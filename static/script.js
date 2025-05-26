// static/script.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  form.addEventListener("submit", () => {
    document.querySelectorAll(".fade-in").forEach(el => {
      el.classList.remove("fade-in");
    });
  });
});
