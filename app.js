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
    store.set("solary.body", body.id);
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
  if (!reduced) setInterval(loop, 72);

  BODIES.push(
    {
      id: "mercury", order: 1, ordinal: "I", label: "Mercury",
      tag: "Closest to the fire, and still the coldest nights.",
      accent: "#C7B49B", diameter: 4879, r: 22,
      ramp: " .·:-=+o0#@",
      colors: [["#6F6659", "#B4A691"], ["#463F38", "#6B6156"], ["#C3B79E", "#EFE6D2"]],
      rows: [["DIAMETER", "4,879 km"], ["MASS", "0.055 ⊕"], ["GRAVITY", "3.70 m/s²"], ["DAY", "1,407.6 h"], ["YEAR", "88.0 d"], ["DISTANCE", "0.387 AU"], ["MOONS", "0"], ["MEAN TEMP", "167 °C"]],
      surf: (lat, lon) => {
        const c = Math.sin(lon * 7 + lat * 3) * Math.sin(lat * 9 - lon * 2);
        return [clamp(0.55 + 0.45 * c, 0, 1), c < -0.42 ? 1 : c > 0.62 ? 2 : 0];
      }
    },
    {
      id: "venus", order: 2, ordinal: "II", label: "Venus",
      tag: "A furnace sealed under a lid it cannot lift.",
      accent: "#E8C87A", diameter: 12104, r: 27,
      ramp: " ..·:░░▒▒▓█",
      colors: [["#9E7434", "#D8B463"], ["#D2B478", "#F7E7B8"]],
      rows: [["DIAMETER", "12,104 km"], ["MASS", "0.815 ⊕"], ["GRAVITY", "8.87 m/s²"], ["DAY", "5,832.5 h"], ["YEAR", "224.7 d"], ["DISTANCE", "0.723 AU"], ["MOONS", "0"], ["MEAN TEMP", "464 °C"]],
      surf: (lat, lon) => {
        const s = 0.5 + 0.5 * Math.sin(lon * 2 + Math.sin(lat * 5) * 2.2);
        const v = clamp(0.4 + 0.35 * s + 0.25 * bands(lat, 6, lon * 0.6), 0, 1);
        return [v, v > 0.68 ? 1 : 0];
      }
    },
    {
      id: "mars", order: 4, ordinal: "IV", label: "Mars",
      tag: "Iron, dust, and two captured stones for moons.",
      accent: "#E2653B", diameter: 6792, r: 24,
      ramp: " .:;-=x*%#@",
      colors: [["#A6512F", "#E2814F"], ["#6E2C1A", "#A9482A"], ["#C4C0B7", "#F1EDE4"]],
      rows: [["DIAMETER", "6,792 km"], ["MASS", "0.107 ⊕"], ["GRAVITY", "3.71 m/s²"], ["DAY", "24.7 h"], ["YEAR", "687.0 d"], ["DISTANCE", "1.524 AU"], ["MOONS", "2"], ["MEAN TEMP", "−65 °C"]],
      surf: (lat, lon) => {
        if (Math.abs(lat) > 1.22) return [1, 2];
        const d = Math.sin(lon * 4 + lat * 2) * Math.sin(lat * 6);
        return [clamp(0.35 + 0.5 * (0.5 + 0.5 * d), 0, 1), d < -0.3 ? 1 : 0];
      }
    },
    {
      id: "jupiter", order: 5, ordinal: "V", label: "Jupiter",
      tag: "A storm wider than Earth, older than the telescope.",
      accent: "#D9A066", diameter: 142984, r: 38,
      ramp: " .-~=≡+*#%@",
      colors: [["#7A4F2C", "#B4763F"], ["#CBA678", "#F3DDB4"], ["#9B3722", "#DC6A45"]],
      rows: [["DIAMETER", "142,984 km"], ["MASS", "317.8 ⊕"], ["GRAVITY", "24.79 m/s²"], ["DAY", "9.9 h"], ["YEAR", "4,331 d"], ["DISTANCE", "5.203 AU"], ["MOONS", "95"], ["MEAN TEMP", "−110 °C"]],
      surf: (lat, lon) => {
        const b = bands(lat, 13, Math.sin(lon * 2) * 0.5);
        const spot = Math.exp(-(Math.pow(wrap(lon + 1.2) - Math.PI, 2) * 3 + Math.pow(lat + 0.32, 2) * 26));
        if (spot > 0.35) return [clamp(0.55 + spot * 0.4, 0, 1), 2];
        return [clamp(0.25 + 0.65 * b, 0, 1), b > 0.55 ? 1 : 0];
      }
    },
    {
      id: "saturn", order: 6, ordinal: "VI", label: "Saturn",
      tag: "Held together by the ice it never took in.",
      accent: "#E3CE9B", diameter: 120536, r: 20, ring: true,
      ramp: " .-~=+*#%@",
      colors: [["#9C8451", "#D2B77E"], ["#D9C89A", "#F6ECCB"], ["#7C7053", "#C0B189"]],
      rows: [["DIAMETER", "120,536 km"], ["MASS", "95.2 ⊕"], ["GRAVITY", "10.44 m/s²"], ["DAY", "10.7 h"], ["YEAR", "10,747 d"], ["DISTANCE", "9.537 AU"], ["MOONS", "274"], ["MEAN TEMP", "−140 °C"]],
      surf: (lat, lon) => {
        const b = bands(lat, 9, Math.sin(lon) * 0.3);
        return [clamp(0.3 + 0.6 * b, 0, 1), b > 0.58 ? 1 : 0];
      }
    },
    {
      id: "uranus", order: 7, ordinal: "VII", label: "Uranus",
      tag: "Knocked over once, and orbiting on its side ever since.",
      accent: "#7FE3D4", diameter: 51118, r: 32,
      ramp: " ..::--==+*",
      colors: [["#3E8C84", "#6FCFC1"], ["#8CE8DC", "#CBF6F0"]],
      rows: [["DIAMETER", "51,118 km"], ["MASS", "14.5 ⊕"], ["GRAVITY", "8.87 m/s²"], ["DAY", "17.2 h"], ["YEAR", "30,589 d"], ["DISTANCE", "19.19 AU"], ["MOONS", "28"], ["MEAN TEMP", "−195 °C"]],
      surf: (lat, lon) => {
        const b = bands(lat, 4, lon * 0.2);
        return [clamp(0.55 + 0.3 * b, 0, 1), b > 0.62 ? 1 : 0];
      }
    },
    {
      id: "neptune", order: 8, ordinal: "VIII", label: "Neptune",
      tag: "Last one out, and the windiest by a wide margin.",
      accent: "#5C7CF0", diameter: 49528, r: 32,
      ramp: " .:-=+*o#%@",
      colors: [["#26418C", "#4C7CF0"], ["#7FA0F5", "#B8CCFF"], ["#141F52", "#2A3F8F"]],
      rows: [["DIAMETER", "49,528 km"], ["MASS", "17.1 ⊕"], ["GRAVITY", "11.15 m/s²"], ["DAY", "16.1 h"], ["YEAR", "59,800 d"], ["DISTANCE", "30.07 AU"], ["MOONS", "16"], ["MEAN TEMP", "−200 °C"]],
      surf: (lat, lon) => {
        const b = bands(lat, 6, Math.sin(lon * 1.5) * 0.8);
        const spot = Math.exp(-(Math.pow(wrap(lon + 2.4) - Math.PI, 2) * 4 + Math.pow(lat - 0.35, 2) * 30));
        if (spot > 0.4) return [clamp(0.45 + spot * 0.3, 0, 1), 2];
        return [clamp(0.35 + 0.5 * b, 0, 1), b > 0.6 ? 1 : 0];
      }
    }
  );

  BODIES.sort((a, b) => a.order - b.order);

  const byId = {};
  for (const b of BODIES) byId[b.id] = b;

  function travel(body) {
    show(body);
    print("Arrived at " + body.label + ". " + body.tag, "key");
  }

  for (const b of BODIES) define(b.id, "", null, 0, () => travel(b));

  define("<body>", "", "travel to mercury … neptune", 5, null);

  define("ls", "", "list every body with its distance", 10, () => {
    print("8 BODIES INDEXED", "head");
    for (const b of BODIES) print("  " + b.ordinal.padEnd(5) + b.label.toLowerCase().padEnd(10) + b.rows[5][1].padStart(10), b.id === state.body.id ? "key" : "muted");
  });

  define("next", "", null, 0, () => {
    const n = BODIES.indexOf(state.body) + 1;
    if (n >= BODIES.length) return print("next: Neptune is the outermost body.", "warn");
    travel(BODIES[n]);
  });

  define("prev", "", null, 0, () => {
    const n = BODIES.indexOf(state.body) - 1;
    if (n < 0) return print("prev: Mercury is the innermost body.", "warn");
    travel(BODIES[n]);
  });

  define("spin", "", null, 0, (arg) => {
    if (arg === "stop" || arg === "0") {
      state.spin = 0;
      return print("Rotation held. Run spin 1 to resume.", "key");
    }
    const n = parseFloat(arg);
    if (!isFinite(n) || n < 0.25 || n > 4) return print("spin: give a number between 0.25 and 4, or stop.", "warn");
    state.spin = n;
    print("Rotation set to " + n.toFixed(2) + "×.", "key");
  });

  define("about", "", null, 0, () => {
    print("ABOUT", "head");
    print("  A new tab page built as a terminal. Every body is drawn live", "muted");
    print("  from a lit sphere sampled into characters, not stored art.", "muted");
    print("  The interface takes its colour from whatever you are orbiting.", "muted");
  });

  function bar(value, max, width) {
    const n = Math.max(1, Math.round((value / max) * width));
    return "█".repeat(n) + "·".repeat(Math.max(0, width - n));
  }

  define("info", "[body]", "full telemetry for one body", 20, (arg) => {
    const b = arg ? byId[arg] : state.body;
    if (!b) return print("info: no body named '" + arg + "'. Try ls.", "warn");
    print(b.label.toUpperCase() + " · " + b.ordinal + " from the sun", "head");
    for (const [k, v] of b.rows) print("  " + k.padEnd(12) + v, "muted");
    print("  " + b.tag, "key");
  });

  define("size", "", "compare diameters", 30, () => {
    print("DIAMETER, RELATIVE", "head");
    for (const b of BODIES) print("  " + b.label.toLowerCase().padEnd(9) + bar(b.diameter, 142984, 24) + " " + b.diameter.toLocaleString("en-US").padStart(8) + " km", b.id === state.body.id ? "key" : "muted");
  });

  const skyEl = document.getElementById("sky");

  const STAR_TIERS = [
    { w: 0.62, ch: ".", size: 10, color: "#2E394F", base: 0.55 },
    { w: 0.26, ch: "·", size: 13, color: "#3E4C66", base: 0.7 },
    { w: 0.09, ch: "+", size: 16, color: "#55688A", base: 0.8 },
    { w: 0.03, ch: "*", size: 18, color: "#66799B", base: 0.85 }
  ];

  const stars = [];

  function pickTier() {
    let r = Math.random();
    for (const t of STAR_TIERS) {
      if (r < t.w) return t;
      r -= t.w;
    }
    return STAR_TIERS[0];
  }

  function seedSky() {
    skyEl.textContent = "";
    stars.length = 0;
    const n = Math.round((window.innerWidth * window.innerHeight) / 15000);
    for (let i = 0; i < n; i++) {
      const t = pickTier();
      const node = document.createElement("span");
      node.className = "star";
      node.textContent = t.ch;
      node.style.left = (Math.random() * 100).toFixed(3) + "%";
      node.style.top = (Math.random() * 100).toFixed(3) + "%";
      node.style.fontSize = t.size + "px";
      node.style.color = t.color;
      node.style.opacity = (t.base * (0.55 + Math.random() * 0.45)).toFixed(2);
      skyEl.appendChild(node);
      stars.push({ node: node, rest: node.style.opacity });
    }
  }

  function flare() {
    if (!stars.length) return;
    const s = stars[Math.floor(Math.random() * stars.length)];
    s.node.style.opacity = Math.random() > 0.45 ? "1" : "0.06";
    setTimeout(() => { s.node.style.opacity = s.rest; }, 1500 + Math.random() * 1500);
  }

  seedSky();
  window.addEventListener("resize", seedSky);
  if (!reduced) setInterval(flare, 1400);

  const ENGINES = {
    google: { label: "Google", url: "https://www.google.com/search?q=" },
    duckduckgo: { label: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
    yahoo: { label: "Yahoo", url: "https://search.yahoo.com/search?p=" }
  };

  const SHORTCUTS = {
    g: { label: "Google", home: "https://www.google.com", url: "https://www.google.com/search?q=" },
    yt: { label: "YouTube", home: "https://www.youtube.com", url: "https://www.youtube.com/results?search_query=" },
    gh: { label: "GitHub", home: "https://github.com", url: "https://github.com/search?q=" }
  };

  function go(url) {
    try {
      window.location.assign(url);
    } catch (e) {
      window.open(url, "_blank", "noopener");
    }
  }

  function search(target, query) {
    if (!query) return print(target.label + ": give something to search for.", "warn");
    print("Searching " + target.label + " for " + query, "key");
    go(target.url + encodeURIComponent(query));
  }

  define("s", "<query>", "search the web with the current engine", 40, (arg, rest) => search(ENGINES[state.engine], rest));

  define("g", "/ yt / gh", "open Google, YouTube or GitHub", 50, (arg, rest) => openSite("g", rest));
  define("yt", "", null, 0, (arg, rest) => openSite("yt", rest));
  define("gh", "", null, 0, (arg, rest) => openSite("gh", rest));

  function openSite(key, rest) {
    const site = SHORTCUTS[key];
    if (rest) return search(site, rest);
    print("Opening " + site.label, "key");
    go(site.home);
  }

  define("engine", "<name>", "google, duckduckgo or yahoo", 60, (arg) => {
    if (!arg) return print("Searching with " + ENGINES[state.engine].label + ". Options: google, duckduckgo, yahoo.", "key");
    if (!ENGINES[arg]) return print("engine: pick google, duckduckgo or yahoo.", "warn");
    state.engine = arg;
    store.set("orrery.engine", arg);
    print("Search engine set to " + ENGINES[arg].label + ".", "key");
  });

  const savedEngine = store.get("orrery.engine");
  if (savedEngine && ENGINES[savedEngine]) state.engine = savedEngine;

  const savedBody = store.get("orrery.body");
  if (savedBody && byId[savedBody]) show(byId[savedBody]);
<<<<<<< HEAD
})();
=======
})();
>>>>>>> c33b3a2427760e3bfd625f7700f04b245538091f
