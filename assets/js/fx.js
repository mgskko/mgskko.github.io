/* Study Note — 시각 효과 (3D 히어로, 카드 틸트). 외부 라이브러리 없음. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 1. 카드 3D 틸트 ---------- */
  function tilt(el, max, glare) {
    var raf = 0, rect = null;
    function reset() {
      el.style.transform = "";
      el.style.setProperty("--gx", "50%"); el.style.setProperty("--gy", "50%"); el.style.setProperty("--ga", "0");
      el.classList.remove("is-tilting");
    }
    el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); el.classList.add("is-tilting"); });
    el.addEventListener("pointermove", function (e) {
      if (!rect) rect = el.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * max).toFixed(2) + "deg) rotateY(" + ((x - 0.5) * max).toFixed(2) + "deg) translateZ(0)";
        if (glare) { el.style.setProperty("--gx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--gy", (y * 100).toFixed(1) + "%"); el.style.setProperty("--ga", "1"); }
      });
    });
    el.addEventListener("pointerleave", function () { cancelAnimationFrame(raf); rect = null; reset(); });
    window.addEventListener("scroll", function () { rect = null; }, { passive: true });
  }
  if (canHover && !reduce) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tilt]"), function (el) { tilt(el, 7, true); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-tilt-soft]"), function (el) { tilt(el, 3.5, false); });
  }

  /* ---------- 2. 3D 신경망 히어로 ---------- */
  var cv = document.querySelector("[data-hero3d]");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, running = false, visible = true, raf2 = 0;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var color = { blue: [49, 130, 246], dark: false };

  function readColor() {
    var cs = getComputedStyle(document.documentElement);
    var hex = (cs.getPropertyValue("--blue") || "#3182f6").trim();
    var m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (m) color.blue = [parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16)];
    var bg = (cs.getPropertyValue("--bg") || "#f2f4f6").trim();
    var b = /^#([0-9a-f]{6})$/i.exec(bg);
    color.dark = b ? (parseInt(b[1].substr(0, 2), 16) < 90) : false;
  }

  // 구 위에 점을 고르게 뿌리고(피보나치), 약간 흔든다
  var N = 84, nodes = [], edges = [], pulses = [];
  (function build() {
    var golden = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      var j = 0.82 + Math.random() * 0.34; // 반지름 흔들기: 안쪽에도 점이 생긴다
      nodes.push({ x: Math.cos(th) * r * j, y: y * j, z: Math.sin(th) * r * j, s: 0.6 + Math.random() * 0.9, ph: Math.random() * 6.28 });
    }
    for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
      var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
      if (dx * dx + dy * dy + dz * dz < 0.26) edges.push([a, b]);
    }
  })();

  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var ay = 0.6, ax = 0.25, t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
    ay += reduce ? 0 : 0.0032; // 천천히 자전
    var ry = ay + mouse.x * 0.7, rx = ax + mouse.y * 0.45;
    var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    var scale = Math.min(W, H) * (W > 700 ? 0.44 : 0.52), ox = W > 700 ? W * 0.72 : W * 0.5, oy = H * 0.5, f = 2.6;
    var c = color.blue, base = color.dark ? 255 : 0;

    ctx.clearRect(0, 0, W, H);
    var pts = new Array(N);
    for (var i = 0; i < N; i++) {
      var n = nodes[i];
      var x1 = n.x * cy + n.z * sy, z1 = -n.x * sy + n.z * cy;
      var y2 = n.y * cx - z1 * sx, z2 = n.y * sx + z1 * cx;
      var k = f / (f + z2 + 0.2);
      pts[i] = { x: ox + x1 * scale * k, y: oy + y2 * scale * k, z: z2, k: k };
    }
    // 선
    ctx.lineWidth = 1;
    for (var e = 0; e < edges.length; e++) {
      var A = pts[edges[e][0]], B = pts[edges[e][1]];
      var depth = (A.z + B.z) * 0.5, a = 0.05 + 0.22 * (1 - (depth + 1) / 2);
      ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    // 신호(펄스): 간선을 따라 빛이 이동
    if (!reduce && pulses.length < 9 && Math.random() < 0.06) pulses.push({ e: (Math.random() * edges.length) | 0, p: 0, v: 0.012 + Math.random() * 0.016, dir: Math.random() < 0.5 ? 1 : -1 });
    for (var q = pulses.length - 1; q >= 0; q--) {
      var P = pulses[q]; P.p += P.v;
      if (P.p >= 1) { pulses.splice(q, 1); continue; }
      var ed = edges[P.e], s0 = pts[P.dir > 0 ? ed[0] : ed[1]], s1 = pts[P.dir > 0 ? ed[1] : ed[0]];
      var px = s0.x + (s1.x - s0.x) * P.p, py = s0.y + (s1.y - s0.y) * P.p;
      var g = ctx.createRadialGradient(px, py, 0, px, py, 14);
      g.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.9)"); g.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 14, 0, 6.283); ctx.fill();
    }
    // 점: 가까울수록 크고 진하게
    for (var m = 0; m < N; m++) {
      var p = pts[m], nd = nodes[m];
      var near = (1 - (p.z + 1) / 2), r = (1.3 + nd.s * 2.2) * p.k * (0.8 + 0.2 * Math.sin(t * 1.6 + nd.ph));
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.25 + 0.7 * near).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.8, r), 0, 6.283); ctx.fill();
    }
    if (running) raf2 = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; t0 = performance.now() - 1; raf2 = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf2); }

  resize(); readColor();
  if (reduce) frame(performance.now()); else start();
  window.addEventListener("resize", function () { resize(); if (!running) frame(performance.now()); });
  document.addEventListener("themechange", function () { readColor(); if (!running) frame(performance.now()); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { readColor(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(cv);
  // 스크롤 패럴랙스: 내려갈수록 신경망이 뒤로 물러나며 흐려진다
  if (!reduce) {
    var sTick = false;
    window.addEventListener("scroll", function () {
      if (sTick) return; sTick = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 700), p = y / 700;
        cv.style.transform = "translate3d(0," + (y * 0.28).toFixed(1) + "px,0) scale(" + (1 - p * 0.12).toFixed(3) + ")";
        cv.style.opacity = (1 - p * 0.85).toFixed(3);
        sTick = false;
      });
    }, { passive: true });
  }
  var host = cv.parentNode;
  if (canHover) host.addEventListener("pointermove", function (e) { var r = host.getBoundingClientRect(); mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  host.addEventListener("pointerleave", function () { mouse.tx = 0; mouse.ty = 0; });
})();
