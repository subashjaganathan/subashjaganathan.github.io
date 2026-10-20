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

/* ---------- Scroll entrance: fade content up as it enters the viewport ----------
   Only elements that start below the fold are hidden, so nothing on screen at
   load ever flickers; siblings in a grid get a short stagger. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  var sel = ".section-head, .about-text, .facts, .skill-card, .frameworks, .proj-card, .spotlight, .tl-item, " +
            ".stats-grid, .impact-card, .community-cta, .cert-group, .edu-card, .contact-box, .vol-card";
  var fold = window.innerHeight;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add("in");
      e.target.classList.remove("pre");
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  document.querySelectorAll(sel).forEach(function (el) {
    if (el.getBoundingClientRect().top < fold) return;
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms";
    el.classList.add("pre");
    io.observe(el);
  });
})();

/* ---------- Easter egg: Evidence Locker ----------
   Opens from the lock in the footer, the Konami code, typing "hunt", or five quick
   clicks on the SJ mark. The game itself (egg.js) only loads when first opened. */
(function () {
  var loading = false;
  function openEgg() {
    if (window.SJEgg) { window.SJEgg.open(); return; }
    if (loading) return;
    loading = true;
    var s = document.createElement("script");
    s.src = "egg.js?v=2";
    s.onload = function () { loading = false; if (window.SJEgg) window.SJEgg.open(); };
    s.onerror = function () { loading = false; };
    document.body.appendChild(s);
  }

  var trigger = document.getElementById("eggTrigger");
  if (trigger) trigger.addEventListener("click", openEgg);

  var mark = document.querySelector(".nav-mark");
  var clicks = [];
  if (mark) mark.addEventListener("click", function (e) {
    var now = Date.now();
    clicks = clicks.filter(function (t) { return now - t < 2000; });
    clicks.push(now);
    if (clicks.length >= 5) { e.preventDefault(); clicks = []; openEgg(); }
  });

  var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var pos = 0, typed = "";
  document.addEventListener("keydown", function (e) {
    if (document.documentElement.classList.contains("egg-open")) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
    if (pos === seq.length) { pos = 0; openEgg(); return; }
    if (k.length === 1) {
      typed = (typed + k).slice(-4);
      if (typed === "hunt") { typed = ""; openEgg(); }
    }
  });

  if (window.console && console.log) {
    console.log("%cEvidence Locker", "font-weight:700;font-size:14px;color:#0f62fe",
      "\nThere is a locked case file on this site. Type \"hunt\" anywhere on the page to try it.");
  }
})();

/* ---------- Footer year ---------- */
(function () {
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
