---
layout: single
title: "6편. AI가 틀렸을 때 — 프롬프트로 멱살 잡는 법"
categories: VibeCoding
tag: [VibeCoding, Lovable, Gemini, 바이브코딩, 버그, 할루시네이션, 프롬프트엔지니어링]
toc: true
---

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>

> **바이브코딩 일대기** | 수학과·컴공과 출신 기획자가 Lovable로 풀스택 앱을 처음 만든 현실 연재. 총 10편.

---

## AI 바이브 코딩의 불편한 진실

5편까지 읽었으면 이런 생각이 들 수 있다.

> "Gemini한테 물어보면 다 나오고, Lovable에 넣으면 다 만들어지는 거 아니야?"

아니다.

AI는 틀린다. 그것도 **자신 있게** 틀린다. 멀쩡해 보이는 코드가 논리적으로 완전히 잘못됐거나, 분명히 요청한 기능이 전혀 다른 방식으로 구현되거나, 고쳐달라고 했더니 엉뚱한 부분을 고치거나.

6편은 그 경험들을 정리한다.

---

## 케이스 1. 스카우팅 리포트가 전부 같은 칭호만 뱉었다

5편에서 16종 스카우팅 리포트를 만들었다고 했다. 근데 실제로 돌려보니 **팀 전원이 "스탯 세탁기"** 칭호를 받았다.

이유가 있었다. Lovable이 생성한 판별 로직이 이런 구조였다.

```javascript
// ❌ Lovable이 처음 만들어준 로직
function getScoutingReport(player) {
  if (player.goals > 5) return "득점 기계";
  if (player.assists > 3) return "플레이메이커";
  if (player.bigLeadGoals > 0) return "스탯 세탁기"; // ← 여기서 다 걸림
  if (player.lastQuarterGoals > 2) return "극장골 장인";
  // ...
}
```

`if-else` 순서대로 내려오다가 `bigLeadGoals > 0` 조건에서 전원이 걸렸다. 3골 이상 이기고 있을 때 골을 **한 번이라도** 넣은 선수가 전부 "스탯 세탁기"가 된 것이다.

<div style="padding: 15px; border-left: 5px solid #ff6b6b; background: rgba(255,107,107,0.08); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #ff6b6b;">🚨 문제:</strong> 단순 if-else 구조는 조건을 순서대로 훑다가 첫 번째 매칭에서 멈춘다. 주전 선수일수록 모든 조건에 조금씩 걸려서 엉뚱한 칭호를 받는 <strong>병목 현상</strong>이 발생한다.
</div>

**Gemini한테 가져간 프롬프트:**

```
스카우팅 리포트 16종 칭호 판별 로직에 병목 현상이 생겼어.

[문제]
if-else로 조건을 순서대로 내려오다 보니
출전이 잦은 선수들이 중간 조건(스탯 세탁기)에
다 걸려버려서 전원이 같은 칭호를 받음.

[원하는 방식]
if-else 방식 말고, 16개 칭호 전부에 대해
각 선수의 '부합 점수(0~100점)'를 계산한 뒤
가장 높은 점수의 칭호 1개를 반환하는 방식으로 바꿔줘.

스탯 세탁기 같은 극단적 칭호는
전체 득점 중 60% 이상이 3점차 리드 상황일 때만
높은 점수 받도록 임계값 빡세게 잡아줘.
```

**Gemini가 제안한 구조 변경:**

```javascript
// ✅ 가중치 점수제로 전면 수정
function getScoutingReport(player, recentMatches) {
  const scores = {
    statPadder: 0,
    clutchHero: 0,
    lastQuarterKing: 0,
    playmaker: 0,
    // ... 16개 전부
  };

  // 스탯 세탁기: 3점차 리드 상황 골 비율 >= 0.6
  const padRatio = player.bigLeadGoals / (player.totalGoals || 1);
  scores.statPadder = padRatio >= 0.6 ? padRatio * 100 : padRatio * 20;

  // 클러치 장인: 지고 있거나 동점 상황 골 비율 >= 0.5
  const clutchRatio = player.clutchGoals / (player.totalGoals || 1);
  scores.clutchHero = clutchRatio >= 0.5 ? clutchRatio * 100 : clutchRatio * 15;

  // 최근 5경기 가중치 부여
  const recentForm = calculateRecentForm(recentMatches);
  Object.keys(scores).forEach(key => {
    scores[key] *= (1 + recentForm * 0.3); // 최근 폼이 좋을수록 점수 증폭
  });

  // 최고 점수 칭호 반환
  return Object.entries(scores)
    .sort(([,a], [,b]) => b - a)[0][0];
}
```

이 구조에서 각 칭호의 점수 계산식을 수식으로 표현하면:

$$\text{Score}_{badge} = \text{ratio} \times 100 \times \begin{cases} 1.0 & \text{if ratio} \geq \text{threshold} \\ 0.2 & \text{if ratio} < \text{threshold} \end{cases} \times (1 + 0.3 \cdot \text{recentForm})$$

