const feedback = document.getElementById("copy-feedback");

for (const card of document.querySelectorAll(".copy-card")) {
  card.addEventListener("click", async () => {
    const value = card.getAttribute("data-copy");

    try {
      await navigator.clipboard.writeText(value);
      feedback.textContent = "Copied command to clipboard.";
    } catch {
      feedback.textContent = "Clipboard permission was blocked. Copy the command manually.";
    }
  });
}
