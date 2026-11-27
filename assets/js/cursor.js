/* Study Note — 마우스 인터랙션. 외부 라이브러리 없음.
   1) 커서를 따라오는 링: 링크·버튼 위에서는 커지고, 누르면 줄어든다
   2) 자석 버튼: 버튼·칩이 커서 쪽으로 살짝 끌려온다
   3) 카드 스포트라이트: 카드 위에 커서 위치를 따라 빛이 번진다
   4) 클릭 버스트: 누른 자리에서 분야 색 입자가 터진다
   5) 드래그 스트림: 빈 곳을 드래그하면 데이터 선이 꼬리처럼 남는다
   6) 텍스트를 선택하면 "복사" 말풍선이 뜬다
   키보드·터치 사용자는 그대로 쓰고, 동작 줄이기 설정이면 움직임 효과는 끈다. */
(function () {
  "use strict";
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doc = document, root = doc.documentElement;

  /* ---------- 6. 텍스트 선택 → 복사 말풍선 (터치에서도 동작) ---------- */
  var bubble = doc.createElement("button");
  bubble.type = "button"; bubble.className = "selbubble"; bubble.textContent = "복사"; bubble.hidden = true;
  doc.body.appendChild(bubble);
  var selText = "";
  function hideBubble() { bubble.hidden = true; }
  doc.addEventListener("selectionchange", function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hideBubble(); return; }
    var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode);
    if (!node || !node.closest || !node.closest(".prose")) { hideBubble(); return; }
    selText = sel.toString().trim();
    if (selText.length < 2) { hideBubble(); return; }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) { hideBubble(); return; }
    bubble.hidden = false;
    bubble.style.transform = "translate(" + Math.round(r.left + r.width / 2 + window.scrollX) + "px," + Math.round(r.top + window.scrollY - 8) + "px) translate(-50%,-100%)";
  });
  bubble.addEventListener("mousedown", function (e) { e.preventDefault(); }); // 선택이 풀리지 않게
  bubble.addEventListener("click", function () {
    var done = function () { bubble.textContent = "복사됨"; setTimeout(function () { bubble.textContent = "복사"; hideBubble(); }, 900); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(selText).then(done, done); else done();
  });

  if (!fine) return; // 아래부터는 마우스 전용

  /* ---------- 3. 카드 스포트라이트 ---------- */
  var litCard = null;
  doc.addEventListener("pointermove", function (e) {
    var card = e.target.closest && e.target.closest(".card");
    if (card !== litCard) { if (litCard) litCard.classList.remove("is-lit"); litCard = card; if (card) card.classList.add("is-lit"); }
    if (card) { var r = card.getBoundingClientRect(); card.style.setProperty("--mx", (e.clientX - r.left) + "px"); card.style.setProperty("--my", (e.clientY - r.top) + "px"); }
  }, { passive: true });

  if (reduce) return; // 움직이는 효과는 여기서부터

  /* ---------- 1. 따라오는 링 ---------- */
  var ring = doc.createElement("div"), dot = doc.createElement("div");
  ring.className = "cursor-ring"; dot.className = "cursor-dot";
  ring.setAttribute("aria-hidden", "true"); dot.setAttribute("aria-hidden", "true");
  doc.body.appendChild(ring); doc.body.appendChild(dot);
  root.classList.add("has-cursor");
  var mx = -100, my = -100, rx = -100, ry = -100, shown = false;
  var INTERACTIVE = "a, button, [role=button], summary, label, select, .chip, .pressable, [data-tilt], .tagsphere__tag";
  var TEXT = "input, textarea, [contenteditable=true], .prose p, .prose li, .prose td, .prose pre, .prose code";

  /* ---------- 2. 자석 버튼 ---------- */
  var MAG = ".btn, .chip, .icon-btn, .tab, .topnav a, .pager__item";
  var magEl = null;
  function releaseMag() { if (magEl) { magEl.style.transform = ""; magEl.classList.remove("is-mag"); magEl = null; } }

  doc.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; rx = mx; ry = my; ring.classList.add("is-on"); dot.classList.add("is-on"); }
    var t = e.target;
    ring.classList.toggle("is-link", !!(t.closest && t.closest(INTERACTIVE)));
    ring.classList.toggle("is-text", !!(t.closest && t.closest(TEXT)) && !(t.closest && t.closest(INTERACTIVE)));
    var m = t.closest && t.closest(MAG);
    if (m && m.closest("[data-tilt]") !== m) {
      if (m !== magEl) { releaseMag(); magEl = m; m.classList.add("is-mag"); }
      var r = m.getBoundingClientRect(), dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
      m.style.transform = "translate(" + (dx * 0.18).toFixed(1) + "px," + (dy * 0.25).toFixed(1) + "px)";
    } else releaseMag();
    if (dragging) addTrail(mx, my);
  }, { passive: true });
  doc.addEventListener("pointerleave", function () { ring.classList.remove("is-on"); dot.classList.remove("is-on"); shown = false; releaseMag(); });
  window.addEventListener("blur", releaseMag);

  /* ---------- 4·5. 캔버스 효과 (버스트, 드래그 스트림) ---------- */
  var cv = doc.createElement("canvas"); cv.className = "fx-layer"; cv.setAttribute("aria-hidden", "true");
  doc.body.appendChild(cv);
  var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1;
  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr | 0; cv.height = H * dpr | 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  resize(); window.addEventListener("resize", resize);
  function palette() {
    var cs = getComputedStyle(root), out = [];
    for (var i = 1; i <= 5; i++) out.push((cs.getPropertyValue("--s" + i) || "#3182f6").trim());
    return out;
  }
  var pal = palette(); doc.addEventListener("themechange", function () { pal = palette(); });
  var parts = [], trail = [], dragging = false, downX = 0, downY = 0, running = false;

  function burst(x, y, big) {
    var n = big ? 22 : 12;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (big ? 2.2 : 1.6) + Math.random() * 3;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: pal[(Math.random() * pal.length) | 0], r: 1.5 + Math.random() * 2.5, sq: Math.random() < 0.35 });
    }
    parts.push({ ring: true, x: x, y: y, life: 1, c: pal[0] });
    kick();
  }
  function addTrail(x, y) {
    var last = trail[trail.length - 1];
    if (last && Math.abs(last.x - x) + Math.abs(last.y - y) < 4) return;
    trail.push({ x: x, y: y, life: 1, c: pal[(trail.length / 6 | 0) % pal.length] });
    if (trail.length > 90) trail.shift();
    kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    // 드래그 스트림: 점을 잇는 선 + 마디 점
    for (var i = trail.length - 1; i >= 0; i--) { trail[i].life -= dragging ? 0.012 : 0.04; if (trail[i].life <= 0) trail.splice(i, 1); }
    if (trail.length > 1) {
      for (var j = 1; j < trail.length; j++) {
        var A = trail[j - 1], B = trail[j];
        ctx.strokeStyle = hexA(B.c, B.life * 0.7); ctx.lineWidth = 1 + B.life * 2.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        if (j % 5 === 0) { ctx.fillStyle = hexA(B.c, B.life); ctx.beginPath(); ctx.arc(B.x, B.y, 2 + B.life * 2.5, 0, 6.283); ctx.fill(); }
      }
    }
    // 버스트 입자
    for (var k = parts.length - 1; k >= 0; k--) {
      var p = parts[k];
      if (p.ring) {
        p.life -= 0.045;
        ctx.strokeStyle = hexA(p.c, p.life * 0.6); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, (1 - p.life) * 38 + 4, 0, 6.283); ctx.stroke();
      } else {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy = p.vy * 0.92 + 0.12; p.life -= 0.03;
        ctx.fillStyle = hexA(p.c, p.life);
        if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 6); ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      }
      if (p.life <= 0) parts.splice(k, 1);
    }
    // 링 따라오기
    rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
    ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
    dot.style.transform = "translate(" + mx + "px," + my + "px)";
    if (parts.length || trail.length || Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(tick); else running = false;
  }
  function hexA(h, a) { var m = /^#([0-9a-f]{6})$/i.exec(h); if (!m) return "rgba(49,130,246," + a + ")"; return "rgba(" + parseInt(m[1].substr(0, 2), 16) + "," + parseInt(m[1].substr(2, 2), 16) + "," + parseInt(m[1].substr(4, 2), 16) + "," + Math.max(0, a).toFixed(3) + ")"; }
  doc.addEventListener("pointermove", function () { kick(); }, { passive: true });

  doc.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    ring.classList.add("is-down");
    var t = e.target;
    downX = e.clientX; downY = e.clientY;
    // 글자·입력창·캔버스 위에서는 드래그 스트림을 만들지 않는다 (텍스트 선택과 차트 회전을 방해하지 않게)
    var skip = t.closest && t.closest(TEXT + ", canvas, .prose, input, textarea, [data-tagsphere], .tagcloud");
    dragging = !skip;
    if (dragging) trail = [{ x: downX, y: downY, life: 1, c: pal[0] }];
  });
  doc.addEventListener("pointerup", function (e) {
    if (e.pointerType !== "mouse") return;
    ring.classList.remove("is-down");
    var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
    var t = e.target, hit = t.closest && t.closest(INTERACTIVE);
    if (moved < 6 && hit) burst(e.clientX, e.clientY, !!(t.closest && t.closest(".btn--primary, .tagsphere__tag")));
    else if (moved < 6 && !(t.closest && t.closest(TEXT + ", canvas"))) burst(e.clientX, e.clientY, false);
    dragging = false;
  });
  // 드래그 스트림이 길게 그려지면 끝에서 한번 터뜨려 준다
  doc.addEventListener("pointerup", function (e) { if (e.pointerType === "mouse" && trail.length > 25) burst(e.clientX, e.clientY, true); });
  doc.addEventListener("dragstart", function () { dragging = false; });
})();