임계값을 넘으면 풀 점수, 못 넘으면 20% 감점. 여기에 최근 5경기 폼 가중치가 곱해진다. 수학과 출신으로서 이 부분은 직접 검토했다.

---

## 케이스 2. 과거 경기가 전부 "예정"으로 떴다

경기 목록 페이지에서 황당한 일이 생겼다.

2024년 경기들이 전부 **"예정(Scheduled)"** 상태로 떴다. 이미 끝난 경기인데.

---

> 📸 **[이미지 필요]**
> 경기 목록에서 과거 경기들이 "예정" 뱃지로 표시된 화면 캡처.
> "이미 끝난 경기인데 예정으로 뜬다"는 게 보이면 됨.

---

원인 추적 결과, Lovable이 경기 상태를 판별하는 로직이 이랬다.

```javascript
// ❌ Lovable이 생성한 상태 판별 로직
const getMatchStatus = (match) => {
  if (match.goal_events.length === 0) {
    return 'scheduled'; // ← 골 기록 없으면 무조건 예정 처리
  }
  return match.result;
}
```

골 기록이 없으면 무조건 예정. 근데 초반에 기록을 다 못 넣은 경기들이 있었다. 2024년 2월~4월 경기 3개(유기FC, Liberty FC, 종민이네)가 전부 예정으로 떴다.

**변경 전/후를 diff로 보면:**

```diff
 const getMatchStatus = (match) => {
-  if (match.goal_events.length === 0) {
-    return 'scheduled';
-  }
-  return match.result;
+  const matchDate = new Date(match.match_date);
+  const now = new Date();
+
+  // 미래 경기 → 예정
+  if (matchDate > now) return 'scheduled';
+
+  // 과거 경기 → 결과 테이블 기준
+  if (match.result) return match.result;
+
+  // 결과도 없는 과거 경기 → 데이터 없음으로 처리
+  return 'no_data';
 }
```

<div style="padding: 15px; border-left: 5px solid #4fc3f7; background: rgba(79,195,247,0.08); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #4fc3f7;">💡 핵심:</strong> 경기 상태는 <strong>"골 기록 유무"</strong>가 아니라 <strong>"경기 날짜 vs 현재 날짜"</strong>로 판별해야 한다. Lovable은 이 도메인 상식을 몰랐다.
</div>

골 기록 없는 3경기는 임시 스코어를 넣어서 해결했다.

**내가 Gemini한테 넣은 프롬프트:**

```
골 기록을 모르는 과거 경기 3개가 있어.
기록이 없으면 "예정"으로 뜨는 버그 때문에
임시 스코어를 넣고 싶어.

승이면 1:0, 패면 0:1로 goal_events에 더미 데이터 넣어줘.
실제 골 넣은 선수는 모르니까 goal_player_id는 NULL로.

[대상 경기]
- 2024-04-14 유기FC 전: 승
- 2024-03-17 Liberty FC 전: 패
- 2024-02-11 종민이네 전: 승
```

---

## 케이스 3. 새 DB 구조가 화면에 안 붙었다

`match_quarters` 테이블(쿼터별 라인업)과 `goal_events` 테이블(상세 득점 기록)을 새로 만들고 데이터를 전부 마이그레이션했다.

근데 앱 화면에는 여전히 **예전 데이터**가 뜨고 있었다.

Supabase에서 직접 SELECT하면 새 데이터가 나왔다. 앱에서만 안 나왔다.

```
Supabase Table Editor → 새 데이터 ✅
앱 화면 → 예전 데이터 🔴
```

이게 바로 **데이터 바인딩 누락** 버그다.

**내가 Gemini한테 가져간 프롬프트:**

```
match_quarters, goal_events 테이블에 새 데이터를
마이그레이션했는데 앱 화면에 예전 데이터가 그대로 뜸.

Supabase에서 직접 SELECT하면 새 데이터 나옴.
프론트엔드 어딘가에서 이전 쿼리를 그대로 쓰고 있는 것 같아.

[원하는 것]
새 테이블 구조로 JOIN해서 가져오는 쿼리로
프론트엔드 데이터 페칭 로직을 전면 교체해줘.
```

**Gemini의 진단:**

> 전형적인 데이터 바인딩 누락 버그입니다. 새 테이블을 만들었지만 프론트엔드 컴포넌트가 여전히 이전 쿼리를 참조하고 있습니다. TanStack Query의 queryKey가 바뀌지 않아서 캐싱된 이전 데이터를 계속 보여주는 경우도 있습니다.

수정된 쿼리 구조:

```typescript
// ❌ 이전 쿼리 — 단순 SELECT
const { data } = await supabase
  .from('matches')
  .select('*')
  .eq('id', matchId)

// ✅ 수정된 쿼리 — 새 테이블 JOIN
const { data } = await supabase
  .from('matches')
  .select(`
    *,
    teams (name, age_category),
    match_quarters (
      quarter_number,
      home_score,
      away_score,
      match_rosters (
        team_side,
        position,
        players (name, number)
      )
    ),
    goal_events (
      quarter,
      goal_player_id,
      assist_player_id,
      is_own_goal,
      video_timestamp,
      players!goal_player_id (name),
      assisters:players!assist_player_id (name)
    )
  `)
  .eq('id', matchId)
  .single()
```

