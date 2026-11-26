---
layout: single
title: "라인업 생성기: 프롬프트로 풀다 포기하고 솔버를 짰다 — 풋살 4쿼터 로테이션을 제약 만족 문제로 다시 세우고, 백트래킹 솔버와 Artifact 런타임으로 옮긴 기록"
description: "풋살 4쿼터 로테이션을 제약 만족 문제로 다시 세우고 백트래킹 솔버로 푼 과정을 인터랙티브 예제와 함께 기록했어요."
date: 2026-11-25 02:00:00 +0900
categories: VibeCoding
tag: [vibe-coding, claude, artifact, csp, backtracking, javascript, 바이브코딩]
toc: true
---

> **요약** 매주 풋살 경기 전에 라인업을 짠다. 15~16명이 오고, 4쿼터를 돌리고, 쿼터마다 포메이션이 다르고, 선수마다 소화 가능한 포지션과 개인 사정이 있다. 이걸 몇 달 동안 LLM 프롬프트로 풀다가, 결국 **브라우저에서 도는 제약 만족 솔버**를 짜서 끝냈다.
{: .notice--primary}

이 글은 그 과정의 기록이다. 왜 프롬프트로는 안 됐는지, 문제를 어떻게 다시 정의했는지, 솔버를 어떤 구조로 짰는지, 그리고 마지막에 "페이지가 직접 LLM을 호출하는" 구조를 넣었다가 배운 것까지 다룬다.

글 중간의 **계산기와 라인업 뷰어는 직접 눌러볼 수 있다.** 같은 코드가 돌아가는 축소판이라고 생각하면 된다.

| 항목 | 값 |
|---|---|
| 결과물 | 단일 HTML 파일 414줄 (스크립트 260줄) |
| 외부 의존성 | 폰트 하나, 그 외 없음 |
| 변수(자리) 수 | 44 (11자리 × 4쿼터) |
| 탐색 시간 제한 | 2.8초 |
| 2.8초 동안 찾은 해 | 15,368개 이상 |
| 화면에 보관하는 표본 | 1,500개 |

---

## 1. 발단: 매주 반복되는 조합 문제

처음엔 이게 조합 문제라는 자각조차 없었다. 그냥 카톡에 명단이 올라오면 손으로 끄적였다.

문제는 **손으로 짜면 항상 누군가 손해를 본다**는 것이다. 4쿼터를 3번 뛴 사람과 2번 뛴 사람이 생기고, 어떤 날은 특정인이 1·2·3쿼터를 내리 뛰어 4쿼터에 다리가 풀려 있다. 골키퍼를 누가 몇 쿼터 볼지도 매번 즉흥이었다.

그래서 조건을 글로 적어 LLM에게 넘기기 시작했다. 우선순위까지 매겨서.

```text
[1순위] 선수별 고정 출전/휴식 제약 & 필수 지정 쿼터
[2순위] 고유 포지션 combinations
[3순위] 포지션 및 쿼터 연속성 제약
[4순위] 체력 배분 및 윙백 배치 시점 최적화
[5순위] 쿼터 균등 배분 및 잔여 포지션 커버리지 최적화
```

여기에 포지션별 쿼터 할당 배분표를 붙였다.

```text
- CM (8쿼터): 아이삭(3), 윤태규(1), 김덕용(1), 이민혁(2), 임정민(1)
- CB (8쿼터): 신동호(3), 고명석(3), 오수환(1), 최영재(1)
- GK (4쿼터): 오수환(3), 최영재(1)
...
```

한동안은 굴러갔다. **4-3-3으로 네 쿼터를 다 돌릴 때까지는.**

---

## 2. 1차 접근이 무너진 지점

### 2.1 포메이션이 쿼터마다 달라지는 순간

어느 날 1·2쿼터는 4-4-2, 3·4쿼터는 4-2-3-1로 가기로 했다. 그러자 위의 배분표가 통째로 무의미해졌다.

4-3-3에서는 네 쿼터 내내 같은 포지션 집합이 반복된다. CM 자리는 항상 2개씩 4쿼터니까 8자리다. 그런데 포메이션이 섞이면 이렇게 된다.

| 포지션 | 4-4-2 (1·2Q) | 4-2-3-1 (3·4Q) | 총 자리 |
|---|---|---|---|
| CM | 2 × 2 = 4 | 0 | **4** |
| DM | 0 | 2 × 2 = 4 | **4** |
| AM | 0 | 1 × 2 = 2 | **2** |
| ST | 2 × 2 = 4 | 1 × 2 = 2 | **6** |

CM은 8자리에서 4자리로 반토막 나고, 존재하지도 않던 DM·AM이 생기고, ST는 6자리가 된다. 배분표를 매번 손으로 다시 계산해야 한다는 뜻이다. 그런데 **그 계산이 바로 내가 자동화하고 싶었던 것**이었다.

아래 계산기로 쿼터별 포메이션을 바꿔 보면 자리 수가 어떻게 달라지는지 바로 보인다.

<div class="lw" id="lw-form"></div>
<script>
(function () {
  var root = document.getElementById('lw-form'); if (!root) return;
  var ORDER = ['GK','LB','CB','RB','DM','CM','AM','LW','RW','ST'];
  var FORM = {
    '4-4-2':   {GK:1, LB:1, CB:2, RB:1, CM:2, LW:1, RW:1, ST:2},
    '4-2-3-1': {GK:1, LB:1, CB:2, RB:1, DM:2, LW:1, AM:1, RW:1, ST:1},
    '4-3-3':   {GK:1, LB:1, CB:2, RB:1, DM:1, CM:2, LW:1, RW:1, ST:1},
    '3-5-2':   {GK:1, CB:3, LW:1, CM:2, DM:1, RW:1, ST:2}
  };
  var KO = {GK:'골키퍼', LB:'왼쪽 풀백', CB:'센터백', RB:'오른쪽 풀백', DM:'수비형 미드', CM:'중앙 미드', AM:'공격형 미드', LW:'왼쪽 윙', RW:'오른쪽 윙', ST:'스트라이커'};
  var state = ['4-4-2', '4-4-2', '4-2-3-1', '4-2-3-1'];

  var ctl = '<p class="lw__title">포메이션 자리 계산기</p><p class="lw__desc">쿼터마다 포메이션을 골라 보세요. 포지션별 총 자리가 바로 계산돼요.</p><div class="lw__controls">';
  for (var q = 0; q < 4; q++) {
    ctl += '<label class="lw__field">' + (q + 1) + 'Q <select data-q="' + q + '" aria-label="' + (q + 1) + '쿼터 포메이션">';
    Object.keys(FORM).forEach(function (f) { ctl += '<option>' + f + '</option>'; });
    ctl += '</select></label>';
  }
  root.innerHTML = ctl + '</div><div data-out></div>';
  var out = root.querySelector('[data-out]');
  var sels = root.querySelectorAll('select');
  for (var i = 0; i < sels.length; i++) sels[i].value = state[i];

  function draw() {
    var rows = ORDER.map(function (p) {
      var per = state.map(function (f) { return FORM[f][p] || 0; });
      return { p: p, per: per, tot: per.reduce(function (a, b) { return a + b; }, 0) };
    }).filter(function (r) { return r.tot > 0; });
    var max = Math.max.apply(null, rows.map(function (r) { return r.tot; }));
    var h = '<div class="lw__grid"><span class="lw__h">포지션</span>';
    for (var q = 0; q < 4; q++) h += '<span class="lw__h">' + (q + 1) + 'Q</span>';
    h += '<span class="lw__h">합계</span>';
    rows.forEach(function (r) {
      h += '<span class="lw__n">' + r.p + '<small>' + KO[r.p] + '</small></span>';
      r.per.forEach(function (n) { h += '<span class="lw__c' + (n ? ' on' : '') + '">' + (n || '·') + '</span>'; });
      h += '<span class="lw__t">' + r.tot + '</span>';
    });
    h += '</div>';
    var total = rows.reduce(function (a, r) { return a + r.tot; }, 0);
    var big = rows.slice().sort(function (a, b) { return b.tot - a.tot; })[0];
    h += '<div class="lw__foot"><span>총 자리 <b>' + total + '</b>개 (쿼터당 11자리 × 4)</span><span>가장 많은 자리 <b>' + big.p + ' ' + big.tot + '개</b></span></div>';
    out.innerHTML = h;
  }
  root.addEventListener('change', function (e) {
    var s = e.target.closest('select'); if (!s) return;
    state[+s.getAttribute('data-q')] = s.value; draw();
  });
  draw();
})();
</script>

