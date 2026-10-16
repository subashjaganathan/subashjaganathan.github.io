/* Runs in <head> before first paint: decides whether the cinematic boot intro plays.
   Once per browser session, never under reduced motion, never if storage is blocked. */
(function () {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem("sj-booted")) return;
    document.documentElement.classList.add("booting");
  } catch (e) { /* storage unavailable: skip the intro */ }
})();
