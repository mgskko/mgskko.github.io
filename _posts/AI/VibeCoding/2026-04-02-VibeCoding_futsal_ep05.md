---
layout: single
title: "5편. 뱃지 시스템 — 팀원들의 심장을 훔친 게임화 설계"
categories: VibeCoding
tag: [VibeCoding, Lovable, Gamification, 바이브코딩, 뱃지, 통계, ChartJS]
toc: true
---

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

> **바이브코딩 일대기** | 수학과·컴공과 출신 기획자가 Lovable로 풀스택 앱을 처음 만든 현실 연재. 총 10편.

---

## 기능이 다 돼도 아무도 안 쓰면 의미 없다

4편까지 만든 것들 — DB 스키마, 자체전 분리, 데이터 마이그레이션.

기술적으로는 다 됐다. 근데 솔직히 말하면, 팀원들한테 "앱 만들었어, 써봐"라고 링크 보냈을 때 반응이 썸썸했다.

경기 기록 보고, 스탯 보고... 그냥 엑셀이랑 다를 게 없어 보이는 거다.

뭔가 팀원들이 **자발적으로 들어오고 싶게 만드는 요소**가 필요했다.

그래서 Gemini한테 물었다.

**내가 넣은 프롬프트:**

```
풋살/축구 동호회 앱에서 팀원들이 매일 들어오게 만드는
재밌는 통계나 뱃지 아이디어 없냐.
단순한 득점왕, 도움왕 말고 진짜 힙하고 유니크한 거.
우리 DB에 goal_events, match_rosters, match_quarters 있어.
```

Gemini가 뱉어낸 아이디어들이 생각보다 훨씬 좋았다.

---

## Gemini가 제안한 아이디어 목록

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 1.5rem 0;">

  <div style="padding: 16px; border-left: 4px solid #c8ff00; background: rgba(200,255,0,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #c8ff00;">💀 자체전 여포</strong><br>
    <span style="font-size: 13px; color: #aaa;">자체전 득점이 전체 득점의 60% 이상. 밖에서는 조용한데 자체전에서만 살아나는 선수.</span>
  </div>

  <div style="padding: 16px; border-left: 4px solid #ff6b6b; background: rgba(255,107,107,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #ff6b6b;">⚡ 극장골 장인</strong><br>
    <span style="font-size: 13px; color: #aaa;">마지막 쿼터 득점 비율 팀 내 1위. 체력이 다 떨어질 때 오히려 강해지는 뒷심왕.</span>
  </div>

  <div style="padding: 16px; border-left: 4px solid #4fc3f7; background: rgba(79,195,247,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #4fc3f7;">🤝 케미왕</strong><br>
    <span style="font-size: 13px; color: #aaa;">특정 선수와 골-도움 연결 횟수 1위 콤비. 눈빛만 봐도 통하는 파트너.</span>
  </div>

  <div style="padding: 16px; border-left: 4px solid #ffd93d; background: rgba(255,217,61,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #ffd93d;">🎲 주사위형 선수</strong><br>
    <span style="font-size: 13px; color: #aaa;">경기별 득점 표준편차가 가장 큰 선수. 오늘 몇 골 넣을지 아무도 모름.</span>
  </div>

  <div style="padding: 16px; border-left: 4px solid #a78bfa; background: rgba(167,139,250,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #a78bfa;">🧹 스탯 세탁기</strong><br>
    <span style="font-size: 13px; color: #aaa;">3점 차 이상 이기고 있을 때 넣은 골 비율 1위. 꿀 빠는 상황만 골라서 뛰는 선수.</span>
  </div>

  <div style="padding: 16px; border-left: 4px solid #34d399; background: rgba(52,211,153,0.04); border-radius: 0 8px 8px 0;">
    <strong style="color: #34d399;">🛡️ 까방권 보유</strong><br>
    <span style="font-size: 13px; color: #aaa;">최근 경기에서 해트트릭 또는 MOM 선정. 3경기 동안 욕 먹을 면죄부 획득.</span>
  </div>

</div>

