
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".form-container form");

  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = form.querySelector('input[name="email"]').value;
    const date = form.querySelector('input[name="date"]').value;
    const time = form.querySelector('input[name="time"]').value;

    const course = Array.from(document.querySelectorAll(".course-grid div"))
      .filter(el => el.classList.contains("selected"))
      .map(el => el.textContent.trim())[0];

    if (!course) {
      alert("Please select a course.");
      return;
    }

    try {
      const res = await fetch("/api/coachSignup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, date, time, course })
      });

      if (res.ok) {
        alert("Thank you! Your registration has been submitted.");
        form.reset();
        document.getElementById("popup").style.display = "none";
        document.getElementById("page-content").classList.remove("blurred");
      } else {
        alert("Failed to submit. Please try again.");
      }
    } catch (err) {
      alert("Error submitting the form.");
    }
  });

  // Course selection toggling
  document.querySelectorAll(".course-grid div").forEach(div => {
    div.addEventListener("click", () => {
      document.querySelectorAll(".course-grid div").forEach(d => d.classList.remove("selected"));
      div.classList.add("selected");
    });
  });
});
