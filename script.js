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

/* ---------- Network constellation background (threat-infra mapping vibe) ---------- */
(function () {
  var canvas = document.getElementById("matrix-bg");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var nodes = [], W = 0, H = 0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LINK = 150; // px distance within which two nodes are linked

  function nodeCount() {
    return Math.max(22, Math.min(80, Math.floor((W * H) / 24000)));
  }

  function viewport() {
    return [
      window.innerWidth || document.documentElement.clientWidth || 0,
      window.innerHeight || document.documentElement.clientHeight || 0
    ];
  }

  function init() {
    var v = viewport();
    W = canvas.width = v[0];
    H = canvas.height = v[1];
    nodes = [];
    for (var i = 0; i < nodeCount(); i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // links
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x <= 0 || a.x >= W) a.vx *= -1;
      if (a.y <= 0 || a.y >= H) a.vy *= -1;
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK) {
          ctx.strokeStyle = "rgba(56, 189, 248, " + (0.16 * (1 - dist / LINK)) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    // nodes
    ctx.fillStyle = "rgba(34, 229, 140, 0.55)";
    for (var k = 0; k < nodes.length; k++) {
      ctx.beginPath();
      ctx.arc(nodes[k].x, nodes[k].y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    if (!W || !H || nodes.length === 0) init(); // self-heal if it started before layout
    if ((W && H) && !document.hidden) draw();
    requestAnimationFrame(loop);
  }

  init();
  window.addEventListener("resize", init);
  if (reduced) { draw(); return; } // static single frame, no animation
  loop();
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

/* ---------- "Decrypt" reveal on section titles ---------- */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!<>-_/\\#$%&*";

  function scramble(node, finalText) {
    var len = finalText.length, frame = 0;
    var timer = setInterval(function () {
      frame++;
      var locked = frame * 0.8; // chars that have settled, left to right
      var out = "";
      for (var i = 0; i < len; i++) {
        var ch = finalText.charAt(i);
        if (ch === " " || i < locked) out += ch;
        else out += GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      }
      node.nodeValue = out;
      if (locked >= len) { clearInterval(timer); node.nodeValue = finalText; }
    }, 30);
  }

  function lastTextNode(el) {
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      var node = lastTextNode(e.target);
      if (node) scramble(node, node.nodeValue);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".section-title").forEach(function (t) { io.observe(t); });
})();

/* ---------- Terminal boot sequence (hero IR panel) ---------- */
(function () {
  var body = document.getElementById("termBody");
  if (!body) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var lines = [].slice.call(body.querySelectorAll("p"));
  lines.forEach(function (p) {
    p.style.opacity = "0";
    p.style.transform = "translateY(4px)";
    p.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  });
  var i = 0;
  (function reveal() {
    if (i >= lines.length) return;
    lines[i].style.opacity = "1";
    lines[i].style.transform = "none";
    i++;
    setTimeout(reveal, 230);
  })();
})();

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
