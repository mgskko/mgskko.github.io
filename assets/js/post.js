/* Study Note — 글 본문을 글 유형에 맞게 재구성 (원본 마크다운은 그대로)
   app.js보다 먼저 실행되어야 목차가 바뀐 구조를 기준으로 만들어진다. */
(function () {
  "use strict";
  var prose = document.querySelector("[data-prose]");
  if (!prose) return;
  var post = document.querySelector("[data-post]");
  var kind = post ? post.getAttribute("data-kind") : "";

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function norm(text) { return (text || "").replace(/[^\p{L}\p{N}]/gu, ""); }
  function isHeading(n, levels) { return n && n.nodeType === 1 && levels.indexOf(n.tagName) > -1; }
  var uid = 0;

  /* ---------- 탭 컴포넌트 ---------- */
  function makeTabs(items, cls) {
    // items: [{label, nodes}]
    var id = "tabs" + (++uid);
    var wrap = el("div", "tabs" + (cls ? " " + cls : ""));
    var list = el("div", "tabs__list");
    list.setAttribute("role", "tablist");
    var ink = el("span", "tabs__ink");
    list.appendChild(ink);
    var panels = [];
    items.forEach(function (it, i) {
      var b = el("button", "tabs__tab", it.label);
      b.type = "button";
      b.id = id + "-t" + i;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", id + "-p" + i);
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.tabIndex = i === 0 ? 0 : -1;
      list.appendChild(b);
      var p = el("div", "tabs__panel");
      p.id = id + "-p" + i;
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", b.id);
      if (i) p.hidden = true;
      it.nodes.forEach(function (n) { p.appendChild(n); });
      panels.push(p);
    });
    wrap.appendChild(list);
    panels.forEach(function (p) { wrap.appendChild(p); });

    var tabs = Array.prototype.slice.call(list.querySelectorAll(".tabs__tab"));
    function moveInk() {
      var cur = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
      if (!cur || !cur.offsetWidth) return;
      ink.style.width = cur.offsetWidth + "px";
      ink.style.transform = "translateX(" + cur.offsetLeft + "px)";
    }
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
      moveInk();
      var cur = list.querySelector('[aria-selected="true"]');
      if (cur && list.scrollWidth > list.clientWidth) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    list.addEventListener("click", function (e) {
      var b = e.target.closest(".tabs__tab");
      if (b) select(tabs.indexOf(b));
    });
    list.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % tabs.length, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
    });
    window.addEventListener("resize", moveInk);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInk);
    requestAnimationFrame(moveInk);
    wrap._select = select;
    return wrap;
  }

  /* ---------- 섹션 나누기 (h3 기준, h2에서 끊김) ---------- */
  function sections() {
    var out = [], cur = null;
    Array.prototype.slice.call(prose.children).forEach(function (n) {
      if (isHeading(n, ["H1", "H2"])) { cur = null; return; }
      if (isHeading(n, ["H3"])) { cur = { h: n, key: norm(n.textContent), nodes: [] }; out.push(cur); return; }
      if (cur) cur.nodes.push(n);
    });
    return out;
  }

  /* ---------- 1. 첫 링크 박스 → 상단 버튼 ---------- */
  (function sourceLink() {
    var first = prose.firstElementChild;
    if (!first || !/notice/.test(first.className)) return;
    var links = first.querySelectorAll("a");
    if (links.length !== 1 || first.textContent.trim().length > 40) return;
    var a = links[0], btn = document.querySelector("[data-source]");
    if (!btn) return;
    var href = a.getAttribute("href") || "";
    var label = /acmicpc|programmers|leetcode/.test(href) ? "문제 보러 가기" : /github\.com/.test(href) ? "GitHub에서 보기" : a.textContent.trim();
    btn.href = href;
    btn.innerHTML = '<span>' + label + '</span><svg class="i" aria-hidden="true"><use href="#i-external"/></svg>';
    btn.hidden = false;
    first.parentNode.removeChild(first);
    var hr = prose.firstElementChild;
    if (hr && hr.tagName === "HR") hr.parentNode.removeChild(hr);
  })();

  /* ---------- 2. 코딩테스트 글 구조화 ---------- */
  if (kind === "pro" || kind === "boj") (function coding() {
    var secs = sections();
    var PROB = /^(문제|문제설명|제한사항|힌트|입력|출력|예시|예제입력\d*|예제출력\d*)$/;
    var probSecs = secs.filter(function (s) { return PROB.test(s.key); });
    if (probSecs.length >= 2) {
      var groups = { desc: [], io: [], ex: [], hint: [] };
      var pairs = {};
      probSecs.forEach(function (s) {
        var k = s.key;
        var m = k.match(/^예제(입력|출력)(\d*)$/);
        if (m) {
          var n = m[2] || "1";
          pairs[n] = pairs[n] || {};
          pairs[n][m[1]] = s;
        } else if (k === "입력" || k === "출력") groups.io.push(s);
        else if (k === "힌트") groups.hint.push(s);
        else if (k === "예시") groups.ex.push(s);
        else groups.desc.push(s);
      });

      function withLabel(s, showLabel) {
        var nodes = [];
        if (showLabel) nodes.push(el("p", "panel-label", s.h.textContent.trim()));
        return nodes.concat(s.nodes);
      }
      var items = [];
      if (groups.desc.length) items.push({ label: "문제", nodes: [].concat.apply([], groups.desc.map(function (s) { return withLabel(s, groups.desc.length > 1); })) });
      if (groups.io.length) items.push({ label: "입력 · 출력", nodes: [].concat.apply([], groups.io.map(function (s) { return withLabel(s, true); })) });
      var pairKeys = Object.keys(pairs).sort(function (a, b) { return a - b; });
      if (pairKeys.length || groups.ex.length) {
        var exNodes = [];
        pairKeys.forEach(function (n) {
          var pr = pairs[n], grid = el("div", "io-pair");
          ["입력", "출력"].forEach(function (side) {
            var s = pr[side];
            if (!s) return;
            var cell = el("div", "io-pair__cell");
            cell.appendChild(el("p", "io-pair__label", "예제 " + side + (pairKeys.length > 1 ? " " + n : "")));
            s.nodes.forEach(function (x) { cell.appendChild(x); });
            grid.appendChild(cell);
          });
          exNodes.push(grid);
        });
        groups.ex.forEach(function (s) { exNodes = exNodes.concat(s.nodes); });
        items.push({ label: "예제" + (pairKeys.length > 1 ? " " + pairKeys.length + "개" : ""), nodes: exNodes });
      }
      if (groups.hint.length) items.push({ label: "힌트", nodes: [].concat.apply([], groups.hint.map(function (s) { return s.nodes; })) });

      var card = el("section", "problem");
      var head = probSecs[0].h;
      prose.insertBefore(card, head);
      var title = el("h3", "problem__title");
      title.id = head.id || "problem";
      title.textContent = "문제";
      card.appendChild(title);
      card.appendChild(makeTabs(items, "tabs--problem"));
      probSecs.forEach(function (s) { if (s.h.parentNode) s.h.parentNode.removeChild(s.h); });
    }

    sections().forEach(function (s) {
      // 풀이 / 구조 파악 → 아이디어 카드
      if (/^(풀이|문제구조파악|접근방법|아이디어|풀이법비교요약)$/.test(s.key)) {
        var box = el("section", "callout callout--idea");
        s.h.parentNode.insertBefore(box, s.h);
        box.appendChild(s.h);
        s.nodes.forEach(function (n) { box.appendChild(n); });
      }
      // 막혔던 부분 / 틀린 과정 → 경고 카드 + 시도 타임라인
      else if (/막혔던|틀렸던|디버깅|실수/.test(s.key)) {
        var warn = el("section", "callout callout--warn");
        s.h.parentNode.insertBefore(warn, s.h);
        warn.appendChild(s.h);
        var tl = null, step = null;
        s.nodes.forEach(function (n) {
          if (isHeading(n, ["H4"])) {
            if (!tl) { tl = el("ol", "timeline"); warn.appendChild(tl); }
            step = el("li", "timeline__step" + (/❌|실패|오류/.test(n.textContent) ? " is-fail" : /✅|성공|정답/.test(n.textContent) ? " is-ok" : ""));
            n.textContent = n.textContent.replace(/^[❌✅⭕️\s]+/, "");
            step.appendChild(n);
            tl.appendChild(step);
          } else if (step) step.appendChild(n);
          else warn.appendChild(n);
        });
      }
      // 코드 → 버전이 2개 이상이면 탭
      else if (/^코드$/.test(s.key)) {
        var vers = [], cur = null, pre = [];
        s.nodes.forEach(function (n) {
          if (isHeading(n, ["H4"])) { cur = { label: n.textContent.trim(), nodes: [], h: n }; vers.push(cur); }
          else if (cur) cur.nodes.push(n);
          else pre.push(n);
        });
        if (vers.length >= 2) {
          var anchor = vers[0].h;
          var tabs = makeTabs(vers.map(function (v) {
            var label = v.label.replace(/ver\s*\(?\s*(\d+)\s*\)?/i, "풀이 $1").replace(/\s+-\s+/, " · ").trim();
            return { label: label, nodes: v.nodes };
          }), "tabs--code");
          anchor.parentNode.insertBefore(tabs, anchor);
          vers.forEach(function (v) { v.h.parentNode.removeChild(v.h); });
        }
      }
    });
  })();

  /* ---------- 3. "**용어** : 설명" 목록 → 용어 카드 ---------- */
  Array.prototype.slice.call(prose.querySelectorAll("ul")).forEach(function (ul) {
    if (ul.closest(".tabs, .timeline, .terms")) return;
    var lis = Array.prototype.slice.call(ul.children);
    if (!lis.length) return;
    var ok = lis.every(function (li) {
      var f = li.firstChild;
      while (f && f.nodeType === 3 && !f.textContent.trim()) f = f.nextSibling;
      if (!f || f.nodeType !== 1 || f.tagName !== "STRONG") return false;
      var nx = f.nextSibling;
      return nx && nx.nodeType === 3 && /^\s*[:：]/.test(nx.textContent);
    });
    if (!ok) return;
    ul.classList.add("terms");
    lis.forEach(function (li) {
      var f = li.firstChild;
      while (f.nodeType === 3) { var d = f; f = f.nextSibling; li.removeChild(d); }
      var k = el("span", "terms__k"); k.appendChild(f);
      var v = el("span", "terms__v");
      while (li.firstChild) v.appendChild(li.firstChild);
      if (v.firstChild && v.firstChild.nodeType === 3) v.firstChild.textContent = v.firstChild.textContent.replace(/^\s*[:：]\s*/, "");
      li.appendChild(k); li.appendChild(v);
    });
  });

  /* ---------- 4. 설명 + 스크린샷 반복 → 단계 카드 ---------- */
  function isImgP(n) {
    if (!n || n.tagName !== "P") return false;
    var imgs = n.querySelectorAll("img");
    return imgs.length >= 1 && !n.textContent.trim();
  }
  function isTextP(n) { return n && n.tagName === "P" && !n.querySelector("img") && n.textContent.trim().length > 0 && !/notice/.test(n.className); }
  if (kind !== "pro" && kind !== "boj") (function steps() {
    var kids = Array.prototype.slice.call(prose.children), i = 0;
    while (i < kids.length) {
      var found = [], j = i;
      for (;;) {
        var texts = [], k = j;
        while (k < kids.length && isTextP(kids[k]) && texts.length < 3) { texts.push(kids[k]); k++; }
        if (k < kids.length && isImgP(kids[k]) && texts.length) { found.push({ texts: texts, img: kids[k] }); j = k + 1; }
        else break;
      }
      if (found.length >= 2) {
        var ol = el("ol", "steps");
        prose.insertBefore(ol, kids[i]);
        found.forEach(function (st, n) {
          var li = el("li", "steps__item");
          li.appendChild(el("span", "steps__n", String(n + 1)));
          var body = el("div", "steps__body");
          st.texts.forEach(function (t) { body.appendChild(t); });
          body.appendChild(st.img);
          li.appendChild(body);
          ol.appendChild(li);
        });
        i = j;
      } else i++;
    }
  })();

  /* ---------- 5. 제목 앞 번호 → 배지 ---------- */
  Array.prototype.slice.call(prose.querySelectorAll("h2, h3")).forEach(function (h) {
    var first = h.firstChild;
    // <span style="color"> 같은 래퍼 안쪽 텍스트까지 확인
    while (first && first.nodeType === 1 && first.firstChild && first.tagName === "SPAN") first = first.firstChild;
    if (!first || first.nodeType !== 3) return;
    var m = first.textContent.match(/^\s*(\d+(?:[-.]\d+)?)\.\s+/);
    if (!m) return;
    first.textContent = first.textContent.slice(m[0].length);
    var badge = el("span", "hnum", m[1]);
    h.insertBefore(badge, h.firstChild);
  });

  /* ---------- 6. 긴 코드 접기 ---------- */
  Array.prototype.slice.call(prose.querySelectorAll("div.highlighter-rouge, figure.highlight")).forEach(function (block) {
    if (block.closest(".io-pair")) return;
    var pre = block.querySelector("pre");
    if (!pre) return;
    var lines = pre.textContent.replace(/\n$/, "").split("\n").length;
    if (lines <= 26) return;
    block.classList.add("is-collapsible", "is-collapsed");
    var btn = el("button", "code-more", "코드 전체 보기 <b>" + lines + "줄</b>");
    btn.type = "button";
    btn.addEventListener("click", function () {
      var open = block.classList.toggle("is-collapsed") === false;
      btn.innerHTML = open ? "코드 접기" : "코드 전체 보기 <b>" + lines + "줄</b>";
      if (!open) block.scrollIntoView({ block: "nearest" });
    });
    block.appendChild(btn);
  });
})();