### 2.2 더 근본적인 문제: 검증 없는 생성

포메이션 문제를 걷어내도 남는 게 있었다. **LLM이 내놓은 라인업을 내가 매번 손으로 검산해야 했다.**

- 한 쿼터에 같은 사람이 두 자리에 들어가 있거나
- 쿼터당 인원이 10명 또는 12명이거나
- "3쿼터 휴식"이라고 했는데 3쿼터에 들어가 있거나
- 총 출전 수가 사람마다 들쭉날쭉하거나

매번 그런 건 아니었다. 그런데 "매번 그런 건 아니다"가 문제였다. **열 번 중 아홉 번 맞으면, 열 번을 다 검산해야 한다.** 검산 비용이 직접 짜는 비용과 비슷해지는 순간 도구로서의 가치는 사라진다.

여기서 선을 그었다.

> **LLM은 자연어를 구조로 바꾸는 데 쓰고, 제약을 만족시키는 일은 코드가 한다.**
{: .notice--info}

이 문장이 이 프로젝트의 전부다. 나머지는 구현 디테일이다.

---

## 3. 문제 재정의: 제약 만족 문제(CSP)

라인업 짜기는 전형적인 **제약 만족 문제(Constraint Satisfaction Problem)** 다. 정식으로 세우면 이렇게 된다.

**변수(Variables)** 쿼터 × 포지션 × 슬롯 인덱스로 전개한 "자리" 하나하나. 1·2쿼터 4-4-2, 3·4쿼터 4-2-3-1이면 쿼터당 11자리 × 4쿼터 = **44개의 변수**.

**도메인(Domain)** 각 자리에 들어갈 수 있는 선수. 그 자리의 포지션을 소화할 수 있는 사람으로 한정된다.

**제약(Constraints)**

| 종류 | 내용 |
|---|---|
| 하드 — 구조 | 한 쿼터에 같은 선수는 한 번만 |
| 하드 — 포지션 | 선수의 소화 가능 포지션 안에서만 |
| 하드 — 쿼터 수 | 선수별 출전 쿼터 수가 [min, max] 범위 안 |
| 하드 — 포지션별 쿼터 수 | "DM 1쿼터, RW 1쿼터, RB 1쿼터" 같은 정확한 할당 |
| 사용자 지정 | 고정 / 휴식 / 출전 / 연속금지 / 연속3 / 최대연속 / 같이 / 따로 |

### 3.1 탐색 공간

16명으로 한 쿼터 11자리를 채우는 순열의 수는 다음과 같다.

$$P(16,11)=\frac{16!}{5!}=174{,}356{,}582{,}400 \approx 1.74\times10^{11}$$

여기서 CB 2자리처럼 **순서가 의미 없는 자리**는 같은 해를 여러 번 세고 있으므로, 같은 포지션 자리 수의 팩토리얼로 나눠 준다. 4-3-3이라면 CB 2자리와 CM 2자리가 있으니 $$2!\times2!=4$$로 나눈다.

$$\frac{P(16,11)}{2!\,2!}=43{,}589{,}145{,}600\approx 4.36\times10^{10}$$

네 쿼터가 서로 독립이라고 보면 전체 공간은 쿼터당 값의 네제곱이다.

$$(4.36\times10^{10})^4\approx 3.6\times10^{42}$$

43자리 숫자다. 전수 탐색은 당연히 불가능하고, "가능한 경우의 수를 다 보여달라"는 원래 요구는 그대로는 성립하지 않는다. 이 지점에서 요구사항을 조정했다. **전부가 아니라, 조건을 만족하는 해를 빠르게 여러 개 보여주고 사용자가 그 사이를 넘겨 보며 고르게 한다.**

직접 숫자를 바꿔 보자. 인원, 쿼터 수, 포메이션을 바꾸면 공간이 얼마나 폭발하는지 보인다. (제약을 전부 무시한 상한이다. 실제 제약이 들어가면 훨씬 작아진다.)

<div class="lw" id="lw-space"></div>
<script>
(function () {
  var root = document.getElementById('lw-space'); if (!root) return;
  var FORM = {
    '4-4-2':   [1,1,2,1,2,1,1,2],
    '4-2-3-1': [1,1,2,1,2,1,1,1,1],
    '4-3-3':   [1,1,2,1,1,2,1,1,1],
    '3-5-2':   [1,3,1,2,1,1,2]
  };
  var PRESET = [['4-3-3','4-3-3 반복'],['4-4-2','4-4-2 반복'],['4-2-3-1','4-2-3-1 반복'],['3-5-2','3-5-2 반복'],['mix','4-4-2 → 4-2-3-1 혼합']];
  var s = { n: 16, q: 4, preset: '4-3-3' };

  function fact(k) { var r = 1n; for (var i = 2n; i <= BigInt(k); i++) r *= i; return r; }
  function perQuarter(n, f) {
    var d = 1n; FORM[f].forEach(function (c) { d *= fact(c); });
    return (fact(n) / fact(n - 11)) / d;
  }
  function formAt(preset, q, total) {
    if (preset !== 'mix') return preset;
    return q < Math.ceil(total / 2) ? '4-4-2' : '4-2-3-1';
  }
  function log10(b) {
    var t = b.toString(), head = parseFloat(t.slice(0, 16));
    return Math.log10(head) + (t.length - Math.min(16, t.length));
  }
  function totalLog(n, preset, qs) {
    var L = 0; for (var q = 0; q < qs; q++) L += log10(perQuarter(n, formAt(preset, q, qs))); return L;
  }
  function sci(L) { var e = Math.floor(L + 1e-9), m = Math.pow(10, L - e); if (m >= 9.995) { m = 1; e += 1; } return m.toFixed(2) + ' × 10<sup>' + e + '</sup>'; }

  var opts = PRESET.map(function (p) { return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
  root.innerHTML = '<p class="lw__title">탐색 공간 계산기</p><p class="lw__desc">제약이 하나도 없다고 가정한 경우의 수예요.</p>' +
    '<div class="lw__controls">' +
    '<label class="lw__field">인원 <input type="range" min="11" max="20" value="16" data-k="n" aria-label="인원"><span class="lw__u"><span class="lw__val" data-v="n">16</span>명</span></label>' +
    '<label class="lw__field">쿼터 <input type="range" min="1" max="6" value="4" data-k="q" aria-label="쿼터 수"><span class="lw__u"><span class="lw__val" data-v="q">4</span>개</span></label>' +
    '<label class="lw__field">포메이션 <select data-k="preset" aria-label="포메이션">' + opts + '</select></label></div>' +
    '<div data-out></div>';
  var out = root.querySelector('[data-out]');

  function draw() {
    var L = totalLog(s.n, s.preset, s.q);
    var digits = Math.floor(L + 1e-9) + 1;
    var h = '<div class="lw__big">' + sci(L) + '<small>' + digits + '자리 숫자</small></div>';
    var per = [];
    for (var q = 0; q < s.q; q++) { var f = formAt(s.preset, q, s.q); per.push(f + ' → ' + sci(log10(perQuarter(s.n, f)))); }
    h += '<p class="lw__note">쿼터당 경우의 수 · ' + per.join(' , ') + '</p>';
    var cols = [], max = totalLog(s.n, s.preset, 6);
    for (var k = 1; k <= 6; k++) cols.push(totalLog(s.n, s.preset, k));
    h += '<div class="lw__cols" role="img" aria-label="쿼터 수에 따른 탐색 공간 크기(상용로그)">' + cols.map(function (v, i) {
      return '<div class="lw__col' + (i + 1 === s.q ? ' on' : '') + '"><span>10<sup>' + Math.floor(v) + '</sup></span><i style="height:' + Math.max(6, v / max * 100) + '%"></i></div>';
    }).join('') + '</div><div class="lw__xs">' + cols.map(function (v, i) { return '<span>' + (i + 1) + 'Q</span>'; }).join('') + '</div>';
    h += '<div class="lw__foot"><span>세로축은 상용로그(10의 거듭제곱)예요</span><span>쿼터가 하나 늘 때마다 자릿수가 <b>약 ' + Math.round(log10(perQuarter(s.n, formAt(s.preset, 0, s.q)))) + '자리</b>씩 늘어요</span></div>';
    out.innerHTML = h;
  }
  root.addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    s[k] = k === 'preset' ? e.target.value : +e.target.value;
    var v = root.querySelector('[data-v="' + k + '"]'); if (v) v.textContent = s[k];
    draw();
  });
  draw();
})();
</script>

