document.addEventListener("DOMContentLoaded", function () {
  // Use event delegation for dynamically added tooltips
  document.body.addEventListener("click", function (event) {
    const tooltipIcon = event.target.closest(".tooltip");

    if (tooltipIcon) {
      // Toggle the 'tooltip-visible' class on the clicked tooltip
      tooltipIcon.classList.toggle("tooltip-visible");

      // Close other tooltips
      document
        .querySelectorAll(".tooltip.tooltip-visible")
        .forEach(function (otherTooltip) {
          if (otherTooltip !== tooltipIcon) {
            otherTooltip.classList.remove("tooltip-visible");
          }
        });
    } else {
      // If clicking anywhere else on the body, close all tooltips
      document
        .querySelectorAll(".tooltip.tooltip-visible")
        .forEach(function (tooltip) {
          tooltip.classList.remove("tooltip-visible");
        });
    }
  });
});
