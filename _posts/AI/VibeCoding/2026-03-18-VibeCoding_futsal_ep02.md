---
layout: single
title: "2편. Lovable + Supabase + Gemini 삼각편대 — 첫 화면이 생성되기까지"
categories: VibeCoding
tag: [VibeCoding, Lovable, Supabase, Gemini, 바이브코딩, 풀스택, React]
toc: true
---

> **바이브코딩 일대기** | 수학과·컴공과 출신 기획자가 Lovable로 풀스택 앱을 처음 만든 현실 연재. 총 10편.

---

## 도구 세 개를 골랐다

1편에서 "코딩 없이 앱 만들기"를 검색했다고 했다.

검색하자마자 바로 시작한 건 아니었다. 어떤 도구를 어떻게 조합할지 며칠 고민했다.

결론은 세 가지였다.

- **Lovable** — 프론트엔드 + 백엔드 코드 생성
- **Supabase** — 데이터베이스 + API
- **Gemini** — 설계자 + 프롬프트 번역가

그리고 이 셋이 각자 다른 역할을 맡는 구조를 잡았다.

---

## 세 도구의 역할 구조

<div class="mermaid">
graph TD
    ME["🙋 나 (도메인 전문가)"]
    GEM["🤖 Gemini\n설계 + 프롬프트 변환"]
    LOV["⚡ Lovable\n코드 생성"]
    SUP["🗄️ Supabase\nDB + API"]
    APP["📱 Bunnies FC 앱"]

    ME -->|"원하는 기능을 설명"| GEM
    GEM -->|"정제된 프롬프트"| LOV
    LOV -->|"React 코드 생성"| APP
    LOV -->|"DB 스키마 연동"| SUP
    SUP -->|"데이터 응답"| APP
    APP -->|"오류 발생"| ME
    ME -->|"오류 메시지 전달"| GEM
</div>

Lovable이 코드를 만들고, Supabase가 데이터를 저장하고, Gemini가 그 사이에서 설계와 번역을 담당한다. 나는 도메인 지식을 공급하고, 오류가 나면 다시 Gemini한테 가져간다.

---

## 각 도구가 실제로 뭘 하는가

### Lovable — 코드를 생성해 주는 AI

Lovable은 자연어 프롬프트를 입력하면 React + TypeScript 기반의 웹앱을 실시간으로 만들어주는 도구다.

블랙박스가 아니다. **실제 코드 파일이 생성된다.** 컴공 베이스가 있으면 생성된 코드를 읽으면서 "아, 이렇게 짰구나"를 확인할 수 있다. 이게 중요하다. 나중에 뭔가 이상할 때 코드를 보고 원인을 파악할 수 있기 때문이다.

---

![Lovable 에디터 경기 목록](/assets/images/ep02_lovable_editor_matches.png)

---

### Supabase — 백엔드를 대신해 주는 DB

Supabase는 PostgreSQL 기반의 BaaS(Backend as a Service)다.

DB 테이블을 만들면 REST API가 자동으로 생성된다. 서버를 직접 띄울 필요가 없다.

Express 서버 짜고, ORM 설정하고, API 엔드포인트 하나하나 만드는 작업을 Supabase가 전부 대신해 주는 것이다. 컴공 베이스가 있으면 이게 얼마나 편한 건지 바로 감이 온다.

---

![Supabase goal_events 테이블](/assets/images/ep02_supabase_goal_events_table.png)

---

### Gemini — 삼각편대의 설계자

Gemini는 두 가지 역할을 했다.

**① 설계 단계** — "자체전을 어떻게 DB 스키마로 표현할까?" 같은 구조 설계 질문은 Lovable보다 Gemini가 훨씬 잘 답해줬다. 도메인을 길게 설명하고 "이런 경우 테이블을 어떻게 나눠야 해?" 식의 대화가 가능했다.

**② 프롬프트 변환 단계** — 내 머릿속 생각을 Lovable이 잘 이해하는 형태의 프롬프트로 다듬어 주는 역할.

---

![Gemini가 Lovable 프롬프트로 변환해주는 장면](/assets/images/ep02_gemini_prompt_to_lovable.png)

---

## 실제 작업 흐름

삼각편대가 실제로 어떻게 돌아가는지 흐름으로 보면 이렇다.

<div class="mermaid">
sequenceDiagram
    participant 나
    participant Gemini
    participant Lovable
    participant Supabase

    나->>Gemini: 원하는 기능을 말로 설명
    Gemini->>나: 설계 구조 + Lovable용 프롬프트 제안
    나->>Lovable: 정제된 프롬프트 입력
    Lovable->>나: React 코드 + UI 생성
    Lovable->>Supabase: DB 스키마 연동
    Supabase->>Lovable: 데이터 응답
    Lovable->>나: 화면에 데이터 렌더링
    나->>Gemini: 오류 메시지 전달
    Gemini->>나: 원인 분석 + 해결책
    나->>Lovable: 수정 프롬프트 입력
