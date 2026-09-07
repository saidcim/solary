(function () {
  const consoleEl = document.getElementById("console");
  const logEl = document.getElementById("log");
  const formEl = document.getElementById("form");
  const inputEl = document.getElementById("input");

  const state = { body: null, grid: null, phase: 0, spin: 1, engine: "google", history: [], cursor: 0, draft: "" };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };

  const CMDS = {};

  function define(name, args, desc, rank, fn) {
    CMDS[name] = { name: name, args: args, desc: desc, rank: rank, fn: fn };
  }

  function print(text, cls) {
    const line = document.createElement("span");
    line.className = "line" + (cls ? " " + cls : "");
    line.textContent = text;
    logEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function echo(cmd) {
    const line = document.createElement("span");
    line.className = "line echo";
    line.textContent = "visitor@sol:~$ ";
    const em = document.createElement("em");
    em.textContent = cmd;
    line.appendChild(em);
    logEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function run(raw) {
    const cmd = raw.trim();
    echo(cmd);
    if (!cmd) return;
    const parts = cmd.toLowerCase().split(/\s+/);
    const head = parts[0];
    const entry = CMDS[head];
    if (entry && entry.fn) return entry.fn(parts[1], cmd.slice(head.length).trim());
    print(head + ": command not found. Type help.", "warn");
  }

  define("help", "", "list every command", 0, () => {
    print("COMMANDS", "head");
    const rows = Object.keys(CMDS).map((k) => CMDS[k]).filter((c) => c.desc).sort((a, b) => a.rank - b.rank);
    for (const c of rows) print("  " + (c.name + " " + c.args).trim().padEnd(22) + c.desc, "muted");
    print("  Tab completes. ↑ ↓ walks history.", "muted");
  });

  define("clear", "", "wipe the log", 90, () => { logEl.textContent = ""; });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = inputEl.value;
    if (value.trim()) {
      state.history.push(value.trim());
      state.cursor = state.history.length;
    }
    inputEl.value = "";
    run(value);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const v = inputEl.value.toLowerCase();
      const cut = v.lastIndexOf(" ") + 1;
      const frag = v.slice(cut);
      if (!frag) return;
      const hits = Object.keys(CMDS).filter((k) => CMDS[k].fn && k.startsWith(frag));
      if (hits.length === 1) inputEl.value = v.slice(0, cut) + hits[0] + " ";
      else if (hits.length > 1) print(hits.join("   "), "muted");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!state.history.length) return;
      if (state.cursor === state.history.length) state.draft = inputEl.value;
      state.cursor = Math.max(0, state.cursor - 1);
      inputEl.value = state.history[state.cursor];
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (state.cursor >= state.history.length) return;
      state.cursor++;
      inputEl.value = state.cursor === state.history.length ? state.draft : state.history[state.cursor];
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      logEl.textContent = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target === inputEl) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === "Backspace") inputEl.focus();
  });

  inputEl.focus();

  const stageEl = document.getElementById("stage");
  const rasterEl = document.getElementById("raster");
  const nameEl = document.getElementById("name");
  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = (a) => a - TAU * Math.floor(a / TAU);
  const bands = (lat, f, p) => 0.5 + 0.5 * Math.sin(lat * f + p);

  function normalize(v) {
    const m = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / m, v[1] / m, v[2] / m];
  }

  const LIGHT = normalize([-0.58, -0.42, 0.7]);

  function makeGrid(body) {
    const halfW = (body.ring ? 2.06 * body.r : body.r) + 1;
    const halfH = (body.ring ? 2.06 * body.r * 0.52 : body.r * 0.52) + 1;
    return { cols: Math.round(halfW * 2) + 1, rows: Math.round(halfH * 2) + 1 };
  }

  function drawRing(ch, col, body, grid, phase, cx, cy, R, ry, front) {
    const tilt = 0.44;
    const ramp = " ·-=≡";
    const pal = body.colors[2];
    const ds = 0.4 / R;
    const dt = 0.3 / (2.05 * R);
    for (let s = 1.32; s <= 2.02; s += ds) {
      if (s > 1.63 && s < 1.71) continue;
      for (let t = 0; t < TAU; t += dt) {
        const wx = Math.cos(t) * s;
        const wz = Math.sin(t) * s;
        const y = wz * Math.sin(tilt);
        const z = wz * Math.cos(tilt);
        if (z > 0 !== front) continue;
        const X = Math.round(cx + wx * R);
        const Y = Math.round(cy + y * ry);
        if (X < 0 || X >= grid.cols || Y < 0 || Y >= grid.rows) continue;
        const nx = (X - cx) / R;
        const ny = (Y - cy) / ry;
        if (!front && nx * nx + ny * ny <= 1) continue;
        const d = 0.42 + 0.58 * Math.abs(Math.sin(s * 8.5 + 0.4));
        ch[Y][X] = ramp[clamp(Math.round(d * (ramp.length - 1)), 1, ramp.length - 1)];
        col[Y][X] = pal[d > 0.62 ? 1 : 0];
      }
    }
  }

  function frame(body, grid, phase) {
    const ch = [];
    const col = [];
    for (let y = 0; y < grid.rows; y++) {
      ch.push(new Array(grid.cols).fill(" "));
      col.push(new Array(grid.cols).fill(null));
    }

    const cx = (grid.cols - 1) / 2;
    const cy = (grid.rows - 1) / 2;
    const R = body.r;
    const ry = R * 0.52;

    if (body.ring) drawRing(ch, col, body, grid, phase, cx, cy, R, ry, false);

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const nx = (x - cx) / R;
        const ny = (y - cy) / ry;
        const dd = nx * nx + ny * ny;
        if (dd > 1) continue;
        const nz = Math.sqrt(1 - dd);
        const lat = Math.asin(clamp(ny, -1, 1));
        const lon = Math.atan2(nx, nz) + phase;
        let light = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
        light = Math.pow(Math.max(0, light), 0.8);
        const sr = body.surf(lat, lon);
        const v = clamp((0.3 + 0.7 * light) * (0.38 + 0.62 * sr[0]) * (0.62 + 0.38 * nz), 0, 1);
        ch[y][x] = body.ramp[Math.round(v * (body.ramp.length - 1))];
        col[y][x] = body.colors[sr[1]][v > 0.52 ? 1 : 0];
      }
    }

    if (body.ring) drawRing(ch, col, body, grid, phase, cx, cy, R, ry, true);

    let html = "";
    for (let y = 0; y < grid.rows; y++) {
      let runText = "";
      let cur = null;
      for (let x = 0; x < grid.cols; x++) {
        const c = ch[y][x] === " " ? null : col[y][x];
        if (c !== cur) {
          if (runText) html += cur ? '<span style="color:' + cur + '">' + runText + "</span>" : runText;
          runText = "";
          cur = c;
        }
        runText += ch[y][x];
      }
      if (runText) html += cur ? '<span style="color:' + cur + '">' + runText + "</span>" : runText;
      html += "\n";
    }
    return html;
  }

  function fit() {
    const cs = getComputedStyle(stageEl);
    const w = stageEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stageEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 60;
    const g = state.grid;
    const size = Math.min(12, w / (g.cols * 0.605), h / (g.rows * 1.08));
    rasterEl.style.fontSize = Math.max(3, size) + "px";
  }

  function show(body) {
    state.body = body;
    state.grid = makeGrid(body);
    document.documentElement.style.setProperty("--accent", body.accent);
    nameEl.textContent = body.label;
    fit();
    rasterEl.innerHTML = frame(body, state.grid, state.phase);
    store.set("orrery.body", body.id);
    if (!reduced) rasterEl.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });
  }

  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("en-GB", { hour12: false });
    dateEl.textContent = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  }

  function loop() {
    state.phase += 0.055 * state.spin;
    rasterEl.innerHTML = frame(state.body, state.grid, state.phase);
  }

  const BODIES = [
    {
      id: "earth", order: 3, ordinal: "III", label: "Earth",
      tag: "The only surface with a return address.",
      accent: "#5AA9E6", diameter: 12756, r: 28,
      ramp: " .:-~=+*%#@",
      colors: [["#2E5F9E", "#5C9BE0"], ["#2A6B3E", "#5FC078"], ["#AFCBD8", "#EAF4F8"], ["#7E93A8", "#D5E4EE"]],
      rows: [["DIAMETER", "12,756 km"], ["MASS", "1.000 ⊕"], ["GRAVITY", "9.81 m/s²"], ["DAY", "24.0 h"], ["YEAR", "365.2 d"], ["DISTANCE", "1.000 AU"], ["MOONS", "1"], ["MEAN TEMP", "15 °C"]],
      surf: (lat, lon) => {
        const l = wrap(lon);
        if (Math.abs(lat) > 1.16) return [1, 2];
        const land = Math.sin(l * 3 + Math.sin(lat * 4) * 1.6) + 0.7 * Math.sin(l * 7 - lat * 3);
        const cloud = Math.sin(l * 5 + lat * 2.2) + Math.sin(l * 2.3 - lat * 4.1);
        if (cloud > 1.32) return [0.92, 3];
        if (land > 0.35) return [clamp(0.55 + 0.3 * land, 0, 1), 1];
        return [clamp(0.52 + 0.18 * land, 0, 1), 0];
      }
    }
  ];

  show(BODIES[0]);
  tick();
  setInterval(tick, 1000);
  window.addEventListener("resize", fit);
  if (!reduced) setInterval(loop, 72);})();