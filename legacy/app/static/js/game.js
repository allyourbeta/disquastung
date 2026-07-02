// Single-page game controller for the chess drills.
//
// The whole loop runs without navigating: a tap fetches the verdict from the
// server, plays a sound, and updates the screen in place. Because the page
// never reloads, ONE audio engine stays warm for the entire session -- which
// is what makes the feedback sounds reliable (no cold-start, no bleed-over).
//
// The <form> is left intact as a no-JavaScript fallback (a native submit still
// posts to the server and renders the old result/hint pages).
(function () {
  var ADVANCE_DELAY_MS = 1900;       // knight/bishop: time to view the path board
  var COLOR_ADVANCE_DELAY_MS = 1300;  // color: static board, brief view before advancing

  var body = document.body;
  var GAME = body.classList.contains("game-knight") ? "knight"
           : body.classList.contains("game-bishop") ? "bishop"
           : body.classList.contains("game-color") ? "color"
           : null;
  if (!GAME) return;

  // ---- audio (persistent across the session; never closed) ----------------
  var ctx;
  function audio() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state !== "running" && ctx.state !== "closed") ctx.resume(); // also catches iOS "interrupted" (post-alarm/call)
      return ctx;
    } catch (e) { return null; }
  }
  function blip(notes, attack) {
    var c = audio();
    if (!c) return;
    var now = c.currentTime + 0.02;
    var atk = attack || 0.012;
    notes.forEach(function (n) {
      var osc = c.createOscillator(), gain = c.createGain();
      osc.type = n[3] || "sine";
      osc.frequency.value = n[0];
      var s = now + n[1];
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(n[4] || 0.18, s + atk);
      gain.gain.exponentialRampToValueAtTime(0.0001, s + n[2]);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(s); osc.stop(s + n[2] + 0.03);
    });
  }
  function playCorrect() {
    blip([[523, 0, 0.17, "triangle", 0.16], [784, 0.1, 0.24, "triangle", 0.16]], 0.022);
  }
  function playWrong() {
    blip([[180, 0, 0.2, "square", 0.12]]);
  }
  audio();
  function warm() {
    var c = audio();
    if (c) {
      try {
        var o = c.createOscillator(), g = c.createGain();
        g.gain.value = 0.0001;
        o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.03);
      } catch (e) {}
    }
    document.removeEventListener("pointerdown", warm, true);
    document.removeEventListener("touchstart", warm, true);
  }
  document.addEventListener("pointerdown", warm, true);
  document.addEventListener("touchstart", warm, { passive: true, capture: true });

  // ---- DOM references -----------------------------------------------------
  var content = document.querySelector(".game-content");
  var squaresContainer = document.querySelector(".squares-container");
  var squares = [].slice.call(document.querySelectorAll(".squares-container .square-display"));
  var questionSection = document.querySelector(".question-section");
  var form = document.querySelector("form");
  var buttons = [].slice.call(document.querySelectorAll(".option-button"));
  var nav = document.querySelector(".navigation-section");

  // feedback (hint / "Correct!") -- inserted above the squares
  var feedback = document.createElement("div");
  feedback.className = "alert js-feedback";
  feedback.style.display = "none";
  content.insertBefore(feedback, squaresContainer);

  // result area (board + next button), fills the space the buttons leave
  var resultArea = document.createElement("div");
  resultArea.style.cssText =
    "flex:1 1 auto;min-height:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;width:100%;";
  var verdict = document.createElement("div");
  verdict.className = "alert alert-success js-feedback result-correct";
  verdict.textContent = "CORRECT!";
  verdict.style.display = "none";
  var boardWrap = document.createElement("div");
  boardWrap.id = "chessboard-container";
  boardWrap.style.cssText = "width:100%;max-width:320px;";
  var nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "nav-link primary result-next";
  nextBtn.textContent = "Next \u2192";
  nextBtn.style.display = "none";
  resultArea.appendChild(verdict);
  resultArea.appendChild(boardWrap);
  resultArea.appendChild(nextBtn);
  questionSection.parentNode.insertBefore(resultArea, questionSection.nextSibling);

  // auto-advance toggle -- inline in the bottom nav row (no longer covers the title)
  var autoAdvance = localStorage.getItem("chess-auto-advance") !== "false";
  var toggle = document.createElement("div");
  toggle.style.cssText =
    "display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;user-select:none;";
  function renderToggle() {
    toggle.innerHTML =
      '<span>Auto</span><div style="width:34px;height:18px;background:' +
      (autoAdvance ? "var(--accent-gold)" : "#555") +
      ';border-radius:9px;position:relative;transition:background .2s"><div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:' +
      (autoAdvance ? "18px" : "2px") +
      ';transition:left .2s"></div></div>';
  }
  renderToggle();
  if (nav) {
    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.justifyContent = "space-between";
    nav.appendChild(toggle);
  }

  // ---- state machine ------------------------------------------------------
  var locked = false;    // an answer is being processed
  var inResult = false;  // showing the correct/board state
  var advanceTimer = null;

  function setButtons(disabled) {
    buttons.forEach(function (b) {
      b.disabled = disabled;
      b.style.opacity = disabled ? "0.55" : "";
    });
  }
  function clearFlash() {
    buttons.forEach(function (b) { b.style.removeProperty("outline"); b.style.removeProperty("outline-offset"); });
  }
  function flash(btn, ok) {
    if (!btn) return;
    btn.style.outline = "3px solid " + (ok ? "#27ae60" : "#e74c3c");
    btn.style.outlineOffset = "-3px";
  }

  function showQuestion() {
    inResult = false;
    locked = false;
    clearTimeout(advanceTimer);
    feedback.style.display = "none";
    verdict.style.display = "none";
    resultArea.style.display = "none";
    boardWrap.innerHTML = "";
    nextBtn.style.display = "none";
    questionSection.style.display = "";
    squaresContainer.style.display = "";
    clearFlash();
    setButtons(false);
  }

  function onCorrect(data) {
    inResult = true;
    feedback.style.display = "none";
    verdict.style.display = "";
    squaresContainer.style.display = "none";
    questionSection.style.display = "none";
    resultArea.style.display = "flex";
    boardWrap.innerHTML = "";
    if (GAME !== "color") {
      boardWrap.style.display = "";
      boardWrap.dataset.piece = data.piece || "";
      boardWrap.dataset.start = data.square_a || "";
      boardWrap.dataset.end = data.square_b || "";
      boardWrap.dataset.path = (data.path && data.path.length) ? data.path.join(",") : "";
      try { new MiniChessboard("chessboard-container"); } catch (e) {}
      scheduleNext(ADVANCE_DELAY_MS);
    } else {
      // Color drill: no path, so show the board with just the square highlighted.
      boardWrap.style.display = "";
      boardWrap.dataset.piece = "Square";
      boardWrap.dataset.start = data.square || "";
      boardWrap.dataset.end = data.square || "";
      boardWrap.dataset.path = "";
      try { new MiniChessboard("chessboard-container"); } catch (e) {}
      if (!(window.ChessSpeech && ChessSpeech.onColorCorrect(data, autoAdvance, nextBtn))) scheduleNext(COLOR_ADVANCE_DELAY_MS);
    }
  }

  function scheduleNext(delay) {
    clearTimeout(advanceTimer);
    if (autoAdvance) {
      nextBtn.style.display = "none";
      advanceTimer = setTimeout(loadNext, delay);
    } else {
      nextBtn.style.display = "";
    }
  }

  function loadNext() {
    clearTimeout(advanceTimer);
    fetch("/api/" + GAME + "/new", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (GAME === "color") {
          if (squares[0]) squares[0].textContent = d.square;
        } else {
          if (squares[0]) squares[0].textContent = d.square_a;
          if (squares[1]) squares[1].textContent = d.square_b;
        }
        showQuestion();
      })
      .catch(function () { showQuestion(); });
  }

  function answer(value, btn) {
    if (locked) return;
    locked = true;
    setButtons(true);
    // In-gesture audio recovery: if an iOS alarm left our persistent context
    // "interrupted", resume/rebuild it now so the beep below isn't muted. No-op normally.
    try { var ac = audio(); if (ac && ac.state !== "running") { try { ac.close(); } catch (e2) {} ctx = null; audio(); } } catch (e) {}
    fetch("/api/" + GAME + "/check", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: value })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.correct) {
          try { playCorrect(); } catch (e) {}
          flash(btn, true);
          onCorrect(data);
        } else {
          try { playWrong(); } catch (e) {}
          flash(btn, false);
          feedback.textContent = data.message || "Incorrect. Try again.";
          feedback.className = "alert alert-danger js-feedback";
          feedback.style.display = "";
          setButtons(false);
          setTimeout(clearFlash, 600);
          locked = false;
        }
      })
      .catch(function () {
        // Network failure: fall back to a native submit so the user isn't stuck.
        if (form) {
          var h = document.createElement("input");
          h.type = "hidden";
          h.name = (GAME === "color") ? "color" : "user_moves";
          h.value = value;
          form.appendChild(h);
          form.submit();
        } else {
          locked = false;
          setButtons(false);
        }
      });
  }

  // ---- input --------------------------------------------------------------
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      answer(btn.getAttribute("value"), btn);
    });
  });

  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (inResult) {
      if (k === "enter" || k === " ") { e.preventDefault(); loadNext(); }
      return;
    }
    if (locked) return;
    var val = null;
    if (GAME === "knight") { if ("123456".indexOf(k) >= 0) val = k; }
    else if (GAME === "bishop") { if (k === "1") val = "1"; else if (k === "2") val = "2"; else if (k === "n") val = "-1"; }
    else if (GAME === "color") { if (k === "w" || k === "l") val = "light"; else if (k === "b" || k === "d") val = "dark"; }
    if (val !== null) {
      e.preventDefault();
      var btn = buttons.filter(function (b) { return b.getAttribute("value") === val; })[0];
      answer(val, btn);
    }
  });

  nextBtn.addEventListener("click", loadNext);
  toggle.addEventListener("click", function () {
    autoAdvance = !autoAdvance;
    localStorage.setItem("chess-auto-advance", autoAdvance ? "true" : "false");
    renderToggle();
    if (inResult) scheduleNext(GAME === "color" ? COLOR_ADVANCE_DELAY_MS : ADVANCE_DELAY_MS);
  });
})();