---

## 4. 솔버 구현

구조는 **백트래킹 DFS + 가지치기**다. 라이브러리 없이 직접 짰다. 44개 변수 규모에서는 이게 가장 단순하고 빠르다.

<div class="mermaid">
flowchart TD
    A["i번째 자리"] --> B["후보 선수 필터 okAt()"]
    B --> C{"후보 있음?"}
    C -- 없음 --> R["백트래킹: 직전 선택 취소"]
    C -- 있음 --> D["선수 배치, 카운터 증가"]
    D --> E{"쿼터의 마지막 자리?"}
    E -- 아니오 --> A2["dfs(i+1)"]
    E -- 예 --> F{"afterQ(q) 가지치기 검사"}
    F -- 실패 --> R
    F -- 통과 --> A2
    A2 --> G{"마지막 자리까지 왔나?"}
    G -- 예 --> H{"fin() 정확히 충족?"}
    H -- 예 --> I["해 저장: 리저버 샘플링"]
    H -- 아니오 --> R
    G -- 아니오 --> A
    R --> A
</div>

### 4.1 포메이션을 자리로 전개

먼저 포메이션 정의를 테이블로 둔다.

```js
const ORDER = ['GK','LB','CB','RB','DM','CM','AM','LW','RW','ST'];
const FORM = {
  '4-4-2':   {GK:1, LB:1, CB:2, RB:1, CM:2, LW:1, RW:1, ST:2},
  '4-2-3-1': {GK:1, LB:1, CB:2, RB:1, DM:2, LW:1, AM:1, RW:1, ST:1},
  '4-3-3':   {GK:1, LB:1, CB:2, RB:1, DM:1, CM:2, LW:1, RW:1, ST:1},
  '3-5-2':   {GK:1, CB:3, LW:1, CM:2, DM:1, RW:1, ST:2}
};
```

여기서 쿼터별 포메이션 배열을 받아 자리 목록으로 펼친다.

```js
const cells = [];
forms.forEach((f, q) =>
  ORDER.forEach(p => {
    const k = FORM[f][p] || 0;
    for (let j = 0; j < k; j++) cells.push({q, p, j});
  })
);
```

`{q: 2, p: 'DM', j: 1}`은 "3쿼터의 두 번째 DM 자리"다. **이 전개 하나로 쿼터마다 포메이션이 달라도 아래 로직은 아무것도 몰라도 된다.** 쿼터 수가 4든 7이든, 포메이션이 섞이든 말든 `cells` 길이만 달라진다. 배분표를 손으로 다시 계산하던 문제가 여기서 사라졌다.

`ORDER` 배열 순서도 의도적이다. GK·LB·CB처럼 소화 가능 인원이 적은 포지션을 앞에 뒀다. 선택지가 좁은 변수를 먼저 확정하는 건 CSP의 기본 휴리스틱(most constrained variable)인데, 여기선 포지션 순서를 고정해 두는 것만으로 충분했다.

### 4.2 배치 가능 판정

각 자리에 어떤 선수를 넣을 수 있는지 판단하는 함수. 모든 하드 제약이 여기 모여 있다.

```js
const okAt = (k, p, q) => {
  if (!P[k].pos.has(p)       // 그 포지션을 소화 못 함
   || used[q].has(k)          // 이미 이 쿼터에 출전 중
   || ban[q].has(k)           // 휴식 지정
   || cnt[k] >= P[k].mx)      // 최대 출전 쿼터 초과
    return false;
  const j = gidx[k][p];        // 포지션별 쿼터 수 캡 그룹
  return j == null || gc[k][j] < grp[k][j].n;
};
```

마지막 두 줄이 나중에 추가한 기능이다. 4.5절에서 따로 설명한다.

### 4.3 중복 순열 제거

처음 돌렸을 때 해가 쏟아지는데 눈으로 보면 다 똑같았다. **CB 두 자리에 신동호·고명석을 넣은 해와 고명석·신동호를 넣은 해가 별개로 세어지고 있었다.**

같은 (쿼터, 포지션) 그룹 안에서는 선수 인덱스가 단조 증가하도록 강제해 해결했다.

```js
const lo = c.j > fx.length ? pick[i-1] + 1 : 0;
cand = [];
for (let k = lo; k < N; k++) if (okAt(k, c.p, q)) cand.push(k);
```

`c.j`가 그룹의 첫 자리가 아니면, 직전 자리에 넣은 선수 인덱스 `pick[i-1]`보다 큰 인덱스만 후보로 둔다. CB 2자리는 조합 $$\binom{n}{2}$$ 만큼만 탐색되고, 중복이 사라졌다. 탐색량도 그만큼 줄었다.

`fx`는 사용자가 "고정"으로 못 박은 선수들이다. 고정 선수는 그룹 앞쪽 자리에 먼저 배치하고, 단조 증가 규칙은 그 뒤 자유 자리들 사이에서만 적용한다.

아래에서 후보 인원과 자리 수를 바꿔 보면 순서만 다른 중복이 얼마나 되는지 보인다.

