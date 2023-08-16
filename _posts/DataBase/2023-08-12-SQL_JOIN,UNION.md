---
layout: single
title:  "[mySQL] 조인(JOIN)과 유니온(UNION)"
categories: DataBase
tag: [MySQL, DATABASE, cs]
toc: true
---


# <span style="color:blue">조인(JOIN)</span>

> 두 개 이상의 테이블을 연결하여 데이터를 검색하고 결합하는 방법

이를 위해서는 적어도 하나의 `공유 컬럼`(또는 관계)이 있어야 합니다. 

 `JOIN`은 <u>내부 조인, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN</u>이 있습니다.

<img width="708" alt="image" src="https://github.com/mgskko/bike_data/assets/100071667/9b6b1864-19ec-409f-a216-09abd33e5630">{: width="80%" height="70%" .align-center}


[출저](<https://lyk00331.tistory.com/107>)
{: .notice--primary}

## 내부 조인(INNER JOIN)

> 두 개의 테이블 사이에 공통된 속성(열)을 기반으로 `데이터`를 결합하는 방법

<img width="293" alt="image" src="https://github.com/mgskko/Algorithm/assets/100071667/1f2a6ec5-f23b-4974-8a44-6e9e0d35b1d7">{: width="50%" height="40%" .align-center}

- 공통되는 값만 뽑아오기 때문에 NULL값이 존재하지 않는다.


```
SELECT <열 목록>
FROM <첫 번째 테이블>
    INNER JOIN <두 번째 테이블>
    ON <조인 조건>
[WHERE 검색 조건]
```

## 외부 조인(OUTER JOIN)

> 두 개의 테이블 사이에 공통된 속성(열)을 기반으로 `데이터`를 결합하는 방법

<img width="293" alt="image" src="https://github.com/mgskko/Algorithm/assets/100071667/3fcc609b-4c7a-4841-a113-fae1436fe513">{: width="50%" height="40%" .align-center}

- 공통되는 값만 뽑아오기 때문에 NULL값이 존재하지 않는다.


### 왼쪽 아우터 조인(Left Outer Join 또는 Left Join)

> 왼쪽 테이블의 모든 값이 출력되는 조인

왼쪽 테이블의 모든 행을 포함하면서 오른쪽 테이블과 <u>일치하는 행</u>을 결합합니다. 오른쪽 테이블에 일치하는 값이 없더라도 왼쪽 테이블의 모든 행이 결과에 포함됩니다. 결과적으로, 왼쪽 테이블의 값은 반드시 결과에 나타나게 됩니다.

### 오른쪽 아우터 조인(Right Outer Join 또는 Right Join)

> 오른쪽 테이블의 모든 값이 출력되는 조인


왼쪽 테이블과 마찬가지로 오른쪽 테이블의 <u>모든 행을 포함하면서</u> 왼쪽 테이블과 일치하는 행을 결합합니다. 왼쪽 테이블에 일치하는 값이 없더라도 오른쪽 테이블의 모든 행이 결과에 포함됩니다.

### 풀 아우터 조인(Full Outer Join)

> 왼쪽 또는 오른쪽 테이블의 모든 값이 출력되는 조인


양쪽 테이블의 <u>모든 행을 포함하면서 일치하는 행</u>을 결합합니다. 따라서 결과에는 양쪽 테이블의 모든 값이 포함되며, 일치하지 않는 값들도 결과에 나타납니다.

<img width="657" alt="image" src="https://github.com/mgskko/Algorithm/assets/100071667/6dfe30e4-da68-4aa0-b22e-a7f5230296a6">{: width="80%" height="70%" .align-center}

[출저](<https://hongong.hanbit.co.kr/sql-%EA%B8%B0%EB%B3%B8-%EB%AC%B8%EB%B2%95-joininner-outer-cross-self-join/>)
{: .notice--primary}

```
SELECT <열 목록>
FROM <첫 번째 테이블(LEFT 테이블)>
    <LEFT | RIGHT | FULL> OUTER JOIN <두 번째 테이블(RIGHT 테이블)>
     ON <조인 조건>
[WHERE 검색 조건]
```

## 크로스 조인(CROSS JOIN)

> 한쪽 테이블의 모든 행과 다른 쪽 테이블의 모든 행을 조인시키는 기능

![image](https://github.com/mgskko/Algorithm/assets/100071667/3421cafe-02f4-4f81-b372-3195fc3c0ce6){: width="80%" height="70%" .align-center}

```
SELECT *
FROM <첫 번째 테이블>
    CROSS JOIN <두 번째 테이블>
```

### <u>크로스 조인 주의사항</u>


1. 두 개의 테이블 간의 가능한 모든 조합을 생성해야 할 때
2. 특정 조건을 적용하지 않고 두 테이블 간의 `모든 가능한 조합`을 확인해야 할 때
3. 데이터의 `테스트` 또는 `임시 결과`를 생성할 때

## 셀프 조인(SELF JOIN)

> 하나의 테이블 내에서 행을 다른 행과 결합하는 것

![image](https://github.com/mgskko/Algorithm/assets/100071667/dc35bedc-d46d-4179-b6af-cb434bd442a7){: width="80%" height="70%" .align-center}

```
SELECT <열 목록>
FROM <테이블> 별칭A
    INNER JOIN <테이블> 별칭B
[WHERE 검색 조건]
```

<br>

# <span style="color:blue">유니온(UNION)</span>

> 두 개 이상의 SELECT 문의 결과 집합을 결합하는 작업

결과로 단일 결과 집합이 생성됩니다. 
<u>단, 컬럼의 개수가 같아야하고, 각 컬럼의 데이터타입이 같아야합니다.</u>

`UNION` 과 `UNION ALL` 의 두 가지 유형의 <u>UNION</u>이 있습니다. `UNION`을 사용하여 얻은 결과에는 중복이 포함되지 않습니다. 반면에 `UNION ALL`을 사용하여 얻은 결과는 중복을 유지합니다.

<br>

# <span style="color:blue">SQL의 JOIN과 UNION의 차이점</span>

### 1. 용도:

- `JOIN`은 관련된 데이터를 결합하여 의미 있는 결과를 생성하기 위해 사용됩니다.
- `UNION`은 서로 다른 데이터 집합을 결합하고 중복을 제거한 결과를 생성하기 위해 사용됩니다.

### 1. 연산 대상:

- `JOIN`은 두 개 이상의 테이블 간의 데이터를 연결하고 결합합니다.
- `UNION`은 두 개 이상의 SELECT 문의 결과 집합을 결합합니다.

### 2. 결과 형태:

- `JOIN`은 연결된 테이블의 열을 사용하여 새로운 결과 테이블을 생성합니다.
- `UNION`은 SELECT 문의 결과 집합을 결합하여 단일 결과 집합을 생성합니다.

### 3. 중복 행 처리:

- `JOIN`은 중복된 행을 제거하지 않습니다. (특정 유형의 조인을 제외하고는)
- `UNION`은 중복을 제거하고자 할 때 사용하며, UNION ALL은 중복을 제거하지 않습니다.

### 4. 컬럼 요구 사항:

- `JOIN`은 관련된 테이블 간의 공유 컬럼이 필요합니다.
- `UNION`은 결합하려는 SELECT 문의 컬럼 수와 데이터 유형이 일치해야 합니다.

### 5. 데이터의 관계:

- `JOIN`은 관련된 데이터를 기반으로 데이터 간의 관계를 사용하여 결합합니다.
- `UNION`은 주로 데이터가 서로 유사한 경우에 사용되며, 두 데이터 집합을 동일한 형태로 결합합니다.

### 6. 성능:

- `JOIN`은 관련된 테이블 간의 연결 및 결합을 수행하므로 성능에 영향을 미칠 수 있습니다.
- `UNION`은 두 개 이상의 결과 집합을 단순히 결합하는 작업이므로 성능에 대부분의 영향을 미치지 않습니다.
