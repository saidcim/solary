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