/* Study Note — 3D 도넛: 분야별 글 비중을 두께 있는 도넛으로. 조각에 올리면 떠오른다. 외부 라이브러리 없음. */
(function () {
  "use strict";
  var cv = document.querySelector("[data-donut3d]");
  if (!cv || !cv.getContext) return;
  var data; try { data = JSON.parse(cv.getAttribute("data-donut3d")); } catch (e) { return; }
  data = data.filter(function (d) { return d[1] > 0; });
  if (!data.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = cv.getContext("2d"), tip = cv.parentNode.querySelector("[data-donut-tip]");
  var total = data.reduce(function (s, d) { return s + d[1]; }, 0);
  var slices = [], acc = 0;
  data.forEach(function (d) { var a0 = acc / total * Math.PI * 2; acc += d[1]; slices.push({ label: d[0], n: d[1], slot: d[2], a0: a0, a1: acc / total * Math.PI * 2, lift: 0 }); });

  var W = 0, H = 0, dpr = 1, rot = -0.6, tilt = 0.95, hover = -1, running = false, raf = 0, grow = reduce ? 1 : 0, cols = {}, ink = "#191f28", dragging = false, lx = 0;
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    for (var i = 1; i <= 5; i++) cols[i] = (cs.getPropertyValue("--s" + i) || "#3182f6").trim();
    ink = (cs.getPropertyValue("--t1") || ink).trim();
  }
  function rgb(h, k) { var m = /^#([0-9a-f]{6})$/i.exec(h); if (!m) return h; return "rgb(" + [0, 2, 4].map(function (i) { return Math.min(255, Math.round(parseInt(m[1].substr(i, 2), 16) * k)); }).join(",") + ")"; }
  function resize() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width | 0); H = Math.max(1, r.height | 0);
    cv.width = W * dpr | 0; cv.height = H * dpr | 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var polys = [];
  function P(a, r, h, c, lift, mid) {
    var x = Math.cos(a) * r + Math.cos(mid) * lift, z = Math.sin(a) * r + Math.sin(mid) * lift;
    var x1 = x * Math.cos(rot) - z * Math.sin(rot), z1 = x * Math.sin(rot) + z * Math.cos(rot);
    return [c.ox + x1 * c.s, c.oy + z1 * c.s * Math.cos(tilt) - h * c.s * Math.sin(tilt), z1];
  }
  function draw() {
    var s = Math.min(W * 0.36, H * 0.46), c = { s: s, ox: W / 2, oy: H * 0.52 };
    var R = 1, r = 0.56, T = 0.28 * grow;
    ctx.clearRect(0, 0, W, H); polys = [];
    // 바닥 그림자
    var g = ctx.createRadialGradient(c.ox, c.oy + s * 0.25, 0, c.ox, c.oy + s * 0.25, s * 1.1);
    g.addColorStop(0, "rgba(2,32,71,0.12)"); g.addColorStop(1, "rgba(2,32,71,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.ox, c.oy + s * 0.22, s * 1.1, s * 1.1 * Math.cos(tilt) * 0.9, 0, 0, 6.283); ctx.fill();

    var faces = [];
    slices.forEach(function (sl, si) {
      sl.lift += ((si === hover ? 0.12 : 0) - sl.lift) * 0.2;
      var mid = (sl.a0 + sl.a1) / 2, L = sl.lift, base = cols[sl.slot] || "#3182f6", step = 0.06;
      var a1 = sl.a0 + (sl.a1 - sl.a0) * grow;
      for (var a = sl.a0; a < a1 - 1e-6; a += step) {
        var b = Math.min(a1, a + step);
        var o0 = P(a, R, 0, c, L, mid), o1 = P(b, R, 0, c, L, mid), o2 = P(b, R, T, c, L, mid), o3 = P(a, R, T, c, L, mid);
        faces.push({ p: [o0, o1, o2, o3], z: (o0[2] + o1[2]) / 2, col: rgb(base, 0.78), si: si });
        var i0 = P(a, r, 0, c, L, mid), i1 = P(b, r, 0, c, L, mid), i2 = P(b, r, T, c, L, mid), i3 = P(a, r, T, c, L, mid);
        faces.push({ p: [i0, i1, i2, i3], z: (i0[2] + i1[2]) / 2 - 0.5, col: rgb(base, 0.62), si: si });
      }
      [sl.a0, a1].forEach(function (a) {
        var e0 = P(a, r, 0, c, L, mid), e1 = P(a, R, 0, c, L, mid), e2 = P(a, R, T, c, L, mid), e3 = P(a, r, T, c, L, mid);
        faces.push({ p: [e0, e1, e2, e3], z: (e0[2] + e1[2]) / 2, col: rgb(base, 0.7), si: si });
      });
    });
    faces.sort(function (a, b) { return a.z - b.z; });
    faces.forEach(function (f) { poly(f.p, f.col, f.si); });
    // 윗면
    slices.forEach(function (sl, si) {
      var mid = (sl.a0 + sl.a1) / 2, L = sl.lift, top = [], a1 = sl.a0 + (sl.a1 - sl.a0) * grow;
      for (var a = sl.a0; a <= a1 + 1e-6; a += 0.05) top.push(P(Math.min(a, a1), R, T, c, L, mid));
      top.push(P(a1, R, T, c, L, mid));
      for (var a2 = a1; a2 >= sl.a0 - 1e-6; a2 -= 0.05) top.push(P(Math.max(a2, sl.a0), r, T, c, L, mid));
      top.push(P(sl.a0, r, T, c, L, mid));
      poly(top, si === hover ? rgb(cols[sl.slot], 1.12) : cols[sl.slot], si);
    });
    // 가운데 숫자
    ctx.textAlign = "center"; ctx.fillStyle = ink;
    var cyy = c.oy - T * s * Math.sin(tilt);
    if (hover >= 0) {
      var h = slices[hover];
      ctx.font = "800 " + Math.round(s * 0.2) + "px Pretendard, system-ui, sans-serif"; ctx.fillText(Math.round(h.n / total * 100) + "%", c.ox, cyy + s * 0.04);
      ctx.font = "600 " + Math.round(s * 0.09) + "px Pretendard, system-ui, sans-serif"; ctx.fillText(h.label + " · " + h.n + "개", c.ox, cyy + s * 0.17);
    } else {
      ctx.font = "800 " + Math.round(s * 0.2) + "px Pretendard, system-ui, sans-serif"; ctx.fillText(total, c.ox, cyy + s * 0.04);
      ctx.font = "600 " + Math.round(s * 0.09) + "px Pretendard, system-ui, sans-serif"; ctx.fillText("전체 글", c.ox, cyy + s * 0.17);
    }
  }
  function poly(p, col, si) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath(); ctx.fill(); ctx.stroke(); polys.push({ p: p, si: si });
  }
  function inPoly(x, y, p) { var ins = false; for (var i = 0, j = p.length - 1; i < p.length; j = i++) { if (((p[i][1] > y) !== (p[j][1] > y)) && (x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) ins = !ins; } return ins; }
  function pick(x, y) { for (var i = polys.length - 1; i >= 0; i--) if (inPoly(x, y, polys[i].p)) return polys[i].si; return -1; }

  function loop() {
    if (grow < 1) grow = Math.min(1, grow + 0.025);
    if (!dragging && hover < 0 && !reduce) rot += 0.002;
    draw(); if (running) raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setHover(h) { if (h === hover) return; hover = h; if (tip) tip.textContent = h >= 0 ? slices[h].label + " " + slices[h].n + "개 (" + Math.round(slices[h].n / total * 100) + "%)" : ""; if (!running) draw(); }

  cv.addEventListener("pointerdown", function (e) { dragging = true; lx = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (x) { } });
  cv.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect();
    if (dragging) { rot += (e.clientX - lx) * 0.01; lx = e.clientX; if (!running) draw(); return; }
    setHover(pick(e.clientX - r.left, e.clientY - r.top));
  });
  cv.addEventListener("pointerup", function (e) { dragging = false; var r = cv.getBoundingClientRect(); setHover(pick(e.clientX - r.left, e.clientY - r.top)); });
  cv.addEventListener("pointerleave", function () { dragging = false; setHover(-1); });

  readColors(); resize(); draw();
  window.addEventListener("resize", function () { resize(); draw(); });
  document.addEventListener("themechange", function () { readColors(); draw(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }).observe(cv); else start();
})();
