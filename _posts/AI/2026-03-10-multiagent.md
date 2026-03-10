---
layout: single
title: 멀티 에이전트 시스템 — AI들이 서로 협력하는 법
categories: AI
tag: [AI, MultiAgent, LangGraph, LangChain, Agent, CrewAI, AutoGen, Python]
toc: true
---

# 멀티 에이전트 시스템 — AI들이 서로 협력하는 법

> "AI 하나도 잘 못 다루는데, 여러 개를 쓴다고요?"  
> 오히려 AI가 여러 개일 때 더 안정적이고 정확합니다. 이유가 있습니다.

---

## 단일 에이전트의 한계 — 혼자 다 하려다 망하는 AI

지난 글에서 ReAct 에이전트를 다뤘습니다. 하나의 AI가 생각(Thought) → 행동(Action) → 관찰(Observation)을 반복하며 문제를 해결하는 구조였죠.

그런데 실무에서 이런 단일 에이전트를 쓰다 보면 이런 일이 생깁니다.

- 도구를 40개 등록했더니 AI가 어떤 도구를 써야 할지 헷갈려서 엉뚱한 걸 호출함
- 너무 많은 지시사항을 프롬프트에 넣었더니 앞의 내용을 잊어버림
- 긴 작업을 하다 중간에 맥락을 잃고 처음부터 다시 시작함

이것이 단일 에이전트의 구조적 한계입니다. OpenAI 내부 벤치마크에 따르면 도구 수가 15개를 넘는 시점부터 tool selection 오류율이 2배 이상 증가합니다.

해결책은 **분업**입니다.

---

![Single Agent vs Multi-Agent](/assets/images/fig1_single_vs_multi.png)

## 멀티 에이전트 시스템이란?

멀티 에이전트 시스템(Multi-Agent System)은 **여러 개의 전문화된 에이전트가 각자의 역할을 맡아 협력하는 구조**입니다.

한 명의 만능 직원 대신, 전문가 팀을 구성하는 것과 같습니다.

```
[단일 에이전트]
  사용자 요청 → AI 하나가 모든 것을 처리 → 응답
  (도구 많아질수록 정확도 하락)

[멀티 에이전트]
  사용자 요청 → Supervisor(오케스트레이터)
                 ├── Research Agent  (정보 수집 전담)
                 ├── Analyst Agent   (데이터 분석 전담)
                 ├── Writer Agent    (결과 작성 전담)
                 └── Reviewer Agent  (검증 전담)
               → 최종 응답
```

각 에이전트는 좁은 범위의 역할만 담당하고, 오케스트레이터가 사용자 의도에 따라 적절한 에이전트를 선택하여 작업을 위임합니다.

---

## 2026년의 표준 — 멀티 에이전트 협업 구조

2024~2025년 동안 에이전트 프레임워크 생태계는 폭발적으로 성장했고, 2026년 현재 프로덕션 수준의 안정성을 갖춘 세 가지 프레임워크가 시장의 주류로 확립되었습니다.

실제 서비스에서 멀티 에이전트가 어떻게 쓰이는지 예시를 보면 이해가 빠릅니다.

**예: 장애 대응 시스템**

```
1. Diagnosis Agent  → 서버 로그를 분석해 원인 파악
2. Recovery Agent   → 파악된 원인에 따라 자동 복구 실행
3. Verification Agent → 복구가 제대로 됐는지 검증
4. Documentation Agent → 전체 과정을 장애 보고서로 기록
```

단일 AI에게 "장애 대응해줘"라고 하면 맥락을 잃고 헤매지만, 역할을 나누면 각 단계가 깔끔하게 처리됩니다.

---

![Multi-Agent Collaboration Patterns](/assets/images/fig2_patterns.png)

## 핵심 협업 패턴 3가지

멀티 에이전트 시스템을 설계할 때는 상황에 맞는 패턴을 선택해야 합니다.

### 1. Supervisor 패턴 (상하 관계)

가장 많이 쓰이는 패턴입니다. 하나의 Supervisor 에이전트가 모든 전문 에이전트를 관리하며, Supervisor는 에이전트 기능에 따라 통신을 조정하고 작업을 위임합니다.

```
Supervisor (총괄)
  ├── Worker A
  ├── Worker B
  └── Worker C
```

- **장점**: 흐름 제어가 명확하고 디버깅이 쉬움
- **단점**: Supervisor가 단일 장애점(SPOF)이 될 수 있음
- **적합한 경우**: 에이전트 간 의존성이 명확한 순차적 작업

### 2. 병렬(Parallel) 패턴

같은 요청을 여러 에이전트에 동시에 보내고, 결과를 취합합니다.

```
           ┌── Agent A ──┐
요청 → ────┼── Agent B ──┼──→ 결과 통합 → 응답
           └── Agent C ──┘
```

- **장점**: 처리 속도가 빠름
- **적합한 경우**: 각 에이전트가 독립적으로 처리 가능한 작업

### 3. 피어(Peer-to-Peer) 패턴

