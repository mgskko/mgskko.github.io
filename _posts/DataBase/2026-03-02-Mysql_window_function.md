---
layout: single
title:  MySQL Window Function
categories: DataBase
tag: [MySQL, DATABASE, WindowFunction, SQL, cs]
toc: true
---

# MySQL Window Function 완전정복 — 진짜 동작 원리부터 실전 패턴까지

---

## 목차

1. [Window Function이란 무엇인가](#1-window-function이란-무엇인가)
2. [GROUP BY와 결정적 차이](#2-group-by와-결정적-차이)
3. [문법 구조 완전 분석](#3-문법-구조-완전-분석)
4. [PARTITION BY 동작 원리](#4-partition-by-동작-원리)
5. [ORDER BY와 Frame의 관계](#5-order-by와-frame의-관계)
6. [ROWS vs RANGE — 헷갈리는 핵심 차이](#6-rows-vs-range--헷갈리는-핵심-차이)
7. [함수별 완전 분석](#7-함수별-완전-분석)
8. [실전 분석 패턴](#8-실전-분석-패턴)
9. [성능 이슈와 최적화](#9-성능-이슈와-최적화)
10. [자주 하는 실수 모음](#10-자주-하는-실수-모음)

---

## 1. Window Function이란 무엇인가

Window Function(윈도우 함수)은 **행을 그룹으로 묶지 않고, 각 행에서 주변 행들을 참조하여 계산**하는 함수입니다.

MySQL 8.0부터 공식 지원되었으며, 이전 버전에서는 변수(`@var`)를 이용한 트릭으로 흉내냈습니다.

### 핵심 개념: "창문(Window)"

Window라는 이름은 **각 행마다 바라보는 창문(범위)이 있다**는 개념에서 왔습니다.

```
전체 데이터
┌─────────────────────────────┐
│  row1                       │
│  row2  ◀── 이 행의 창문     │
│  row3      ┌────────────┐   │
│  row4      │ row1       │   │
│  row5      │ row2 (현재)│   │
│  row6      │ row3       │   │
│  row7      └────────────┘   │
└─────────────────────────────┘
```

각 행마다 "창문"의 범위가 정의되고, 그 범위 안에서 집계/순위/참조 등의 계산이 일어납니다.

---

## 2. GROUP BY와 결정적 차이

가장 중요한 개념입니다. 많은 분들이 Window Function을 GROUP BY의 확장으로 이해하는데, **근본적으로 다릅니다.**

### 예시 데이터

```sql
CREATE TABLE sales (
    id       INT,
    dept     VARCHAR(20),
    emp_name VARCHAR(20),
    amount   INT
);

INSERT INTO sales VALUES
(1, '개발팀', '김철수', 500),
(2, '개발팀', '이영희', 700),
(3, '개발팀', '박지수', 300),
(4, '영업팀', '최민준', 900),
(5, '영업팀', '정수연', 400);
```

### GROUP BY — 행이 줄어든다

```sql
SELECT dept, SUM(amount) AS total
FROM sales
GROUP BY dept;
```

```
dept    | total
--------|------
개발팀  | 1500
영업팀  | 1300
```

> 5행 → 2행으로 압축됨. 개별 직원 정보 사라짐.

### Window Function — 행이 유지된다

```sql
SELECT
    emp_name,
    dept,
    amount,
    SUM(amount) OVER (PARTITION BY dept) AS dept_total
FROM sales;
```

```
emp_name | dept   | amount | dept_total
---------|--------|--------|----------
김철수   | 개발팀 |    500 |      1500
이영희   | 개발팀 |    700 |      1500
박지수   | 개발팀 |    300 |      1500
최민준   | 영업팀 |    900 |      1300
정수연   | 영업팀 |    400 |      1300
```

> 5행 → 5행 유지. 각 직원 정보 + 팀 합계를 동시에 볼 수 있음.

**이것이 Window Function의 존재 이유입니다.**

---

## 3. 문법 구조 완전 분석

```sql
함수명() OVER (
    [PARTITION BY 컬럼]
    [ORDER BY 컬럼 ASC|DESC]
    [ROWS|RANGE BETWEEN ... AND ...]
)
```

각 절은 **모두 선택사항**이지만, 어떤 조합을 쓰느냐에 따라 동작이 완전히 달라집니다.

| 절 | 역할 | 생략 시 |
|----|------|---------|
| `PARTITION BY` | 그룹 나누기 (GROUP BY와 유사하나 행 유지) | 전체를 하나의 파티션으로 처리 |
| `ORDER BY` | 파티션 내 정렬 + Frame 기준 | Frame 미적용, 순서 보장 없음 |
| `ROWS\|RANGE` | Frame(계산 범위) 지정 | ORDER BY 있으면 기본 Frame 적용 |

---

## 4. PARTITION BY 동작 원리

PARTITION BY는 데이터를 **논리적으로 분리**합니다. 물리적으로 테이블을 나누는 게 아닙니다.

```sql
SUM(amount) OVER (PARTITION BY dept)
```

내부적으로 MySQL은 다음과 같이 처리합니다:

```
1. dept 기준으로 파티션 분리
   ├── 개발팀 파티션: [500, 700, 300]
   └── 영업팀 파티션: [900, 400]

2. 각 파티션 내에서 SUM 계산
   ├── 개발팀: 1500
   └── 영업팀: 1300

3. 각 행에 해당 파티션의 결과값 붙여서 반환
```

### PARTITION BY 없이 사용

```sql
SELECT
    emp_name,
    amount,
    SUM(amount) OVER () AS grand_total  -- 전체 합계
FROM sales;
```

`OVER ()` — 괄호 안이 비어있으면 **전체 데이터셋이 하나의 파티션**이 됩니다.

---

## 5. ORDER BY와 Frame의 관계

Window Function에서 ORDER BY는 **단순 정렬이 아닙니다.**
ORDER BY를 쓰면 **기본 Frame이 자동으로 설정**됩니다.

### ORDER BY 없을 때

```sql
SUM(amount) OVER (PARTITION BY dept)
```

Frame = **파티션 전체** (처음부터 끝까지)
→ 모든 행이 같은 값 반환

### ORDER BY 있을 때

```sql
SUM(amount) OVER (PARTITION BY dept ORDER BY amount)
```

Frame = **RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW** (기본값 자동 적용)
→ **누적 합계**가 됨

```
emp_name | amount | 누적합(dept 내)
---------|--------|---------------
박지수   |    300 |   300
김철수   |    500 |   800
이영희   |    700 |  1500
```

이걸 모르면 "왜 누적합이 나오지?"라는 혼란이 생깁니다.

---

## 6. ROWS vs RANGE — 헷갈리는 핵심 차이

가장 많이 헷갈리는 부분입니다. 예시로 정확하게 짚고 넘어갑니다.

### Frame 문법

```sql
ROWS  BETWEEN [시작] AND [끝]
RANGE BETWEEN [시작] AND [끝]
```

**시작/끝 옵션:**

| 표현 | 의미 |
|------|------|
| `UNBOUNDED PRECEDING` | 파티션의 첫 번째 행 |
| `N PRECEDING` | 현재 행에서 N행 앞 |
| `CURRENT ROW` | 현재 행 |
| `N FOLLOWING` | 현재 행에서 N행 뒤 |
| `UNBOUNDED FOLLOWING` | 파티션의 마지막 행 |

### ROWS — 물리적 행 기준

```sql
SUM(amount) OVER (
    ORDER BY amount
    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
)
```

현재 행 기준으로 **물리적으로 앞 1행, 뒤 1행**을 포함합니다.

```
amount | 계산 대상        | 결과
-------|-----------------|------
300    | [300, 500]      |  800  (앞행 없음)
500    | [300, 500, 700] | 1500
700    | [500, 700, 900] | 2100
900    | [700, 900, 400] | 2000  ← 다른 파티션이면 불포함
```

### RANGE — 값의 범위 기준

```sql
SUM(amount) OVER (
    ORDER BY amount
    RANGE BETWEEN 200 PRECEDING AND 200 FOLLOWING
)
```

현재 행의 **값 기준으로 ±200 범위**에 해당하는 행들을 포함합니다.

```
amount | 계산 대상 (200 범위 내)   | 결과
-------|--------------------------|------
300    | 300, 500 (100~500 범위)  |  800
500    | 300, 500, 700 (300~700)  | 1500
700    | 500, 700, 900 (500~900)  | 2100
```

> **ROWS는 개수 기준, RANGE는 값 기준** — 이것만 기억하세요.

---

## 7. 함수별 완전 분석

### 7-1. 순위 함수

```sql
SELECT
    emp_name,
    amount,
    RANK()       OVER (ORDER BY amount DESC) AS rnk,
    DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rnk,
    ROW_NUMBER() OVER (ORDER BY amount DESC) AS row_num
FROM sales;
```

```
emp_name | amount | rnk | dense_rnk | row_num
---------|--------|-----|-----------|--------
최민준   |    900 |   1 |         1 |       1
이영희   |    700 |   2 |         2 |       2
김철수   |    500 |   3 |         3 |       3
정수연   |    400 |   4 |         4 |       4
박지수   |    300 |   5 |         5 |       5
```

동점자가 있을 때 차이가 극명하게 드러납니다:

```
amount | RANK | DENSE_RANK | ROW_NUMBER
-------|------|------------|----------
  900  |   1  |     1      |    1
  900  |   1  |     1      |    2   ← ROW_NUMBER는 무조건 유니크
  700  |   3  |     2      |    3   ← RANK는 2를 건너뜀
  700  |   3  |     2      |    4
  500  |   5  |     3      |    5
```

**언제 무엇을 쓸까?**

- `RANK` → 스포츠 순위 (동점이면 같은 등수, 다음 등수 건너뜀)
- `DENSE_RANK` → 등급 시스템 (동점이면 같은 등수, 다음 등수 연속)
- `ROW_NUMBER` → 페이지네이션, 중복 제거

---

### 7-2. LAG / LEAD — 이전/다음 행 참조

```sql
SELECT
    emp_name,
    amount,
    LAG(amount, 1)  OVER (ORDER BY id) AS prev_amount,
    LEAD(amount, 1) OVER (ORDER BY id) AS next_amount
FROM sales;
```

```
emp_name | amount | prev_amount | next_amount
---------|--------|-------------|------------
김철수   |    500 |        NULL |        700
이영희   |    700 |         500 |        300
박지수   |    300 |         700 |        900
최민준   |    900 |         300 |        400
정수연   |    400 |         900 |       NULL
```

**LAG/LEAD 시그니처:**

```sql
LAG(컬럼, N, 기본값) OVER (...)
--         ↑          ↑
--        N행 앞   NULL 대신 쓸 값
```

**실전 활용 — 전월 대비 증감률:**

```sql
SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month)                                    AS prev_revenue,
    ROUND((revenue - LAG(revenue) OVER (ORDER BY month))
          / LAG(revenue) OVER (ORDER BY month) * 100, 2)                  AS growth_rate
FROM monthly_revenue;
```

---

### 7-3. FIRST_VALUE / LAST_VALUE

```sql
SELECT
    emp_name,
    dept,
    amount,
    FIRST_VALUE(emp_name) OVER (PARTITION BY dept ORDER BY amount DESC) AS top_earner
FROM sales;
```

> **LAST_VALUE 주의사항:** 기본 Frame이 `CURRENT ROW`까지이므로, 진짜 마지막 값을 보려면 Frame을 명시해야 합니다.

```sql
-- ❌ 의도와 다르게 동작
LAST_VALUE(emp_name) OVER (PARTITION BY dept ORDER BY amount DESC)

-- ✅ 올바른 사용
LAST_VALUE(emp_name) OVER (
    PARTITION BY dept
    ORDER BY amount DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

---

### 7-4. NTILE — 구간 분할

```sql
SELECT
    emp_name,
    amount,
    NTILE(4) OVER (ORDER BY amount DESC) AS quartile
FROM sales;
```

전체 데이터를 N등분합니다. 4등분하면 4분위수 분류가 됩니다.

---

### 7-5. PERCENT_RANK / CUME_DIST

```sql
SELECT
    emp_name,
    amount,
    ROUND(PERCENT_RANK() OVER (ORDER BY amount), 2) AS pct_rank,
    ROUND(CUME_DIST()    OVER (ORDER BY amount), 2) AS cume_dist
FROM sales;
```

```
emp_name | amount | pct_rank | cume_dist
---------|--------|----------|----------
박지수   |    300 |     0.00 |      0.20
정수연   |    400 |     0.25 |      0.40
김철수   |    500 |     0.50 |      0.60
이영희   |    700 |     0.75 |      0.80
최민준   |    900 |     1.00 |      1.00
```

- `PERCENT_RANK` = (rank - 1) / (전체 행 수 - 1)
- `CUME_DIST` = 현재 값 이하인 행의 비율

---

## 8. 실전 분석 패턴

### 패턴 1. 각 부서에서 상위 N명 추출

서브쿼리 없이 깔끔하게:

```sql
SELECT *
FROM (
    SELECT
        emp_name,
        dept,
        amount,
        RANK() OVER (PARTITION BY dept ORDER BY amount DESC) AS rnk
    FROM sales
) ranked
WHERE rnk <= 2;
```

> Window Function은 WHERE 절에서 직접 사용 불가 → 서브쿼리나 CTE로 감싸야 합니다.

### 패턴 2. 누적 합계 (Running Total)

```sql
SELECT
    order_date,
    daily_revenue,
    SUM(daily_revenue) OVER (ORDER BY order_date
                             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                            ) AS cumulative_revenue
FROM daily_sales;
```

### 패턴 3. 이동 평균 (Moving Average)

```sql
SELECT
    order_date,
    revenue,
    AVG(revenue) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW  -- 7일 이동 평균
    ) AS moving_avg_7d
FROM daily_sales;
```

### 패턴 4. 전체 대비 비율

```sql
SELECT
    dept,
    emp_name,
    amount,
    ROUND(amount / SUM(amount) OVER () * 100, 1)          AS pct_of_total,
    ROUND(amount / SUM(amount) OVER (PARTITION BY dept) * 100, 1) AS pct_of_dept
FROM sales;
```

### 패턴 5. 중복 제거 (ROW_NUMBER 활용)

동일 사용자의 가장 최근 주문만 가져오기:

```sql
SELECT *
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM orders
) t
WHERE rn = 1;
```

### 패턴 6. 연속된 이벤트 탐지 (Gap & Island)

연속 출석일 계산:

```sql
SELECT
    user_id,
    login_date,
    login_date - INTERVAL (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) - 1) DAY AS group_start
FROM user_logins;
```

같은 `group_start`를 가진 행들이 연속된 그룹입니다.

---

## 9. 성능 이슈와 최적화

### Window Function은 느릴 수 있다

Window Function은 내부적으로 **정렬(Sort) + 스캔** 과정을 거칩니다.

```sql
EXPLAIN SELECT
    emp_name,
    SUM(amount) OVER (PARTITION BY dept ORDER BY amount)
FROM sales;
```

실행 계획에서 `Using filesort`가 보이면 **디스크 정렬이 발생**하고 있다는 신호입니다.

### 최적화 전략

**1. 인덱스 활용**

PARTITION BY, ORDER BY에 사용되는 컬럼에 복합 인덱스를 생성하면 정렬 비용을 줄일 수 있습니다.

```sql
-- dept로 파티션, amount로 정렬하는 경우
CREATE INDEX idx_dept_amount ON sales (dept, amount);
```

**2. 동일 OVER 절은 한 번만**

```sql
-- ❌ 비효율: 같은 OVER 절이 3번 평가됨
SELECT
    SUM(amount) OVER (PARTITION BY dept) AS dept_total,
    AVG(amount) OVER (PARTITION BY dept) AS dept_avg,
    MAX(amount) OVER (PARTITION BY dept) AS dept_max
FROM sales;

-- ✅ MySQL 옵티마이저가 자동으로 최적화하지만, 명시적으로 동일하게 작성하는 것이 좋음
-- (실제로 MySQL 8.0은 동일한 OVER 절을 캐싱함)
```

**3. 불필요한 Frame 피하기**

Frame을 명시하지 않는 게 더 빠를 수도 있습니다. Frame 범위가 넓을수록 처리 비용이 증가합니다.

**4. 대용량에서는 파티션 테이블 고려**

수억 건 데이터에 Window Function을 쓴다면, MySQL 테이블 파티셔닝과 병행하는 아키텍처를 고려하세요.

---

## 10. 자주 하는 실수 모음

### 실수 1. WHERE에서 Window Function 사용

```sql
-- ❌ 오류 발생
SELECT emp_name, RANK() OVER (ORDER BY amount DESC) AS rnk
FROM sales
WHERE rnk <= 3;

-- ✅ 서브쿼리나 CTE 사용
WITH ranked AS (
    SELECT emp_name, RANK() OVER (ORDER BY amount DESC) AS rnk
    FROM sales
)
SELECT * FROM ranked WHERE rnk <= 3;
```

Window Function은 WHERE보다 늦게 실행되기 때문에 WHERE에서 참조할 수 없습니다.

### 실수 2. LAST_VALUE의 Frame 미지정

```sql
-- ❌ 파티션의 마지막이 아닌 CURRENT ROW가 반환됨
LAST_VALUE(amount) OVER (PARTITION BY dept ORDER BY amount)

-- ✅
LAST_VALUE(amount) OVER (
    PARTITION BY dept
    ORDER BY amount
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### 실수 3. ORDER BY 생략으로 인한 비결정적 순서

```sql
-- ❌ 어떤 순서로 ROW_NUMBER가 부여될지 모름
ROW_NUMBER() OVER (PARTITION BY dept)

-- ✅ 항상 ORDER BY 명시
ROW_NUMBER() OVER (PARTITION BY dept ORDER BY id)
```

### 실수 4. NULL 처리

LAG/LEAD에서 첫 번째/마지막 행은 NULL을 반환합니다. 기본값을 반드시 지정하세요.

```sql
-- NULL 대신 0 반환
LAG(amount, 1, 0) OVER (ORDER BY id)
```

---

## 마무리

Window Function을 제대로 이해하면:

- 복잡한 셀프조인을 단순하게 대체
- 서브쿼리 중첩을 줄여 가독성 향상
- 누적합, 이동평균, 순위, 비율 등 분석 쿼리를 한 방에 해결

특히 `ROWS vs RANGE`의 차이와 **ORDER BY가 기본 Frame을 변경한다**는 사실을 이해하는 것이 Window Function을 진짜로 아는 것입니다.


---

*참고: 이 글의 모든 예시는 MySQL 8.0 이상에서 동작합니다. MySQL 5.7 이하에서는 Window Function을 지원하지 않습니다.*