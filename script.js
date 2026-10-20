/* Subash Jaganathan - portfolio interactions */

/* ---------- Animated counters ---------- */
(function () {
  var counters = document.querySelectorAll(".stat-num");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(el) { el.textContent = parseInt(el.getAttribute("data-count"), 10).toLocaleString(); }
  if (reduced || !("IntersectionObserver" in window)) { counters.forEach(show); return; }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      var target = parseInt(e.target.getAttribute("data-count"), 10);
      var dur = 1200, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        e.target.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  counters.forEach(function (c) { obs.observe(c); });
})();

/* ---------- Nav: scrolled state + mobile toggle ---------- */
(function () {
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function setExpanded(v) { toggle.setAttribute("aria-expanded", v ? "true" : "false"); }
  setExpanded(false);
  toggle.addEventListener("click", function () { setExpanded(links.classList.toggle("open")); });
  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { links.classList.remove("open"); setExpanded(false); });
  });
  // ESC closes the mobile menu and returns focus to the toggle
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && links.classList.contains("open")) {
      links.classList.remove("open"); setExpanded(false); toggle.focus();
    }
  });
})();

/* ---------- Email links: device-aware composer (assembled at runtime to defeat scrapers) ---------- */
(function () {
  // address stored reversed so it never appears in source as plain text
  var addr = "moc.liamg@8091jshsabuS".split("").reverse().join("");
  var isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent || "");

  document.querySelectorAll(".js-email").forEach(function (a) {
    var subject = a.getAttribute("data-subject");
    var bodyRaw = a.getAttribute("data-body");
    var body = bodyRaw ? bodyRaw.replace(/\\n/g, "\n") : null;

    if (isMobile) {
      // Phones reliably have a default mail app (Gmail / Apple Mail); mailto opens it natively
      var p = [];
      if (subject) p.push("subject=" + encodeURIComponent(subject));
      if (body) p.push("body=" + encodeURIComponent(body));
      a.href = "mailto:" + addr + (p.length ? "?" + p.join("&") : "");
      a.removeAttribute("target");
    } else {
      // Desktop: Gmail web compose opens in the browser, no desktop mail client required
      var qs = "to=" + encodeURIComponent(addr);
      if (subject) qs += "&su=" + encodeURIComponent(subject);
      if (body) qs += "&body=" + encodeURIComponent(body);
      a.href = "https://mail.google.com/mail/?view=cm&fs=1&" + qs;
      a.target = "_blank";
      a.rel = "noopener";
    }

    var label = a.querySelector(".email-text");
    if (label) label.textContent = addr; // reveal the address for copy/paste
  });
})();

/* ---------- Scroll-spy: highlight active nav link ---------- */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var links = [].slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (id) map[id] = a;
  });
  var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (!sections.length) return;

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (l) { l.classList.remove("active"); });
        if (map[e.target.id]) map[e.target.id].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
  sections.forEach(function (s) { obs.observe(s); });
})();

/* ---------- Footer year ---------- */
(function () {
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