</div>

반복이 핵심이다. 한 번에 완성되는 게 아니라, 이 루프를 계속 돌면서 앱이 완성된다.

---

## Gemini 프롬프트를 실제로 어떻게 썼나

### 상황 1 — 앱 전체 구조 설계를 부탁할 때

처음 Lovable에 프롬프트를 넣기 전에, 먼저 Gemini한테 이렇게 물었다.

**내가 Gemini한테 넣은 프롬프트:**

```
조기축구팀 데이터 분석 앱을 만들려고 해.
아래 조건을 Lovable(React + Supabase 기반 AI 코딩 툴)에 넣을 프롬프트로 만들어줘.

[앱 조건]
- 경기 기록 관리: 날짜, 장소, 참석 선수, 골/도움, 승패, 상대팀 연령대
- 자체전(팀 내 A팀 vs B팀)과 외부 경기를 반드시 구분해야 함
- 선수별 누적 스탯 조회 가능해야 함
- 연령대별 승률 분석 기능 필요
- 모바일에서 잘 보여야 함 (풋살장에서 바로 입력하니까)

Lovable이 잘 이해하도록 구체적이고 기술적인 언어로 바꿔줘.
```

**Gemini가 만들어준 Lovable 프롬프트:**

```
Build a futsal team analytics web app with the following specifications:

Database schema (Supabase):
- matches: id, date, venue, match_type(external/internal), result, opponent_team_id
- players: id, name, number, position
- rosters: id, match_id, player_id, team_side(A/B for internal matches)
- goal_events: id, match_id, scorer_id, assister_id, quarter, is_own_goal

Key features:
1. Match recording form with conditional UI
   - If match_type = 'internal': show Team A / Team B player assignment
   - If match_type = 'external': show opponent team selector
2. Player stats dashboard: goals, assists, appearances per player
3. Win rate analysis grouped by opponent age category
4. Mobile-first responsive design with bottom navigation

Use React + TypeScript + Tailwind CSS frontend with Supabase backend.
```

이걸 Lovable에 그대로 붙여넣었다.

---

### 상황 2 — 오류가 났을 때 해결책을 물어볼 때

Lovable이 생성한 코드에서 오류가 나면, 오류 메시지를 Gemini한테 가져갔다.

**내가 Gemini한테 넣은 프롬프트:**

```
Lovable로 Supabase 연동 앱 만드는 중인데 아래 에러가 났어.

[에러 메시지]
column "original_age_desc" of relation "teams" does not exist

상황:
- teams 테이블에 original_age_desc 컬럼을 추가하려고 했음
- CREATE TABLE IF NOT EXISTS 로 테이블 재생성 시도했는데 에러 남
- 이미 teams 테이블이 존재하는 상태

원인이 뭔지, 그리고 Supabase SQL 에디터에 바로 붙여넣을 수 있는
해결 쿼리 만들어줘.
```

**Gemini가 준 해결책:**

```sql
-- 원인: CREATE TABLE IF NOT EXISTS는 테이블이 이미 있으면 넘어감
-- 새 컬럼이 추가되지 않은 것

-- 해결책 1: 컬럼만 추가 (데이터가 이미 있을 때)
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS original_age_desc text;

-- 해결책 2: 테이블 재생성 (초기 세팅 단계일 때만)
DROP TABLE IF EXISTS teams;
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  original_age_desc text,
  age_category text
);
```

오류 메시지를 그대로 붙여넣고, 상황을 설명하면 원인과 해결책이 같이 나온다. 이게 Gemini를 쓰는 가장 효율적인 방식이었다.

---

### 상황 3 — 기능 아이디어를 Lovable 프롬프트로 바꿀 때

**내가 Gemini한테 넣은 프롬프트:**

```
아래 기능을 Lovable 프롬프트로 만들어줘.

[원하는 기능]
선수 프로필 페이지에 뱃지 시스템 추가.
아래 조건을 만족하는 선수한테 자동으로 뱃지가 붙어야 해.

- 자체전 여포: 자체전 득점이 전체 득점의 60% 이상인 선수
- 극장골 장인: 마지막 쿼터(7~8쿼터) 득점 비율이 팀 내 1위인 선수
- 케미왕: 특정 선수와 골-도움 연결 횟수가 가장 많은 콤비

뱃지는 이모지 + 한국어 제목 형태로 선수 카드에 표시되어야 해.
goal_events 테이블에서 계산 가능해야 해.
```

**Gemini가 만들어준 Lovable 프롬프트:**

