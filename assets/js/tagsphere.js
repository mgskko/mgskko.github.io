/* Study Note — 태그 구: 자주 쓴 태그를 3D 구 위에 띄워 돌린다. 누르면 그 태그의 글을 보여 준다.
   글자는 DOM 요소라 선명하고, 키보드로도 누를 수 있다. 외부 라이브러리 없음. */
(function () {
  "use strict";
  var host = document.querySelector("[data-tagsphere]");
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-tags] [data-tag]"));
  if (!host || !chips.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var tags = chips.map(function (c) { return { name: c.getAttribute("data-tag"), n: +c.getAttribute("data-n") || 1, chip: c }; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 36);
  var nMax = tags[0].n, nMin = tags[tags.length - 1].n;
  var slots = ["s1", "s2", "s3", "s4", "s5"];
  var golden = Math.PI * (3 - Math.sqrt(5)), M = tags.length;
  var items = tags.map(function (t, i) {
    var j = (i * 17) % M; // 많이 쓴 태그가 한쪽에 몰리지 않게 구 위에 고르게 흩는다
    var y = 1 - (j / Math.max(1, M - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * j;
    var b = document.createElement("button");
    b.type = "button"; b.className = "tagsphere__tag " + slots[i % 5];
    b.textContent = "#" + t.name;
    b.setAttribute("aria-label", t.name + " 태그, 글 " + t.n + "개");
    var w = nMax === nMin ? 0.5 : (t.n - nMin) / (nMax - nMin);
    b.style.fontSize = (12 + Math.sqrt(w) * 14).toFixed(1) + "px";
    b.addEventListener("click", function () { t.chip.click(); var r2 = document.querySelector("[data-tag-result]"); if (r2) r2.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); });
    b.addEventListener("focus", function () { paused = true; });
    b.addEventListener("blur", function () { paused = false; });
    host.appendChild(b);
    return { el: b, x: Math.cos(th) * r, y: y, z: Math.sin(th) * r };
  });

  var ax = 0.25, ay = 0, vx = 0.0016, vy = 0.0032, dragging = false, lx = 0, ly = 0, paused = false, running = false, raf = 0, hover = false;
  function render() {
    var RX = Math.min(host.clientWidth * 0.4, host.clientHeight * 0.75), RY = host.clientHeight * 0.4, cx = host.clientWidth / 2, cy = host.clientHeight / 2;
    var cX = Math.cos(ax), sX = Math.sin(ax), cY = Math.cos(ay), sY = Math.sin(ay);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var x1 = it.x * cY + it.z * sY, z1 = -it.x * sY + it.z * cY;
      var y2 = it.y * cX - z1 * sX, z2 = it.y * sX + z1 * cX;
      var k = 2.2 / (2.2 + z2), depth = (1 - z2) / 2; // 앞쪽일수록 1
      it.el.style.transform = "translate(-50%,-50%) translate(" + (cx + x1 * RX * k).toFixed(1) + "px," + (cy + y2 * RY * k).toFixed(1) + "px) scale(" + (0.6 + depth * 0.55).toFixed(3) + ")";
      it.el.style.opacity = (0.22 + depth * 0.78).toFixed(3);
      it.el.style.zIndex = String(Math.round(depth * 100));
      it.el.style.filter = depth < 0.35 ? "blur(" + ((0.35 - depth) * 4).toFixed(2) + "px)" : "none";
    }
  }
  function loop() {
    if (!dragging && !paused && !hover) { ay += vy; ax += (0.25 - ax) * 0.01 + vx * 0.2; }
    vy += (0.0032 - vy) * 0.02;
    render();
    if (running) raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  host.addEventListener("pointerdown", function (e) { if (e.target.closest(".tagsphere__tag")) return; dragging = true; lx = e.clientX; ly = e.clientY; try { host.setPointerCapture(e.pointerId); } catch (x) { } });
  host.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    ay += dx * 0.008; ax = Math.max(-1.2, Math.min(1.2, ax + dy * 0.008)); vy = dx * 0.0008;
    if (!running) render();
  });
  host.addEventListener("pointerup", function () { dragging = false; });
  host.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
  host.addEventListener("pointerleave", function () { hover = false; dragging = false; });

  render(); start();
  window.addEventListener("resize", render);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }).observe(host);
})();
