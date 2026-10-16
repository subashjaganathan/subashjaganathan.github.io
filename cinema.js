/* Subash Jaganathan - cinematic layer: boot intro, WebGL threat globe, scroll choreography.
   ES module, deferred. three.js r169 is vendored locally because the CSP is script-src 'self'.
   Everything animates off one requestAnimationFrame loop; reduced motion gets a static page. */

const root = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/* ---------- 1. Boot intro (once per session, skippable) ---------- */
async function runBoot(onOpen) {
  const boot = document.getElementById("boot");
  if (!root.classList.contains("booting") || !boot) return false;
  try { sessionStorage.setItem("sj-booted", "1"); } catch (e) { /* ignore */ }

  let skipped = document.hidden;
  const skip = () => { skipped = true; };
  const events = ["keydown", "pointerdown", "wheel", "touchstart"];
  events.forEach((e) => window.addEventListener(e, skip, { passive: true }));

  const lines = [
    ["OK", "Establishing secure session (TLS 1.3)"],
    ["OK", "Loading DFIR toolkit modules"],
    ["OK", "Mounting evidence volume - read-only"],
    ["OK", "Correlating SOC telemetry - 2.1M events"],
    ["WARN", "Beacon to unknown host - initiating hunt"],
    ["OK", "Threat isolated - chain of custody preserved"]
  ];
  const log = document.getElementById("bootLog");
  for (const [tag, text] of lines) {
    if (skipped) break;
    const row = document.createElement("div");
    row.className = "boot-line";
    const t = document.createElement("span");
    t.className = "boot-tag " + (tag === "WARN" ? "warn" : "ok");
    t.textContent = tag === "WARN" ? "[ WARN ]" : "[  OK  ]";
    const msg = document.createElement("span");
    row.append(t, msg);
    log.append(row);
    for (const ch of text) {
      if (skipped) break;
      msg.textContent += ch;
      await sleep(4 + Math.random() * 5);
    }
    msg.textContent = text;
    await sleep(skipped ? 0 : 60);
  }

  if (!skipped) {
    boot.classList.add("name-in");
    for (let i = 0; i < 18 && !skipped; i++) await sleep(50);
  }
  boot.classList.add("exit");
  onOpen();
  await sleep(1100);
  events.forEach((e) => window.removeEventListener(e, skip));
  root.classList.remove("booting");
  boot.remove();
  return true;
}

/* Re-run the hero terminal's line-by-line boot so it plays after the curtains open. */
function replayHeroTerminal() {
  const lines = Array.prototype.slice.call(document.querySelectorAll("#termBody p"));
  lines.forEach((p) => { p.style.opacity = "0"; p.style.transform = "translateY(4px)"; });
  lines.forEach((p, i) => setTimeout(() => { p.style.opacity = "1"; p.style.transform = "none"; }, 450 + i * 210));
}

/* ---------- 2. Staggered reveals ---------- */
function stagger() {
  const groups = document.querySelectorAll(
    ".hero-content, .skills-grid, .proj-grid, .impact-cards, .certs-grid, .stats-grid, .vol-grid, .timeline, .about-side, .edu-row, .about-text"
  );
  groups.forEach((g) => {
    let i = 0;
    Array.prototype.forEach.call(g.children, (el) => {
      if (!el.classList.contains("reveal")) return;
      el.style.setProperty("--rd", Math.min(i * 70, 490) + "ms");
      i++;
      // once revealed, drop the delay so hover transitions stay instant
      el.addEventListener("transitionend", () => el.style.setProperty("--rd", "0ms"), { once: true });
    });
  });
}

/* ---------- 3. WebGL threat globe ---------- */
const DEG = Math.PI / 180;
const HOME = [11.0168, 76.9558]; // Coimbatore
const CITY = {
  london: [51.5, -0.13], newyork: [40.71, -74.0], frankfurt: [50.11, 8.68], singapore: [1.35, 103.82],
  dubai: [25.2, 55.27], tokyo: [35.68, 139.69], sydney: [-33.87, 151.21], saopaulo: [-23.55, -46.63],
  johannesburg: [-26.2, 28.05], sanfrancisco: [37.77, -122.42], moscow: [55.76, 37.62], seoul: [37.57, 126.98]
};
// inbound arcs converge on home; a few lateral arcs for texture
const ARCS = [
  ["london", "home"], ["newyork", "home"], ["frankfurt", "home"], ["singapore", "home"], ["dubai", "home"],
  ["tokyo", "home"], ["saopaulo", "home"], ["moscow", "home"], ["sanfrancisco", "home"],
  ["london", "newyork"], ["frankfurt", "singapore"], ["tokyo", "sydney"], ["johannesburg", "dubai"], ["seoul", "sanfrancisco"]
];
const ARC_RATE = 0.11; // pulse cycles per second (scaled per arc)