"이거 우리 팀 누군지 다 알겠는데?" 라는 반응이 나올 것 같았다. 실제로도 그랬다.

---

## 처음엔 그냥 텍스트 뱃지였다

처음 Lovable에 요청한 건 단순했다.

**내가 Gemini한테 먼저 프롬프트 정리 요청:**

```
아래 뱃지들을 선수 프로필에 조건부로 표시하고 싶어.
Lovable 프롬프트로 만들어줘.

[뱃지 목록 및 조건]
- 자체전 여포: is_internal 경기에서 득점 / 전체 득점 >= 0.6
- 극장골 장인: 마지막 쿼터 득점 횟수 팀 내 1위
- 케미왕: 특정 선수와 goal-assist 연결 횟수 최다
- 스탯 세탁기: 팀이 3점 이상 앞선 상황 골 비율 1위
- 까방권: 최근 3경기 내 해트트릭 또는 MOM 달성

goal_events, match_quarters 테이블에서 계산 가능해야 함.
뱃지는 이모지 + 텍스트 chip 형태로 선수 카드에 렌더링.
```

**Gemini가 만들어준 Lovable 프롬프트:**

```
Add a dynamic badge system to player profile cards.

Badge conditions (calculate from Supabase):
1. 💀 자체전 여포
   SELECT player_id, COUNT(*) as internal_goals
   FROM goal_events ge
   JOIN matches m ON ge.match_id = m.id
   WHERE m.is_internal = TRUE
   GROUP BY player_id
   → Badge if internal_goals / total_goals >= 0.6

2. ⚡ 극장골 장인
   SELECT goal_player_id, COUNT(*) as last_quarter_goals
   FROM goal_events ge
   JOIN match_quarters mq ON ...
   WHERE ge.quarter = max_quarter_of_match
   GROUP BY goal_player_id ORDER BY last_quarter_goals DESC LIMIT 1

3. 🤝 케미왕
   SELECT scorer_id, assister_id, COUNT(*) as connections
   FROM goal_events
   WHERE assister_id IS NOT NULL
   GROUP BY scorer_id, assister_id
   ORDER BY connections DESC LIMIT 1

Render as: emoji + Korean text chip badges on player card.
Use Tailwind CSS pill style: rounded-full, bg-opacity-20.
```

---

![Supabase goal_events 테이블](/assets/images/ep05_player_badge_card.jpg){: width="50%" .center}

---

## 뱃지 개수가 문제였다

뱃지 시스템이 돌아가기 시작하면서 새로운 문제가 생겼다.

**칭호 조건이 너무 느슨해서 한 선수가 칭호를 너무 많이 가져갔다.**

예를 들어 고명석은 득점왕이면서 극장골 장인이면서 케미왕이면서 까방권까지 — 4개 뱃지가 한 선수에게 몰렸다. 희소성이 없어지니까 재미도 없어졌다.

<div style="padding: 15px; border-left: 5px solid #ff6b6b; background-color: rgba(255,107,107,0.08); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #ff6b6b;">🚨 문제 발생:</strong> 칭호가 희소하지 않으면 게임화의 의미가 없다. 모두가 특별하면 아무도 특별하지 않다.
</div>

**내가 Gemini한테 다시 물었다:**

```
뱃지 조건이 너무 느슨해서 한 선수가 여러 개를 독점함.
칭호가 희소해야 재미있는데.

팀 내 1~2위에게만 주는 방식으로 바꾸고 싶어.
그리고 극단적인 칭호(스탯 세탁기, 탐욕왕)는
임계값을 더 빡세게 설정하고 싶어.
구체적인 기준 잡아줘.
```

**Gemini가 잡아준 기준:**

| 뱃지 | 조건 | 희소성 |
|------|------|--------|
| 💀 자체전 여포 | 자체전 득점 / 전체 득점 >= **0.65**, 최소 5골 이상 | 팀 내 1명 |
| ⚡ 극장골 장인 | 마지막 쿼터 득점 비율 >= **0.30** | 팀 내 1명 |
| 🤝 케미왕 | 특정 콤비 골-도움 연결 **10회 이상** | 콤비 1쌍 |
| 🧹 스탯 세탁기 | 3점 차 이상 상황 골 비율 >= **0.50** | 팀 내 1명 |
| 🎲 주사위형 선수 | 경기별 득점 표준편차 **상위 1명** | 팀 내 1명 |
| 🛡️ 까방권 | 최근 **3경기 내** 해트트릭 또는 MOM | 해당 시점 기준 |