<div class="lw" id="lw-dedupe"></div>
<script>
(function () {
  var root = document.getElementById('lw-dedupe'); if (!root) return;
  var NAMES = ['신동호','고명석','오수환','최영재','박지환','아이삭','윤태규','임정민'];
  var s = { n: 4, k: 2 };
  function perm(n, k) { var r = 1; for (var i = 0; i < k; i++) r *= (n - i); return r; }
  function fk(k) { var r = 1; for (var i = 2; i <= k; i++) r *= i; return r; }

  root.innerHTML = '<p class="lw__title">중복 순열 제거 데모</p><p class="lw__desc">같은 포지션 자리(예: CB)에 후보 선수를 넣는 방법을 세어 봐요.</p>' +
    '<div class="lw__controls"><label class="lw__field">후보 <input type="range" min="3" max="8" value="4" data-k="n" aria-label="후보 인원"><span class="lw__u"><span class="lw__val" data-v="n">4</span>명</span></label>' +
    '<span class="lw__field">자리 수 <span class="lw__seg" role="group" aria-label="자리 수"><button type="button" data-k="k" data-val="2" aria-pressed="true">2자리</button><button type="button" data-k="k" data-val="3" aria-pressed="false">3자리</button></span></span></div>' +
    '<div data-out></div>';
  var out = root.querySelector('[data-out]');

  function draw() {
    var ord = perm(s.n, s.k), com = ord / fk(s.k);
    var h = '<div class="lw__big">' + ord + ' → ' + com + '<small>순열 → 조합 (' + fk(s.k) + '분의 1)</small></div>';
    if (s.k === 2) {
      var keep = [], skip = [];
      for (var i = 0; i < s.n; i++) for (var j = 0; j < s.n; j++) {
        if (i === j) continue;
        var label = NAMES[i] + '·' + NAMES[j];
        (j > i ? keep : skip).push('<span class="lw__chip ' + (j > i ? 'keep' : 'skip') + '">' + label + '</span>');
      }
      h += '<p class="lw__label">탐색하는 조합 (뒤 선수 인덱스가 더 클 때만)</p><div class="lw__chips">' + keep.join('') + '</div>';
      h += '<p class="lw__label">건너뛰는 순서 뒤바뀜</p><div class="lw__chips">' + skip.join('') + '</div>';
    } else {
      h += '<p class="lw__note">3자리(3-5-2의 CB)는 같은 세 명이 6가지 순서로 중복 집계돼요. 단조 증가 규칙이 그 6가지 중 1가지만 남겨요.</p>';
    }
    out.innerHTML = h;
  }
  root.addEventListener('input', function (e) {
    if (e.target.getAttribute('data-k') !== 'n') return;
    s.n = +e.target.value; root.querySelector('[data-v="n"]').textContent = s.n; draw();
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-k="k"]'); if (!b) return;
    s.k = +b.getAttribute('data-val');
    root.querySelectorAll('button[data-k="k"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    draw();
  });
  draw();
})();
</script>

### 4.4 쿼터 경계 가지치기

이게 성능의 핵심이다. 44자리를 끝까지 다 채운 다음 검사하면 늦다. **한 쿼터가 끝나는 시점마다 검사해서 가망 없는 가지를 잘라낸다.**

```js
function afterQ(q) {
  for (const i of need[q]) if (!used[q].has(i)) return false;       // 출전 지정 위반
  for (const [a,b] of apart) if (used[q].has(a) && used[q].has(b)) return false;  // 따로
  for (const [a,b] of withp) if (used[q].has(a) != used[q].has(b)) return false;  // 같이

  let short = 0;
  for (let i = 0; i < N; i++) {
    let gneed = 0;
    for (let j = 0; j < grp[i].length; j++) gneed += grp[i][j].n - gc[i][j];
    // 남은 쿼터보다 더 많은 포지션 할당이 남았으면 불가능
    if (gneed > NQ-1-q || cnt[i] + gneed > P[i].mx) return false;
    const r = Math.max(P[i].mn - cnt[i], gneed);
    if (r > 0) { if (r > NQ-1-q) return false; short += r; }
    if (cnt[i] > P[i].mx) return false;
  }
  return short <= left;   // 남은 자리보다 더 많은 최소 출전이 남았으면 불가능
}
```

마지막 `short <= left`가 특히 잘 듣는다. 아직 최소 출전 쿼터를 못 채운 선수들의 부족분 합이 남은 자리 수보다 크면, 그 아래로는 아무리 내려가도 해가 없다. 1쿼터 중간에 이미 판가름 나는 경우가 많다.

`gneed > NQ-1-q`도 같은 종류다. 선수는 한 쿼터에 한 포지션만 뛰므로, 남은 포지션 할당 요구량이 남은 쿼터 수보다 크면 즉시 탈락이다.

### 4.5 포지션별 쿼터 수 — 그룹 카운터

나중에 추가한 요구사항이다. "신형찬은 DM 1쿼터, RW 1쿼터, RB 1쿼터 뛰게 해달라."

기존 형식으로는 표현이 안 됐다. `신형찬: DM, RW, RB | 3`은 "세 포지션 중 아무거나 합쳐서 3쿼터"라는 뜻이라, DM만 2쿼터 뛰는 해가 나와버린다.

그래서 입력 파서에서 **포지션 뒤 숫자를 캡 그룹으로** 읽게 했다.

```js
m[2].split(/[,，、/]/).forEach(ch => {
  ch = ch.trim(); if (!ch) return;
  const ps = posOf(ch); if (!ps.length) return;
  ps.forEach(p => { if (!pos.includes(p)) pos.push(p) });
  const n = ch.match(/\d+/);
  if (n && +n[0] > 0) caps.push({pos: new Set(ps), n: +n[0], label: ps.join('+')});
});
```

솔버 쪽에서는 선수별로 그룹 카운터 `gc[k][j]`를 두고, 배치할 때 올리고 백트래킹할 때 내린다.

```js
for (const k of cand) {
  const gj = gidx[k][c.p];
  used[q].add(k); cnt[k]++; if (gj != null) gc[k][gj]++;
  left--; pick[i] = k; (L[q][c.p] = L[q][c.p] || []).push(k);

  if (!lastOfQ[i] || afterQ(q)) dfs(i + 1);

  L[q][c.p].pop(); if (!L[q][c.p].length) delete L[q][c.p];
  pick[i] = -1; left++; if (gj != null) gc[k][gj]--; cnt[k]--; used[q].delete(k);
  if (stop) return;
}
```

`gidx`는 포지션 → 그룹 인덱스 역방향 맵이다. 매번 선형 탐색하지 않으려고 미리 만들어 둔다. `gj != null`로 쓴 건 그룹 인덱스 0이 falsy라서다. 이런 데서 한 번 당하면 다음부터는 `!= null`이 손에 붙는다.

마지막에 `fin()`에서 **정확히 일치하는지** 확인한다. `okAt`은 초과만 막지, 미달은 못 막는다.

```js
for (let j = 0; j < grp[i].length; j++)
  if (gc[i][j] != grp[i][j].n) return false;
```

한 가지 덤이 있었다. 모든 포지션에 숫자가 붙어 있으면 총 출전 쿼터는 그 합으로 자동 결정된다. `| 3`을 따로 쓸 필요가 없다.

```js
if (caps.length && mn == null && pos.every(p => capped.has(p))) { mn = mx = sum }
```

### 4.6 시간 제한과 리저버 샘플링

탐색 공간이 $$10^{42}$$이므로 끝까지 가는 건 포기해야 한다. 노드 1,500개마다 시계를 보고 2.8초가 지나면 멈춘다.

```js
if (++nodes % 1500 == 0 && performance.now() - t0 > 2800) {
  stop = true; exact = false; return;
}
```

`nodes % 1500`으로 샘플링하는 이유는 `performance.now()` 호출 자체가 공짜가 아니기 때문이다. 재귀 한 번마다 부르면 그게 병목이 된다.

여기서 생각보다 중요했던 게 **어떤 해를 보여줄 것인가**다. 처음엔 먼저 찾은 1,500개를 그냥 담았다. 그런데 DFS는 깊이 우선이라 앞쪽 해들이 전부 비슷했다. 첫 몇 자리가 똑같고 뒤쪽만 조금씩 다른 해가 1,500개 쌓인다.

두 가지로 해결했다. 하나는 **후보 셔플**이다.

```js
if (c.j == fx.length) shuf(cand);
```

그룹의 첫 자유 자리에서 후보 순서를 섞는다. 그룹 전체를 섞으면 4.3절의 단조 증가 규칙이 깨지므로 첫 자리에서만 섞는다. 돌릴 때마다 다른 영역부터 탐색해서, 같은 입력이라도 매번 다른 해를 보여준다.

다른 하나는 **리저버 샘플링**이다.