const COLORSPACE = "#include <colorspace_fragment>";
const FACING_VS = `
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  float facing = dot(n, normalize(-mv.xyz));`;

async function initGlobe(state) {
  if (reduced || window.innerWidth < 900 || (navigator.hardwareConcurrency || 4) <= 2) return null;
  const canvas = document.getElementById("cinema-bg");
  if (!canvas) return null;

  let THREE, renderer;
  try {
    THREE = await import("./assets/vendor/three.module.min.js");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null; // no WebGL: the 2D constellation in script.js stays on
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  const CAM_Z = 4.6;
  camera.position.set(0, 0, CAM_Z);

  const uTime = { value: 0 };
  const uFade = { value: 0 };
  const uArcIn = { value: 0 };
  const uPixelRatio = { value: renderer.getPixelRatio() };
  const col = (hex) => ({ value: new THREE.Color(hex) });
  const owned = [];
  const track = (obj) => { owned.push(obj.geometry, obj.material); return obj; };

  const globe = new THREE.Group();
  const spin = new THREE.Group(); // rotates; globe group carries position + scale
  globe.add(spin);
  scene.add(globe);

  const ll = (lat, lon, r) => new THREE.Vector3(
    Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG)
  ).multiplyScalar(r);

  // depth-only occluder: hides the far hemisphere of every line/point layer
  const occluder = track(new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 48, 32),
    new THREE.ShaderMaterial({
      vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }",
      colorWrite: false
    })
  ));
  occluder.renderOrder = -1;
  spin.add(occluder);

  // dot sphere (Fibonacci lattice)
  const N = 2600;
  const dotPos = new Float32Array(N * 3);
  const dotSeed = new Float32Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    dotPos[i * 3] = Math.cos(golden * i) * r;
    dotPos[i * 3 + 1] = y;
    dotPos[i * 3 + 2] = Math.sin(golden * i) * r;
    dotSeed[i] = Math.random();
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
  dotGeo.setAttribute("aSeed", new THREE.BufferAttribute(dotSeed, 1));
  spin.add(track(new THREE.Points(dotGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uFade, uPixelRatio, uColor: col("#22e58c"), uRim: col("#38bdf8") },
    vertexShader: `
      uniform float uTime; uniform float uPixelRatio;
      attribute float aSeed;
      varying float vFacing; varying float vTw;
      void main() {${FACING_VS}
        vFacing = facing;
        vTw = 0.65 + 0.35 * sin(uTime * 1.2 + aSeed * 6.2831);
        gl_PointSize = 8.0 * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor; uniform vec3 uRim; uniform float uFade;
      varying float vFacing; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d);
        float rim = pow(1.0 - clamp(vFacing, 0.0, 1.0), 2.4);
        vec3 c = mix(uColor, uRim, rim);
        gl_FragColor = vec4(c, a * vTw * (0.5 + 0.8 * rim) * uFade);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }))));

  // graticule
  const grat = [];
  const seg = (a, b) => { grat.push(a.x, a.y, a.z, b.x, b.y, b.z); };
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = 0; lon < 360; lon += 4) seg(ll(lat, lon, 1.001), ll(lat, lon + 4, 1.001));
  for (let lon = 0; lon < 360; lon += 30) for (let lat = -88; lat < 88; lat += 4) seg(ll(lat, lon, 1.001), ll(lat + 4, lon, 1.001));
  const gratGeo = new THREE.BufferGeometry();
  gratGeo.setAttribute("position", new THREE.Float32BufferAttribute(grat, 3));
  spin.add(track(new THREE.LineSegments(gratGeo, new THREE.ShaderMaterial({
    uniforms: { uFade, uColor: col("#22e58c") },
    vertexShader: `varying float vFacing; void main() {${FACING_VS} vFacing = facing; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor; uniform float uFade; varying float vFacing;
      void main() {
        float rim = pow(1.0 - clamp(vFacing, 0.0, 1.0), 3.0);
        gl_FragColor = vec4(uColor, (0.08 + 0.18 * rim) * uFade);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }))));

  // atmosphere halo: back faces of a larger sphere, the occluder clips its centre
  const halo = track(new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uFade, uColor: col("#22e58c"), uColor2: col("#38bdf8") },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor; uniform vec3 uColor2; uniform float uFade;
      varying vec3 vN; varying vec3 vV;
      void main() {
        // d: 0 at the halo's outer edge, ~0.45 at the globe limb; light hugs the limb and fades outward
        float d = clamp(-dot(vN, vV), 0.0, 1.0);
        float g = pow(smoothstep(0.0, 0.45, d), 3.0);
        gl_FragColor = vec4(mix(uColor2, uColor, g), g * 0.2 * uFade);
        ${COLORSPACE}
      }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  })));
  globe.add(halo);

  // attack arcs: one LineSegments draw call, pulses travel in the fragment shader
  const slerp = (a, b, t) => {
    const ang = a.angleTo(b), s = Math.sin(ang);
    if (s < 1e-5) return a.clone();
    return a.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).add(b.clone().multiplyScalar(Math.sin(t * ang) / s));
  };
  const point = (key) => (key === "home" ? ll(HOME[0], HOME[1], 1) : ll(CITY[key][0], CITY[key][1], 1));
  const SEGS = 72;
  const aPos = [], aT = [], aSeed = [], aSpeed = [];
  const nodes = new Map(); // key -> {kind, seed, speed}
  nodes.set("home", { kind: 1, seed: 0, speed: 1 });
  const homeArcs = [];
  ARCS.forEach(([from, to], idx) => {
    const a = point(from), b = point(to);
    const lift = 0.06 + a.angleTo(b) * 0.2;
    const seed = (idx * 0.618) % 1, speed = 0.8 + ((idx * 0.37) % 1) * 0.5;
    let prev = null;
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const p = slerp(a, b, t).multiplyScalar(1 + lift * Math.sin(Math.PI * t));
      if (prev) {
        aPos.push(prev.p.x, prev.p.y, prev.p.z, p.x, p.y, p.z);
        aT.push(prev.t, t);
        aSeed.push(seed, seed); aSpeed.push(speed, speed);
      }
      prev = { p, t };
    }
    if (!nodes.has(from)) nodes.set(from, { kind: 0, seed, speed });
    if (to === "home") homeArcs.push({ seed, speed });
    else nodes.set(to, { kind: 2, seed, speed });
  });
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.Float32BufferAttribute(aPos, 3));
  arcGeo.setAttribute("aT", new THREE.Float32BufferAttribute(aT, 1));
  arcGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(aSeed, 1));
  arcGeo.setAttribute("aSpeed", new THREE.Float32BufferAttribute(aSpeed, 1));
  spin.add(track(new THREE.LineSegments(arcGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uFade, uArcIn, uColA: col("#22e58c"), uColB: col("#38bdf8"), uRate: { value: ARC_RATE } },
    vertexShader: `
      uniform float uTime; uniform float uRate;
      attribute float aT; attribute float aSeed; attribute float aSpeed;
      varying float vT; varying float vHead;
      void main() {
        vT = aT;
        vHead = fract(uTime * uRate * aSpeed + aSeed) * 1.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColA; uniform vec3 uColB; uniform float uFade; uniform float uArcIn;
      varying float vT; varying float vHead;
      void main() {
        float d = vHead - vT;
        float trail = step(0.0, d) * (1.0 - smoothstep(0.0, 0.3, d));
        float head = smoothstep(0.035, 0.0, abs(d));
        vec3 c = mix(mix(uColA, uColB, vT), vec3(1.0), head * 0.55);
        gl_FragColor = vec4(c, (0.06 + trail * 0.8 + head) * uFade * uArcIn);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }))));

  // nodes: city dots, destination impact rings synced to arrival, pulsing home beacon
  const nPos = [], nSeed = [], nSpeed = [], nKind = [];
  nodes.forEach((n, key) => {
    const p = point(key).multiplyScalar(1.004);
    nPos.push(p.x, p.y, p.z); nSeed.push(n.seed); nSpeed.push(n.speed); nKind.push(n.kind);
  });
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nPos, 3));
  nodeGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(nSeed, 1));
  nodeGeo.setAttribute("aSpeed", new THREE.Float32BufferAttribute(nSpeed, 1));
  nodeGeo.setAttribute("aKind", new THREE.Float32BufferAttribute(nKind, 1));
  spin.add(track(new THREE.Points(nodeGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uFade, uArcIn, uPixelRatio, uRate: { value: ARC_RATE }, uColor: col("#22e58c"), uCore: col("#e8fff2") },
    vertexShader: `
      uniform float uTime; uniform float uPixelRatio; uniform float uRate;
      attribute float aSeed; attribute float aSpeed; attribute float aKind;
      varying float vPhase; varying float vKind;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vKind = aKind;
        vPhase = aKind > 1.5 ? fract(uTime * uRate * aSpeed + aSeed) * 1.4 : fract(uTime * 0.45);
        gl_PointSize = (aKind > 0.5 ? 70.0 : 16.0) * uPixelRatio / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor; uniform vec3 uCore; uniform float uFade; uniform float uArcIn;
      varying float vPhase; varying float vKind;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a; vec3 c = uColor;
        if (vKind < 0.5) {
          a = smoothstep(0.9, 0.2, d) * 0.85;
        } else {
          float p = vKind > 1.5 ? clamp((vPhase - 1.0) / 0.4, 0.0, 1.0) : vPhase;
          float live = vKind > 1.5 ? step(1.0, vPhase) : 1.0;
          float ring = smoothstep(0.07, 0.0, abs(d - (0.15 + p * 0.85))) * (1.0 - p) * live;
          float core = smoothstep(vKind > 1.5 ? 0.12 : 0.2, 0.0, d);
          c = mix(uColor, uCore, core);
          a = core + ring * 0.9;
        }
        gl_FragColor = vec4(c, a * uFade * uArcIn);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  }))));

  // tilted orbit ring with a travelling satellite
  const ORB = 160;
  const oPos = [], oT = [];
  for (let i = 0; i < ORB; i++) {
    const a0 = (i / ORB) * Math.PI * 2, a1 = ((i + 1) / ORB) * Math.PI * 2;
    oPos.push(Math.cos(a0) * 1.42, 0, Math.sin(a0) * 1.42, Math.cos(a1) * 1.42, 0, Math.sin(a1) * 1.42);
    oT.push(i / ORB, (i + 1) / ORB);
  }
  const orbGeo = new THREE.BufferGeometry();
  orbGeo.setAttribute("position", new THREE.Float32BufferAttribute(oPos, 3));
  orbGeo.setAttribute("aT", new THREE.Float32BufferAttribute(oT, 1));
  const orbit = track(new THREE.LineSegments(orbGeo, new THREE.ShaderMaterial({
    uniforms: { uTime, uFade, uArcIn, uColor: col("#38bdf8") },
    vertexShader: `attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime; uniform vec3 uColor; uniform float uFade; uniform float uArcIn; varying float vT;
      void main() {
        float d = fract(fract(uTime * 0.035) - vT);
        float trail = 1.0 - smoothstep(0.0, 0.14, d);
        gl_FragColor = vec4(uColor, (0.05 + trail * 0.75) * uFade * uArcIn);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  })));
  orbit.rotation.set(1.18, 0, 0.32);
  globe.add(orbit);

  // depth dust (scene space, so it parallaxes against the globe)
  const DUST = 420;
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    // keep every particle well in front of the near plane: no oversized sprites
    dPos[i * 3] = (Math.random() * 2 - 1) * 9;
    dPos[i * 3 + 1] = (Math.random() * 2 - 1) * 6;
    dPos[i * 3 + 2] = -12 + Math.random() * 12.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const dust = track(new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: { uFade, uPixelRatio, uColor: col("#38bdf8") },
    vertexShader: `
      uniform float uPixelRatio;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 9.0 * uPixelRatio / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor; uniform float uFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * 0.22 * uFade);
        ${COLORSPACE}
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  })));
  scene.add(dust);

  // orient home towards the viewer, slightly left of centre, with a gentle tilt
  const home = ll(HOME[0], HOME[1], 1);
  const baseYaw = -Math.atan2(home.x, home.z) - 0.35;
  spin.rotation.x = 0.28;

  // layout: anchor the globe behind the hero terminal, drift right and dim on scroll
  const anchor = { hero: new THREE.Vector3(), deep: new THREE.Vector3(), r: 1 };
  const screenToWorld = (sx, sy) => {
    const v = new THREE.Vector3((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1, 0.5);
    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    v.unproject(camera).sub(camera.position).normalize();
    return camera.position.clone().add(v.multiplyScalar(-CAM_Z / v.z));
  };
  const layout = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPixelRatio.value = renderer.getPixelRatio();
    const term = document.querySelector(".hero-terminal");
    anchor.deep.copy(screenToWorld(w * 0.93, h * 0.55));
    anchor.hasHero = !!term;
    if (term) {
      const tr = term.getBoundingClientRect();
      const cx = tr.left + tr.width / 2, cy = tr.top + window.scrollY + tr.height / 2;
      anchor.hero.copy(screenToWorld(cx, Math.min(cy, h * 0.62)));
    } else {
      anchor.hero.copy(anchor.deep); // sub-pages: parked at the right edge
    }
    const worldPerPx = (2 * Math.tan((camera.fov / 2) * DEG) * CAM_Z) / h;
    anchor.r = (Math.min(h * 0.74, 620) / 2) * worldPerPx;
  };
  layout();
  let resizeTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });

  // pointer parallax (always damped)
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const look = new THREE.Vector3();
  let scrollP = 0;
  let intercepts = 0;

  root.classList.add("webgl");

  return {
    update(dt, t) {
      uTime.value = t;
      const target = clamp01(window.scrollY / (window.innerHeight * 1.15));
      scrollP = damp(scrollP, target, 4, dt);

      const intro = state.introAt == null ? 0 : easeOutExpo(clamp01((t - state.introAt) / 2.4));
      uArcIn.value = state.introAt == null ? 0 : clamp01((t - state.introAt - 0.8) / 1.4);
      const ease = scrollP * scrollP * (3 - 2 * scrollP);
      uFade.value = intro * (anchor.hasHero ? 1 - ease * 0.62 : 0.4) * (1 - 0.92 * (state.dim || 0));

      globe.position.lerpVectors(anchor.hero, anchor.deep, ease);
      globe.scale.setScalar(anchor.r * (0.84 + 0.16 * intro) * (1 + ease * 0.35));
      spin.rotation.y = baseYaw + t * 0.035 + (1 - intro) * 0.9 + ease * 0.6;

      mouse.sx = damp(mouse.sx, mouse.x, 3, dt);
      mouse.sy = damp(mouse.sy, mouse.y, 3, dt);
      camera.position.set(mouse.sx * 0.16, -mouse.sy * 0.1 + Math.sin(t * 0.3) * 0.04, CAM_Z);
      look.set(damp(look.x, mouse.sx * 0.05, 3, dt), damp(look.y, -mouse.sy * 0.03, 3, dt), 0);
      camera.lookAt(look);
      dust.rotation.y = t * 0.01;

      renderer.render(scene, camera);

      // HUD counter consistent with the shader: a pulse lands when fract(t*rate*speed+seed) crosses 1/1.4
      if (state.introAt != null) {
        const edge = 1 / 1.4;
        let n = 0;
        homeArcs.forEach((a) => {
          const k = ARC_RATE * a.speed;
          n += Math.floor(t * k + a.seed - edge) - Math.floor(state.introAt * k + a.seed - edge);
        });
        intercepts = n;
      }
    },
    stats() { return { calls: renderer.info.render.calls, intercepts }; },
    dispose() { owned.forEach((o) => o && o.dispose && o.dispose()); renderer.dispose(); }
  };
}

