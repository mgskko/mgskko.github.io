/* Study Note — home charts (SVG, no dependencies) */
(function () {
  "use strict";
  var SN = window.SN;
  if (!SN) return;
  var $ = SN.$, $$ = SN.$$, esc = SN.esc;
  var postEl = document.getElementById("post-data");
  var catEl = document.getElementById("cat-data");
  if (!postEl || !catEl) return;

  var posts = JSON.parse(postEl.textContent);
  var meta = JSON.parse(catEl.textContent);
  var NS = "http://www.w3.org/2000/svg";
  var MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  /* ---------- 집계 ---------- */
  var byDay = {};
  posts.forEach(function (p) { byDay[p.d] = (byDay[p.d] || 0) + 1; });
  var years = Object.keys(posts.reduce(function (a, p) { a[p.d.slice(0, 4)] = 1; return a; }, {})).sort().reverse();

  // 가장 길게 이어 쓴 날
  var days = Object.keys(byDay).sort();
  var best = 0, run = 0, prev = null;
  days.forEach(function (d) {
    var cur = parse(d);
    run = prev && (cur - prev) / 86400000 === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  });
  var streakEl = $('[data-stat="streak"]');
  if (streakEl) { streakEl.setAttribute("data-count", best); streakEl.textContent = best; if (streakEl.closest(".is-in")) SN.countUp(streakEl); }

  /* ---------- 툴팁 ---------- */
  var tip = document.createElement("div");
  tip.className = "tip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  function showTip(html, x, y) {
    tip.innerHTML = html;
    var w = tip.offsetWidth / 2 + 8;
    tip.style.left = Math.min(window.innerWidth - w, Math.max(w, x)) + "px";
    tip.style.top = y + "px";
    tip.classList.add("is-shown");
  }
  function hideTip() { tip.classList.remove("is-shown"); }
  window.addEventListener("scroll", hideTip, { passive: true });

  function bindTip(el, html) {
    function at() { var r = el.getBoundingClientRect(); showTip(html, r.left + r.width / 2, r.top); }
    el.addEventListener("mouseenter", at);
    el.addEventListener("focus", at);
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("blur", hideTip);
    el.addEventListener("touchstart", at, { passive: true });
  }

  /* ---------- 히트맵 ---------- */
  var heatBox = $("[data-heatmap]");
  function level(n) { return n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 3 ? 3 : 4; }
  function drawHeatmap(year) {
    var gap = 3, left = 26, top = 20;
    var start = new Date(+year, 0, 1);
    var end = new Date(+year, 11, 31);
    var first = new Date(start); first.setDate(first.getDate() - first.getDay()); // 그 주 일요일
    var weeks = Math.ceil(((end - first) / 86400000 + 1) / 7);
    // 카드 폭에 맞춰 칸 크기 결정 (작은 화면은 가로 스크롤)
    var cell = Math.max(11, Math.min(18, Math.floor((heatBox.clientWidth - left) / weeks) - gap));
    var step = cell + gap;
    var W = left + weeks * step, H = top + 7 * step;
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H });

    ["", "월", "", "수", "", "금", ""].forEach(function (t, i) {
      if (t) { var tx = svgEl("text", { x: 0, y: top + i * step + cell - 2 }); tx.textContent = t; svg.appendChild(tx); }
    });

    var total = 0, active = 0, lastMonth = -100, lastCol = 0;
    for (var w = 0; w < weeks; w++) {
      for (var d = 0; d < 7; d++) {
        var day = new Date(first); day.setDate(first.getDate() + w * 7 + d);
        if (day < start || day > end) continue;
        if (day.getDate() === 1 && left + w * step - lastMonth >= 30) {
          lastMonth = left + w * step;
          var mt = svgEl("text", { x: lastMonth, y: 11 }); mt.textContent = MONTHS[day.getMonth()]; svg.appendChild(mt);
        }
        var k = key(day), n = byDay[k] || 0;
        total += n; if (n) { active++; lastCol = w; }
        var r = svgEl("rect", {
          class: "cell q" + level(n), x: left + w * step, y: top + d * step, width: cell, height: cell, rx: cell > 14 ? 4 : 3,
          tabindex: n ? 0 : -1, "aria-label": (day.getMonth() + 1) + "월 " + day.getDate() + "일 " + n + "개"
        });
        if (!SN.reduceMotion) r.style.animationDelay = Math.min(w * 12, 600) + "ms";
        bindTip(r, (day.getMonth() + 1) + "월 " + day.getDate() + "일<small>" + (n ? n + "개의 글" : "기록 없음") + "</small>");
        svg.appendChild(r);
      }
    }
    heatBox.innerHTML = "";
    heatBox.appendChild(svg);
    heatBox.setAttribute("aria-label", year + "년 작성일 히트맵: " + active + "일 동안 " + total + "개의 글");
    $("[data-heat-summary]").textContent = year + "년에 " + active + "일, " + total + "개의 글을 썼어요";
    // 모바일에서는 마지막 기록 근처로 스크롤
    heatBox.scrollLeft = Math.max(0, left + lastCol * step - heatBox.clientWidth + 80);
  }

  /* ---------- 월별 막대 ---------- */
  var barBox = $("[data-bars]");
  var tableBox = $('[data-table="monthly"]');
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  function roundTop(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function drawBars(year) {
    var counts = MONTHS.map(function () { return 0; });
    posts.forEach(function (p) { if (p.d.slice(0, 4) === year) counts[+p.d.slice(5, 7) - 1]++; });
    var max = Math.max.apply(null, counts), top = niceMax(max);
    var W = 600, H = 220, L = 30, R = 6, T = 18, B = 26;
    var pw = W - L - R, ph = H - T - B, band = pw / 12, bw = Math.min(28, band * 0.56);
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "xMidYMid meet" });

    [0, 0.5, 1].forEach(function (f) {
      var y = T + ph - ph * f;
      svg.appendChild(svgEl("line", { class: "grid", x1: L, x2: W - R, y1: y, y2: y }));
      var t = svgEl("text", { x: L - 8, y: y + 4, "text-anchor": "end" }); t.textContent = Math.round(top * f); svg.appendChild(t);
    });

    var maxIdx = counts.indexOf(max);
    counts.forEach(function (n, i) {
      var cx = L + band * i + band / 2;
      var h = n ? Math.max(4, ph * n / top) : 3;
      var bar = svgEl("path", { class: "bar" + (n ? "" : " bar--empty"), d: roundTop(cx - bw / 2, T + ph - h, bw, h, 4) });
      if (!SN.reduceMotion) bar.style.animationDelay = i * 35 + "ms";
      svg.appendChild(bar);
      var lab = svgEl("text", { x: cx, y: H - 6, "text-anchor": "middle" }); lab.textContent = (i + 1) + "월"; svg.appendChild(lab);
      if (i === maxIdx && n) {
        var v = svgEl("text", { class: "val", x: cx, y: T + ph - h - 6, "text-anchor": "middle" }); v.textContent = n; svg.appendChild(v);
      }
      var hit = svgEl("rect", { x: L + band * i, y: T, width: band, height: ph + B, fill: "transparent", tabindex: 0, "aria-label": MONTHS[i] + " " + n + "개" });
      hit.addEventListener("mouseenter", function () { barBox.classList.add("is-hovering"); bar.classList.add("is-active"); });
      hit.addEventListener("mouseleave", function () { barBox.classList.remove("is-hovering"); bar.classList.remove("is-active"); });
      hit.addEventListener("focus", function () { barBox.classList.add("is-hovering"); bar.classList.add("is-active"); });
      hit.addEventListener("blur", function () { barBox.classList.remove("is-hovering"); bar.classList.remove("is-active"); });
      bindTip(hit, year + "년 " + MONTHS[i] + "<small>" + n + "개의 글</small>");
      svg.appendChild(hit);
    });
    barBox.innerHTML = "";
    barBox.appendChild(svg);
    var sum = counts.reduce(function (a, b) { return a + b; }, 0);
    barBox.setAttribute("aria-label", year + "년 월별 작성 글 막대 차트, 합계 " + sum + "개");
    $("[data-bars-summary]").textContent = max ? "가장 많이 쓴 달은 " + MONTHS[maxIdx] + " (" + max + "개)" : "이 해에는 글이 없어요";
    tableBox.innerHTML = "<table><thead><tr><th>월</th><th>글 수</th></tr></thead><tbody>" +
      counts.map(function (n, i) { return "<tr><td>" + MONTHS[i] + "</td><td>" + n + "</td></tr>"; }).join("") +
      "<tr><td><b>합계</b></td><td><b>" + sum + "</b></td></tr></tbody></table>";
  }
  $$("[data-table-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = $('[data-table="' + b.getAttribute("data-table-toggle") + '"]');
      t.hidden = !t.hidden;
      b.setAttribute("aria-expanded", String(!t.hidden));
      b.lastChild.textContent = t.hidden ? "표로 보기" : "표 닫기";
    });
  });

  /* ---------- 분야 순위 ---------- */
  var rankBox = $("[data-rank]");
  function drawRank(year) {
    var counts = {};
    posts.forEach(function (p) { if (p.d.slice(0, 4) === year) counts[p.c] = (counts[p.c] || 0) + 1; });
    var rows = Object.keys(counts).map(function (c) { return { c: c, n: counts[c] }; }).sort(function (a, b) { return b.n - a.n; });
    var top = rows.slice(0, 5), rest = rows.slice(5).reduce(function (a, r) { return a + r.n; }, 0);
    if (rest) top.push({ c: null, n: rest, other: rows.length - 5 });
    var max = top.length ? top[0].n : 1;
    rankBox.innerHTML = top.map(function (r) {
      var m = r.c && meta.items[r.c];
      var label = r.c ? (m ? m.label : r.c) : "기타 " + r.other + "개 분야";
      var name = r.c && m ? '<a href="' + esc(m.url) + '">' + esc(label) + "</a>" : esc(label);
      return '<li class="rank__item' + (r.c ? "" : " rank__item--other") + '"><span class="rank__name">' + name +
        '</span><span class="rank__track"><span class="rank__bar" data-w="' + (r.n / max * 100).toFixed(1) + '"></span></span><span class="rank__val">' + r.n + "개</span></li>";
    }).join("") || '<li class="muted">이 해에는 글이 없어요</li>';
    var firstMeta = rows[0] && meta.items[rows[0].c];
    $("[data-rank-summary]").textContent = rows[0] ? (firstMeta ? firstMeta.label : rows[0].c) + " 분야를 가장 많이 썼어요" : "";
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      $$(".rank__bar", rankBox).forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    }); });
  }

  /* ---------- 연도 선택 ---------- */
  var tabs = $("[data-year-tabs]");
  var drawn = false, currentYear = years[0];
  function drawAll(year) { currentYear = year; drawHeatmap(year); drawBars(year); drawRank(year); }
  tabs.innerHTML = years.map(function (y, i) {
    return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-year="' + y + '">' + y + "</button>";
  }).join("");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-year]");
    if (!b) return;
    $$("[data-year]", tabs).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
    drawAll(b.getAttribute("data-year"));
  });

  // 차트 카드가 화면에 들어올 때 그리기 (애니메이션이 보이도록)
  var firstCard = heatBox.closest(".chart-card");
  function start() { if (drawn) return; drawn = true; drawAll(currentYear); }
  if (firstCard.classList.contains("is-in") || !("IntersectionObserver" in window)) start();
  else firstCard.addEventListener("revealed", start);
  setTimeout(start, 1500);
})();