```
Add a badge system to the player profile page with the following badges:

Badge logic (calculate from goal_events table):
1. 💀 자체전 여포
   - Condition: internal_match_goals / total_goals >= 0.6
   - Query: COUNT goals WHERE match_type = 'internal'

2. ⚡ 극장골 장인
   - Condition: player with highest ratio of goals in quarter 7-8
   - Query: COUNT goals WHERE quarter IN (7, 8) GROUP BY player

3. 🤝 케미왕
   - Condition: player pair with most goal+assist connections
   - Query: JOIN goal_events on scorer_id + assister_id combinations

Display: emoji + Korean title as chip badges on player card component.
Calculate on page load using Supabase RPC or client-side aggregation.
```

---

## 프론트-백엔드-DB 연결 구조

실제로 앱이 어떻게 돌아가는지 구조로 보면 이렇다.

<div class="mermaid">
graph LR
    subgraph Frontend["⚡ Frontend (Lovable 생성)"]
        UI["React 컴포넌트"]
        RQ["TanStack Query\n데이터 패칭"]
        ENV[".env\nSUPABASE_URL\nSUPABASE_KEY"]
    end

    subgraph Supabase["🗄️ Supabase"]
        AUTH["Auth\n인증"]
        DB["PostgreSQL\nDB"]
        API["Auto REST API"]
        RLS["Row Level Security\n접근 권한"]
    end

    subgraph Tables["📋 핵심 테이블"]
        M["matches"]
        P["players"]
        G["goal_events"]
        MQ["match_quarters"]
        T["teams"]
    end

    UI --> RQ
    RQ -->|"supabase-js 클라이언트"| API
    ENV --> RQ
    API --> AUTH
    AUTH --> RLS
    RLS --> DB
    DB --> M & P & G & MQ & T
</div>

핵심은 **supabase-js 클라이언트** 하나다. 이 라이브러리가 프론트엔드에서 DB를 직접 쿼리할 수 있게 해준다. 별도의 백엔드 서버가 없다.

`.env` 파일에 Supabase URL과 API 키만 넣으면 연결이 된다.

```typescript
// src/lib/supabase.ts — Lovable이 자동 생성한 코드
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

이 파일 하나로 앱 전체에서 DB 쿼리를 날릴 수 있다.

---

## Lovable이 자동으로 세팅한 것들

첫 프롬프트를 넣으면 Lovable이 프로젝트를 통째로 만들어준다. `package.json`에 뭐가 들어갔는지 보면 스택이 한눈에 보인다.

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "@supabase/supabase-js": "^2.98.0",
    "react-router-dom": "^6.30.1",
    "recharts": "^2.15.4",
    "framer-motion": "^12.34.5",
    "react-hook-form": "^7.61.1",
    "zod": "^3.25.76"
  }
}
```

투두앱 수준이 아니다. 실제 서비스에 쓰이는 스택이다.

그리고 PWA 설정도 자동으로 들어간다. 스마트폰 홈 화면에 앱처럼 설치할 수 있게 해주는 기능이다.

```typescript
// vite.config.ts — PWA 설정
VitePWA({
  registerType: "autoUpdate",  // 새 버전 배포 시 자동 업데이트
  manifest: {
    name: "Bunnies FC",
    short_name: "Bunnies",     // 홈 화면 아이콘 아래 이름
    display: "standalone",     // 브라우저 UI 없이 앱처럼 실행
    orientation: "portrait",   // 세로 방향 고정
    theme_color: "#000000",
  },
})
```

팀원들한테 링크 하나 보냈더니 "이거 앱이야? 어떻게 설치해?"라는 반응이 나왔다. 이 설정 덕분이다.

---

![스마트폰 홈 화면 PWA 설치](/assets/images/ep02_pwa_homescreen.jpg)

---

## 이 편에서 배운 것

**도구 선택이 절반이다.**

Lovable 하나만 썼으면 설계가 엉망이 됐을 것이다. Gemini 하나만 썼으면 코드가 안 나왔을 것이다. 셋을 조합하는 흐름을 잡는 게 핵심이었다.

그리고 하나 더. Gemini한테 프롬프트를 잘 넣는 방법은 간단하다.

> **상황 설명 + 원하는 결과 + 제약 조건**

이 세 가지를 갖추면 Gemini가 알아서 정리해 준다. 막연하게 "이거 만들어줘"가 아니라, "이런 상황에서, 이런 결과물을, 이런 형태로 만들어줘"가 돼야 한다.

3편에서는 이 구조로 실제 DB에 2년치 데이터를 옮기는 과정을 다룬다.

---

**다음 편:** [3편. 데이터를 갖다 바치다 — 엑셀에서 DB로의 대이동]()

---

*바이브코딩 일대기 전체 목차는 [여기]()에서 확인할 수 있습니다.*