에이전트끼리 직접 메시지를 주고받으며 협업합니다.

```
Agent A ↔ Agent B ↔ Agent C
```

- **장점**: 유연한 협업 가능
- **적합한 경우**: 연구·토론처럼 에이전트 간 대화가 필요한 작업

---

## LangGraph로 멀티 에이전트 구현하기

LangGraph는 2025년 10월 1.0 정식 릴리스 이후 프로덕션 환경에서 가장 널리 채택되는 에이전트 오케스트레이션 도구로 자리잡았습니다. LinkedIn, Uber, Replit, Klarna 같은 기업들이 실제로 프로덕션에서 사용 중입니다.

LangGraph는 에이전트 워크플로우를 **방향 그래프(Directed Graph)**로 모델링합니다.

![LangGraph Workflow](/assets/images/fig3_langgraph_flow.png)

### 핵심 개념 3가지

LangGraph의 핵심 구성요소는 StateGraph(그래프 진입점), Node(각 에이전트에 대응하는 Python 함수), Conditional Edge(현재 State 값에 기반해 다음 노드를 동적으로 결정하는 라우팅 로직)입니다.

```python
# State: 에이전트들이 공유하는 데이터 컨테이너
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # 대화 이력 (자동 누적)
    next_agent: str                           # 다음에 실행할 에이전트
    research_result: str                      # 에이전트 간 공유 데이터
    final_output: str
```

### Supervisor 패턴 실전 코드

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent

llm = ChatOpenAI(model="gpt-4o", temperature=0)

# ── 전문 에이전트 정의 ──────────────────────────────────

@tool
def web_search(query: str) -> str:
    """웹에서 최신 정보를 검색합니다."""
    # 실제로는 Tavily, SerpAPI 등 연결
    return f"'{query}'에 대한 검색 결과: ..."

@tool
def analyze_data(data: str) -> str:
    """데이터를 분석하고 인사이트를 도출합니다."""
    return f"분석 결과: {data[:100]}..."

@tool
def write_report(content: str) -> str:
    """분석 결과를 보고서 형식으로 작성합니다."""
    return f"## 보고서\n{content}"

# 각 에이전트 생성 (역할별로 도구 분리)
research_agent = create_react_agent(
    llm, tools=[web_search],
    state_modifier="당신은 정보 수집 전문가입니다. 웹 검색으로 필요한 정보를 수집하세요."
)

analyst_agent = create_react_agent(
    llm, tools=[analyze_data],
    state_modifier="당신은 데이터 분석가입니다. 수집된 정보를 분석해 인사이트를 도출하세요."
)

writer_agent = create_react_agent(
    llm, tools=[write_report],
    state_modifier="당신은 기술 문서 작성가입니다. 분석 결과를 명확한 보고서로 작성하세요."
)

# ── 노드 함수 정의 ──────────────────────────────────────

def research_node(state: AgentState) -> AgentState:
    result = research_agent.invoke(state)
    return {**state,
            "research_result": result["messages"][-1].content,
            "next_agent": "analyst"}

def analyst_node(state: AgentState) -> AgentState:
    # 이전 연구 결과를 컨텍스트로 전달
    state["messages"].append(
        {"role": "user", "content": f"다음 데이터를 분석하세요:\n{state['research_result']}"}
    )
    result = analyst_agent.invoke(state)
    return {**state,
            "research_result": result["messages"][-1].content,
            "next_agent": "writer"}

def writer_node(state: AgentState) -> AgentState:
    result = writer_agent.invoke(state)
    return {**state,
            "final_output": result["messages"][-1].content,
            "next_agent": "END"}

# ── 라우팅 함수 (Conditional Edge) ─────────────────────

def route_agent(state: AgentState) -> str:
    """next_agent 값에 따라 다음 노드를 동적으로 결정"""
    return state.get("next_agent", "END")

# ── 그래프 조립 ─────────────────────────────────────────

workflow = StateGraph(AgentState)

# 노드 등록 (각 에이전트를 그래프의 노드로)
workflow.add_node("researcher", research_node)
workflow.add_node("analyst",    analyst_node)
workflow.add_node("writer",     writer_node)

# 엣지 연결 (Conditional Edge로 동적 라우팅)
workflow.add_edge(START, "researcher")
workflow.add_conditional_edges(
    "researcher",
    route_agent,
    {"analyst": "analyst", "END": END}
)
workflow.add_conditional_edges(
    "analyst",
    route_agent,
    {"writer": "writer", "END": END}
)
workflow.add_conditional_edges(
    "writer",
    route_agent,
    {"END": END}
)

# 컴파일 (실행 가능한 에이전트 생성)
app = workflow.compile()

# ── 실행 ────────────────────────────────────────────────

result = app.invoke({
    "messages": [{"role": "user", "content": "2026년 AI 에이전트 시장 트렌드를 분석해줘"}],
    "next_agent": "",
    "research_result": "",
    "final_output": ""
})

print(result["final_output"])
```

코드를 실행하면 다음 순서로 자동 처리됩니다.

```
사용자 질문
    ↓
