---
layout: single
title: 데이터 분석가가 반드시 알아야 할 핵심 지표 완전정복
categories: DataAnalytics
tag: [DataAnalytics, Retention, LTV, CAC, ABTest, DAU, MAU, Cohort, KPI, 데이터분석]
toc: true
---

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body);"></script>

<style>
/* ── 전체 카드 기본 ───────────────────────── */
.metric-card {
  background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 20px 24px;
  margin: 1.4rem 0;
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
/* ── 경고/팁 박스 ────────────────────────── */
.box-danger {
  border-left: 5px solid #FF7B72;
  background: rgba(255,123,114,0.07);
  border-radius: 0 10px 10px 0;
  padding: 14px 18px;
  margin: 1.4rem 0;
}
.box-tip {
  border-left: 5px solid #3FB950;
  background: rgba(63,185,80,0.07);
  border-radius: 0 10px 10px 0;
  padding: 14px 18px;
  margin: 1.4rem 0;
}
.box-info {
  border-left: 5px solid #58A6FF;
  background: rgba(88,166,255,0.07);
  border-radius: 0 10px 10px 0;
  padding: 14px 18px;
  margin: 1.4rem 0;
}
.box-formula {
  border-left: 5px solid #BC8CFF;
  background: rgba(188,140,255,0.07);
  border-radius: 0 10px 10px 0;
  padding: 14px 18px;
  margin: 1.4rem 0;
}
/* ── 지표 태그 배지 ──────────────────────── */
.badge-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 1rem 0;
}
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.badge-blue   { background: rgba(88,166,255,0.18); color: #58A6FF; border: 1px solid #58A6FF44; }
.badge-green  { background: rgba(63,185,80,0.18);  color: #3FB950; border: 1px solid #3FB95044; }
.badge-orange { background: rgba(240,136,62,0.18); color: #F0883E; border: 1px solid #F0883E44; }
.badge-purple { background: rgba(188,140,255,0.18);color: #BC8CFF; border: 1px solid #BC8CFF44; }
.badge-yellow { background: rgba(227,179,65,0.18); color: #E3B341; border: 1px solid #E3B34144; }
.badge-red    { background: rgba(255,123,114,0.18); color: #FF7B72; border: 1px solid #FF7B7244; }
/* ── 비교 카드 그리드 ────────────────────── */
.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 1.4rem 0;
}
.compare-card {
  background: rgba(22,27,34,0.9);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 16px;
}
/* ── 이미지 래퍼 ─────────────────────────── */
.img-wrapper {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  margin: 1.6rem 0;
  position: relative;
}
.img-wrapper img {
  display: block;
  width: 100%;
  transition: transform 0.3s ease;
}
.img-wrapper:hover img {
  transform: scale(1.01);
}
.img-caption {
  background: rgba(13,17,23,0.92);
  color: #8B949E;
  font-size: 0.82rem;
  padding: 8px 14px;
  text-align: center;
  border-top: 1px solid rgba(255,255,255,0.06);
}
/* ── 단계 스텝 ──────────────────────────── */
.step-list {
  counter-reset: step-counter;
  list-style: none;
  padding: 0;
  margin: 1rem 0;
}
.step-list li {
  counter-increment: step-counter;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.step-list li::before {
  content: counter(step-counter);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #58A6FF, #BC8CFF);
  color: white;
  font-size: 0.78rem;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 2px;
}
/* ── Mermaid 래퍼 ────────────────────────── */
.mermaid-wrapper {
  background: rgba(22,27,34,0.9);
  border: 1px solid rgba(88,166,255,0.2);
  border-radius: 12px;
  padding: 20px;
  margin: 1.4rem 0;
}
/* ── 요약 테이블 ─────────────────────────── */
.summary-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 10px;
  overflow: hidden;
  margin: 1.4rem 0;
  font-size: 0.9rem;
}
.summary-table th {
  background: rgba(88,166,255,0.15);
  color: #58A6FF;
  font-weight: 700;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid rgba(88,166,255,0.3);
}
.summary-table td {
  padding: 9px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  vertical-align: middle;
}
.summary-table tr:last-child td { border-bottom: none; }
.summary-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
</style>

> **이 글은** 데이터 분석 직무를 준비하거나, 처음으로 지표를 체계적으로 정리하고 싶은 분들을 위해 작성됐습니다.  
> 사전적 정의가 아니라 **"왜 이 지표가 필요한가"** 와 **"분석가는 이 지표로 무엇을 하는가"** 에 집중합니다.

---

## 지표를 왜 AARRR 순서로 봐야 하는가

지표가 너무 많아서 뭐부터 봐야 할지 막막하다면, 가장 먼저 **퍼널 구조**를 머릿속에 심어야 합니다.

<div class="mermaid-wrapper">

```mermaid
flowchart LR
    A(["👤 유입<br/>Acquisition"]) -->|42%| B(["⚡ 활성화<br/>Activation"])
    B -->|55%| C(["🔄 유지<br/>Retention"])
    C -->|37%| D(["💰 수익<br/>Revenue"])
    D -->|38%| E(["📢 추천<br/>Referral"])
    style A fill:#1e3a5f,stroke:#58A6FF,color:#F0F6FC
    style B fill:#1a3d2e,stroke:#3FB950,color:#F0F6FC
    style C fill:#2d2a1e,stroke:#E3B341,color:#F0F6FC
    style D fill:#3d2a1a,stroke:#F0883E,color:#F0F6FC
    style E fill:#2e1a3d,stroke:#BC8CFF,color:#F0F6FC
```

</div>

각 단계 사이의 숫자가 **전환율(Conversion Rate)** 입니다. 분석가의 일은 "어느 단계에서 사람이 가장 많이 빠져나가는가"를 찾아내는 것입니다.

<div class="img-wrapper">
  <img src="./assets/images/fig1_aarrr_funnel.png" alt="AARRR 퍼널 & 핵심 지표 매핑">
  <div class="img-caption">📊 AARRR 퍼널 — 각 단계별 사용자 이탈과 핵심 지표 매핑</div>
</div>

<div class="box-info">
  <strong style="color:#58A6FF;">💡 분석가의 시각:</strong> 단계별 수치를 보는 것보다, <strong>어느 단계의 전환율이 업계 평균보다 현저히 낮은가</strong>를 찾는 것이 핵심입니다. 거기가 가장 먼저 파야 할 곳입니다.
</div>

---

## 1. 리텐션(Retention) — 분석가가 가장 먼저 보는 지표

> "한 번 온 사람이 다시 오는가?"

리텐션은 단순하게 들리지만, **측정 방식에 따라 완전히 다른 이야기를 합니다.**

### Classic Retention vs Rolling Retention

<div class="compare-grid">
  <div class="compare-card">
    <div class="badge-grid"><span class="badge badge-blue">Classic Retention</span><span class="badge badge-blue">N-Day</span></div>
    <p style="font-size:0.9rem; margin:8px 0 4px;"><strong>정의:</strong> 가입 후 정확히 N일째에 돌아온 비율</p>
    <p style="font-size:0.88rem; color:#8B949E;">가입 후 7일째 날에만 들어온 사람 / 전체 가입자</p>
    <p style="font-size:0.88rem; margin-top:8px;"><strong>적합한 서비스:</strong> 게임, 메신저, SNS</p>
    <p style="font-size:0.88rem; color:#FF7B72;">단점: 6일째 들어왔다가 8일째 들어온 사람은 0%로 계산됨</p>
  </div>
  <div class="compare-card">
    <div class="badge-grid"><span class="badge badge-green">Rolling Retention</span><span class="badge badge-green">Unbounded</span></div>
    <p style="font-size:0.9rem; margin:8px 0 4px;"><strong>정의:</strong> 가입 후 N일 이후 한 번이라도 돌아온 비율</p>
    <p style="font-size:0.88rem; color:#8B949E;">가입 후 7일 이후에 한 번이라도 방문한 사람 / 전체 가입자</p>
    <p style="font-size:0.88rem; margin-top:8px;"><strong>적합한 서비스:</strong> 여행 앱, 가전 쇼핑몰</p>
    <p style="font-size:0.88rem; color:#3FB950;">장점: 비정기적으로 쓰는 서비스에 더 현실적인 측정값</p>
  </div>
</div>

### Cohort 분석 — 리텐션의 진짜 패턴을 읽는 법

단순한 리텐션 수치 하나보다, **가입 시점이 같은 집단(Cohort)** 을 묶어서 비교할 때 진짜 인사이트가 나옵니다.

<div class="img-wrapper">
  <img src="./assets/images/fig2_retention.png" alt="Retention 분석 — Classic vs Rolling 곡선 + Cohort Heatmap">
  <div class="img-caption">📈 Classic/Rolling Retention 곡선 비교 & 월별 코호트 리텐션 히트맵</div>
</div>

Cohort Heatmap에서 읽어야 할 패턴 두 가지:

<ul class="step-list">
  <li><strong>세로(같은 Week) 방향으로 읽기:</strong> 아래 코호트로 갈수록 Week 1 리텐션이 45% → 61%로 올라가고 있다면, 서비스 품질이 개선되고 있다는 신호입니다.</li>
  <li><strong>가로(같은 코호트) 방향으로 읽기:</strong> 특정 Week에서 리텐션이 급격히 꺾이는 시점이 있다면, 그 시점에 사용자가 이탈하는 원인이 있습니다. 그 지점을 파야 합니다.</li>
</ul>

### Stickiness — DAU/MAU로 서비스 생활화 진단

$$\text{Stickiness} = \frac{DAU}{MAU} \times 100$$

<div class="box-formula">
  <strong style="color:#BC8CFF;">📐 해석 기준:</strong>
  <table class="summary-table" style="margin-top:10px;">
    <tr><th>범위</th><th>의미</th><th>예시</th></tr>
    <tr><td>&lt; 20%</td><td style="color:#FF7B72;">생활화 약함</td><td>핵심 기능 재점검 필요</td></tr>
    <tr><td>20 ~ 30%</td><td style="color:#E3B341;">준수</td><td>꾸준한 개선 필요</td></tr>
    <tr><td>30 ~ 50%</td><td style="color:#3FB950;">좋음</td><td>습관적 사용 중</td></tr>
    <tr><td>&gt; 50%</td><td style="color:#58A6FF;">탁월</td><td>카카오톡·인스타그램 수준</td></tr>
  </table>
</div>

---

## 2. 전환율(CVR) — 퍼널의 어디가 막혔나

> "원하는 행동을 했는가?"

전환율은 **Micro(작은 전환)**와 **Macro(최종 전환)**로 나뉩니다.

<div class="badge-grid">
  <span class="badge badge-blue">Micro CVR: 상세 페이지 조회</span>
  <span class="badge badge-blue">Micro CVR: 장바구니 담기</span>
  <span class="badge badge-blue">Micro CVR: 결제 시작</span>
  <span class="badge badge-orange">Macro CVR: 결제 완료</span>
  <span class="badge badge-orange">Macro CVR: 구독 전환</span>
</div>

<div class="box-danger">
  <strong style="color:#FF7B72;">⚠️ 전환율 분석의 흔한 실수:</strong> "전체 전환율 3.2%"는 아무 말도 하지 않습니다. 반드시 <strong>신규 vs 기존 사용자, 모바일 vs 웹, 채널별로 세그먼트를 쪼개야</strong> 진짜 인사이트가 나옵니다.
</div>

```python
# 세그먼트별 전환율 분석
segment_data = {
    'segment':     ['신규_모바일', '신규_웹', '기존_모바일', '기존_웹'],
    'visitors':    [15000, 8000, 22000, 12000],
    'conversions': [  300,  280,  1540,   960]
}
df = pd.DataFrame(segment_data)
df['cvr'] = (df['conversions'] / df['visitors'] * 100).round(2)

#  segment  visitors  conversions   cvr
#  신규_모바일  15000     300       2.00  ← 문제 구간 발견
#  신규_웹      8000     280       3.50
#  기존_모바일  22000    1540       7.00
#  기존_웹     12000     960       8.00
```

**신규 모바일(2%) vs 기존 웹(8%)** 사이에 4배 차이. 전체 평균만 봤다면 이 격차를 완전히 놓쳤을 것입니다.

<div class="img-wrapper">
  <img src="./assets/images/fig4_funnel_stickiness.png" alt="Micro→Macro 전환 퍼널 & DAU/MAU Stickiness 트렌드">
  <div class="img-caption">🔽 Micro → Macro 전환 퍼널 & 월별 DAU/MAU Stickiness 추이</div>
</div>

---

## 3. 수익 지표 — LTV / CAC / ARPU / ARPPU

> "비즈니스가 지속 가능한가?"

### LTV — 한 명의 고객이 가져다주는 총 가치

$$\text{LTV} = ARPU \times \frac{1}{\text{Churn Rate}}$$

월 평균 결제액이 3만 원이고 월 이탈률이 5%라면:

$$\text{LTV} = 30{,}000 \times \frac{1}{0.05} = 600{,}000\text{원}$$

### LTV / CAC — 비즈니스 지속가능성의 핵심 비율

<div class="metric-card">
  <div class="badge-grid">
    <span class="badge badge-red">LTV/CAC &lt; 1 → 고객 데려올수록 손해</span>
    <span class="badge badge-yellow">LTV/CAC = 3 → 건강한 비즈니스 기준</span>
    <span class="badge badge-green">LTV/CAC ≥ 5 → 성장 투자 가능</span>
  </div>
  <p style="font-size:0.9rem; color:#8B949E; margin-top:10px;">
    단순히 비율만 볼 게 아니라 <strong>Payback Period(투자 회수 기간)</strong>도 함께 봐야 합니다.
    CAC가 LTV의 1/3이라도, 그걸 회수하는 데 24개월 걸린다면 현금 흐름에 문제가 생깁니다.
  </p>
</div>

### ARPU vs ARPPU — 결제 유저와 전체 유저를 구분하는 이유

<div class="compare-grid">
  <div class="compare-card">
    <div class="badge-grid"><span class="badge badge-blue">ARPU</span></div>
    <p style="font-size:0.9rem; margin:6px 0;">전체 유저 1인당 평균 매출</p>
    <code style="font-size:0.85rem;">총 매출 ÷ 전체 MAU</code>
    <p style="font-size:0.85rem; color:#8B949E; margin-top:8px;">비결제 유저까지 포함해 서비스 전체의 수익 효율을 봄</p>
  </div>
  <div class="compare-card">
    <div class="badge-grid"><span class="badge badge-green">ARPPU</span></div>
    <p style="font-size:0.9rem; margin:6px 0;">결제 유저 1인당 평균 매출</p>
    <code style="font-size:0.85rem;">총 매출 ÷ 결제 유저 수</code>
    <p style="font-size:0.85rem; color:#8B949E; margin-top:8px;">실제 지갑을 여는 사람들의 소비 패턴을 봄. 가격 전략에 직접 영향</p>
  </div>
</div>

<div class="img-wrapper">
  <img src="./assets/images/fig3_ltvcac_abtest.png" alt="LTV/CAC 채널별 분석 & A/B 테스트 통계적 유의성">
  <div class="img-caption">💹 채널별 LTV vs CAC 비율 분석 & A/B 테스트 통계적 유의성(p-value) 개념</div>
</div>

---

## 4. A/B 테스트 — 진짜 효과였는지 증명하는 법

> "어떤 변화가 우연이 아닌 진짜 효과였는가?"

### 알아야 할 핵심 개념 3가지

<ul class="step-list">
  <li>
    <div>
      <strong>Statistical Significance (통계적 유의성)</strong><br>
      <span style="font-size:0.88rem; color:#8B949E;">실험 결과가 우연이 아님을 증명하는 성질. 보통 <strong>p-value &lt; 0.05</strong>일 때 "유의하다"고 판단합니다.</span>
    </div>
  </li>
  <li>
    <div>
      <strong>P-value</strong><br>
      <span style="font-size:0.88rem; color:#8B949E;">귀무가설(아무 효과 없음)이 참일 때 이런 결과가 우연히 나올 확률. 낮을수록 "이건 진짜 효과다"라고 말할 수 있습니다.</span>
    </div>
  </li>
  <li>
    <div>
      <strong>MDE (Minimum Detectable Effect)</strong><br>
      <span style="font-size:0.88rem; color:#8B949E;">실험으로 감지하고 싶은 최소한의 지표 개선 폭. MDE가 작을수록 더 많은 샘플(사용자)이 필요합니다. 실험 설계 단계에서 반드시 정해야 합니다.</span>
    </div>
  </li>
</ul>

<div class="box-formula">
  <strong style="color:#BC8CFF;">📐 실험 필요 샘플 수 추정:</strong>

  $$n \approx \frac{2 \cdot (z_{\alpha/2} + z_{\beta})^2 \cdot p(1-p)}{MDE^2}$$

  <ul style="font-size:0.88rem; color:#8B949E; margin-top:8px;">
    <li>$z_{\alpha/2} = 1.96$ (유의수준 5%)</li>
    <li>$z_{\beta} = 0.84$ (검정력 80%)</li>
    <li>$p$ = 기존 전환율, $MDE$ = 감지하려는 최소 개선폭</li>
  </ul>
</div>

<div class="box-danger">
  <strong style="color:#FF7B72;">🚨 A/B 테스트에서 가장 많이 하는 실수:</strong> 결과가 좋아 보이자마자 실험을 조기 종료하는 것입니다. 이를 <strong>Peeking Problem</strong>이라고 하며, 실제로 유의미하지 않은 결과를 유의미하게 오해할 확률이 올라갑니다. 사전에 정한 샘플 수를 채울 때까지 기다려야 합니다.
</div>

---

## 5. 분석가가 지표를 다루는 실전 원칙

<div class="metric-card">
  <h3 style="color:#58A6FF; margin-top:0;">🌟 North Star Metric 먼저 정하라</h3>
  <p style="font-size:0.9rem; color:#8B949E;">모든 지표를 동시에 관리하는 것은 불가능합니다. 서비스의 핵심 가치를 가장 잘 표현하는 단 하나의 지표를 정하고, 팀 전체가 그것을 기준으로 정렬해야 합니다.</p>
  <table class="summary-table">
    <tr><th>서비스 유형</th><th>North Star Metric 예시</th></tr>
    <tr><td>커머스</td><td>월간 구매 완료 건수</td></tr>
    <tr><td>SaaS</td><td>주간 활성 워크스페이스 수</td></tr>
    <tr><td>콘텐츠</td><td>주간 총 시청 시간</td></tr>
    <tr><td>커뮤니티</td><td>월간 콘텐츠 생산 사용자 수</td></tr>
  </table>
</div>

<div class="box-danger">
  <strong style="color:#FF7B72;">🚫 허영 지표(Vanity Metric)를 경계하라</strong><br>
  총 가입자 수, 누적 다운로드 수처럼 숫자는 커 보이지만 실제 비즈니스 상태를 반영하지 못하는 지표들입니다. 가입자 100만 명이라도 MAU가 1만 명이면 의미가 없습니다.
</div>

<div class="box-tip">
  <strong style="color:#3FB950;">✅ 지표는 항상 세그먼트로 쪼개라</strong><br>
  "전체 리텐션 25%"는 아무 말도 하지 않습니다. 신규 vs 기존, 모바일 vs 웹, 채널별, 지역별로 분해했을 때 진짜 개선 포인트가 보입니다.
</div>

---

## 전체 지표 한눈에 정리

<table class="summary-table">
  <tr>
    <th>분류</th>
    <th>지표명</th>
    <th>핵심 질문</th>
    <th>주의할 것</th>
  </tr>
  <tr>
    <td><span class="badge badge-blue">Retention</span></td>
    <td>N-Day / Rolling / Cohort</td>
    <td>다시 돌아오는가?</td>
    <td>서비스 특성에 맞는 방식 선택</td>
  </tr>
  <tr>
    <td><span class="badge badge-purple">Stickiness</span></td>
    <td>DAU/MAU</td>
    <td>생활화됐는가?</td>
    <td>20% 미만이면 핵심 기능 재검토</td>
  </tr>
  <tr>
    <td><span class="badge badge-orange">CVR</span></td>
    <td>Micro/Macro Conversion Rate</td>
    <td>원하는 행동을 했는가?</td>
    <td>세그먼트 없는 전체 수치는 의미 없음</td>
  </tr>
  <tr>
    <td><span class="badge badge-yellow">Revenue</span></td>
    <td>LTV / CAC / ARPU / ARPPU</td>
    <td>지속 가능한 구조인가?</td>
    <td>LTV/CAC 비율 + Payback Period 함께 볼 것</td>
  </tr>
  <tr>
    <td><span class="badge badge-green">Experiment</span></td>
    <td>p-value / MDE / Significance</td>
    <td>이 변화는 진짜 효과인가?</td>
    <td>Peeking Problem — 조기 종료 금지</td>
  </tr>
</table>

---

## 마치며

지표는 정답을 알려주지 않습니다.

**"지금 무엇을 물어봐야 하는지"** 를 알려주는 도구입니다.

리텐션이 낮으면 "왜 떠나는가"를, LTV/CAC가 1 미만이면 "이 채널에 계속 돈을 써야 하는가"를, A/B 테스트 결과가 p &lt; 0.05이면 "이 변화를 전체 배포해도 되는가"를 물어볼 수 있게 됩니다.

<div class="box-tip">
  <strong style="color:#3FB950;">💬 결국 같은 말:</strong> 좋은 분석가는 좋은 <strong>질문</strong>을 만드는 사람입니다. 지표는 그 질문을 만들기 위한 재료입니다.
</div>