```js
if (store.length < 1500) store.push(sn);
else { const j = Math.floor(Math.random() * total); if (j < 1500) store[j] = sn; }
```

버퍼가 차면 그 뒤로는 확률적으로 교체한다. 몇 개를 찾든 지금까지 발견한 해 전체에서 고르게 뽑힌 1,500개가 남는다. 저장 공간은 고정인데 표본의 대표성은 유지된다.

### 4.7 실측

기본 명단(16명, 4쿼터, 제약 4개)으로 돌린 결과.

| 항목 | 값 |
|---|---|
| 변수(자리) 수 | 44 |
| 선수 | 16명 |
| 제약 없는 탐색 공간 | 약 3.6 × 10<sup>42</sup> (4-3-3 기준) |
| 2.8초 안에 찾은 해 | 15,368개 이상 |
| 보관·표시 표본 | 1,500개 |
| 쿼터당 벤치 | 5명 |

$$10^{42}$$ 공간에서 2.8초에 1만 5천 개를 긁어온다. **가지치기가 일을 하고 있다**는 뜻이다.

---

## 5. 입력 설계를 뒤집다 — 배분표에서 명단으로

구현을 하다 보니 입력 형식 자체가 잘못됐다는 걸 알게 됐다.

처음엔 원래 쓰던 배분표를 그대로 받았다.

```text
CM: 아이삭(2), 윤태규(1), 이민혁(1)
DM: 엄주성(2), 윤태규(2)
```

그런데 이건 이미 풀린 문제의 일부를 사람에게 떠넘기는 입력이다. 쿼터 수를 4에서 3으로 바꾸면 CM 자리는 4개에서 2개로 줄고, 배분표를 전부 다시 써야 한다. 애초에 그 계산이 싫어서 만든 도구인데.

그래서 **입력을 명단으로 바꿨다.** 누가 어떤 포지션을 소화할 수 있는지만 적는다.

```text
아이삭: CM, AM
윤태규: CM, DM
최영재: RW, CB, GK
```

쿼터 수와 포메이션은 위에서 따로 고르고, 누가 몇 쿼터를 어디서 뛰는지는 솔버가 정한다. 벤치도 자동으로 나온다. 쿼터당 출전 11명이니 벤치는 `인원수 − 11`이다.

출전 쿼터 수 균등 분배도 자동이다.

```js
const base = Math.floor(total / P.length), extra = total % P.length;
P.forEach(p => {
  if (p.mn == null) { p.mn = base; p.mx = Math.min(NQ, extra ? base+1 : base) }
  ...
});
```

16명 44자리면 `base = 2`, `extra = 12`. 전원에게 [2, 3] 범위를 주면 솔버가 알아서 12명을 3쿼터, 4명을 2쿼터로 맞춘다. 누구를 3쿼터 뛰게 할지는 다른 제약을 만족시키면서 결정되므로, 사람이 미리 정하는 것보다 낫다.

<div class="mermaid">
pie showData title 쿼터 출전 수 분포 (16명, 44자리)
    "3쿼터 출전 (12명)" : 12
    "2쿼터 출전 (4명)" : 4
</div>

이 전환이 이 프로젝트에서 **제일 큰 설계 변경**이었다. 코드량은 오히려 줄었고, 쿼터 수를 바꿔도 아무것도 다시 쓸 필요가 없어졌다.

---

## 6. 한국어 포지션 파서

팀원들이 쓸 거라면 `CM`, `DM` 같은 약어를 강요할 수 없다. "중미", "수미", "왼쪽풀백"으로 써도 알아듣게 만들었다.

별칭 테이블을 두고 **최장 일치**로 스캔한다.

```js
const ALIAS = {
  GK: ['gk','골키퍼','골키','키퍼','골리'],
  CB: ['cb','센터백','중앙수비','센백','스토퍼'],
  DM: ['dm','수비형미드필더','수비형','수미','홀딩'],
  CM: ['cm','중앙미드필더','미드필더','중미','중원','미들'],
  ...
};
const MULTI = {'윙어':['LW','RW'], '측면':['LW','RW'], '윙':['LW','RW'],
               '풀백':['LB','RB'], '수비':['CB']};

const ALIST = [];
for (const p in ALIAS) ALIAS[p].forEach(a => ALIST.push([a, [p]]));
for (const k in MULTI) ALIST.push([k, MULTI[k]]);
ALIST.sort((a, b) => b[0].length - a[0].length);   // 긴 별칭 우선

function posOf(txt) {
  let s = String(txt||'').toLowerCase().replace(/[\s·]/g, '');
  const out = [];
  for (const [a, ps] of ALIST)
    if (s.includes(a)) { ps.forEach(p => out.push(p)); s = s.split(a).join(' '); }
  return [...new Set(out)];
}
```

길이 내림차순 정렬이 핵심이다. `수비형`이 `수비`보다 먼저 검사돼야 "수비형 미드필더"가 CB로 잘못 잡히지 않는다. 매칭된 별칭은 공백으로 치환해 같은 문자열이 두 번 소비되지 않게 한다.

`MULTI`는 하나의 단어가 여러 포지션으로 펼쳐지는 경우다. "윙"이라고만 쓰면 LW와 RW 둘 다 소화 가능한 것으로 본다.

제약 조건 문법에도 같은 파서를 물렸다. `고정 유성민 공격수 2,4`가 `고정 유성민 ST 2,4`와 동일하게 동작한다.

---

## 7. 출력: 표가 아니라 피치

초기 버전은 표로 뽑았다. 포지션이 행, 쿼터가 열. 문제는 쿼터마다 포메이션이 다르면 **행 구조가 안 맞는다**는 것이다. CM 행은 1·2쿼터만 차고 3·4쿼터는 비고, DM 행은 반대다. 빈칸이 절반인 표가 나온다.

그래서 실제 축구 포메이션 그림으로 바꿨다. 쿼터마다 피치 카드 하나, 선수 칩을 포지션 좌표에 찍는다.

좌표는 포메이션별 퍼센트 테이블로 둔다.

```js
const BACK = {GK:[[50,89]], LB:[[13,70]], CB:[[37,72],[63,72]], RB:[[87,70]]};
const COORD = {
  '4-4-2':   {...BACK, LW:[[13,47]], CM:[[38,49],[62,49]], RW:[[87,47]],
              ST:[[36,21],[64,21]]},
  '4-2-3-1': {...BACK, DM:[[37,52],[63,52]], LW:[[15,33]], AM:[[50,33]],
              RW:[[85,33]], ST:[[50,13]]},
  ...
};
```

백4는 네 포메이션이 공유하므로 `BACK`으로 빼서 스프레드했다. 칩은 `position: absolute` + `left/top` 퍼센트 + `translate(-50%,-50%)`로 찍는다. 퍼센트라서 카드 크기가 변해도 비율이 유지되고, 모바일에서 2열 그리드로 줄어들어도 그대로 동작한다.

피치 라인은 인라인 SVG 몇 줄이다.

```html
<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect x="2" y="2" width="96" height="96"/>
  <rect x="24" y="80" width="52" height="18"/>
  <circle cx="50" cy="50" r="13"/>
  <path d="M2 50h96"/>
</svg>
```

`preserveAspectRatio="none"`으로 늘려 쓰고, `vector-effect: non-scaling-stroke`로 선 굵기만 고정한다.

카드 아래에는 그 쿼터 벤치를 칩으로 붙였다. 벤치는 별도로 계산하지 않고 **출전 명단의 여집합**으로 만든다.

```js
const on = new Set(ORDER.flatMap(p => s[q][p] || []));
const off = P.filter(p => !on.has(p.name));
```

표를 완전히 버리진 않았다. "포지션 표로 보기"를 `<details>`로 접어 두고, 기본은 그림이다.

