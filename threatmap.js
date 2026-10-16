/* Live C2 threat map: replays the last 48 h of abuse.ch ThreatFox C2 sightings
   (assets/data/threatmap.json, refreshed by scripts/build_threatmap.py) on a dot-matrix world map.
   2D canvas so it also runs on phones; animated from cinema.js's single rAF loop. */

const PALETTE = ["#ff2e88", "#ffb000", "#22d3ee", "#9d7bff", "#39ff88", "#ff6a3d", "#f472f6", "#facc15", "#7c8aa5"];
const HOME = { lat: 11.0168, lon: 76.9558, label: "CBE · ANALYST NODE" };
const LOOP_S = 90;         // the 48 h window replays in ninety seconds
const FEED_ROWS = 6;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
};
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const label = (name) => (name === "Unknown" ? "Unattributed" : name);
const ago = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 60 ? m + "m ago" : Math.round(m / 60) + "h ago";
};

export async function initThreatMap({ reduced }) {
  const section = document.getElementById("threat-map");
  const stage = document.getElementById("tmStage");
  const canvas = document.getElementById("tmCanvas");
  if (!section || !stage || !canvas) return null;

  let data, dots;
  try {
    const [a, b] = await Promise.all([
      fetch("assets/data/threatmap.json", { cache: "no-cache" }),
      fetch("assets/data/world-dots.json")
    ]);
    if (!a.ok || !b.ok) throw new Error("feed unavailable");
    [data, dots] = await Promise.all([a.json(), b.json()]);
  } catch (e) {
    section.classList.add("tm-offline");
    return null;
  }

  // ---- side panel: legend, counters, freshness ----
  const gen = Date.parse(data.generated);
  const maxFam = Math.max.apply(null, data.families.map((f) => f[1]));
  const legend = document.getElementById("tmLegend");
  data.families.forEach(([name, n], i) => {
    const li = document.createElement("li");
    li.style.setProperty("--c", PALETTE[Math.min(i, PALETTE.length - 1)]);
    li.innerHTML = '<i></i><span></span><b></b><div class="bar"><span></span></div>';
    li.children[1].textContent = label(name);
    li.children[2].textContent = n;
    li.querySelector(".bar span").style.width = Math.round((n / maxFam) * 100) + "%";
    legend.append(li);
  });
  const counters = [["tmC2", data.totals.c2], ["tmCountries", data.totals.countries], ["tmFamilies", data.totals.families]]
    .map(([id, v]) => ({ el: document.getElementById(id), v }));
  const setCounts = (k) => counters.forEach((c) => { c.el.textContent = Math.round(c.v * k).toLocaleString(); });
  const updated = document.getElementById("tmUpdated");
  const clock = document.getElementById("tmClock");
  const showUpdated = () => {
    const s = "updated " + ago(Date.now() - gen) + " · " + data.windowHours + "h window";
    if (updated.textContent !== s) updated.textContent = s;
  };
  showUpdated();

  // ---- events in time order ----
  const ev = data.events.map(([sAgo, ci, fi, ip, port], k) => ({
    t: gen - sAgo * 1000, ci, fi, ip, port,
    jx: Math.sin(k * 12.9898) * 1.1, jy: Math.cos(k * 78.233) * 0.9 // stable jitter, degrees
  }));
  const t0 = ev.length ? ev[0].t : gen - data.windowHours * 3600e3;
  const span = Math.max(1, gen - t0);

  // ---- canvas + projection ----
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d");
  const bits = Uint8Array.from(atob(dots.bits), (c) => c.charCodeAt(0));
  const spanLat = dots.h * dots.step;
  let W = 0, H = 0, dpr = 1, k = 1, cPos = [], home = [0, 0]; // k: marker scale vs. a 1100px-wide map
  const proj = (lat, lon) => [((lon + 180) / 360) * W, ((dots.lat0 - lat) / spanLat) * H];

  const sprites = new Map();
  const glow = (hex) => {
    if (!sprites.has(hex)) {
      const s = document.createElement("canvas");
      s.width = s.height = 64;
      const g = s.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(hex, 1));
      gr.addColorStop(0.18, rgba(hex, 0.75));
      gr.addColorStop(0.5, rgba(hex, 0.18));
      gr.addColorStop(1, rgba(hex, 0));
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      sprites.set(hex, s);
    }
    return sprites.get(hex);
  };

  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = base.width = Math.max(1, Math.round(stage.clientWidth * dpr));
    H = canvas.height = base.height = Math.max(1, Math.round(stage.clientHeight * dpr));
    k = Math.min(1, Math.max(0.4, stage.clientWidth / 1100));
    bctx.clearRect(0, 0, W, H);
    // graticule
    bctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
    bctx.lineWidth = dpr;
    for (let lon = -150; lon <= 150; lon += 30) { const x = proj(0, lon)[0]; bctx.beginPath(); bctx.moveTo(x, 0); bctx.lineTo(x, H); bctx.stroke(); }
    for (let lat = 60; lat >= -40; lat -= 30) { const y = proj(lat, 0)[1]; bctx.beginPath(); bctx.moveTo(0, y); bctx.lineTo(W, y); bctx.stroke(); }
    // land dot matrix
    const cw = W / dots.w, ch = H / dots.h, r = Math.min(cw, ch) * 0.3;
    bctx.fillStyle = "rgba(120, 170, 215, 0.3)";
    for (let row = 0; row < dots.h; row++) {
      for (let col = 0; col < dots.w; col++) {
        const k = row * dots.w + col;
        if ((bits[k >> 3] >> (k & 7)) & 1) {
          bctx.beginPath();
          bctx.arc((col + 0.5) * cw, (row + 0.5) * ch, r, 0, Math.PI * 2);
          bctx.fill();
        }
      }
    }
    cPos = data.countries.map(([cc, name, lat, lon, n, fi], i) => {
      const [x, y] = proj(lat, lon);
      return { x, y, n, color: PALETTE[Math.min(fi, PALETTE.length - 1)], r: (5 + Math.sqrt(n) * 2.6) * dpr * k, seed: i * 1.7 };
    });
    home = proj(HOME.lat, HOME.lon);
  };

  // ---- animation state ----
  const arcs = [], rings = [];
  let elapsed = 0, cursor = 0, lastRt = -Infinity, uiT = 0, countK = 0, active = false;
  const feed = document.getElementById("tmFeed");
  let pending = null;

  const spawn = (e) => {
    const c = data.countries[e.ci];
    const [x0, y0] = proj(c[2] + e.jy, c[3] + e.jx);
    const [x1, y1] = home;
    const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
    const color = PALETTE[Math.min(e.fi, PALETTE.length - 1)];
    arcs.push({ x0, y0, x1, y1, cx: (x0 + x1) / 2 - dy * 0.12, cy: (y0 + y1) / 2 - dist * 0.32, color,
      born: elapsed, dur: 1.1 + dist / (W || 1) * 1.6, hit: false });
    rings.push({ x: x0, y: y0, color, born: elapsed, dur: 1.3, max: 16 * dpr * k });
    if (arcs.length > 70) arcs.shift();
    pending = e;
  };

  const pushFeed = (e) => {
    const li = document.createElement("li");
    li.style.setProperty("--c", PALETTE[Math.min(e.fi, PALETTE.length - 1)]);
    const d = new Date(e.t);
    const time = document.createElement("span");
    time.textContent = d.toISOString().slice(11, 16);
    const fam = document.createElement("em");
    fam.textContent = label(e.fi < data.families.length ? data.families[e.fi][0] : "Other");
    const cc = document.createElement("span");
    cc.textContent = data.countries[e.ci][0];
    const ip = document.createElement("span");
    ip.className = "ip";
    ip.textContent = e.ip + ":" + e.port;
    li.append(time, fam, cc, ip);
    feed.prepend(li);
    while (feed.children.length > FEED_ROWS) feed.lastChild.remove();
  };

  const bez = (a, u) => {
    const v = 1 - u;
    return [v * v * a.x0 + 2 * v * u * a.cx + u * u * a.x1, v * v * a.y0 + 2 * v * u * a.cy + u * u * a.y1];
  };

  const draw = (t) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = "lighter";

    // radar sweep
    const sx = ((t / 10) % 1) * W * 1.2 - W * 0.1;
    const sw = ctx.createLinearGradient(sx - 90 * dpr, 0, sx, 0);
    sw.addColorStop(0, "rgba(34, 211, 238, 0)");
    sw.addColorStop(1, "rgba(34, 211, 238, 0.07)");
    ctx.fillStyle = sw;
    ctx.fillRect(sx - 90 * dpr, 0, 90 * dpr, H);

    // country heat: size by C2 count, colour by dominant family
    cPos.forEach((c) => {
      const p = 0.82 + 0.18 * Math.sin(t * 1.7 + c.seed);
      const r = c.r * p;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(glow(c.color), c.x - r, c.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      const cs = 6 * dpr * Math.max(k, 0.6);
      ctx.drawImage(glow("#ffffff"), c.x - cs / 2, c.y - cs / 2, cs, cs);
    });

    // arcs with travelling heads
    ctx.lineCap = "round";
    ctx.lineWidth = 1.6 * dpr;
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      const u = (elapsed - a.born) / a.dur;
      if (u > 1.5) { arcs.splice(i, 1); continue; }
      const head = easeInOut(Math.min(u, 1));
      const tail = Math.max(0, head - 0.34);
      const fade = u > 1 ? 1 - (u - 1) / 0.5 : 1;
      const N = 22;
      let prev = bez(a, tail);
      for (let k = 1; k <= N; k++) {
        const pt = bez(a, tail + (head - tail) * (k / N));
        ctx.strokeStyle = rgba(a.color, (k / N) * 0.95 * fade);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
        prev = pt;
      }
      if (u <= 1) {
        const s = 16 * dpr * k;
        ctx.drawImage(glow(a.color), prev[0] - s / 2, prev[1] - s / 2, s, s);
      } else if (!a.hit) {
        a.hit = true;
        rings.push({ x: a.x1, y: a.y1, color: a.color, born: elapsed, dur: 0.9, max: 22 * dpr * k });
      }
    }

    // impact / origin rings
    ctx.lineWidth = 1.5 * dpr;
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      const u = (elapsed - g.born) / g.dur;
      if (u >= 1) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(g.color, 1 - u);
      ctx.beginPath(); ctx.arc(g.x, g.y, 2 * dpr + easeOutExpo(u) * g.max, 0, Math.PI * 2); ctx.stroke();
    }

    // analyst node
    const hp = (1 + 0.25 * Math.sin(t * 3)) * k;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(glow("#22d3ee"), home[0] - 14 * dpr * hp, home[1] - 14 * dpr * hp, 28 * dpr * hp, 28 * dpr * hp);
    ctx.drawImage(glow("#ffffff"), home[0] - 4 * dpr * k, home[1] - 4 * dpr * k, 8 * dpr * k, 8 * dpr * k);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(205, 240, 255, 0.85)";
    ctx.font = "500 " + Math.round(10 * dpr * Math.max(k, 0.8)) + "px 'JetBrains Mono', monospace";
    // keep the label inside the map: flip it to the left of the node when it would overflow
    const lw = ctx.measureText(HOME.label).width, gap = 12 * dpr * k;
    const lx = home[0] + gap + lw > W - 8 * dpr ? home[0] - gap - lw : home[0] + gap;
    ctx.fillText(HOME.label, lx, home[1] + 18 * dpr * Math.max(k, 0.7));
  };

  const staticFrame = () => {
    elapsed = 0;
    draw(0);
    ev.slice(-FEED_ROWS).forEach(pushFeed);
    setCounts(1);
    clock.textContent = "last 48 hours";
  };

  layout();
  if (window.ResizeObserver) {
    let rt = 0;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (reduced) draw(0); }, 120); }).observe(stage);
  }

  if (reduced) { staticFrame(); return null; }

  ev.slice(-FEED_ROWS).forEach(pushFeed);
  new IntersectionObserver((entries) => { active = entries[0].isIntersecting; }, { rootMargin: "120px" }).observe(stage);

  return {
    update(dt, t) {
      if (!active) return;
      elapsed += dt;
      if (countK < 1) { countK = Math.min(1, countK + dt / 1.6); setCounts(easeOutExpo(countK)); }

      const rt = t0 + ((elapsed % LOOP_S) / LOOP_S) * span;
      if (rt < lastRt) cursor = 0; // replay looped
      while (cursor < ev.length && ev[cursor].t <= rt) spawn(ev[cursor++]);
      lastRt = rt;
      draw(t);

      uiT += dt;
      if (uiT > 0.35) {
        uiT = 0;
        if (pending) { pushFeed(pending); pending = null; }
        const d = new Date(rt);
        clock.textContent = "replay · " + String(d.getUTCDate()).padStart(2, "0") + " " + MONTHS[d.getUTCMonth()] + " " +
          d.toISOString().slice(11, 16) + " utc";
        showUpdated();
      }
    }
  };
}
