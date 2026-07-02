// Mini Chessboard Visualization with Move Arrows
class MiniChessboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.boardSize = this.getResponsiveBoardSize();
    this.squareSize = (this.boardSize - 6) / 8; // Account for 3px border on each side
    this.piece = null;
    this.startSquare = null;
    this.endSquare = null;
    this.path = [];

    this.init();
  }

  getResponsiveBoardSize() {
    // If the container exists, base the size on its actual rendered width.
    if (this.container && this.container.clientWidth > 0) {
      const availableWidth = this.container.clientWidth;
      // Find the largest multiple of 8 that fits.
      const adjustedSize = Math.floor(availableWidth / 8) * 8;
      // Use a sensible minimum size.
      return Math.max(adjustedSize, 160); // 160px is 20px per square
    }

    // Fallback to original logic if container isn't ready (e.g., during initial load).
    const screenWidth = window.innerWidth;
    let baseSize;
    if (screenWidth <= 360) baseSize = 220;
    else if (screenWidth <= 480) baseSize = 250;
    else if (screenWidth <= 768) baseSize = 280;
    else baseSize = 300;

    const adjustedInnerSize = Math.floor(baseSize / 8) * 8;
    return adjustedInnerSize;
  }

  init() {
    if (!this.container) return;

    // Get data from container attributes
    this.piece = this.container.dataset.piece;
    this.startSquare = this.container.dataset.start;
    this.endSquare = this.container.dataset.end;
    this.path = this.container.dataset.path
      ? this.container.dataset.path.split(",")
      : [];

    this.createBoard();
    this.drawPath();
  }

  createBoard() {
    // Create main board container
    const boardContainer = document.createElement("div");
    boardContainer.className = "mini-chessboard";
    boardContainer.style.cssText = `
            position: relative;
            width: ${this.boardSize}px;
            height: ${this.boardSize}px;
            margin: 0 auto;
            border: 3px solid #2c3e50;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
        `;

    // Create squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        const isLight = (row + col) % 2 === 0;
        const squareName = String.fromCharCode(97 + col) + (8 - row);

        square.className = "chess-square";
        square.dataset.square = squareName;
        square.style.cssText = `
                    position: absolute;
                    left: ${col * this.squareSize}px;
                    top: ${row * this.squareSize}px;
                    width: ${
                      col === 7
                        ? this.boardSize - 6 - col * this.squareSize
                        : this.squareSize
                    }px;
                    height: ${
                      row === 7
                        ? this.boardSize - 6 - row * this.squareSize
                        : this.squareSize
                    }px;
                    background: ${isLight ? "#f0d9b5" : "#b58863"};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                    color: ${isLight ? "#8b4513" : "#f0d9b5"};
                    transition: all 0.3s ease;
                `;

        // Add square label
        square.textContent = squareName;

        // Highlight special squares
        if (squareName === this.startSquare) {
          square.style.background = "#4CAF50";
          square.style.boxShadow = "inset 0 0 10px rgba(76, 175, 80, 0.7)";
        } else if (squareName === this.endSquare) {
          square.style.background = "#f44336";
          square.style.boxShadow = "inset 0 0 10px rgba(244, 67, 54, 0.7)";
        } else if (this.path.includes(squareName)) {
          square.style.background = "#FF9800";
          square.style.boxShadow = "inset 0 0 8px rgba(255, 152, 0, 0.7)";
        }

        boardContainer.appendChild(square);
      }
    }

    // Create SVG overlay for arrows
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;

    // Add arrow marker definition
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker"
    );

    // Make arrowhead size relative to the square size
    const markerWidth = Math.max(5, this.squareSize / 8); // e.g., ~9px on desktop, smaller on mobile
    const markerHeight = markerWidth * 0.7; // Maintain the aspect ratio

    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", markerWidth);
    marker.setAttribute("markerHeight", markerHeight);
    marker.setAttribute("refX", markerWidth - 1); // Adjust reference point
    marker.setAttribute("refY", markerHeight / 2);
    marker.setAttribute("orient", "auto");

    const polygon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    // Use dynamic points for the polygon shape
    polygon.setAttribute(
      "points",
      `0 0, ${markerWidth} ${markerHeight / 2}, 0 ${markerHeight}`
    );
    polygon.setAttribute("fill", "#2196F3");
    polygon.setAttribute("stroke", "#1976D2");
    polygon.setAttribute("stroke-width", "1");

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    boardContainer.appendChild(svg);
    this.svg = svg;

    this.container.appendChild(boardContainer);
  }

  squareToPixel(square) {
    const col = square.charCodeAt(0) - 97; // a-h to 0-7
    const row = 8 - parseInt(square[1]); // 8-1 to 0-7
    return {
      x: col * this.squareSize + this.squareSize / 2,
      y: row * this.squareSize + this.squareSize / 2,
    };
  }

  drawPath() {
    if (!this.svg || this.path.length < 2) return;

    // Add a dot at the start of the path for clarity
    const startPoint = this.squareToPixel(this.path[0]);
    const dot = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    dot.setAttribute("cx", startPoint.x);
    dot.setAttribute("cy", startPoint.y);
    dot.setAttribute("r", Math.max(3, this.squareSize / 12)); // CORRECTED: squareSize
    dot.setAttribute("fill", "#2196F3");
    dot.setAttribute("stroke", "#1976D2");
    dot.setAttribute("stroke-width", "1");
    dot.setAttribute("opacity", "0");

    const dotAnimate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "animate"
    );
    dotAnimate.setAttribute("attributeName", "opacity");
    dotAnimate.setAttribute("values", "0;1");
    dotAnimate.setAttribute("dur", "0.5s");
    dotAnimate.setAttribute("begin", "0s"); // Appear with the first arrow
    dotAnimate.setAttribute("fill", "freeze");

    dot.appendChild(dotAnimate);
    this.svg.appendChild(dot);

    // Draw arrows between consecutive squares in path
    for (let i = 0; i < this.path.length - 1; i++) {
      const from = this.squareToPixel(this.path[i]);
      const to = this.squareToPixel(this.path[i + 1]);

      // Create animated arrow
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", to.x);
      line.setAttribute("y2", to.y);
      line.setAttribute("stroke", "#2196F3");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("marker-end", "url(#arrowhead)");
      line.setAttribute("opacity", "0");

      // Add glow effect
      line.setAttribute("filter", "drop-shadow(0 0 4px #2196F3)");

      // Animate arrow appearance
      const animate = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "animate"
      );
      animate.setAttribute("attributeName", "opacity");
      animate.setAttribute("values", "0;1");
      animate.setAttribute("dur", "0.5s");
      animate.setAttribute("begin", `${i * 0.8}s`);
      animate.setAttribute("fill", "freeze");

      line.appendChild(animate);
      this.svg.appendChild(line);

      // Add move number
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", (from.x + to.x) / 2);
      text.setAttribute("y", (from.y + to.y) / 2 - 8);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "#ffffff");
      text.setAttribute("stroke", "#2c3e50");
      text.setAttribute("stroke-width", "1");
      text.textContent = i + 1;
      text.setAttribute("opacity", "0");

      const textAnimate = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "animate"
      );
      textAnimate.setAttribute("attributeName", "opacity");
      textAnimate.setAttribute("values", "0;1");
      textAnimate.setAttribute("dur", "0.3s");
      textAnimate.setAttribute("begin", `${i * 0.8 + 0.3}s`);
      textAnimate.setAttribute("fill", "freeze");

      text.appendChild(textAnimate);
      this.svg.appendChild(text);
    }
  }
}

// Initialize chessboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("chessboard-container");
  if (container) {
    new MiniChessboard("chessboard-container");
  }
});

// Add responsive behavior
window.addEventListener("resize", function () {
  const container = document.getElementById("chessboard-container");
  if (container) {
    container.innerHTML = "";
    new MiniChessboard("chessboard-container");
  }
});