/* ---------- 4. Main loop: globe, hero parallax, timeline draw, HUD ---------- */
function startLoop(globe, state) {
  const heroCopy = document.querySelector(".hero-content");
  const heroTerm = document.querySelector(".hero-terminal");
  const timeline = document.querySelector(".timeline");
  const tmStage = document.getElementById("tmStage");
  const markers = timeline ? Array.prototype.slice.call(timeline.querySelectorAll(".tl-marker")) : [];
  const hudFps = document.getElementById("hudFps");
  const hudCalls = document.getElementById("hudCalls");
  const hudHits = document.getElementById("hudHits");

  // marker offsets inside the timeline are stable: measure on load/resize, not per frame
  let markerY = [];
  const measure = () => {
    if (!timeline) return;
    const top = timeline.getBoundingClientRect().top;
    markerY = markers.map((m) => m.getBoundingClientRect().top - top);
  };
  measure();
  setTimeout(measure, 1500);
  window.addEventListener("resize", measure);

  let last = performance.now(), start = last, raf = 0;
  let tl = 0, par = 0, frames = 0, fpsT = 0;

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - start) / 1000;
    if (state.ready && state.introAt == null) state.introAt = t;

    // reads first, then writes: no forced layout inside the frame
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const tr = timeline ? timeline.getBoundingClientRect() : null;
    const mr = tmStage ? tmStage.getBoundingClientRect() : null;
    // fade the globe out while the threat map is on screen so the two never compete
    const mapShown = mr ? clamp01((Math.min(mr.bottom, vh) - Math.max(mr.top, 0)) / (vh * 0.45)) : 0;
    state.dim = damp(state.dim || 0, mapShown, 5, dt);

    if (globe) globe.update(dt, t);
    if (state.tm) state.tm.update(dt, t);

    // hero: content drifts up and dims as it leaves (CSS `translate` composes with reveal transforms)
    if (sy < vh * 1.3 || par < vh * 1.3) {
      par = damp(par, Math.min(sy, vh * 1.3), 10, dt);
      const k = clamp01(par / (vh * 0.9));
      if (heroCopy) { heroCopy.style.translate = "0 " + (par * 0.14).toFixed(1) + "px"; heroCopy.style.opacity = (1 - k * 0.75).toFixed(3); }
      if (heroTerm) heroTerm.style.translate = "0 " + (par * 0.06).toFixed(1) + "px";
    }

    // experience timeline draws itself as it scrolls through the viewport
    if (tr) {
      tl = damp(tl, clamp01((vh * 0.62 - tr.top) / tr.height), 6, dt);
      timeline.style.setProperty("--tl", tl.toFixed(4));
      const reach = tr.height * tl + 4;
      markers.forEach((m, i) => m.classList.toggle("lit", markerY[i] < reach));
    }

    // HUD: real FPS and draw calls, sampled twice a second
    frames++; fpsT += dt;
    if (fpsT >= 0.5 && hudFps) {
      hudFps.textContent = String(Math.round(frames / fpsT)).padStart(2, "0");
      if (globe) {
        const s = globe.stats();
        if (hudCalls) hudCalls.textContent = String(s.calls);
        if (hudHits) hudHits.textContent = String(s.intercepts).padStart(4, "0");
      }
      frames = 0; fpsT = 0;
    }

    raf = requestAnimationFrame(frame);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  window.addEventListener("pagehide", () => { cancelAnimationFrame(raf); if (globe) globe.dispose(); });
  raf = requestAnimationFrame(frame);
}

/* ---------- boot order ---------- */
(async function main() {
  root.classList.add("cine");
  const state = { ready: false, introAt: null, tm: null };
  // live threat map (2D canvas, all devices); reduced motion gets a single static frame
  import("./threatmap.js?v=3")
    .then((m) => m.initThreatMap({ reduced }))
    .then((tm) => { state.tm = tm; })
    .catch(() => { /* map is optional */ });
  if (reduced) {
    const tlEl = document.querySelector(".timeline");
    if (tlEl) tlEl.style.setProperty("--tl", "1");
    return;
  }
  stagger();
  // ready flips when the curtains start to part (or at once with no intro);
  // the loop then stamps introAt so the globe's entrance is choreographed with the reveal
  initGlobe(state).then((globe) => startLoop(globe, state)); // three.js downloads while the intro plays
  const opened = () => { if (!state.ready) { state.ready = true; replayHeroTerminal(); } };
  const played = await runBoot(opened);
  if (!played) state.ready = true;
})();