Supabase의 중첩 SELECT 문법이다. 테이블 이름 뒤에 괄호로 연결된 테이블을 선언하면 자동으로 JOIN해서 가져온다. 직접 SQL JOIN을 짤 필요가 없다.

---

## 막혔을 때 쓰는 프롬프트 패턴 3가지

이 과정에서 정리된 프롬프트 패턴들이다.

<div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin: 1.5rem 0;">

  <div style="padding: 16px; border: 1px solid rgba(200,255,0,0.2); border-radius: 8px; background: rgba(200,255,0,0.02);">
    <strong style="color: #c8ff00;">패턴 1. 현상 + 기대값 명시</strong>
    <pre style="margin-top: 8px; font-size: 12px; color: #aaa; white-space: pre-wrap;">[현재 동작] 과거 경기가 "예정"으로 뜸
[기대 동작] 날짜 기준으로 과거 경기는 결과 표시
[시도한 것] goal_events.length로 판별했는데 안 됨</pre>
  </div>

  <div style="padding: 16px; border: 1px solid rgba(79,195,247,0.2); border-radius: 8px; background: rgba(79,195,247,0.02);">
    <strong style="color: #4fc3f7;">패턴 2. 에러 메시지 그대로 복사</strong>
    <pre style="margin-top: 8px; font-size: 12px; color: #aaa; white-space: pre-wrap;">아래 에러가 났어. 원인과 해결책 줘.

[에러]
TypeError: Cannot read properties of undefined
  at getMatchStatus (MatchCard.tsx:42)

[상황] match 객체에 goal_events가 없을 때 발생</pre>
  </div>

  <div style="padding: 16px; border: 1px solid rgba(167,139,250,0.2); border-radius: 8px; background: rgba(167,139,250,0.02);">
    <strong style="color: #a78bfa;">패턴 3. 변경 범위를 명확하게 제한</strong>
    <pre style="margin-top: 8px; font-size: 12px; color: #aaa; white-space: pre-wrap;">getMatchStatus 함수만 수정해줘.
다른 컴포넌트는 건드리지 마.
변경할 로직: 날짜 기준 상태 판별
유지할 것: 기존 UI, 다른 함수들</pre>
  </div>

</div>

세 번째 패턴이 특히 중요하다.

"고쳐줘"라고 하면 AI는 관련 없는 파일까지 수정한다. 범위를 좁혀줄수록 원하는 부분만 정확하게 바꿔준다.

---

## AI한테 멱살 잡는 법 — 단계별 정리

실전에서 정리된 방법이다.

**STEP 1** — 에러 메시지를 그대로 복사한다  
<kbd>Ctrl</kbd> + <kbd>C</kbd> 로 에러 전문을 복사해서 그냥 붙여넣는다. 요약하지 마라. 전체 stack trace가 다 있어야 AI가 원인을 정확하게 찾는다.

**STEP 2** — 현재 상황을 3줄로 설명한다  
"어디서" + "뭘 했는데" + "어떻게 됐다". 그 이상은 오히려 AI를 혼란스럽게 한다.

**STEP 3** — 수정 범위를 명시한다  
"이 함수만", "이 컴포넌트만", "이 쿼리만". 범위를 좁혀야 다른 곳이 망가지지 않는다.

**STEP 4** — 고쳐진 뒤 다시 검증한다  
AI가 고쳐줬다고 끝이 아니다. 직접 돌려보고, 기존에 되던 기능이 여전히 되는지 확인해야 한다.

---

## 이 편에서 배운 것

AI가 틀리는 건 AI가 나빠서가 아니다.

**내가 문제를 정확하게 정의하지 못했거나**, **AI가 모르는 도메인 상식이 있거나**, 둘 중 하나다.

스카우팅 리포트 병목은 내가 "16개 칭호가 다채롭게 나와야 한다"는 요구사항을 처음부터 명확하게 말했어야 했다. 예정 상태 버그는 "골 기록이 없는 과거 경기가 있다"는 도메인 상식을 AI가 몰랐던 것이다.

<div style="padding: 15px; border-left: 5px solid #c8ff00; background: rgba(200,255,0,0.04); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #c8ff00;">결론:</strong> AI한테 멱살 잡는 능력 = 문제를 정밀하게 언어로 표현하는 능력. 결국 같은 말이다.
</div>

7편에서는 이 모든 데이터가 쌓인 후 실제 통계 분석을 돌려보는 과정을 다룬다. 연령대별 승률, 구장별 전적, 쿼터별 득실 추이.

---

**다음 편:** [7편. 통계의 진화 — 연령대별 승률과 우리가 발견한 것들]()

---

*바이브코딩 일대기 전체 목차는 [여기]()에서 확인할 수 있습니다.*