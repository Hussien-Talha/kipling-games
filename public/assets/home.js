// Games home page: the printed round turns over tile by tile, the word-length
// picker, and section entrances. The page works without any of this.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

// The finished round on the right turns over row by row, like a guess being checked.
const boardTiles = [...document.querySelectorAll(".board-art .b-tile")];
boardTiles.forEach((tile, i) => {
  const row = Math.floor(i / 5);
  const col = i % 5;
  tile.style.animationDelay = `${0.15 + row * 0.3 + col * 0.06}s`;
});

// Word-length picker: say how many words each length holds.
const WORDS = { 4: "four", 5: "five", 6: "six" };
const count = document.getElementById("pick-count");
for (const input of document.querySelectorAll('.pick input[name="length"]')) {
  input.addEventListener("change", () => {
    count.innerHTML = `<strong>${input.dataset.count}</strong> ${WORDS[input.value]}-letter words to find`;
  });
}

// Entrances: each section's parts rise in turn as the section arrives.
const groups = [
  ".strip-head h2", ".moments li",
  ".letter > *", ".stub", ".postcard-message > *", ".postcard-address > *",
];
const parts = groups.flatMap((sel) => [...document.querySelectorAll(sel)]);
if ("IntersectionObserver" in window && !reduced) {
  const seen = new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.style.transitionDelay = `${(n++) * 75}ms`;
      e.target.classList.add("in");
      seen.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  for (const p of parts) {
    p.classList.add("reveal");
    seen.observe(p);
  }
}