research_node  → 웹 검색으로 트렌드 정보 수집
    ↓
analyst_node   → 수집된 정보 분석 및 인사이트 도출
    ↓
writer_node    → 최종 보고서 작성
    ↓
최종 응답 반환
```

---

![Framework Comparison Radar](/assets/images/fig4_framework_radar.png)

## 프레임워크 비교 — LangGraph vs CrewAI vs AutoGen

AutoGen은 대화 기반 멀티 에이전트 상호작용에 특화되어 있고, CrewAI는 역할 기반 에이전트 팀을 직관적인 API로 구성하여 빠른 프로토타이핑과 비즈니스 워크플로우 자동화에 강점을 보이며, LangGraph는 유향 그래프로 에이전트 워크플로우를 모델링하여 복잡한 상태 관리와 조건부 분기가 필요한 프로덕션 시스템에 최적화되어 있습니다.

| | LangGraph | CrewAI | AutoGen |
|---|---|---|---|
| **설계 철학** | 그래프 + 상태 우선 | 역할 기반 팀 | 대화 기반 협업 |
| **학습 난이도** | 높음 | 낮음 | 중간 |
| **흐름 제어** | 매우 정밀 (Conditional Edge) | 자동 위임 | 대화로 결정 |
| **프로덕션 적합성** | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| **프로토타이핑 속도** | ★★★☆☆ | ★★★★★ | ★★★★☆ |
| **적합한 경우** | 복잡한 상태 관리, 엄격한 흐름 제어 | 빠른 PoC, 비즈니스 자동화 | 연구·토론형 협업 |

> **선택 기준**: 빠른 프로토타입이 목표라면 CrewAI, 프로덕션 배포가 목표라면 LangGraph가 현실적입니다.

---

## 멀티 에이전트의 함정 — 반드시 알아야 할 주의사항

### 1. 비용이 선형적으로 증가한다

Supervisor가 3개의 에이전트를 순차적으로 호출하면 단일 에이전트 대비 3~4배의 비용이 발생할 수 있습니다. 에이전트 수를 늘릴수록 API 호출 횟수가 곱으로 늘어납니다.

### 2. 에이전트 간 컨텍스트 손실

State에 충분한 컨텍스트가 전달되지 않거나 메시지 히스토리가 잘려 있으면 에이전트 간 핸드오프 시 정보가 유실됩니다. Supervisor가 요약 메시지를 State에 추가하도록 구현하는 것이 해결책입니다.

### 3. 무한 루프

에이전트들이 서로에게 작업을 넘기다 순환에 빠질 수 있습니다. LangGraph에서는 `recursion_limit`으로 최대 반복 횟수를 반드시 설정해야 합니다.

```python
# 무한 루프 방지 설정
app = workflow.compile()
config = {"recursion_limit": 10}  # 최대 10번 반복으로 제한
result = app.invoke(inputs, config=config)
```

### 4. 보안 문제 (Prompt Injection)

에이전트 중 하나가 DB 수정 권한을 가지고 있다면, 악의적인 입력이 에이전트 체인을 타고 들어와 데이터를 조작할 수 있습니다. 에이전트 간 메시지 전달 과정에서 jailbreak 시도가 유입되거나, 특정 에이전트가 허용되지 않은 도구를 호출하거나, 민감한 정보가 에이전트 경계를 넘어 유출될 수 있습니다.

---

## 실제 활용 사례

### 🛒 커머스 — 고객 문의 자동 처리

```
Intent Agent     → 문의 의도 분류 (환불/배송/상품문의)
     ↓
Lookup Agent     → 주문 DB 조회
     ↓
Response Agent   → 상황에 맞는 답변 생성
     ↓
Escalation Agent → 해결 불가 시 상담원 연결
```

### 🔬 리서치 — 자동 보고서 생성

```
Search Agent     → 논문/기사 수집
Summarize Agent  → 각 문서 요약
Synthesis Agent  → 전체 내용 종합
Citation Agent   → 출처 정리 및 검증
```

### 💻 DevOps — 코드 리뷰 자동화

```
Code Agent       → 코드 분석 및 버그 탐지
Security Agent   → 보안 취약점 스캔
Test Agent       → 테스트 케이스 생성
Review Agent     → 종합 리뷰 코멘트 작성
```

---

## 정리하며

멀티 에이전트 시스템은 AI를 **전문가 팀**으로 운영하는 방식입니다.

- 단일 에이전트는 도구가 많아질수록 정확도가 떨어진다
- 멀티 에이전트는 역할을 분리해 각자의 전문성을 극대화한다
- LangGraph는 이 협업 구조를 그래프로 명확하게 제어할 수 있게 해준다
- 도입 전에 비용, 컨텍스트 손실, 무한 루프, 보안 문제를 반드시 고려해야 한다

> RAG가 AI에게 **지식**을 주고, ReAct가 AI에게 **행동**을 줬다면, 멀티 에이전트는 AI에게 **팀**을 줍니다.

---