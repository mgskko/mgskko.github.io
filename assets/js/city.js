/* Study Note — 기록 도시: 월별 글 수를 3D 막대(아이소메트릭)로. 외부 라이브러리 없음. */
(function () {
  "use strict";
  var root = document.querySelector("[data-city]");
  var dataEl = document.getElementById("cosmos-data");
  if (!root || !dataEl) return;
  var cv = root.querySelector("canvas"), tip = root.querySelector("[data-city-tip]");
  if (!cv || !cv.getContext) return;
  var rows; try { rows = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = cv.getContext("2d");

  /* 연도(행) × 월(열) 집계 */
  var cnt = {}, yMin = 9999, yMax = 0, vMax = 1;
  rows.forEach(function (r) {
    var d = new Date(+r[3] * 1000), y = d.getFullYear(), m = d.getMonth();
    cnt[y + "-" + m] = (cnt[y + "-" + m] || 0) + 1;
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  });
  Object.keys(cnt).forEach(function (k) { vMax = Math.max(vMax, cnt[k]); });
  var years = []; for (var y = yMin; y <= yMax; y++) { for (var mm = 0; mm < 12; mm++) if (cnt[y + "-" + mm]) { years.push(y); break; } }
  var cells = [];
  years.forEach(function (yy, yi) { for (var m = 0; m < 12; m++) cells.push({ y: yy, yi: yi, m: m, v: cnt[yy + "-" + m] || 0, grow: reduce ? 1 : 0 }); });

  var W = 0, H = 0, dpr = 1, rot = 0.78, pitch = 0.8, dragging = false, lx = 0, ly = 0, moved = 0, running = false, visible = false, raf = 0, hover = -1, t0 = 0;
  var cols = ["#cce3fd", "#84b9f3", "#338ced", "#1b64be"], ink = "#4e5968", dark = false, empty = "rgba(25,31,40,0.06)", blue = "#3182f6";
  function readColors() {
    var cs = getComputedStyle(document.documentElement), g = function (n, d) { return (cs.getPropertyValue(n) || d).trim() || d; };
    cols = [g("--q1", cols[0]), g("--q2", cols[1]), g("--q3", cols[2]), g("--q4", cols[3])];
    ink = g("--t2", ink); blue = g("--blue", blue);
    var m = /^#([0-9a-f]{6})$/i.exec(g("--bg", "#f2f4f6")); dark = m ? parseInt(m[1].substr(0, 2), 16) < 90 : false;
    empty = dark ? "rgba(255,255,255,0.07)" : "rgba(25,31,40,0.06)";
  }
  function resize() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function shade(hex, k) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var c = [0, 2, 4].map(function (i) { return Math.max(0, Math.min(255, Math.round(parseInt(m[1].substr(i, 2), 16) * k))); });
    return "rgb(" + c.join(",") + ")";
  }
  function level(v) { return v === 0 ? -1 : Math.min(3, Math.floor((v / vMax) * 3.999)); }

  var NX = 12, NZ = years.length, polys = [];
  function P(x, y, z, c) {
    var x1 = x * c.cr + z * c.sr, z1 = -x * c.sr + z * c.cr;
    var y2 = y * c.cp - z1 * c.sp, z2 = y * c.sp + z1 * c.cp, k = 3 / (3 + z2 * 0.35);
    return [c.ox + x1 * c.s * k, c.oy - y2 * c.s * k, z2];
  }
  function quad(a, b, c2, d, fill, owner) { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); if (owner >= 0) polys.push({ pts: [a, b, c2, d], o: owner }); }

  function draw(now) {
    var cr = Math.cos(rot), sr = Math.sin(rot), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var s = Math.min(W / (NX + NZ + 4), H / (NX * 0.58 + NZ * 0.3 + 5));
    var c = { cr: cr, sr: sr, cp: cp, sp: sp, s: s, ox: W / 2, oy: H * 0.64 };
    ctx.clearRect(0, 0, W, H); polys = [];
    var gx = NX / 2, gz = NZ / 2, hMax = Math.min(4.2, NZ + 2.2);
    // 막대를 뒤→앞 순서로
    var order = cells.map(function (cl, i) { var x = cl.m - gx + 0.5, z = cl.yi - gz + 0.5; return { i: i, d: (-x * sr + z * cr) }; }).sort(function (a, b) { return b.d - a.d; });
    for (var q = 0; q < order.length; q++) {
      var cl = cells[order[q].i], x = cl.m - gx, z = cl.yi - gz, w = 0.82, o = (1 - w) / 2;
      var x0 = x + o, x1 = x + o + w, z0 = z + o, z1 = z + o + w;
      if (reduce) cl.grow = 1; else if (cl.grow < 1) cl.grow = Math.min(1, cl.grow + 0.035);
      var e = 1 - Math.pow(1 - cl.grow, 3);
      var h = cl.v === 0 ? 0.05 : (0.35 + (cl.v / vMax) * hMax) * e;
      var lv = level(cl.v), base = lv < 0 ? null : cols[lv];
      var hot = order[q].i === hover;
      var top, left, right;
      if (!base) { top = empty; left = empty; right = empty; }
      else { top = hot ? shade(blue, 1.15) : base; left = shade(base, dark ? 0.62 : 0.8); right = shade(base, dark ? 0.78 : 0.9); }
      var a0 = P(x0, 0, z0, c), a1 = P(x1, 0, z0, c), a2 = P(x1, 0, z1, c), a3 = P(x0, 0, z1, c);
      var b0 = P(x0, h, z0, c), b1 = P(x1, h, z0, c), b2 = P(x1, h, z1, c), b3 = P(x0, h, z1, c);
      // 보이는 옆면 두 개 (카메라 쪽): 회전에 따라 선택
      var faces = [
        { p: [a0, a1, b1, b0], n: [0, 0, -1] }, { p: [a1, a2, b2, b1], n: [1, 0, 0] },
        { p: [a2, a3, b3, b2], n: [0, 0, 1] }, { p: [a3, a0, b0, b3], n: [-1, 0, 0] }
      ];
      faces.forEach(function (f, fi) {
        var nz = -f.n[0] * sr + f.n[2] * cr; // 회전 후 z 성분 (카메라 쪽이면 음수)
        if (nz < 0.0) quad(f.p[0], f.p[1], f.p[2], f.p[3], (f.n[0] + f.n[2] > 0 ? right : left), order[q].i);
      });
      quad(b0, b1, b2, b3, top, order[q].i);
    }
    // 레이블: 월(앞쪽 가장자리), 연도
    ctx.font = "600 11px Pretendard, system-ui, sans-serif"; ctx.fillStyle = ink; ctx.globalAlpha = 0.75;
    var zf = -(cr >= 0 ? 1 : -1) * (gz + 0.45), xf = (sr >= 0 ? 1 : -1) * (gx + 0.6);
    ctx.textAlign = "center";
    for (var m = 0; m < 12; m += (W < 520 ? 2 : 1)) { var pm = P(m - gx + 0.5, 0, zf, c); ctx.fillText((m + 1) + "월", pm[0], pm[1] + 6); }
    ctx.textAlign = "right";
    for (var yi = 0; yi < years.length; yi++) { var py = P(xf, 0, yi - gz + 0.5, c); ctx.fillText(years[yi], py[0], py[1] + 4); }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!dragging && !reduce) rot += 0.0016;
    draw(now); if (running) raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function inPoly(pt, p) {
    var x = pt[0], y = pt[1], ins = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if (((p[i][1] > y) !== (p[j][1] > y)) && (x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) ins = !ins;
    }
    return ins;
  }
  function pick(mx, my) { for (var i = polys.length - 1; i >= 0; i--) if (inPoly([mx, my], polys[i].pts)) return polys[i].o; return -1; }
  function showTip(i, mx, my) {
    if (i < 0) { tip.hidden = true; return; }
    var cl = cells[i];
    tip.innerHTML = "<b></b><small></small>";
    tip.querySelector("b").textContent = cl.y + "년 " + (cl.m + 1) + "월";
    tip.querySelector("small").textContent = cl.v ? cl.v + "개의 글" : "기록 없음";
    tip.hidden = false;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.transform = "translate(" + Math.max(8, Math.min(W - tw - 8, mx + 12)) + "px," + Math.max(8, Math.min(H - th - 8, my - th - 8)) + "px)";
  }

  cv.addEventListener("pointerdown", function (e) { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) { } });
  cv.addEventListener("pointermove", function (e) {
    var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (dragging) { var dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); rot += dx * 0.008; pitch = Math.max(0.25, Math.min(1.1, pitch + dy * 0.005)); lx = e.clientX; ly = e.clientY; if (!running) draw(); }
    else if (e.pointerType === "mouse") { var h = pick(mx, my); if (h !== hover) { hover = h; showTip(h, mx, my); if (!running) draw(); } cv.classList.toggle("cur-link", h >= 0); }
  });
  cv.addEventListener("pointerup", function (e) { dragging = false; if (moved < 6) { var r = cv.getBoundingClientRect(), h = pick(e.clientX - r.left, e.clientY - r.top); hover = h; showTip(h, e.clientX - r.left, e.clientY - r.top); if (!running) draw(); } });
  cv.addEventListener("pointerleave", function () { hover = -1; tip.hidden = true; });

  resize(); readColors(); draw();
  window.addEventListener("resize", function () { resize(); if (!running) draw(); });
  document.addEventListener("themechange", function () { readColors(); if (!running) draw(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.15 }).observe(cv);
  else start();
})();
