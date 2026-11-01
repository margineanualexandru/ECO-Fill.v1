const progressBar = document.querySelector("#progress-bar");
const cursor = document.querySelector("#scroll-cursor");
const cursorCaption = document.querySelector(".cursor-caption");
const refillSlider = document.querySelector("#refills");
const refillOutput = document.querySelector("#refill-output");
const yearRefills = document.querySelector("#year-refills");
const avoided = document.querySelector("#avoided");
const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector("#main-nav");

document.querySelector("#year").textContent = new Date().getFullYear();

function updateScrollState() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${progress}%`;

  // Cursor illustration follows scroll position and turns into a bottle near the end.
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  cursor.classList.toggle("is-bottle", ratio > 0.78);
  cursorCaption.textContent = ratio > 0.78 ? "REFILL" : ratio > 0.4 ? "REUSE" : "GROW";
}
window.addEventListener("scroll", updateScrollState, { passive: true });
window.addEventListener("resize", updateScrollState);
updateScrollState();

function updateImpact() {
  const monthly = Number(refillSlider.value);
  refillOutput.value = monthly;
  refillOutput.textContent = monthly;
  yearRefills.textContent = monthly * 12;
  avoided.textContent = monthly * 12;
}
refillSlider.addEventListener("input", updateImpact);
updateImpact();

menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
});
mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

// Reveal the bottle when the closing section enters view as well as near the page end.
const closingSection = document.querySelector("#contact");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) cursor.classList.add("is-bottle");
      else if (window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) < 0.78) {
        cursor.classList.remove("is-bottle");
      }
    }
  }, { threshold: 0.25 });
  observer.observe(closingSection);
}
