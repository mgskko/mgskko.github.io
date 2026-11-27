/* Study Note — 지식 은하: 블로그 글 전체를 3D 데이터 시각화로. 외부 라이브러리 없음.
   글 하나 = 점 하나. 세 가지 배치(은하 / 시간 나선 / 3D 산점도)로 부드럽게 변형된다. */
(function () {
  "use strict";
  var root = document.querySelector("[data-cosmos]");
  if (!root) return;
  var cv = root.querySelector("canvas");
  var dataEl = document.getElementById("cosmos-data");
  if (!cv || !dataEl || !cv.getContext) return;
  var rows;
  try { rows = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!rows.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = cv.getContext("2d");
  var tip = root.querySelector("[data-cosmos-tip]");
  var W = 0, H = 0, dpr = 1, running = false, visible = true, raf = 0;

  /* ---------- 데이터 ---------- */
  var N = rows.length, pts = [];
  var tMin = Infinity, tMax = -Infinity, lMin = Infinity, lMax = -Infinity;
  rows.forEach(function (r) {
    tMin = Math.min(tMin, +r[3]); tMax = Math.max(tMax, +r[3]);
    var l = Math.log(Math.max(200, +r[4])); lMin = Math.min(lMin, l); lMax = Math.max(lMax, l);
  });
  function rnd(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }
  function gauss(i, k) { return (rnd(i, k) + rnd(i, k + 1) + rnd(i, k + 2) - 1.5) * 1.15; }

  var order = rows.map(function (r, i) { return i; }).sort(function (a, b) { return rows[a][3] - rows[b][3] || a - b; });
  var rank = new Array(N); order.forEach(function (idx, pos) { rank[idx] = pos / Math.max(1, N - 1); });

  var layouts = { cluster: [], helix: [], scatter: [] };
  var GROUP_POS = [];
  for (var g = 0; g < 5; g++) {
    var ang = (g / 5) * Math.PI * 2 + 0.4;
    GROUP_POS.push({ x: Math.cos(ang) * 0.62, y: ((g % 2) ? 0.16 : -0.16), z: Math.sin(ang) * 0.62 });
  }
  rows.forEach(function (r, i) {
    var gi = Math.max(0, Math.min(4, (+r[2]) - 1)), G = GROUP_POS[gi];
    var lenN = (Math.log(Math.max(200, +r[4])) - lMin) / Math.max(0.001, lMax - lMin);
    var tN = (+r[3] - tMin) / Math.max(1, tMax - tMin);
    layouts.cluster[i] = { x: G.x + gauss(i, 1) * 0.2, y: G.y + gauss(i, 4) * 0.2, z: G.z + gauss(i, 7) * 0.2 };
    var th = rank[i] * Math.PI * 6.2, rad = 0.58 + gauss(i, 2) * 0.07;
    layouts.helix[i] = { x: Math.cos(th) * rad, y: (rank[i] - 0.5) * 1.7, z: Math.sin(th) * rad };
    layouts.scatter[i] = { x: (gi - 2) * 0.4 + gauss(i, 3) * 0.05, y: (lenN - 0.5) * 1.3, z: (tN - 0.5) * 1.5 };
    pts.push({
      title: r[0], url: r[1], slot: gi + 1, label: r[5], len: +r[4], ts: +r[3], gi: gi,
      x: layouts.cluster[i].x, y: layouts.cluster[i].y, z: layouts.cluster[i].z,
      size: 0.8 + lenN * 1.6, sx: 0, sy: 0, sk: 1, sz: 0
    });
  });

  var mode = "cluster", target = layouts.cluster;
  var active = { 1: true, 2: true, 3: true, 4: true, 5: true };
  var hover = -1, picked = -1;

  /* ---------- 색 ---------- */
  var pal = ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac"], ink = "#4e5968", dark = false;
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    for (var i = 1; i <= 5; i++) { var v = (cs.getPropertyValue("--s" + i) || "").trim(); if (v) pal[i - 1] = v; }
    ink = (cs.getPropertyValue("--t2") || "#4e5968").trim();
    var bg = (cs.getPropertyValue("--bg") || "#f2f4f6").trim(), m = /^#([0-9a-f]{6})$/i.exec(bg);
    dark = m ? parseInt(m[1].substr(0, 2), 16) < 90 : false;
  }
  function rgba(hex, a) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    return "rgba(" + parseInt(m[1].substr(0, 2), 16) + "," + parseInt(m[1].substr(2, 2), 16) + "," + parseInt(m[1].substr(4, 2), 16) + "," + a + ")";
  }

  /* ---------- 카메라 ---------- */
  var yaw = 0.5, pitch = 0.32, vyaw = 0, dragging = false, lastX = 0, lastY = 0, moved = 0, idle = 0, zoom = 1;
  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project() {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    var scale = Math.min(W * 0.62, H * 0.9) * 0.74 * zoom * (mode === "helix" ? 0.74 : 1), f = 2.6, ox = W / 2, oy = H / 2 + 6;
    for (var i = 0; i < N; i++) {
      var p = pts[i], t = target[i];
      p.x += (t.x - p.x) * (reduce ? 1 : 0.075); p.y += (t.y - p.y) * (reduce ? 1 : 0.075); p.z += (t.z - p.z) * (reduce ? 1 : 0.075);
      var x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
      var y2 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
      var k = f / (f + z2 + 0.6);
      p.sx = ox + x1 * scale * k; p.sy = oy - y2 * scale * k; p.sk = k; p.sz = z2;
    }
    return { cy: cy, sy: sy, cx: cx, sx: sx, scale: scale, f: f, ox: ox, oy: oy };
  }
  function proj(c, x, y, z) {
    var x1 = x * c.cy + z * c.sy, z1 = -x * c.sy + z * c.cy;
    var y2 = y * c.cx - z1 * c.sx, z2 = y * c.sx + z1 * c.cx, k = c.f / (c.f + z2 + 0.6);
    return { x: c.ox + x1 * c.scale * k, y: c.oy - y2 * c.scale * k, k: k, z: z2 };
  }

  function line(c, a, b, col, w) {
    var A = proj(c, a[0], a[1], a[2]), B = proj(c, b[0], b[1], b[2]);
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  function label(c, x, y, z, text, col) {
    var P = proj(c, x, y, z);
    ctx.font = "600 " + (11 + P.k * 2).toFixed(1) + "px Pretendard, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillStyle = col; ctx.fillText(text, P.x, P.y);
  }

  var GROUP_NAME = ["코딩테스트", "CS", "데이터", "AI·ML", "개발"];
  var grid = dark ? "rgba(255,255,255,0.08)" : "rgba(25,31,40,0.07)";

  function draw() {
    var c = project();
    ctx.clearRect(0, 0, W, H);
    grid = dark ? "rgba(255,255,255,0.09)" : "rgba(25,31,40,0.08)";

    // 바닥 격자
    var g0 = mode === "scatter" ? -0.75 : -0.95, span = 0.95;
    for (var i = -4; i <= 4; i++) {
      var u = (i / 4) * span;
      line(c, [u, g0, -span], [u, g0, span], grid, 1);
      line(c, [-span, g0, u], [span, g0, u], grid, 1);
    }
    if (mode === "scatter") {
      // 축 + 레이블
      line(c, [-1, g0, span], [1, g0, span], rgba(ink, 0.25), 1.2);
      line(c, [-1, g0, -span], [-1, g0, span], rgba(ink, 0.25), 1.2);
      line(c, [-1, g0, span], [-1, 0.78, span], rgba(ink, 0.25), 1.2);
      for (var gi = 0; gi < 5; gi++) label(c, (gi - 2) * 0.4, g0, span + 0.12, GROUP_NAME[gi], rgba(pal[gi], 0.95));
      label(c, -1.0, 0.86, span, "글 길이 ↑", rgba(ink, 0.8));
      label(c, 0.95, g0, -span - 0.1, "오래된 글 → 최근 글", rgba(ink, 0.6));
    }
    if (mode === "cluster") {
      for (var gk = 0; gk < 5; gk++) if (active[gk + 1]) {
        var G = GROUP_POS[gk];
        label(c, G.x, G.y - 0.42, G.z, GROUP_NAME[gk], rgba(pal[gk], 0.95));
      }
    }
    if (mode === "helix") {
      // 시간 기준선
      line(c, [0, -0.85, 0], [0, 0.85, 0], rgba(ink, 0.18), 1);
      label(c, 0, -0.95, 0, "처음 글", rgba(ink, 0.6));
      label(c, 0, 0.95, 0, "최근 글", rgba(ink, 0.6));
    }

    // 점 (뒤에서 앞으로)
    var idx = pts.map(function (p, i) { return i; }).sort(function (a, b) { return pts[b].sz - pts[a].sz; });
    for (var q = 0; q < idx.length; q++) {
      var i2 = idx[q], p = pts[i2], on = active[p.slot];
      var col = pal[p.slot - 1];
      var near = 1 - Math.max(0, Math.min(1, (p.sz + 1.2) / 2.4));
      var a = on ? 0.35 + 0.6 * near : 0.08;
      var r = (1.6 + p.size * 1.9) * p.sk * 1.35;
      var hot = i2 === hover || i2 === picked;
      if (on) {
        var gr = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 3.2);
        gr.addColorStop(0, rgba(col, (hot ? 0.55 : 0.22) * (0.5 + near)));
        gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 3.2, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = rgba(col, hot ? 1 : a);
      ctx.beginPath(); ctx.arc(p.sx, p.sy, hot ? r * 1.5 : r, 0, 6.283); ctx.fill();
      if (hot) { ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2.3, 0, 6.283); ctx.stroke(); }
    }
  }

  function frame() {
    if (!dragging && !reduce && picked < 0 && hover < 0) { yaw += 0.0026 + vyaw; }
    vyaw *= 0.94;
    draw();
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---------- 상호작용 ---------- */
  function nearest(mx, my) {
    var best = -1, bd = 18 * 18;
    for (var i = 0; i < N; i++) {
      var p = pts[i]; if (!active[p.slot]) continue;
      var dx = p.sx - mx, dy = p.sy - my, d = dx * dx + dy * dy - (p.sk * 40);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function fmtDate(ts) { var d = new Date(ts * 1000); return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0"); }
  function showTip(i, mx, my) {
    if (i < 0) { tip.hidden = true; return; }
    var p = pts[i];
    tip.innerHTML = '<span class="cosmos__dot s' + p.slot + '"></span><b></b><small></small><a class="cosmos__go" href="">글 읽기 →</a>';
    tip.querySelector("b").textContent = p.title.replace(/^\[[^\]]*\]\s*/, "");
    tip.querySelector("small").textContent = p.label + " · " + fmtDate(p.ts) + " · 약 " + p.len.toLocaleString("ko-KR") + "자";
    tip.querySelector("a").href = p.url;
    tip.hidden = false;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.max(8, Math.min(W - tw - 8, mx + 14)), y = Math.max(8, Math.min(H - th - 8, my - th - 10));
    tip.style.transform = "translate(" + x + "px," + y + "px)";
  }

  cv.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    try { cv.setPointerCapture(e.pointerId); } catch (x) { }
  });
  cv.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY; moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.008; pitch = Math.max(-0.2, Math.min(1.1, pitch + dy * 0.006)); vyaw = dx * 0.0006;
      lastX = e.clientX; lastY = e.clientY;
      if (reduce) draw();
    } else if (e.pointerType === "mouse") {
      var h = nearest(mx, my);
      if (h !== hover) { hover = h; if (picked < 0) showTip(h, mx, my); if (reduce) draw(); }
      cv.classList.toggle("cur-link", h >= 0);
    }
  });
  cv.addEventListener("pointerup", function (e) {
    var wasClick = moved < 6; dragging = false;
    if (wasClick) {
      var r = cv.getBoundingClientRect(), h = nearest(e.clientX - r.left, e.clientY - r.top);
      picked = h; hover = h; showTip(h, e.clientX - r.left, e.clientY - r.top); if (reduce) draw();
    }
  });
  cv.addEventListener("pointerleave", function () { hover = -1; if (picked < 0) tip.hidden = true; });
  cv.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.shiftKey) return; // 일반 스크롤은 페이지에 양보
    e.preventDefault(); zoom = Math.max(0.7, Math.min(1.8, zoom - e.deltaY * 0.001));
  }, { passive: false });

  Array.prototype.forEach.call(root.querySelectorAll("[data-cosmos-mode]"), function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-cosmos-mode"); target = layouts[mode];
      Array.prototype.forEach.call(root.querySelectorAll("[data-cosmos-mode]"), function (x) { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var d = root.querySelector("[data-cosmos-desc]"); if (d) d.textContent = b.getAttribute("data-desc") || "";
      picked = -1; hover = -1; tip.hidden = true;
      if (mode === "scatter") pitch = 0.42; if (reduce) { for (var i = 0; i < N; i++) { pts[i].x = target[i].x; pts[i].y = target[i].y; pts[i].z = target[i].z; } draw(); }
    });
  });
  Array.prototype.forEach.call(root.querySelectorAll("[data-cosmos-group]"), function (b) {
    b.addEventListener("click", function () {
      var s = +b.getAttribute("data-cosmos-group"); active[s] = !active[s];
      b.classList.toggle("is-off", !active[s]); b.setAttribute("aria-pressed", active[s] ? "true" : "false");
      if (picked >= 0 && !active[pts[picked].slot]) { picked = -1; tip.hidden = true; }
      if (reduce) draw();
    });
  });

  resize(); readColors(); draw();
  if (!reduce) start();
  window.addEventListener("resize", function () { resize(); if (!running) draw(); });
  document.addEventListener("themechange", function () { readColors(); if (!running) draw(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(cv);
})();
