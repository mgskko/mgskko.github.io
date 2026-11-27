/* Study Note — 배경 3D: 화면 뒤에 은은하게 떠 있는 데이터 입자 공간.
   스크롤하면 카메라가 공간 안으로 전진하고, 마우스를 움직이면 살짝 시점이 바뀐다.
   글 페이지와 카테고리 페이지는 그 분야의 색으로 물든다. 외부 라이브러리 없음. */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-page") || "post";
  if (page === "home") return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = document.createElement("canvas");
  cv.className = "bg3d"; cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d");
  if (!ctx) return;

  var W = 0, H = 0, dpr = 1, running = false, raf = 0;
  var mobile = window.matchMedia("(max-width: 759px)").matches;
  var N = mobile ? 90 : 220, DEPTH = 14, pts = [];
  var pal = [], dark = false;

  function hexOk(h) { return /^#([0-9a-f]{6})$/i.test(h); }
  function rgb(h) { var m = /^#([0-9a-f]{6})$/i.exec(h); return m ? [parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16)] : [49, 130, 246]; }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var bg = (cs.getPropertyValue("--bg") || "#f2f4f6").trim();
    dark = hexOk(bg) ? rgb(bg)[0] < 90 : false;
    var blue = (cs.getPropertyValue("--blue") || "#3182f6").trim();
    // 글/카테고리 페이지: 그 분야의 색 + 파랑. 나머지: 다섯 분야 색을 모두.
    var slotEl = document.querySelector(".post .chip--cat .cat-icon, .page-head .cat-icon--lg");
    var slot = 0;
    if (slotEl) { var m = /\bs([1-5])\b/.exec(slotEl.className); if (m) slot = +m[1]; }
    var list = [];
    if (slot) list = [(cs.getPropertyValue("--s" + slot) || blue).trim(), blue];
    else for (var i = 1; i <= 5; i++) list.push((cs.getPropertyValue("--s" + i) || blue).trim());
    pal = list.filter(hexOk).map(rgb);
    if (!pal.length) pal = [rgb(blue)];
  }

  function seed() {
    pts = [];
    for (var i = 0; i < N; i++) {
      pts.push({ x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.5) * 6, z: Math.random() * DEPTH, c: (Math.random() * pal.length) | 0, s: 0.6 + Math.random() * 1.2, ph: Math.random() * 6.28 });
    }
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var mx = 0, my = 0, tmx = 0, tmy = 0, camZ = 0, tCamZ = 0, t0 = performance.now();
  function scrollTarget() {
    var max = Math.max(1, document.documentElement.scrollHeight - H);
    tCamZ = (window.scrollY / max) * DEPTH * 1.6; // 글 끝까지 내려가면 공간을 한 바퀴 반 지나간다
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    camZ += (tCamZ - camZ) * (reduce ? 1 : 0.08);
    ctx.clearRect(0, 0, W, H);
    var f = Math.min(W, H) * 0.9, cx = W / 2 + mx * 40, cy = H / 2 + my * 30;
    var base = dark ? 0.7 : 0.55, proj = [];
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      var z = ((p.z - camZ) % DEPTH + DEPTH) % DEPTH + 0.6; // 지나가면 뒤로 다시 감긴다
      var x = p.x + Math.sin(t * 0.15 + p.ph) * 0.15 - mx * 0.6 * (1 / z);
      var y = p.y + Math.cos(t * 0.12 + p.ph) * 0.12 - my * 0.4 * (1 / z);
      var k = f / (z * 1.0 + 1.2);
      var fade = Math.min(1, z / 1.6) * (1 - z / (DEPTH + 0.6));
      proj.push({ x: cx + x * k * 0.35, y: cy + y * k * 0.35, k: k, a: fade, c: p.c, s: p.s, z: z });
    }
    // 가까운 점끼리 잇는 선 (데이터 그래프 느낌)
    ctx.lineWidth = 1;
    for (var a = 0; a < N; a++) {
      var A = proj[a]; if (A.a < 0.15 || A.z > 8) continue;
      for (var b = a + 1; b < N; b++) {
        var B = proj[b]; if (B.z > 8 || Math.abs(A.z - B.z) > 1.6) continue;
        var dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy, lim = 130 * 130;
        if (d2 < lim) {
          var col = pal[A.c], al = (1 - d2 / lim) * Math.min(A.a, B.a) * base * 0.45;
          ctx.strokeStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + al.toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        }
      }
    }
    for (var j = 0; j < N; j++) {
      var P = proj[j], c = pal[P.c], r = Math.max(0.8, P.s * P.k * 0.008);
      ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (P.a * base * 1.4).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 6.283); ctx.fill();
    }
  }
  function loop(now) { draw(now); if (running) raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  readColors(); seed(); resize(); scrollTarget(); camZ = tCamZ; draw(performance.now());
  start();
  window.addEventListener("resize", function () { resize(); scrollTarget(); if (!running) draw(performance.now()); });
  window.addEventListener("scroll", function () { scrollTarget(); if (reduce) { camZ = tCamZ; draw(performance.now()); } }, { passive: true });
  if (window.matchMedia("(hover: hover)").matches) window.addEventListener("pointermove", function (e) { tmx = e.clientX / W - 0.5; tmy = e.clientY / H - 0.5; }, { passive: true });
  document.addEventListener("themechange", function () { readColors(); pts.forEach(function (p) { p.c = p.c % pal.length; }); if (!running) draw(performance.now()); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
})();
