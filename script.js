/* Subash Jaganathan - DFIR Portfolio interactions */

/* ---------- Typewriter ---------- */
(function () {
  var roles = [
    "Digital Forensics & Incident Response",
    "SOC Operations & Detection Engineering",
    "Threat Hunting | MITRE ATT&CK",
    "Malware Analysis & Reverse Engineering",
    "Threat Intelligence & Dark Web Forensics",
    "Cybercrime Investigator | Cyber Forensic Expert",
    "AI Security | LLM Threat Modeling"
  ];
  var el = document.getElementById("typewriter");
  if (!el) return;
  var ri = 0, ci = 0, deleting = false;

  function tick() {
    var word = roles[ri];
    if (!deleting) {
      ci++;
      el.textContent = word.slice(0, ci);
      if (ci === word.length) { deleting = true; setTimeout(tick, 2100); return; }
      setTimeout(tick, 48 + Math.random() * 40);
    } else {
      ci--;
      el.textContent = word.slice(0, ci);
      if (ci === 0) { deleting = false; ri = (ri + 1) % roles.length; setTimeout(tick, 350); return; }
      setTimeout(tick, 24);
    }
  }
  tick();
})();

/* ---------- Matrix rain background ---------- */
(function () {
  var canvas = document.getElementById("matrix-bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var chars = "01アイウエオカキクケコ$#@&%<>/\\{}[]";
  var fontSize = 14, drops = [], cols = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / fontSize);
    drops = new Array(cols).fill(1).map(function () { return Math.floor(Math.random() * canvas.height / fontSize); });
  }
  resize();
  window.addEventListener("resize", resize);

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  setInterval(function () {
    if (document.hidden) return; // pause when tab is in background
    ctx.fillStyle = "rgba(6, 10, 18, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#22e58c";
    ctx.font = fontSize + "px monospace";
    for (var i = 0; i < drops.length; i++) {
      var ch = chars.charAt(Math.floor(Math.random() * chars.length));
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 70);
})();

/* ---------- Scroll reveal ---------- */
(function () {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });
})();

/* ---------- Animated counters ---------- */
(function () {
  var counters = document.querySelectorAll(".stat-num");
  var done = new WeakSet();
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || done.has(e.target)) return;
      done.add(e.target);
      var target = parseInt(e.target.getAttribute("data-count"), 10);
      var dur = 1600, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        e.target.textContent = Math.floor(eased * target).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  counters.forEach(function (c) { obs.observe(c); });
})();

/* ---------- Nav: scrolled state + mobile toggle ---------- */
(function () {
  var nav = document.getElementById("nav");
  window.addEventListener("scroll", function () {
    nav.classList.toggle("scrolled", window.scrollY > 30);
  }, { passive: true });

  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  toggle.addEventListener("click", function () { links.classList.toggle("open"); });
  links.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { links.classList.remove("open"); });
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

/* ---------- Scroll progress bar ---------- */
(function () {
  var bar = document.getElementById("scrollProgress");
  if (!bar) return;
  function update() {
    var h = document.documentElement;
    var scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    bar.style.width = Math.max(0, Math.min(1, scrolled)) * 100 + "%";
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* ---------- Scroll-spy: highlight active nav link ---------- */
(function () {
  var links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
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
document.getElementById("year").textContent = new Date().getFullYear();