---

## 칭호 개수가 늘어나면서 생긴 또 다른 문제

칭호를 계속 추가하다 보니, 프론트엔드에서 쿼리가 너무 많아졌다.

선수 프로필 페이지 하나를 불러올 때 뱃지 계산용 쿼리만 6개가 날아갔다. 페이지 로딩이 느려졌다.

<div style="padding: 15px; border-left: 5px solid #4fc3f7; background-color: rgba(79,195,247,0.08); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #4fc3f7;">💡 해결책:</strong> Supabase의 <strong>RPC(Remote Procedure Call)</strong>로 뱃지 계산 로직을 DB 함수로 옮겼다. 6번의 개별 쿼리 대신 함수 1번 호출로 모든 뱃지를 한 번에 계산.
</div>

**내가 Gemini한테 요청한 프롬프트:**

```
선수 프로필에서 뱃지 계산 쿼리가 6개나 날아가서 느려.
Supabase RPC로 합쳐서 한 번에 가져오고 싶어.

입력: player_id
출력: 해당 선수가 보유한 뱃지 목록 (badge_key, badge_name)

PostgreSQL 함수로 작성해줘.
```

**Gemini가 작성해준 RPC 함수:**

```sql
CREATE OR REPLACE FUNCTION get_player_badges(p_player_id UUID)
RETURNS TABLE(badge_key TEXT, badge_name TEXT) AS $$
BEGIN
  -- 1. 자체전 여포
  IF (
    SELECT COALESCE(
      SUM(CASE WHEN m.is_internal THEN 1 ELSE 0 END)::float /
      NULLIF(COUNT(*), 0), 0
    )
    FROM goal_events ge
    JOIN matches m ON ge.match_id = m.id
    WHERE ge.goal_player_id = p_player_id
  ) >= 0.65 THEN
    RETURN NEXT ('internal_master', '💀 자체전 여포');
  END IF;

  -- 2. 극장골 장인 (팀 내 마지막 쿼터 득점 1위)
  IF (
    SELECT goal_player_id FROM goal_events ge
    JOIN matches m ON ge.match_id = m.id
    WHERE ge.quarter = (
      SELECT MAX(quarter) FROM goal_events WHERE match_id = m.id
    )
    GROUP BY goal_player_id
    ORDER BY COUNT(*) DESC LIMIT 1
  ) = p_player_id THEN
    RETURN NEXT ('last_quarter', '⚡ 극장골 장인');
  END IF;

  -- 3. 까방권 (최근 3경기 내 해트트릭)
  IF EXISTS (
    SELECT 1 FROM goal_events ge
    JOIN matches m ON ge.match_id = m.id
    WHERE ge.goal_player_id = p_player_id
    AND m.match_date >= (
      SELECT match_date FROM matches ORDER BY match_date DESC LIMIT 1 OFFSET 2
    )
    GROUP BY ge.match_id
    HAVING COUNT(*) >= 3
  ) THEN
    RETURN NEXT ('shield', '🛡️ 까방권');
  END IF;

END;
$$ LANGUAGE plpgsql;
```

프론트엔드에서는 이렇게 한 줄로:

```typescript
const { data: badges } = await supabase
  .rpc('get_player_badges', { p_player_id: playerId })
```

---

## Data MOM — 주관 투표를 데이터로 대체한다

뱃지 시스템과 함께 고민한 게 하나 더 있었다. **경기 MVP(MOM) 선정 문제.**

기존엔 그냥 "오늘 누가 잘했어?" 식으로 감으로 뽑았다. 근데 데이터가 있으니까 알고리즘으로 뽑을 수 있지 않을까.

**Data MOM 점수 계산 방식 — Gemini와 설계:**