### 직접 만져 보는 라인업

아래는 실제로 솔버가 낸 해 하나를 같은 방식으로 그린 것이다. **선수 이름을 누르면** 네 쿼터에 걸친 그 선수의 동선이 한꺼번에 강조된다. 표의 행을 눌러도 된다.

<div class="lw" id="lw-lineup"></div>
<script>
(function () {
  var root = document.getElementById('lw-lineup'); if (!root) return;
  var BACK = {GK:[[50,89]], LB:[[13,70]], CB:[[37,72],[63,72]], RB:[[87,70]]};
  var COORD = {
    '4-4-2':   Object.assign({}, BACK, {LW:[[13,47]], CM:[[38,49],[62,49]], RW:[[87,47]], ST:[[36,21],[64,21]]}),
    '4-2-3-1': Object.assign({}, BACK, {DM:[[37,52],[63,52]], LW:[[15,33]], AM:[[50,33]], RW:[[85,33]], ST:[[50,13]]})
  };
  var ORDER = ['GK','LB','CB','RB','DM','CM','AM','LW','RW','ST'];
  var Q = [
    {f:'4-4-2',   p:{GK:['최영재'], LB:['박지환'], CB:['신동호','고명석'], RB:['장고호'], CM:['아이삭','윤태규'], LW:['손창민'], RW:['신형찬'], ST:['임정민','이래현']}},
    {f:'4-4-2',   p:{GK:['오수환'], LB:['손창민'], CB:['최영재','고명석'], RB:['신형찬'], CM:['아이삭','이민혁'], LW:['임정민'], RW:['김덕용'], ST:['유성민','이래현']}},
    {f:'4-2-3-1', p:{GK:['오수환'], LB:['박지환'], CB:['신동호','고명석'], RB:['이민혁'], DM:['윤태규','엄주성'], AM:['김덕용'], LW:['장고호'], RW:['임정민'], ST:['유성민']}},
    {f:'4-2-3-1', p:{GK:['최영재'], LB:['박지환'], CB:['신동호','오수환'], RB:['엄주성'], DM:['신형찬','윤태규'], AM:['아이삭'], LW:['장고호'], RW:['김덕용'], ST:['유성민']}}
  ];
  var ROSTER = [];
  Q.forEach(function (q) { ORDER.forEach(function (p) { (q.p[p] || []).forEach(function (n) { if (ROSTER.indexOf(n) < 0) ROSTER.push(n); }); }); });
  function posOf(n, qi) { for (var i = 0; i < ORDER.length; i++) if ((Q[qi].p[ORDER[i]] || []).indexOf(n) >= 0) return ORDER[i]; return null; }
  ROSTER.sort(function (a, b) { return cnt(b) - cnt(a) || (a < b ? -1 : 1); });
  function cnt(n) { var c = 0; for (var q = 0; q < 4; q++) if (posOf(n, q)) c++; return c; }

  var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="96" height="96"/><rect x="24" y="80" width="52" height="18"/><rect x="38" y="90" width="24" height="8"/><rect x="24" y="2" width="52" height="18"/><circle cx="50" cy="50" r="13"/><path d="M2 50h96"/></svg>';
  var sel = null;
  root.innerHTML = '<p class="lw__title">솔버가 낸 해 하나 (16명 · 4쿼터)</p><p class="lw__desc">이름을 누르면 그 선수의 네 쿼터가 강조돼요. 다시 누르면 해제돼요.</p><div class="lw__pitches" data-pitches></div><div class="lw__sum is-empty" data-sum>선수를 눌러 보세요</div><div class="lw__mx" data-mx></div>';
  var pitches = root.querySelector('[data-pitches]'), mx = root.querySelector('[data-mx]'), sum = root.querySelector('[data-sum]');

  var ph = '';
  Q.forEach(function (q, qi) {
    var chips = '';
    ORDER.forEach(function (p) {
      (q.p[p] || []).forEach(function (n, j) {
        var c = COORD[q.f][p][j];
        chips += '<span class="lw__p" data-n="' + n + '" style="left:' + c[0] + '%;top:' + c[1] + '%" title="' + p + '">' + n + '</span>';
      });
    });
    var bench = ROSTER.filter(function (n) { return !posOf(n, qi); });
    ph += '<div class="lw__q"><div class="lw__qh">' + (qi + 1) + 'Q<small>' + q.f + '</small></div><div class="lw__pitch">' + svg + chips + '</div><div class="lw__bench"><b>벤치</b>' + bench.map(function (n) { return '<span data-n="' + n + '">' + n + '</span>'; }).join('') + '</div></div>';
  });
  pitches.innerHTML = ph;

  var mh = '<div class="lw__mr is-head"><span>선수</span><span>1Q</span><span>2Q</span><span>3Q</span><span>4Q</span><span>합계</span></div>';
  ROSTER.forEach(function (n) {
    mh += '<div class="lw__mr" data-n="' + n + '"><span class="lw__mn">' + n + '</span>';
    for (var q = 0; q < 4; q++) { var p = posOf(n, q); mh += '<span class="lw__mc' + (p ? ' on' : '') + '">' + (p || '·') + '</span>'; }
    mh += '<span class="lw__mt">' + cnt(n) + '</span></div>';
  });
  mx.innerHTML = mh;

  function apply() {
    root.classList.toggle('has-sel', !!sel);
    root.querySelectorAll('[data-n]').forEach(function (e) { e.classList.toggle('is-sel', e.getAttribute('data-n') === sel); });
    if (!sel) { sum.className = 'lw__sum is-empty'; sum.textContent = '선수를 눌러 보세요'; return; }
    var parts = [], rest = [];
    for (var q = 0; q < 4; q++) { var p = posOf(sel, q); if (p) parts.push((q + 1) + 'Q ' + p); else rest.push((q + 1) + 'Q'); }
    sum.className = 'lw__sum';
    sum.textContent = sel + ' · ' + parts.join(' · ') + ' → ' + parts.length + '쿼터 출전' + (rest.length ? ' (벤치 ' + rest.join(', ') + ')' : '');
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-n]'); if (!t) return;
    var n = t.getAttribute('data-n'); sel = sel === n ? null : n; apply();
  });
  apply();
})();
</script>

이 해의 검증 결과는 9장에서 다시 본다. 신형찬은 1Q RW, 2Q RB, 4Q DM으로 각 포지션 1쿼터씩이고, 12명이 3쿼터, 4명이 2쿼터를 뛴다.

---

## 8. 페이지가 LLM을 직접 호출하기 — 그리고 그게 안 되는 곳

### 8.1 sample capability

Claude Artifact에는 런타임 capability라는 게 있다. 페이지가 뷰어 환경의 기능을 선언하고 쓰는 구조다. 그중 `sample`은 **페이지가 Claude에게 질문을 던질 수 있게** 해준다.

이걸 쓰면 "말로 적은 명단"을 구조화된 입력으로 바꾸는 일을 LLM에게 맡길 수 있다. 정확히 2장에서 그은 선 그대로 — 자연어 → 구조 변환은 LLM, 제약 만족은 코드.

```js
let ai = null;
try {
  if (typeof claude !== 'undefined' && claude && claude.use)
    ai = await claude.use('sample');
} catch (e) { ai = null }
```

프롬프트는 출력 스키마를 못 박는다.

<details markdown="1">
<summary>AI 입력 정리용 프롬프트 전문 보기</summary>

```js
const AIP = `당신은 풋살팀 라인업 입력을 정리하는 도우미입니다. JSON 하나로만 답하세요.

형식:
{"quarters":4,"formations":["4-4-2","4-4-2","4-2-3-1","4-2-3-1"],
 "roster":[{"name":"아이삭","positions":["CM","AM"],"min":2,"max":3}],
 "constraints":["고정 유성민 ST 2,4","휴식 아이삭 3"]}

