/* Evidence Locker - hidden code-breaking game (easter egg).
   Three levels, each harder than the last:
     1 Workstation        4 different digits, every digit marked     8 tries
     2 File server        5 different digits, counts only           10 tries
     3 Domain controller  4 hex characters, repeats allowed,        10 tries, 3 minutes
                          counts only
   "Counts only" means you learn how many characters are in the right place and how
   many are in the code but misplaced, never which ones. Runs entirely in the browser;
   the best score is kept in localStorage. Loaded on demand by script.js. */
(function () {
  "use strict";
  if (window.SJEgg) return;

  var LEVELS = [
    { name: "Workstation", symbols: "0123456789", len: 4, unique: true, tries: 8, positional: true, time: 0,
      brief: "Four different digits. Every digit you try is marked." },
    { name: "File server", symbols: "0123456789", len: 5, unique: true, tries: 10, positional: false, time: 0,
      brief: "Five different digits. You only learn how many are right, not which ones." },
    { name: "Domain controller", symbols: "0123456789ABCDEF", len: 4, unique: false, tries: 10, positional: false, time: 180,
      brief: "Four hex characters, repeats allowed, counts only. Three minutes on the clock." }
  ];
  var HINT_COST = 2;      // tries spent per hint
  var BEST_KEY = "sj-locker-best";

  var root, els = {}, state, timer = null, lastFocus = null;

  /* ---------- helpers ---------- */
  function rand(n) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  function newCode(lv) {
    var pool = lv.symbols.split(""), out = "";
    for (var i = 0; i < lv.len; i++) {
      var k = rand(pool.length);
      out += pool[k];
      if (lv.unique) pool.splice(k, 1);
    }
    return out;
  }
  function marks(guess, code) {
    return guess.split("").map(function (c, i) { return code[i] === c ? "hit" : code.indexOf(c) >= 0 ? "near" : "miss"; });
  }
  function counts(guess, code) {
    var hits = 0, g = {}, c = {};
    for (var i = 0; i < code.length; i++) {
      if (guess[i] === code[i]) hits++;
      else { g[guess[i]] = (g[guess[i]] || 0) + 1; c[code[i]] = (c[code[i]] || 0) + 1; }
    }
    var near = 0;
    Object.keys(g).forEach(function (k) { near += Math.min(g[k], c[k] || 0); });
    return { hits: hits, near: near };
  }
  function getBest() { try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* storage blocked */ } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(sec) { return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
  function reduced() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

  /* ---------- game flow ---------- */
  function startRun() { state = { level: 0, score: 0 }; startLevel(); }

  function startLevel() {
    var lv = LEVELS[state.level];
    stopTimer();
    state.code = newCode(lv);
    state.input = "";
    state.rows = [];
    state.triesLeft = lv.tries;
    state.hints = 0;
    state.revealed = {};
    state.notes = {};
    state.notesMode = false;
    state.over = false;
    state.timeLeft = lv.time;
    if (lv.time) timer = setInterval(tick, 1000);
    render(true);
  }

  function tick() {
    if (state.over) return stopTimer();
    state.timeLeft--;
    if (state.timeLeft <= 0) { state.timeLeft = 0; lose("Time's up."); return; }
    updateStatus();
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function press(sym) {
    if (state.over) return;
    var lv = LEVELS[state.level];
    if (lv.symbols.indexOf(sym) < 0) return;
    if (state.notesMode) { state.notes[sym] = !state.notes[sym]; renderKeys(); return; }
    if (state.input.length >= lv.len) return;
    if (lv.unique && state.input.indexOf(sym) >= 0) { shake(); return; }
    state.input += sym;
    renderEntry();
  }
  function back() { if (!state.over) { state.input = state.input.slice(0, -1); renderEntry(); } }

  function submit() {
    var lv = LEVELS[state.level];
    if (state.over) return;
    if (state.input.length !== lv.len) { shake(); return; }
    var guess = state.input;
    var row = { guess: guess };
    if (lv.positional) row.marks = marks(guess, state.code);
    else row.counts = counts(guess, state.code);
    state.rows.push(row);
    state.input = "";
    state.triesLeft--;
    var solved = guess === state.code;
    renderBoard(true);
    renderEntry();
    announce(lv.positional ? describeMarks(row) : row.counts.hits + " in the right place, " + row.counts.near + " misplaced.");
    if (solved) win();
    else if (state.triesLeft <= 0) lose("Out of tries.");
    else updateStatus();
  }

  function hint() {
    var lv = LEVELS[state.level];
    if (state.over || state.triesLeft <= HINT_COST) return;
    var hidden = [];
    for (var i = 0; i < lv.len; i++) if (!state.revealed[i]) hidden.push(i);
    if (hidden.length <= 1) return;
    var pos = hidden[rand(hidden.length)];
    state.revealed[pos] = state.code[pos];
    state.triesLeft -= HINT_COST;
    state.hints++;
    announce("Position " + (pos + 1) + " is " + state.code[pos] + ".");
    renderEntry();
    updateStatus();
  }

  function win() {
    var lv = LEVELS[state.level];
    state.over = true;
    stopTimer();
    var base = 500 * (state.level + 1);
    var triesBonus = state.triesLeft * 60 * (state.level + 1);
    var timeBonus = lv.time ? state.timeLeft * 4 : 0;
    var hintPenalty = state.hints * 150;
    var gained = Math.max(0, base + triesBonus + timeBonus - hintPenalty);
    state.score += gained;
    var last = state.level === LEVELS.length - 1;
    var best = getBest(), newBest = false;
    if (last && state.score > best) { setBest(state.score); newBest = true; }
    root.classList.add("egg-won");
    var lines = [
      ["Level cleared", "+" + base],
      ["Tries left × " + (60 * (state.level + 1)), "+" + triesBonus]
    ];
    if (lv.time) lines.push(["Time left × 4", "+" + timeBonus]);
    if (state.hints) lines.push(["Hints used", "−" + hintPenalty]);
    els.result.innerHTML =
      '<p class="egg-kicker egg-ok">' + (last ? "Locker opened" : "Access granted") + "</p>" +
      '<p class="egg-big">' + (last ? "You cracked all three." : esc(lv.name) + " cracked in " + state.rows.length + (state.rows.length === 1 ? " try." : " tries.")) + "</p>" +
      '<dl class="egg-score">' + lines.map(function (l) { return "<div><dt>" + l[0] + "</dt><dd>" + l[1] + "</dd></div>"; }).join("") +
      '<div class="egg-total"><dt>Run score</dt><dd>' + state.score.toLocaleString() + "</dd></div></dl>" +
      (last ? '<p class="egg-note">' + (newBest ? "New personal best." : "Personal best: " + Math.max(best, state.score).toLocaleString() + ".") +
        " That kind of patience is most of incident response.</p>" : "") +
      '<div class="egg-actions">' +
      (last ? '<button type="button" class="btn btn-primary" data-act="restart">Play again</button><button type="button" class="btn btn-ghost" data-act="share">Copy score</button>'
            : '<button type="button" class="btn btn-primary" data-act="next">Next level: ' + esc(LEVELS[state.level + 1].name) + " →</button>") +
      "</div>";
    showResult();
  }

  function lose(reason) {
    state.over = true;
    stopTimer();
    root.classList.add("egg-lost");
    els.result.innerHTML =
      '<p class="egg-kicker egg-bad">Locked out</p>' +
      '<p class="egg-big">' + esc(reason) + " The code was <span class=\"egg-code\">" + esc(state.code) + "</span>.</p>" +
      '<p class="egg-note">Run score: ' + state.score.toLocaleString() + (getBest() ? " · personal best " + getBest().toLocaleString() : "") + ". Runs restart from level 1.</p>" +
      '<div class="egg-actions"><button type="button" class="btn btn-primary" data-act="restart">Start over</button></div>';
    showResult();
  }

  function showResult() {
    els.play.hidden = true;
    els.result.hidden = false;
    updateStatus();
    var b = els.result.querySelector("button");
    if (b) b.focus();
  }

  function shake() {
    if (reduced()) return;
    els.entry.classList.remove("egg-shake");
    void els.entry.offsetWidth;
    els.entry.classList.add("egg-shake");
  }
  function announce(t) { els.live.textContent = t; }
  function describeMarks(row) {
    return row.guess.split("").map(function (c, i) {
      return c + " " + (row.marks[i] === "hit" ? "right place" : row.marks[i] === "near" ? "wrong place" : "not in code");
    }).join(", ");
  }

  /* ---------- rendering ---------- */
  function build() {
    root = document.createElement("div");
    root.className = "egg";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "eggTitle");
    root.innerHTML =
      '<div class="egg-backdrop" data-act="close"></div>' +
      '<div class="egg-panel" tabindex="-1">' +
        '<div class="egg-head">' +
          '<div><p class="egg-kicker">Easter egg · <span data-el="level"></span></p>' +
          '<h2 id="eggTitle" class="egg-title"><svg class="egg-lock" viewBox="0 0 24 24" aria-hidden="true"><path class="egg-shackle" d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="4" y="11" width="16" height="10" rx="2"/></svg>Evidence Locker</h2></div>' +
          '<button type="button" class="egg-x" data-act="close" aria-label="Close game">×</button>' +
        "</div>" +
        '<div class="egg-steps" data-el="steps"></div>' +
        '<p class="egg-brief" data-el="brief"></p>' +
        '<div class="egg-status" data-el="status"></div>' +
        '<div class="egg-timebar" data-el="timebar" hidden><span></span></div>' +
        '<ol class="egg-board" data-el="board" aria-label="Your guesses"></ol>' +
        '<div data-el="play">' +
          '<div class="egg-entry" data-el="entry"></div>' +
          '<div class="egg-keys" data-el="keys"></div>' +
          '<div class="egg-tools">' +
            '<button type="button" class="egg-tool" data-act="notes" aria-pressed="false">Notes: off</button>' +
            '<button type="button" class="egg-tool" data-act="hint">Hint (−' + HINT_COST + " tries)</button>" +
          "</div>" +
          '<p class="egg-help">Type on your keyboard or tap the keys. Turn Notes on to cross out characters you have ruled out.</p>' +
        "</div>" +
        '<div class="egg-result" data-el="result" hidden aria-live="polite"></div>' +
        '<p class="egg-sr" data-el="live" aria-live="polite"></p>' +
      "</div>";
    ["level", "steps", "brief", "status", "timebar", "board", "play", "entry", "keys", "result", "live"].forEach(function (k) {
      els[k] = root.querySelector('[data-el="' + k + '"]');
    });
    els.notesBtn = root.querySelector('[data-act="notes"]');
    els.hintBtn = root.querySelector('[data-act="hint"]');
    root.addEventListener("click", onClick);
    document.body.appendChild(root);
  }

  function onClick(e) {
    var t = e.target.closest("[data-act],[data-key]");
    if (!t) return;
    if (t.hasAttribute("data-key")) { press(t.getAttribute("data-key")); return; }
    var act = t.getAttribute("data-act");
    if (act === "close") close();
    else if (act === "back") back();
    else if (act === "enter") submit();
    else if (act === "hint") hint();
    else if (act === "notes") { state.notesMode = !state.notesMode; renderKeys(); }
    else if (act === "next") { state.level++; startLevel(); }
    else if (act === "restart") startRun();
    else if (act === "share") {
      var text = "I opened the Evidence Locker on subashjaganathan.github.io with " + state.score.toLocaleString() + " points.";
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { t.textContent = "Copied"; }, function () {});
    }
  }

  function render(fresh) {
    var lv = LEVELS[state.level];
    root.classList.remove("egg-won", "egg-lost");
    els.level.textContent = "Level " + (state.level + 1) + " of " + LEVELS.length;
    els.steps.innerHTML = LEVELS.map(function (l, i) {
      var cls = i < state.level ? "done" : i === state.level ? "now" : "";
      return '<span class="' + cls + '"><b>' + (i + 1) + "</b>" + esc(l.name) + "</span>";
    }).join("");
    els.brief.textContent = lv.brief;
    els.timebar.hidden = !lv.time;
    els.play.hidden = false;
    els.result.hidden = true;
    els.result.innerHTML = "";
    renderBoard(false);
    renderEntry();
    renderKeys();
    updateStatus();
    if (fresh && !reduced()) {
      root.querySelector(".egg-panel").classList.remove("egg-enter");
      void root.offsetWidth;
      root.querySelector(".egg-panel").classList.add("egg-enter");
    }
  }

  function renderBoard(animateLast) {
    var lv = LEVELS[state.level];
    els.board.innerHTML = state.rows.map(function (r, ri) {
      var last = animateLast && ri === state.rows.length - 1;
      var tiles = r.guess.split("").map(function (c, i) {
        var cls = lv.positional ? " egg-" + r.marks[i] : "";
        return '<span class="egg-tile' + cls + (last ? " egg-flip" : "") + '">' + esc(c) + "</span>";
      }).join("");
      var fb = lv.positional ? "" :
        '<span class="egg-pegs' + (last ? " egg-pop" : "") + '" aria-label="' + r.counts.hits + " right place, " + r.counts.near + ' misplaced">' +
        '<span class="egg-peg egg-hit" title="Right place">' + r.counts.hits + "</span>" +
        '<span class="egg-peg egg-near" title="In the code, wrong place">' + r.counts.near + "</span></span>";
      return '<li><span class="egg-n">' + ("0" + (ri + 1)).slice(-2) + "</span>" + tiles + fb + "</li>";
    }).join("");
    if (!lv.positional && state.rows.length === 0) {
      els.board.innerHTML = '<li class="egg-legend"><span class="egg-peg egg-hit">2</span> right place <span class="egg-peg egg-near">1</span> in the code, wrong place</li>';
    } else if (lv.positional && state.rows.length === 0) {
      els.board.innerHTML = '<li class="egg-legend"><span class="egg-tile egg-hit">1</span> right place <span class="egg-tile egg-near">2</span> wrong place <span class="egg-tile egg-miss">3</span> not in code</li>';
    }
    els.board.scrollTop = els.board.scrollHeight;
  }

  function renderEntry() {
    var lv = LEVELS[state.level], html = "";
    for (var i = 0; i < lv.len; i++) {
      var c = state.input[i];
      var known = state.revealed[i];
      html += '<span class="egg-slot' + (c ? " filled" : "") + (i === state.input.length ? " cur" : "") + '">' +
        (c ? esc(c) : known ? '<i title="Revealed by a hint">' + esc(known) + "</i>" : "") + "</span>";
    }
    els.entry.innerHTML = html;
    var enter = els.keys.querySelector('[data-act="enter"]');
    if (enter) enter.disabled = state.input.length !== lv.len;
    if (lv.unique) {
      els.keys.querySelectorAll("[data-key]").forEach(function (k) {
        k.classList.toggle("used", state.input.indexOf(k.getAttribute("data-key")) >= 0);
      });
    }
  }

  function renderKeys() {
    var lv = LEVELS[state.level];
    els.keys.className = "egg-keys" + (lv.symbols.length > 10 ? " hex" : "") + (state.notesMode ? " noting" : "");
    els.keys.innerHTML = lv.symbols.split("").map(function (s) {
      return '<button type="button" class="egg-key' + (state.notes[s] ? " ruled" : "") + '" data-key="' + s + '" aria-label="' + s + (state.notes[s] ? ", ruled out" : "") + '">' + s + "</button>";
    }).join("") +
      '<button type="button" class="egg-key egg-fn" data-act="back" aria-label="Delete last character">⌫</button>' +
      '<button type="button" class="egg-key egg-fn egg-go" data-act="enter" aria-label="Submit guess">Enter</button>';
    els.notesBtn.textContent = "Notes: " + (state.notesMode ? "on" : "off");
    els.notesBtn.setAttribute("aria-pressed", state.notesMode ? "true" : "false");
    renderEntry();
  }

  function updateStatus() {
    var lv = LEVELS[state.level];
    var parts = [
      "<span><b>" + state.triesLeft + "</b> " + (state.triesLeft === 1 ? "try" : "tries") + " left</span>",
      "<span>Score <b>" + state.score.toLocaleString() + "</b></span>"
    ];
    if (lv.time) parts.splice(1, 0, '<span class="' + (state.timeLeft <= 30 ? "egg-warn" : "") + '"><b>' + fmt(state.timeLeft) + "</b> left</span>");
    var best = getBest();
    if (best) parts.push("<span>Best <b>" + best.toLocaleString() + "</b></span>");
    els.status.innerHTML = parts.join("");
    if (lv.time) els.timebar.firstChild.style.width = (state.timeLeft / lv.time * 100) + "%";
    els.hintBtn.disabled = state.over || state.triesLeft <= HINT_COST || Object.keys(state.revealed).length >= lv.len - 1;
  }

  /* ---------- open / close ---------- */
  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === "Tab") { trapFocus(e); return; }
    if (state.over) return;
    var k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (k === "Backspace") { e.preventDefault(); back(); }
    else if (k === "Enter") {
      // Enter on a tool, close or result button keeps its own meaning; anywhere else it submits
      var a = document.activeElement;
      if (a && a.matches && a.matches("button[data-act]:not([data-act='enter']):not([data-act='back'])")) return;
      e.preventDefault(); submit();
    }
    else if (k.length === 1 && LEVELS[state.level].symbols.indexOf(k) >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); press(k); }
  }
  function trapFocus(e) {
    var f = [].slice.call(root.querySelectorAll("button:not([disabled])")).filter(function (b) { return b.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("egg-open");
    document.addEventListener("keydown", onKey);
    if (!state) startRun();
    else if (!state.over) render(false);   // resume an untimed level where it was left
    root.querySelector(".egg-panel").focus();
  }
  function close() {
    // the clock does not pause: leaving a timed level forfeits it
    if (state && !state.over && LEVELS[state.level].time) lose("You left the locker with the clock running.");
    stopTimer();
    root.hidden = true;
    document.documentElement.classList.remove("egg-open");
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.SJEgg = { open: open };
})();
