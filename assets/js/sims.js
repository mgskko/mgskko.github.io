/* Study Note — ML 개념 시뮬레이터 (글 안에서 <div class="sim" data-sim="이름"></div> 로 사용)
   kNN 회귀 · 선형회귀 · 경사하강법 · k-평균 · 활성화 함수 · 신경망 놀이터
   전부 브라우저 안에서 계산한다. 외부 라이브러리 없음. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 공통 도구 ---------- */
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function palette() {
    return { blue: css("--blue"), t1: css("--t1"), t2: css("--t2"), t3: css("--t3"), line: css("--line"), surface: css("--surface"), fill: css("--fill"),
      s: [css("--s1"), css("--s2"), css("--s3"), css("--s4"), css("--s5")], red: css("--red"), green: css("--green") };
  }
  function rnd() { // 표준정규 (Box-Muller)
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v);
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function hexA(hex, a) { // #rrggbb -> rgba
    var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    return "rgba(" + parseInt(m[1].substr(0, 2), 16) + "," + parseInt(m[1].substr(2, 2), 16) + "," + parseInt(m[1].substr(4, 2), 16) + "," + a + ")";
  }

  // 위젯 뼈대: 제목, 설명, 컨트롤 줄, 캔버스, 상태 줄
  function frame(host, title, desc, ratio) {
    host.classList.add("lw", "sim");
    host.innerHTML = "";
    host.appendChild(el("p", "lw__title", title));
    host.appendChild(el("p", "lw__desc", desc));
    var ctl = el("div", "lw__controls"); host.appendChild(ctl);
    var wrap = el("div", "sim__wrap"); var cv = el("canvas", "sim__cv"); wrap.appendChild(cv); host.appendChild(wrap);
    var info = el("div", "lw__foot sim__info"); host.appendChild(info);
    var ctx = cv.getContext("2d"), W = 0, H = 0, onDraw = function () {};
    function resize() {
      var w = Math.floor(wrap.clientWidth); if (!w) return;
      var h = Math.round(w * (ratio || 0.6)); var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.height = h + "px"; cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h; onDraw();
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(wrap); else window.addEventListener("resize", resize);
    document.addEventListener("themechange", function () { onDraw(); });
    return {
      ctl: ctl, cv: cv, ctx: ctx, info: info, host: host,
      size: function () { return { w: W, h: H }; },
      draw: function (fn) { onDraw = fn; resize(); },
      redraw: function () { onDraw(); },
      pos: function (e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    };
  }
  function slider(ctl, label, min, max, step, val, unit, cb) {
    var f = el("label", "lw__field"); f.appendChild(document.createTextNode(label + " "));
    var inp = el("input"); inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = val; inp.setAttribute("aria-label", label);
    var u = el("span", "lw__u"); var v = el("span", "lw__val", String(val)); u.appendChild(v); if (unit) u.appendChild(document.createTextNode(unit));
    f.appendChild(inp); f.appendChild(u); ctl.appendChild(f);
    inp.addEventListener("input", function () { v.textContent = inp.value; cb(+inp.value); });
    return inp;
  }
  function button(ctl, text, cb, primary) {
    var b = el("button", "chip chip--sm pressable" + (primary ? " is-active" : ""), text); b.type = "button";
    b.addEventListener("click", cb); ctl.appendChild(b); return b;
  }
  function seg(ctl, label, opts, cb) {
    var f = el("span", "lw__field"); f.appendChild(document.createTextNode(label + " "));
    var s = el("span", "lw__seg"); s.setAttribute("role", "group");
    opts.forEach(function (o, i) {
      var b = el("button", "", o[1]); b.type = "button"; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      b.addEventListener("click", function () { Array.prototype.forEach.call(s.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); }); cb(o[0]); });
      s.appendChild(b);
    });
    f.appendChild(s); ctl.appendChild(f);
  }
  function axes(ctx, P, W, H, pad) {
    ctx.strokeStyle = P.line; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(pad, H - pad); ctx.lineTo(W - 6, H - pad); ctx.moveTo(pad, 6); ctx.lineTo(pad, H - pad); ctx.stroke();
  }
  function dot(ctx, x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  var SIMS = {};

  /* ---------- 1. k-최근접 이웃 회귀 ---------- */
  SIMS.knn = function (host) {
    var f = frame(host, "k-최근접 이웃 회귀", "캔버스 위를 움직이거나 눌러 보세요. 그 위치에서 가장 가까운 k개 점의 평균이 예측값이에요.", 0.52);
    var pts = [], k = 3, qx = 0.5, N = 40;
    function gen() { pts = []; for (var i = 0; i < N; i++) { var x = Math.random(); pts.push({ x: x, y: 0.5 + 0.34 * Math.sin(x * 6.2832 * 1.1) + rnd() * 0.07 }); } }
    function pred(x, kk) { var s = pts.map(function (p) { return { p: p, d: Math.abs(p.x - x) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, kk); return { n: s, y: s.reduce(function (a, b) { return a + b.p.y; }, 0) / kk }; }
    slider(f.ctl, "k", 1, 15, 1, k, "", function (v) { k = v; f.redraw(); });
    button(f.ctl, "데이터 새로 만들기", function () { gen(); f.redraw(); });
    gen();
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), pad = 28, W = s.w, H = s.h;
      c.clearRect(0, 0, W, H); axes(c, P, W, H, pad);
      var X = function (x) { return pad + x * (W - pad - 10); }, Y = function (y) { return H - pad - y * (H - pad - 14); };
      // 예측 곡선
      c.beginPath(); for (var i = 0; i <= 160; i++) { var x = i / 160, y = pred(x, k).y; if (i) c.lineTo(X(x), Y(y)); else c.moveTo(X(x), Y(y)); }
      c.strokeStyle = P.blue; c.lineWidth = 2.5; c.stroke();
      var q = pred(qx, k);
      pts.forEach(function (p) { dot(c, X(p.x), Y(p.y), 4, hexA(P.t3, 0.55)); });
      q.n.forEach(function (n) { c.beginPath(); c.moveTo(X(qx), Y(q.y)); c.lineTo(X(n.p.x), Y(n.p.y)); c.strokeStyle = hexA(P.s[1], 0.5); c.lineWidth = 1; c.stroke(); dot(c, X(n.p.x), Y(n.p.y), 5, P.s[1]); });
      c.setLineDash([4, 4]); c.beginPath(); c.moveTo(X(qx), 6); c.lineTo(X(qx), H - pad); c.strokeStyle = P.t3; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      dot(c, X(qx), Y(q.y), 7, P.blue, P.surface);
      f.info.innerHTML = "<span>x = <b>" + qx.toFixed(2) + "</b></span><span>예측 y = <b>" + q.y.toFixed(3) + "</b></span><span>" + (k <= 2 ? "k가 작아 점 하나에 휘둘려요 (과대적합)" : k >= 11 ? "k가 커서 곡선이 너무 뭉개져요 (과소적합)" : "적당히 매끄러운 곡선이에요") + "</span>";
    });
    function move(e) { var p = f.pos(e), s = f.size(); qx = Math.max(0, Math.min(1, (p.x - 28) / (s.w - 38))); f.redraw(); }
    f.cv.addEventListener("pointermove", move); f.cv.addEventListener("pointerdown", move);
  };

  /* ---------- 2. 선형회귀 ---------- */
  SIMS.linreg = function (host) {
    var f = frame(host, "선형회귀 직접 만들어 보기", "빈 곳을 누르면 점이 추가되고, 점을 끌면 움직여요. 최소제곱 직선이 바로 다시 계산돼요.", 0.55);
    var pts = [], drag = -1;
    function init() { pts = []; for (var i = 0; i < 12; i++) { var x = 0.08 + 0.84 * i / 11; pts.push({ x: x, y: 0.2 + 0.6 * x + rnd() * 0.07 }); } }
    button(f.ctl, "처음 데이터로", function () { init(); f.redraw(); });
    button(f.ctl, "점 모두 지우기", function () { pts = []; f.redraw(); });
    init();
    function fit() {
      var n = pts.length; if (n < 2) return null;
      var mx = 0, my = 0; pts.forEach(function (p) { mx += p.x; my += p.y; }); mx /= n; my /= n;
      var sxy = 0, sxx = 0; pts.forEach(function (p) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) * (p.x - mx); });
      if (sxx < 1e-9) return null; var w = sxy / sxx; return { w: w, b: my - w * mx };
    }
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), pad = 28, W = s.w, H = s.h;
      c.clearRect(0, 0, W, H); axes(c, P, W, H, pad);
      var X = function (x) { return pad + x * (W - pad - 10); }, Y = function (y) { return H - pad - y * (H - pad - 14); };
      var m = fit(), mse = 0;
      if (m) {
        pts.forEach(function (p) { var yh = m.w * p.x + m.b; mse += (p.y - yh) * (p.y - yh); c.beginPath(); c.moveTo(X(p.x), Y(p.y)); c.lineTo(X(p.x), Y(yh)); c.strokeStyle = hexA(P.s[1], 0.55); c.lineWidth = 1.5; c.stroke(); });
        mse /= pts.length;
        c.beginPath(); c.moveTo(X(0), Y(m.b)); c.lineTo(X(1), Y(m.w + m.b)); c.strokeStyle = P.blue; c.lineWidth = 3; c.stroke();
      }
      pts.forEach(function (p, i) { dot(c, X(p.x), Y(p.y), i === drag ? 8 : 6, P.t1, P.surface); });
      f.info.innerHTML = m ? "<span>y = <b>" + m.w.toFixed(2) + "</b>x + <b>" + m.b.toFixed(2) + "</b></span><span>MSE(평균 제곱 오차) = <b>" + mse.toFixed(4) + "</b></span><span>주황 선이 잔차예요</span>" : "<span>점을 2개 이상 찍어 보세요</span>";
    });
    function toData(e) { var p = f.pos(e), s = f.size(); return { x: (p.x - 28) / (s.w - 38), y: (s.h - 28 - p.y) / (s.h - 42) }; }
    f.cv.addEventListener("pointerdown", function (e) {
      var d = toData(e), s = f.size(), best = -1, bd = 14 / (s.w - 38);
      pts.forEach(function (p, i) { var dd = Math.hypot((p.x - d.x) * (s.w - 38), (p.y - d.y) * (s.h - 42)); if (dd < 14 && dd / (s.w - 38) <= bd) { bd = dd / (s.w - 38); best = i; } });
      if (best >= 0) { drag = best; f.cv.setPointerCapture(e.pointerId); } else if (d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1) { pts.push(d); drag = pts.length - 1; f.cv.setPointerCapture(e.pointerId); }
      f.redraw();
    });
    f.cv.addEventListener("pointermove", function (e) { if (drag < 0) return; var d = toData(e); pts[drag].x = Math.max(0, Math.min(1, d.x)); pts[drag].y = Math.max(0, Math.min(1, d.y)); f.redraw(); });
    f.cv.addEventListener("pointerup", function () { drag = -1; f.redraw(); });
  };

  /* ---------- 3. 경사하강법 ---------- */
  SIMS.gd = function (host) {
    var f = frame(host, "경사하강법", "손실 함수의 등고선 위를 눌러 시작점을 정하세요. 학습률이 너무 크면 발산하는 것도 직접 확인해 보세요.", 0.55);
    var lr = 0.12, pos = { w: -1.6, b: 1.6 }, path = [], timer = 0, running = false;
    var L = function (w, b) { return 0.5 * (w - 1) * (w - 1) + 4 * (b + 1) * (b + 1); };
    var G = function (w, b) { return { w: (w - 1), b: 8 * (b + 1) }; };
    var R = { w0: -3, w1: 3.4, b0: -3, b1: 3 };
    slider(f.ctl, "학습률", 0.01, 0.30, 0.01, lr, "", function (v) { lr = v; });
    var runBtn = button(f.ctl, "자동 실행", function () { running = !running; runBtn.textContent = running ? "멈춤" : "자동 실행"; if (running) loop(); }, true);
    button(f.ctl, "한 걸음", function () { step(); });
    button(f.ctl, "처음으로", function () { pos = { w: -1.6, b: 1.6 }; path = [{ w: pos.w, b: pos.b }]; running = false; runBtn.textContent = "자동 실행"; f.redraw(); });
    path.push({ w: pos.w, b: pos.b });
    function step() { var g = G(pos.w, pos.b); pos = { w: pos.w - lr * g.w, b: pos.b - lr * g.b }; path.push({ w: pos.w, b: pos.b }); if (path.length > 400) path.shift(); f.redraw(); }
    function loop() { if (!running) return; step(); var l = L(pos.w, pos.b); if (!isFinite(l) || l > 1e6 || l < 1e-6) { running = false; runBtn.textContent = "자동 실행"; f.redraw(); return; } timer = setTimeout(loop, reduce ? 30 : 90); }
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), W = s.w, H = s.h;
      var X = function (w) { return (w - R.w0) / (R.w1 - R.w0) * W; }, Y = function (b) { return H - (b - R.b0) / (R.b1 - R.b0) * H; };
      c.clearRect(0, 0, W, H);
      // 손실 색 (로그 스케일)
      var cs = 14; for (var x = 0; x < W; x += cs) for (var y = 0; y < H; y += cs) {
        var w = R.w0 + (x + cs / 2) / W * (R.w1 - R.w0), b = R.b0 + (H - y - cs / 2) / H * (R.b1 - R.b0);
        var l = Math.log10(1 + L(w, b)), t = Math.min(1, l / 1.8);
        c.fillStyle = hexA(P.blue, 0.06 + 0.5 * (1 - t)); c.fillRect(x, y, cs, cs);
      }
      // 등고선
      [0.2, 1, 3, 8, 16].forEach(function (lv) { c.beginPath(); for (var a = 0; a <= 64; a++) { var th = a / 64 * 6.2832, w = 1 + Math.sqrt(2 * lv) * Math.cos(th), b = -1 + Math.sqrt(lv / 4) * Math.sin(th); if (a) c.lineTo(X(w), Y(b)); else c.moveTo(X(w), Y(b)); } c.strokeStyle = hexA(P.t3, 0.45); c.lineWidth = 1; c.stroke(); });
      dot(c, X(1), Y(-1), 6, P.green, P.surface);
      c.beginPath(); path.forEach(function (p, i) { var px = X(p.w), py = Y(p.b); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.strokeStyle = P.s[1]; c.lineWidth = 2; c.stroke();
      path.forEach(function (p) { dot(c, X(p.w), Y(p.b), 2.5, P.s[1]); });
      dot(c, X(pos.w), Y(pos.b), 7, P.t1, P.surface);
      var loss = L(pos.w, pos.b);
      var status = !isFinite(loss) || loss > 1e4 ? "발산했어요! 학습률을 줄여 보세요" : loss < 1e-3 ? "최솟값에 도착했어요" : lr > 0.25 ? "학습률이 커서 불안정해요 (0.25를 넘으면 발산)" : lr < 0.04 ? "학습률이 작아 아주 느려요" : "순조롭게 내려가는 중";
      f.info.innerHTML = "<span>걸음 수 <b>" + (path.length - 1) + "</b></span><span>손실 <b>" + (loss > 1e4 ? "∞" : loss.toFixed(4)) + "</b></span><span>" + status + "</span>";
    });
    f.cv.addEventListener("pointerdown", function (e) { var p = f.pos(e), s = f.size(); pos = { w: R.w0 + p.x / s.w * (R.w1 - R.w0), b: R.b0 + (s.h - p.y) / s.h * (R.b1 - R.b0) }; path = [{ w: pos.w, b: pos.b }]; f.redraw(); });
  };

  /* ---------- 4. k-평균 ---------- */
  SIMS.kmeans = function (host) {
    var f = frame(host, "k-평균 군집화", "‘한 걸음’은 (1) 가장 가까운 중심으로 배정 → (2) 중심 이동을 한 번씩 해요. 중심이 더 안 움직이면 끝나요.", 0.58);
    var pts = [], cent = [], asg = [], k = 3, iter = 0, done = false, timer = 0, auto = false;
    function gen() { pts = []; var cs = [[0.25, 0.3], [0.7, 0.35], [0.45, 0.75], [0.85, 0.8]]; for (var i = 0; i < 120; i++) { var c = cs[i % 4]; pts.push({ x: c[0] + rnd() * 0.075, y: c[1] + rnd() * 0.075 }); } init(); }
    function init() { cent = []; var idx = []; while (idx.length < k) { var r = (Math.random() * pts.length) | 0; if (idx.indexOf(r) < 0) idx.push(r); } idx.forEach(function (r) { cent.push({ x: pts[r].x, y: pts[r].y }); }); asg = pts.map(function () { return -1; }); iter = 0; done = false; assign(); }
    function assign() { pts.forEach(function (p, i) { var bd = 1e9, bi = 0; cent.forEach(function (c, j) { var d = (p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y); if (d < bd) { bd = d; bi = j; } }); asg[i] = bi; }); }
    function step() {
      if (done) return; assign(); var moved = 0;
      cent.forEach(function (c, j) { var sx = 0, sy = 0, n = 0; pts.forEach(function (p, i) { if (asg[i] === j) { sx += p.x; sy += p.y; n++; } }); if (n) { var nx = sx / n, ny = sy / n; moved += Math.abs(nx - c.x) + Math.abs(ny - c.y); c.x = nx; c.y = ny; } });
      iter++; assign(); if (moved < 1e-5) done = true; f.redraw();
    }
    function loop() { if (!auto || done) { auto = false; autoBtn.textContent = "자동 실행"; return; } step(); timer = setTimeout(loop, reduce ? 40 : 450); }
    slider(f.ctl, "k", 2, 6, 1, k, "", function (v) { k = v; init(); f.redraw(); });
    button(f.ctl, "한 걸음", function () { step(); }, true);
    var autoBtn = button(f.ctl, "자동 실행", function () { auto = !auto; autoBtn.textContent = auto ? "멈춤" : "자동 실행"; if (auto) loop(); });
    button(f.ctl, "중심 다시 뽑기", function () { init(); f.redraw(); });
    button(f.ctl, "데이터 새로", function () { gen(); f.redraw(); });
    gen();
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), W = s.w, H = s.h, pad = 14;
      var X = function (x) { return pad + x * (W - 2 * pad); }, Y = function (y) { return H - pad - y * (H - 2 * pad); };
      c.clearRect(0, 0, W, H);
      pts.forEach(function (p, i) { dot(c, X(p.x), Y(p.y), 4, hexA(P.s[asg[i] % 5], 0.8)); });
      var inertia = 0; pts.forEach(function (p, i) { var q = cent[asg[i]]; inertia += (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y); });
      cent.forEach(function (q, j) { c.save(); c.translate(X(q.x), Y(q.y)); c.rotate(0.7854); c.fillStyle = P.s[j % 5]; c.strokeStyle = P.surface; c.lineWidth = 2.5; c.fillRect(-8, -8, 16, 16); c.strokeRect(-8, -8, 16, 16); c.restore(); });
      f.info.innerHTML = "<span>반복 <b>" + iter + "</b>회</span><span>이너셔(중심까지 거리² 합) <b>" + inertia.toFixed(3) + "</b></span><span>" + (done ? "수렴했어요" : "진행 중") + "</span>";
    });
  };

  /* ---------- 5. 활성화 함수 ---------- */
  SIMS.activation = function (host) {
    var f = frame(host, "활성화 함수 살펴보기", "함수를 고르고 x를 움직여 보세요. 파란 선이 함수, 주황 점선이 미분(기울기)이에요.", 0.5);
    var FN = {
      sigmoid: { n: "시그모이드", f: function (x) { return 1 / (1 + Math.exp(-x)); }, d: function (x) { var s = 1 / (1 + Math.exp(-x)); return s * (1 - s); }, note: "0~1로 눌러요. 양끝에서 기울기가 거의 0이라 학습이 느려져요 (기울기 소실)" },
      tanh: { n: "tanh", f: Math.tanh, d: function (x) { var t = Math.tanh(x); return 1 - t * t; }, note: "-1~1로 눌러요. 시그모이드보다 중심이 0이라 학습이 낫지만 양끝은 똑같이 납작해요" },
      relu: { n: "ReLU", f: function (x) { return Math.max(0, x); }, d: function (x) { return x > 0 ? 1 : 0; }, note: "양수는 그대로, 음수는 0. 계산이 단순하고 양수 쪽 기울기가 1이라 깊은 망에 잘 맞아요" },
      leaky: { n: "Leaky ReLU", f: function (x) { return x > 0 ? x : 0.1 * x; }, d: function (x) { return x > 0 ? 1 : 0.1; }, note: "음수에도 작은 기울기(0.1)를 남겨 ‘죽은 ReLU’를 막아요" },
      softplus: { n: "소프트플러스", f: function (x) { return Math.log(1 + Math.exp(x)); }, d: function (x) { return 1 / (1 + Math.exp(-x)); }, note: "ReLU를 매끈하게 만든 함수예요. 미분이 시그모이드가 돼요" }
    };
    var cur = "sigmoid", x0 = 1;
    seg(f.ctl, "함수", Object.keys(FN).map(function (k) { return [k, FN[k].n]; }), function (v) { cur = v; f.redraw(); });
    slider(f.ctl, "x", -6, 6, 0.1, x0, "", function (v) { x0 = v; f.redraw(); });
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), W = s.w, H = s.h, fn = FN[cur];
      var xr = 6, yr0 = -1.5, yr1 = 3; if (cur === "relu" || cur === "leaky" || cur === "softplus") { yr1 = 6; yr0 = -1; }
      var X = function (x) { return (x + xr) / (2 * xr) * W; }, Y = function (y) { return H - (y - yr0) / (yr1 - yr0) * H; };
      c.clearRect(0, 0, W, H); c.strokeStyle = P.line; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
      c.beginPath(); for (var i = 0; i <= 240; i++) { var x = -xr + 2 * xr * i / 240, y = fn.d(x); if (i) c.lineTo(X(x), Y(y)); else c.moveTo(X(x), Y(y)); } c.setLineDash([5, 4]); c.strokeStyle = P.s[1]; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
      c.beginPath(); for (var j = 0; j <= 240; j++) { var x2 = -xr + 2 * xr * j / 240, y2 = fn.f(x2); if (j) c.lineTo(X(x2), Y(y2)); else c.moveTo(X(x2), Y(y2)); } c.strokeStyle = P.blue; c.lineWidth = 3; c.stroke();
      c.setLineDash([3, 4]); c.beginPath(); c.moveTo(X(x0), 0); c.lineTo(X(x0), H); c.strokeStyle = P.t3; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      dot(c, X(x0), Y(fn.f(x0)), 7, P.blue, P.surface); dot(c, X(x0), Y(fn.d(x0)), 6, P.s[1], P.surface);
      f.info.innerHTML = "<span>f(x) = <b>" + fn.f(x0).toFixed(3) + "</b></span><span>f′(x) = <b>" + fn.d(x0).toFixed(3) + "</b></span><span>" + fn.note + "</span>";
    });
  };

  /* ---------- 6. 신경망 놀이터 ---------- */
  SIMS.nn = function (host) {
    var f = frame(host, "신경망 놀이터", "점들을 가르는 경계를 신경망이 스스로 배워요. 데이터와 층 크기를 바꿔 보고, 학습하는 모습을 지켜보세요.", 0.62);
    var data = [], ds = "circle", H1 = 6, lr = 0.08, run = false, epoch = 0, loss = 0, net, raf = 0;
    function gen() {
      data = [];
      for (var i = 0; i < 160; i++) {
        var x, y, l;
        if (ds === "circle") { var r = Math.random() < 0.5 ? 0.35 * Math.sqrt(Math.random()) : 0.62 + 0.3 * Math.random(); var a = Math.random() * 6.2832; x = r * Math.cos(a); y = r * Math.sin(a); l = r < 0.5 ? 1 : 0; x += rnd() * 0.03; y += rnd() * 0.03; }
        else if (ds === "xor") { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; l = (x * y > 0) ? 1 : 0; x += rnd() * 0.04; y += rnd() * 0.04; }
        else if (ds === "spiral") { var t = Math.random() * 3.6 + 0.2, cl = i % 2; var ang = t * 1.7 + cl * 3.1416; x = 0.25 * t * Math.cos(ang) + rnd() * 0.025; y = 0.25 * t * Math.sin(ang) + rnd() * 0.025; l = cl; }
        else { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; l = (x + 0.6 * y > 0) ? 1 : 0; x += rnd() * 0.06; y += rnd() * 0.06; }
        data.push({ x: x, y: y, l: l });
      }
      reset();
    }
    function reset() {
      var h = H1; net = { W1: [], b1: [], W2: [], b2: [], W3: [], b3: 0 };
      for (var i = 0; i < h; i++) { net.W1.push([rnd() * 0.9, rnd() * 0.9]); net.b1.push(0); net.W2.push([]); for (var j = 0; j < h; j++) net.W2[i].push(rnd() * Math.sqrt(1 / h) * 1.2); net.b2.push(0); net.W3.push(rnd() * 0.7); }
      epoch = 0; loss = 0;
    }
    function fwd(x, y) {
      var h = H1, a1 = new Array(h), a2 = new Array(h), i, j, s;
      for (i = 0; i < h; i++) a1[i] = Math.tanh(net.W1[i][0] * x + net.W1[i][1] * y + net.b1[i]);
      for (i = 0; i < h; i++) { s = net.b2[i]; for (j = 0; j < h; j++) s += net.W2[i][j] * a1[j]; a2[i] = Math.tanh(s); }
      s = net.b3; for (i = 0; i < h; i++) s += net.W3[i] * a2[i];
      return { a1: a1, a2: a2, o: 1 / (1 + Math.exp(-s)) };
    }
    function train(n) {
      var h = H1, tl = 0, c = 0;
      for (var it = 0; it < n; it++) {
        var d = data[(Math.random() * data.length) | 0], r = fwd(d.x, d.y), e = r.o - d.l;
        tl += -(d.l * Math.log(r.o + 1e-9) + (1 - d.l) * Math.log(1 - r.o + 1e-9)); c++;
        var g2 = new Array(h), g1 = new Array(h), i, j;
        for (i = 0; i < h; i++) g2[i] = e * net.W3[i] * (1 - r.a2[i] * r.a2[i]);
        for (j = 0; j < h; j++) { var s = 0; for (i = 0; i < h; i++) s += g2[i] * net.W2[i][j]; g1[j] = s * (1 - r.a1[j] * r.a1[j]); }
        for (i = 0; i < h; i++) { net.W3[i] -= lr * e * r.a2[i]; for (j = 0; j < h; j++) net.W2[i][j] -= lr * g2[i] * r.a1[j]; net.b2[i] -= lr * g2[i]; net.W1[i][0] -= lr * g1[i] * d.x; net.W1[i][1] -= lr * g1[i] * d.y; net.b1[i] -= lr * g1[i]; }
        net.b3 -= lr * e;
      }
      epoch += n; loss = tl / c;
    }
    seg(f.ctl, "데이터", [["circle", "원형"], ["xor", "XOR"], ["spiral", "나선"], ["line", "직선"]], function (v) { ds = v; gen(); f.redraw(); });
    seg(f.ctl, "뉴런", [["3", "3"], ["6", "6"], ["10", "10"]], function (v) { H1 = +v; reset(); f.redraw(); });
    slider(f.ctl, "학습률", 0.01, 0.30, 0.01, lr, "", function (v) { lr = v; });
    var playBtn = button(f.ctl, "학습 시작", function () { run = !run; playBtn.textContent = run ? "멈춤" : "학습 시작"; if (run) tick(); }, true);
    button(f.ctl, "다시 초기화", function () { reset(); f.redraw(); });
    function tick() { if (!run) return; train(40); f.redraw(); raf = requestAnimationFrame(tick); }
    gen();
    f.draw(function () {
      var P = palette(), c = f.ctx, s = f.size(), W = s.w, Hh = s.h, g = 24;
      var X = function (x) { return (x + 1.1) / 2.2 * W; }, Y = function (y) { return Hh - (y + 1.1) / 2.2 * Hh; };
      c.clearRect(0, 0, W, Hh);
      var cw = W / g, ch = Hh / g;
      for (var i = 0; i < g; i++) for (var j = 0; j < g; j++) {
        var x = -1.1 + (i + 0.5) / g * 2.2, y = 1.1 - (j + 0.5) / g * 2.2, o = fwd(x, y).o;
        c.fillStyle = o > 0.5 ? hexA(P.blue, 0.10 + 0.45 * (o - 0.5) * 2) : hexA(P.s[1], 0.10 + 0.45 * (0.5 - o) * 2); c.fillRect(i * cw, j * ch, cw + 0.5, ch + 0.5);
      }
      data.forEach(function (d) { dot(c, X(d.x), Y(d.y), 4.2, d.l ? P.blue : P.s[1], P.surface); });
      var acc = 0; data.forEach(function (d) { if ((fwd(d.x, d.y).o > 0.5 ? 1 : 0) === d.l) acc++; });
      f.info.innerHTML = "<span>학습 횟수 <b>" + epoch + "</b></span><span>손실 <b>" + (epoch ? loss.toFixed(3) : "-") + "</b></span><span>정확도 <b>" + Math.round(acc / data.length * 100) + "%</b></span><span>" + (ds === "spiral" && H1 < 10 ? "나선은 뉴런이 많아야 잘 풀려요" : ds === "xor" ? "XOR은 은닉층이 있어야만 풀려요" : "파랑/주황이 두 클래스예요") + "</span>";
    });
  };

  /* ---------- 시작 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-sim]"), function (host) {
    var name = host.getAttribute("data-sim"); if (SIMS[name]) SIMS[name](host);
  });
})();