규칙:
- positions는 GK, LB, CB, RB, DM, CM, AM, LW, RW, ST 중에서만.
  "중미"면 CM, "수미" DM, "공미" AM, ...
- constraints 문법은 다음 중 하나로만: ...
- 문법으로 표현할 수 없는 조건은 넣지 마세요.
`;
```

</details>

받은 JSON은 **그대로 믿지 않고 전부 화이트리스트로 거른다.**

```js
const fs = Array.isArray(d.formations) ? d.formations.filter(f => FORM[f]) : [];
let n = +d.quarters; if (!(n >= 1 && n <= 8)) n = fs.length || 4;
const raw = (p.positions || []).filter(x => ORDER.includes(x));
```

LLM이 `'4-5-1'`이나 `'FW'`를 뱉어도 조용히 버려진다. 설령 다 통과해도 최종 방어선은 솔버다. 제약을 어긴 라인업은 애초에 생성되지 않는다.

### 8.2 카톡에서 안 되는 이유

링크를 팀 단톡방에 뿌리고 핸드폰으로 열었더니, AI 입력 칸이 통째로 사라져 있었다. `claude.use('sample')`이 `null`을 반환했고 패널을 숨기게 짜 놨기 때문이다.

이유는 단순하다. 아티팩트 링크를 카톡 인앱 브라우저로 열면 그건 그냥 평범한 웹페이지다. **거기엔 `window.claude`가 없다.** 호출할 대상 자체가 존재하지 않는다.

| 여는 곳 | `window.claude` | sample 호출 | AI 정리 |
|---|---|---|---|
| claude.ai 대화 옆 패널 | 있음 | 가능 | ✅ 동작 |
| 카톡 인앱 브라우저 | 없음 | 불가 | ❌ 미동작 |
| 사파리 / 크롬 직접 | 없음 | 불가 | ❌ 미동작 |

환경에 따라 어떤 경로를 타는지는 아래 시퀀스로 정리된다.

<div class="mermaid">
sequenceDiagram
    actor U as 사용자
    participant P as 페이지 JS
    participant C as window.claude
    participant L as localParse
    participant S as 솔버
    U->>P: 말로 적은 명단 입력
    P->>C: claude.use('sample')
    alt claude.ai 패널 (capability 있음)
        C-->>P: JSON (명단, 포메이션, 제약)
        P->>P: 화이트리스트 검증
    else 카톡, 일반 브라우저 (window.claude 없음)
        C--xP: undefined
        P->>L: 규칙 기반 파싱
        L-->>P: 같은 형태의 JSON
    end
    P->>S: parseRoster, parseCons, solve()
    S-->>U: 해 최대 1,500개
</div>

### 8.3 설계 교훈과 폴백

여기서 배운 게 둘이다.

**하나. 환경 의존 기능을 조용히 숨기면 안 된다.** "안 되면 숨긴다"는 겉보기엔 깔끔한 처리지만, 사용자 입장에선 기능이 존재한다는 사실조차 모른 채 사라진다. 그래서 패널은 항상 띄우고, 쓸 수 없을 때는 왜 안 되는지 한 줄로 말하게 바꿨다.

**둘. 핵심 기능을 환경 의존 경로에만 두면 안 된다.** 자연어 입력은 "있으면 좋은" 기능이 아니라 팀원들이 쓸 주 경로였다. 그래서 LLM 없이도 도는 **규칙 기반 폴백 파서**를 짰다.

```js
function localParse(t, cur) {
  // 1) "1,2쿼터 442" 같은 포메이션 지정 추출
  const fre = new RegExp('((?:\\d[,·~및]*)+)쿼터[^0-9A-Za-z]{0,8}' + FRX, 'g');
  while (g = fre.exec(flat)) {
    const f = FNUM[g[2].replace(/-/g,'')] || g[2];
    (g[1].match(/\d/g)||[]).forEach(d => { fmq[+d-1] = f; nq = Math.max(nq, +d) });
  }
  // 2) 줄마다 이름 + 포지션 추출
  t.split('\n').forEach(l => {
    const pos = posOf(l); if (!pos.length) return;
    const name = (l.split(/[\s:：,]/)[0]||'').replace(/(은|는|이|가|도|만|의)$/, '');
    ...
    // 3) "3쿼터 쉼" → 휴식, "2,4쿼터 고정" → 고정
    if (/쉬|쉼|휴식|휴무|빠|제외|불참|벤치/.test(l)) cons.push('휴식 '+name+' '+qq.join(','));
    else if (/고정|무조건|반드시|해야|시키/.test(l)) cons.push('고정 '+name+' '+pos[0]+' '+qq.join(','));
  });
}
```

이름 추출에서 조사(은/는/이/가/도/만/의)를 떼는 처리를 넣었다. "아이삭은 중미인데" → `아이삭`.

실제로 이렇게 넣어서 테스트했다.

```text
오늘 4쿼터고 1,2쿼터 442 3,4쿼터 4231로 간다
아이삭은 중미인데 3쿼터 쉼
유성민 공격수 2,4쿼터 고정
임정민 윙 공격수
...
```

쿼터 수 4개, 포메이션 4개, 선수 15명의 포지션, 제약 3개가 전부 제대로 뽑혔다.

### 8.4 폴백 짜다 만난 버그

이 과정에서 버그를 하나 잡았다. 전체 쿼터 수를 추론하는 정규식이 이랬다.

```js
const qm = flat.match(/(\d)쿼터(?:제|까지)?/);   // 버그
```

"신형찬 수미 1쿼터 우윙 1쿼터" 같은 입력에서 맨 앞의 `1쿼터`를 **경기 전체가 1쿼터**라는 뜻으로 읽어버렸다. 그러면 뒤따르는 `휴식 아이삭 3`이 "3쿼터는 범위 밖"으로 걸러져 조용히 사라진다.

포지션별 쿼터 수와 전체 쿼터 수는 문법적으로 구분이 안 된다. 그래서 **추론을 포기하는 쪽**으로 고쳤다. 명시적 표지가 있을 때만 받아들이고, 없으면 사용자가 이미 고른 드롭다운 값을 쓴다.

```js
const qm = flat.match(/(\d)쿼터(?:제|경기|진행|까지|으?로간다|씩)/);
if (qm) nq = Math.max(nq, Math.min(8, +qm[1]));
if (!nq) nq = Math.min(8, Math.max(1, +cur || 4));
```

> 애매하면 추측하지 말고 사용자가 이미 명시한 값을 쓴다. 휴리스틱 파서를 짤 때 매번 되새기게 되는 원칙이다.
{: .notice--warning}

---

## 9. 검증: 헤드리스로 돌려본다

제약 만족 코드는 눈으로 봐서는 맞는지 알 수 없다. 백트래킹에서 상태 복원을 한 줄 빠뜨려도 대부분의 경우엔 그럴듯한 답이 나온다.

그래서 **브라우저 없이 Node에서 스크립트만 떼어내 돌리는 하네스**를 만들었다.

```js
const h = fs.readFileSync('lineup_generator.html', 'utf8');
const js = h.slice(h.indexOf('<script>') + 8, h.lastIndexOf('</scr'+'ipt>'));

const cache = {};
global.document = {
  querySelector: id => cache[id] || (cache[id] = el(id)),
  querySelectorAll: () => ['4-4-2','4-4-2','4-2-3-1','4-2-3-1'].map(v => ({value: v}))
};
global.claude = { use: async () => null };

eval(js + checkCode);
```

