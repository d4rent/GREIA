
document.addEventListener("DOMContentLoaded", function () {
  document.body.addEventListener("click", async function (e) {
    if (e.target.classList.contains("save-agent-btn")) {
      const savedId = e.target.getAttribute("data-id");

      try {
        const res = await fetch("/api/save-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedId })
        });

        const data = await res.json();

        if (res.ok && data.status === "success") {
          e.target.textContent = "Saved ✓";
          e.target.disabled = true;
        } else if (data.status === "noTier") {
          window.location.href = "/pages/purchase-tier.html?tier=1";
        } else if (data.status === "quotaExceeded") {
          const nextTier = data.nextTier || 2;
          window.location.href = "/pages/purchase-tier.html?tier=" + nextTier;
        } else {
          alert(data.error || "Failed to save.");
        }
      } catch (err) {
        console.error(err);
        alert("Error saving agent.");
      }
    }
  });
});
