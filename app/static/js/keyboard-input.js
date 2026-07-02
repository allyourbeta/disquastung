// Keyboard Input Handler for Chess Training Games
class KeyboardHandler {
  constructor() {
    this.isEnabled = true;
    this.gameType = this.detectGameType();
    this.init();
  }

  detectGameType() {
    const path = window.location.pathname;
    if (path.includes("knight_game")) return "knight";
    if (path.includes("bishop_game")) return "bishop";
    if (path.includes("color_game")) return "color";

    // Check for result pages or infer from content
    const title = document.title.toLowerCase();
    const bodyText = document.body.textContent.toLowerCase();

    if (title.includes("knight") || bodyText.includes("knight"))
      return "knight";
    if (title.includes("bishop") || bodyText.includes("bishop"))
      return "bishop";
    if (title.includes("color") || title.includes("square color"))
      return "color";

    // Check for result page with Continue Training link
    const continueLinks = document.querySelectorAll('a[href*="_game"]');
    if (continueLinks.length > 0) {
      const href = continueLinks[0].href;
      if (href.includes("knight_game")) return "knight";
      if (href.includes("bishop_game")) return "bishop";
      if (href.includes("color_game")) return "color";
    }

    return null;
  }

  init() {
    if (!this.gameType) return;

    document.addEventListener("keydown", (e) => this.handleKeyPress(e));

    // Add visual indicators for keyboard shortcuts
    this.addKeyboardHints();

    // Focus on document to ensure key events are captured
    document.body.setAttribute("tabindex", "0");
    document.body.focus();
  }

  handleKeyPress(event) {
    if (!this.isEnabled) return;

    // Prevent default browser shortcuts
    if (this.shouldPreventDefault(event)) {
      event.preventDefault();
    }

    const key = event.key.toLowerCase();

    switch (this.gameType) {
      case "knight":
        this.handleKnightKeys(key, event);
        break;
      case "bishop":
        this.handleBishopKeys(key, event);
        break;
      case "color":
        this.handleColorKeys(key, event);
        break;
    }
  }

  shouldPreventDefault(event) {
    const key = event.key.toLowerCase();
    const gameKeys = {
      knight: ["1", "2", "3", "4", "5", "6", "enter", " "],
      bishop: ["1", "2", "n", "enter", " "],
      color: ["w", "b", "l", "d", "enter", " "],
    };

    if (this.gameType && gameKeys[this.gameType].includes(key)) {
      return true;
    }

    return false;
  }

  handleKnightKeys(key, event) {
    const validNumbers = ["1", "2", "3", "4", "5", "6"];

    if (validNumbers.includes(key)) {
      this.submitAnswer("user_moves", key);
    } else if (key === "enter" || key === " ") {
      this.handleNavigationKey();
    }
  }

  handleBishopKeys(key, event) {
    let value = null;

    if (key === "1") value = "1";
    else if (key === "2") value = "2";
    else if (key === "n") value = "-1"; // N for "Not possible" or "N/A"
    else if (key === "enter" || key === " ") {
      this.handleNavigationKey();
      return;
    }

    if (value !== null) {
      this.submitAnswer("user_moves", value);
    }
  }

  handleColorKeys(key, event) {
    let value = null;

    if (key === "w" || key === "l") value = "light";
    else if (key === "b" || key === "d") value = "dark";
    else if (key === "enter" || key === " ") {
      this.handleNavigationKey();
      return;
    }

    if (value !== null) {
      this.submitAnswer("color", value);
    }
  }

  submitAnswer(fieldName, value) {
    // Find the form and submit with the answer
    const forms = document.querySelectorAll("form");
    const targetForm = Array.from(forms).find((form) =>
      form.querySelector(`[name="${fieldName}"]`)
    );

    if (targetForm) {
      // Create hidden input or find existing button
      const existingInput = targetForm.querySelector(
        `[name="${fieldName}"][value="${value}"]`
      );

      if (existingInput && existingInput.type === "submit") {
        // It's a submit button, click it
        this.highlightButton(existingInput);
        setTimeout(() => existingInput.click(), 100);
      } else {
        // Create hidden input and submit
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = fieldName;
        input.value = value;
        targetForm.appendChild(input);

        setTimeout(() => targetForm.submit(), 100);
      }
    }
  }

  highlightButton(button) {
    button.style.transform = "scale(1.1)";
    button.style.backgroundColor = "var(--accent-gold)";
    button.style.color = "var(--primary-dark)";

    setTimeout(() => {
      button.style.transform = "";
      button.style.backgroundColor = "";
      button.style.color = "";
    }, 200);
  }

  handleNavigationKey() {
    // Look for navigation links (Continue Training, Back to Menu, etc.)
    const navLinks = document.querySelectorAll(
      ".nav-link, .training-button, .game-button"
    );

    if (navLinks.length > 0) {
      // Focus on first nav link or click it
      const primaryLink =
        Array.from(navLinks).find(
          (link) =>
            link.textContent.includes("Continue") ||
            link.textContent.includes("Training") ||
            link.classList.contains("primary")
        ) || navLinks[0];

      if (primaryLink) {
        this.highlightButton(primaryLink);
        setTimeout(() => primaryLink.click(), 100);
      }
    } else {
      // Fallback: look for any link that goes back to a game
      const gameLinks = document.querySelectorAll('a[href*="_game"]');
      if (gameLinks.length > 0) {
        this.highlightButton(gameLinks[0]);
        setTimeout(() => gameLinks[0].click(), 100);
      }
    }
  }

  addKeyboardHints() {
    const hintStyle = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 12px;
            font-family: 'Inter', sans-serif;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

    const hint = document.createElement("div");
    hint.style.cssText = hintStyle;
    hint.id = "keyboard-hint";

    let hintText = "";
    switch (this.gameType) {
      case "knight":
        hintText = "⌨️ Keys: 1-6 for moves • Enter/Space to continue";
        break;
      case "bishop":
        hintText = "⌨️ Keys: 1, 2, N for moves • Enter/Space to continue";
        break;
      case "color":
        hintText =
          "⌨️ Keys: W/L for Light, B/D for Dark • Enter/Space to continue";
        break;
    }

    hint.textContent = hintText;
    document.body.appendChild(hint);

    // Show hint briefly on page load
    setTimeout(() => (hint.style.opacity = "0.8"), 500);
    setTimeout(() => (hint.style.opacity = "0"), 4000);

    // Show hint on any key press
    document.addEventListener("keydown", () => {
      hint.style.opacity = "0.8";
      clearTimeout(this.hintTimeout);
      this.hintTimeout = setTimeout(() => (hint.style.opacity = "0"), 3000);
    });
  }

  disable() {
    this.isEnabled = false;
  }

  enable() {
    this.isEnabled = true;
  }
}

// Initialize keyboard handler when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("_game")) {
    window.keyboardHandler = new KeyboardHandler();
  }
});