DOM은 필요한 만큼만 흉내 낸다. `querySelector`가 `{value, textContent, innerHTML, onclick}` 정도를 가진 객체를 돌려주면 충분하다. `claude.use`는 `null`을 반환해 폴백 경로를 타게 한다.

그리고 찾아낸 해를 **전부 독립적으로 검사한다.** 솔버가 맞다고 한 걸 믿지 않고, 별도 코드로 다시 본다.

```js
for (const s of sols) {
  const pos = (n, q) => ORDER.find(p => (s[q][p]||[]).includes(n));

  // 포지션별 쿼터 수
  const c = {};
  for (let q = 0; q < 4; q++) { const p = pos('신형찬', q); if (p) c[p] = (c[p]||0)+1 }
  if (c.DM !== 1 || c.RW !== 1 || c.RB !== 1) bad.push('캡 위반');

  // 고정 / 휴식
  if (pos('유성민',1) !== 'ST' || pos('유성민',3) !== 'ST') bad.push('고정');
  if (pos('아이삭',2)) bad.push('휴식');

  // 최대 연속
  let run = 0, mr = 0;
  for (let q = 0; q < 4; q++) { run = pos('박지환',q) ? run+1 : 0; mr = Math.max(mr,run) }
  if (mr > 2) bad.push('연속');

  // 구조: 쿼터당 11명, 중복 없음
  for (let q = 0; q < 4; q++) {
    const all = ORDER.flatMap(p => s[q][p]||[]);
    if (all.length !== 11 || new Set(all).size !== 11) bad.push('구조');
  }
}
```

**1,500개 해 전부에서 위반 0건.** 이 하네스가 없었다면 4.5절의 그룹 카운터 백트래킹이 맞는지 확신할 방법이 없었다.

7장의 라인업이 바로 이 검사를 통과한 해다. 요구사항을 하나씩 대조하면 이렇다.

| 요구사항 | 확인 |
|---|---|
| 신형찬: DM, RW, RB 각 1쿼터 | 1Q RW, 2Q RB, 4Q DM ✅ |
| 유성민: 2·4쿼터 ST 고정 | 2Q ST, 4Q ST ✅ |
| 아이삭: 3쿼터 휴식 | 1·2·4Q 출전, 3Q 벤치 ✅ |
| 박지환: 최대 연속 2쿼터 | 1Q, 3Q, 4Q 출전 → 최대 연속 2 ✅ |
| 쿼터당 11명, 중복 없음 | 4개 쿼터 모두 11명 ✅ |

---

## 10. 전체 구조

<div class="mermaid">
flowchart TD
    IN["자유 입력: 말로 적은 명단"] --> AI{"window.claude 있음?"}
    AI -- 있음 --> S1["sample capability: LLM이 JSON으로 변환"]
    AI -- 없음 --> S2["localParse: 규칙 기반 파서"]
    S1 --> WL["화이트리스트 검증"]
    S2 --> WL
    WL --> TA["명단 textarea + 제약 textarea"]
    TA --> PR["parseRoster / parseCons"]
    PR --> CHK{"사전 검증: 자리 수, 인원, 포지션 커버리지"}
    CHK -- 실패 --> ERR["오류 목록 표시"]
    CHK -- 통과 --> SOLVE["solve(): 백트래킹 DFS"]
    SOLVE --> RES["리저버 샘플링: 최대 1,500해"]
    RES --> OUT["피치 렌더링 + 벤치 + 선수별 표"]
</div>

LLM이 닿는 범위는 위쪽 한 블록뿐이다. 거기서부터 아래는 전부 결정론적 코드다. 그래서 **LLM이 헛소리를 해도 잘못된 라인업은 나올 수 없다.** 최악의 경우 입력이 이상하게 채워지고, 사용자가 보고 고친다.

---

## 11. 회고

### 11.1 프롬프트로 안 되는 일이 있다

LLM은 제약 만족을 못 한다. 정확히는, 맞는 답을 자주 내지만 항상 내지는 못한다. 그리고 제약 만족 문제에서 "자주 맞음"은 "틀림"과 거의 같다. 매번 검산해야 하니까.

이 구분을 명확히 하는 게 이번 프로젝트의 전부였다.

| | LLM에게 | 코드에게 |
|---|---|---|
| 잘하는 일 | 자유로운 한국어를 구조로 변환, 별칭·오타·생략 처리 | 제약 검사, 완전성 보장, 재현성 |
| 못하는 일 | 44변수 제약 만족, 매번 같은 결과 | 비정형 입력 해석 |

### 11.2 입력 형식이 설계다

가장 큰 개선은 알고리즘이 아니라 **입력을 배분표에서 명단으로 바꾼 것**이었다. 배분표는 이미 반쯤 풀린 답을 사람에게 요구하는 입력이었다. 명단으로 바꾸자 쿼터 수를 바꿔도 아무것도 다시 쓸 필요가 없어졌고, 코드도 줄었다.

문제를 어떻게 받을지를 잘못 정하면, 그 뒤 코드가 아무리 좋아도 사용자는 계속 손으로 일한다.

### 11.3 폴백은 나중에 붙이는 게 아니다

sample capability는 매력적인 기능이었고, 그래서 그 위에 핵심 UX를 올렸다. 카톡에서 열어 보기 전까지는 문제를 몰랐다.

"환경이 지원하면 쓰고 아니면 숨긴다"는 패턴은 **부가 기능**에만 써야 한다. 주 경로라면 지원 안 되는 환경에서 무엇이 대신 동작할지를 처음부터 같이 설계해야 한다.

### 11.4 바이브코딩에 대해

이 작업은 전부 Claude와의 대화로 진행했다. 다만 "알아서 해줘"로 굴러간 건 아니었다.

실제로 효과가 있었던 건 이런 것들이다.

- **문제를 CSP로 다시 세우자고 명시한 것.** 이걸 말하기 전까지는 계속 프롬프트 템플릿을 다듬고 있었다.
- **못 되는 걸 못 된다고 듣는 것.** "카톡에서 왜 안 되냐"에 대해 "환경에 `window.claude`가 없다"는 답을 받고 나서야 폴백 설계로 넘어갈 수 있었다. 여기서 얼버무렸다면 한참 더 헤맸을 것이다.
- **매번 돌려보고 수치로 확인한 것.** 1,500개 해 전수 검사, 2.8초에 15,368해 같은 숫자가 있어야 "되는 것 같다"에서 "된다"로 넘어간다.

### 11.5 한눈에 보는 여정

<div class="mermaid">
timeline
    title 라인업 생성기가 바뀐 순서
    프롬프트 시기 : 우선순위 5단계 프롬프트 : 4-3-3 고정에서는 잘 동작
    한계 : 쿼터별 포메이션 혼합 : 매번 손으로 검산
    재정의 : 제약 만족 문제로 모델링 : LLM은 변환만, 코드는 검증
    솔버 : 백트래킹과 가지치기 : 중복 순열 제거와 리저버 샘플링
    입력 : 배분표에서 명단으로 : 한국어 포지션 파서
    출력과 환경 : 피치 렌더링 : sample capability와 폴백
</div>

도구는 **단일 HTML 414줄**로 끝났다. 빌드도 없고 의존성도 없고 서버도 없다. 매주 쓰고 있다.

### 이 글에서 다룬 것

- [x] 포메이션이 섞이면 배분표가 무의미해지는 이유
- [x] 라인업 짜기를 CSP로 모델링 (변수·도메인·제약)
- [x] 백트래킹 DFS + 쿼터 경계 가지치기
- [x] 단조 증가로 중복 순열 제거, 리저버 샘플링
- [x] 입력을 배분표에서 명단으로 뒤집기
- [x] 한국어 별칭 최장 일치 파서
- [x] 환경 의존 기능의 폴백 설계
- [x] 솔버 결과를 독립 코드로 전수 검증