<canvas id="momChart" style="max-height: 300px; margin: 1.5rem 0;"></canvas>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const ctx = document.getElementById('momChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['골 (1개당)', '어시스트 (1개당)', '코트 마진 (+1당)', '자책골 (1개당)', '공격수 무득점', '수비 대량실점'],
      datasets: [{
        label: 'MOM 점수 가중치',
        data: [3, 4, 1, -2, -3, -3],
        backgroundColor: [
          'rgba(200,255,0,0.7)',
          'rgba(200,255,0,0.9)',
          'rgba(79,195,247,0.7)',
          'rgba(255,107,107,0.7)',
          'rgba(255,107,107,0.7)',
          'rgba(255,107,107,0.7)',
        ],
        borderColor: 'transparent',
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Data MOM 점수 가중치',
          color: '#e0e0e0',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          ticks: { color: '#888' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#888', font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
});
</script>

어시스트에 골보다 높은 가중치(4점)를 준 이유가 있다. 골은 눈에 잘 띄는데 어시스트는 과소평가받는 경향이 있다. 이걸 보정하는 것이다.

감점 로직도 넣었다. 자책골(-2), 공격수인데 무득점(-3), 수비수인데 대량실점(-3). 그냥 참석만 해도 점수가 쌓이는 구조를 막기 위해서다.

---

## 팀원 반응이 달라지기 시작했다

뱃지 시스템이 붙고 나서 팀원들 반응이 달라졌다.

<div style="padding: 16px; border: 1px solid rgba(200,255,0,0.2); border-radius: 8px; background: rgba(200,255,0,0.03); margin: 1.5rem 0;">
  <p style="margin: 0 0 8px; font-size: 13px; color: #888;">단톡방 반응 (실제)</p>
  <p style="margin: 0 0 6px; font-size: 14px; color: #e0e0e0;">💀 "야 나 자체전 여포잖아 ㅋㅋㅋ 인정하지?"</p>
  <p style="margin: 0 0 6px; font-size: 14px; color: #e0e0e0;">⚡ "극장골 장인이 나라고? 나도 몰랐는데"</p>
  <p style="margin: 0 0 6px; font-size: 14px; color: #e0e0e0;">🧹 "스탯 세탁기 ㅋㅋㅋㅋ 맞아 쟤 꿀 빨 때만 나옴"</p>
  <p style="margin: 0; font-size: 14px; color: #e0e0e0;">🤝 "이민혁-신형찬 케미왕 예상했음 걔네 눈빛으로 통함"</p>
</div>

링크 공유하고 나서 하루 만에 팀원 전원이 자기 프로필을 확인했다.

**게임화의 핵심은 거울이다.** 사람들은 자기 자신에 대한 데이터를 보고 싶어한다. 특히 남들과 비교되는 형태로.

---

## 이 편에서 배운 것

기능이 다 돌아간다고 앱이 완성된 게 아니다. **사람들이 쓰고 싶게 만드는 것**이 따로 있다.

<div style="padding: 15px; border-left: 5px solid #c8ff00; background-color: rgba(200,255,0,0.04); border-radius: 0 8px 8px 0; margin: 1.5rem 0;">
  <strong style="color: #c8ff00;">핵심 교훈:</strong> 도메인 전문가만이 "우리 팀에서 진짜 의미 있는 통계가 뭔지"를 안다. AI는 아이디어를 줄 수 있지만, 어떤 아이디어가 우리 팀에 맞는지는 내가 결정해야 한다.
</div>

뱃지 아이디어는 Gemini가 줬다. 근데 "자체전 여포"라는 개념은 우리 팀 문화를 아는 내가 만든 거다. 장고호가 자체전에서 유독 강하다는 걸 아는 사람이 팀 안에 있어야 이 칭호가 의미 있다.

6편에서는 AI가 틀렸을 때 — 할루시네이션과 싸우는 방법을 다룬다.

---

**다음 편:** [6편. AI가 틀렸을 때 — 프롬프트로 멱살 잡는 법]()

---

*바이브코딩 일대기 전체 목차는 [여기]()에서 확인할 수 있습니다.*