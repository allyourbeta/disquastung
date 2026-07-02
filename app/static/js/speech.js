// speech.js -- spoken answer reinforcement for the Square Color drill.
//
// Purely additive and opt-in. A "Speak" toggle (mirroring the existing "Auto"
// toggle) that, when ON, says the answer aloud right after a CORRECT color
// guess -- e.g. square h1 -> "H 1 is white". Wrong guesses are untouched.
//
// PRIMARY path: play a pre-recorded clip (app/static/audio/squares/<sq>.m4a).
// There are only 64 possible utterances and they never change, so we record
// them once on a Mac with a good "Premium" voice (see scripts/generate_square_
// audio.sh). Clips are played through the Web Audio API -- the SAME mechanism
// the beeps use, which is what makes audio reliable on iOS from an async
// callback -- and this also sidesteps Safari's habit of muting live speech when
// the tab is backgrounded.
//
// FALLBACK path: if a square's clip hasn't been generated yet (or Web Audio is
// unavailable), we fall back to the browser's built-in speechSynthesis voice so
// the toggle is never silent. Generate the clips and every square upgrades to
// the good voice automatically.
//
// Only active on the color game. game.js calls ChessSpeech.onColorCorrect(...)
// on a correct color answer; if we handle it we return true and (when auto is
// on) drive the advance, otherwise game.js carries on exactly as before.
(function () {
  // Word spoken for each square color. Chess convention is "light"/"dark";
  // swap these two values (and re-record the clips) to hear that instead.
  var COLOR_WORD = { light: "white", dark: "black" };

  // Speak each file as a plain CAPITAL letter -- enhanced voices read "A 1 is
  // black" correctly. (Phonetic spellings like "ay"/"eff" backfired: some
  // voices spelled them out letter-by-letter. Must match the clip text in
  // scripts/generate_square_audio.sh.)
  var SAY_LETTER = { a: "A", b: "B", c: "C", d: "D", e: "E", f: "F", g: "G", h: "H" };

  var STORAGE_KEY = "chess-speak";
  var LEAD_MS = 160;    // small gap so the "correct" beep finishes before the voice
  var SAFETY_MS = 4000; // if an "ended" event never fires, advance anyway

  // Derive the clip folder from this script's own URL so it works no matter
  // what path the app is served under; fall back to the conventional location.
  var thisScript = document.currentScript;
  var AUDIO_BASE = (thisScript && thisScript.src)
    ? thisScript.src.replace(/js\/speech\.js.*$/, "audio/squares/")
    : "/static/audio/squares/";

  var FILES = "abcdefgh".split("");
  var SQUARES = [];
  FILES.forEach(function (f) { for (var r = 1; r <= 8; r++) SQUARES.push(f + r); });

  var enabled = localStorage.getItem(STORAGE_KEY) === "true"; // opt-in: OFF by default

  // ---- Web Audio: recorded clips ------------------------------------------
  var ctx;
  function audioCtx() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state !== "running" && ctx.state !== "closed") ctx.resume(); // also catches iOS "interrupted"
      return ctx;
    } catch (e) { return null; }
  }

  var buffers = {};        // square -> decoded AudioBuffer
  var current = null;      // the clip currently playing (so we can stop it)
  var preloadStarted = false;

  function loadOne(sq) {
    var c = audioCtx();
    if (!c) return;
    fetch(AUDIO_BASE + sq + ".m4a", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      // Callback form of decodeAudioData for the widest Safari support.
      .then(function (ab) { c.decodeAudioData(ab, function (dec) { buffers[sq] = dec; }, function () {}); })
      .catch(function () {}); // missing clip -> stays on the fallback voice
  }

  function preload() {
    if (preloadStarted) return;
    preloadStarted = true;
    SQUARES.forEach(loadOne);
  }

  function playClip(sq, onDone) {
    var c = audioCtx();
    var b = buffers[sq];
    if (!c || !b) return false;
    try {
      if (c.state !== "running") c.resume();
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.onended = function () { if (current === s) current = null; if (onDone) onDone(); };
      current = s;
      s.start(0);
      return true;
    } catch (e) { return false; }
  }

  // ---- fallback: browser speechSynthesis ----------------------------------
  var synth = window.speechSynthesis || null;
  function ttsOK() { return !!synth && typeof window.SpeechSynthesisUtterance !== "undefined"; }

  function speak(text, onDone) {
    if (!ttsOK()) { if (onDone) onDone(); return false; }
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      if (onDone) { u.onend = onDone; u.onerror = onDone; }
      synth.speak(u);
      return true;
    } catch (e) { if (onDone) onDone(); return false; }
  }

  function sentence(square, color) {
    var sq = String(square || "").toLowerCase();
    var f = sq.charAt(0);
    var word = COLOR_WORD[color] || color || "";
    return (SAY_LETTER[f] || f) + " " + sq.charAt(1) + " is " + word; // e.g. "ay 1 is white"
  }

  function cancel() {
    if (current) { try { current.stop(); } catch (e) {} current = null; }
    if (ttsOK()) { try { synth.cancel(); } catch (e) {} }
  }

  function anyAudio() { return !!(window.AudioContext || window.webkitAudioContext) || ttsOK(); }

  // ---- iOS unlock ---------------------------------------------------------
  // Unlock the audio engine inside the first real user gesture (and again when
  // the toggle is switched on -- that tap counts), exactly like the beeps do.
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    var c = audioCtx();
    if (c) {
      try {
        if (c.state !== "running") c.resume();
        var b = c.createBuffer(1, 1, 22050);
        var s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) {}
    }
    if (ttsOK()) { try { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch (e) {} }
  }
  document.addEventListener("pointerdown", warm, true);
  document.addEventListener("touchstart", warm, { passive: true, capture: true });

  // ---- the "Speak" toggle (mirrors game.js's "Auto" toggle) ---------------
  var toggle = document.createElement("div");
  toggle.style.cssText =
    "display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;user-select:none;";
  function render() {
    toggle.innerHTML =
      '<span>Speak</span><div style="width:34px;height:18px;background:' +
      (enabled ? "var(--accent-gold)" : "#555") +
      ';border-radius:9px;position:relative;transition:background .2s"><div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:' +
      (enabled ? "18px" : "2px") +
      ';transition:left .2s"></div></div>';
  }
  toggle.addEventListener("click", function () {
    enabled = !enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    render();
    if (enabled) { warm(); preload(); } // this tap unlocks iOS audio; start fetching clips
    else cancel();                      // turning off silences anything mid-word
  });

  function mount() {
    if (!document.body.classList.contains("game-color")) return; // color drill only
    if (!anyAudio()) return;                                     // no audio at all -> no toggle
    render();
    var nav = document.querySelector(".navigation-section");
    if (!nav) return;
    var autoToggle = null, kids = nav.children, i;
    for (i = 0; i < kids.length; i++) {
      if (kids[i].tagName === "DIV") { autoToggle = kids[i]; break; }
    }
    if (autoToggle) {
      var wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;align-items:center;gap:16px;";
      nav.insertBefore(wrap, autoToggle);
      wrap.appendChild(autoToggle);
      wrap.appendChild(toggle);
    } else {
      nav.appendChild(toggle);
    }
    var nextBtn = document.querySelector(".result-next");
    if (nextBtn) nextBtn.addEventListener("click", cancel); // manual advance silences the clip
    if (enabled) preload();
  }

  // ---- the hook game.js calls on a correct color answer -------------------
  function onColorCorrect(data, auto, nextBtn) {
    if (!enabled) return false;
    var sq = String(data.square || "").toLowerCase();
    var advanced = false;
    function go() { if (advanced) return; advanced = true; if (nextBtn) nextBtn.click(); }

    if (auto && nextBtn) nextBtn.style.display = "none";

    if (buffers[sq]) {
      // recorded clip (good voice)
      setTimeout(function () {
        var ok = playClip(sq, auto ? go : null);
        if (!ok && auto) go(); // couldn't play -> don't stall the loop
      }, LEAD_MS);
      if (auto) setTimeout(go, SAFETY_MS);
    } else {
      // fallback voice
      var text = sentence(data.square, data.correct_color);
      if (auto) { speak(text, go); setTimeout(go, SAFETY_MS); }
      else speak(text, null);
    }

    if (!auto && nextBtn) nextBtn.style.display = "";
    return true;
  }

  window.ChessSpeech = {
    supported: anyAudio,
    warm: warm,
    cancel: cancel,
    onColorCorrect: onColorCorrect
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
