---
layout: single
title: "[선형대수(with 파이썬)] 2. 전치 연산, 영벡터, 일벡터"
description: "전치 행렬과 영벡터, 일벡터의 정의를 행렬 식으로 정리했어요."
categories: Linear-algebra
tag: [python, Linear-algebra]
toc: true
---

> **핵심 요약**
> - **전치 행렬**은 행렬 A의 행과 열을 서로 바꾼 행렬이고, A^T로 쓴다.
> - **영벡터**는 모든 성분이 0인 벡터, **일벡터**는 모든 성분이 1인 벡터다.
{: .notice--primary}

## 전치 연산, 영벡터, 일벡터

### 1. 용어 정리

 - **전치 행렬** : 행렬 A의 행과 열을 바꾸어 놓은 행렬

$$
A_{2,3} =
 \begin{pmatrix}
  a_{1,1} & a_{1,2} & a_{1,3} \\
  a_{2,1} & a_{2,2} & a_{2,3} \\
 \end{pmatrix}
$$

$$
A^T =
 \begin{pmatrix}
  a_{1,1} & a_{2,1} \\
  a_{1,2} & a_{2,2} \\
  a_{1,3} & a_{2,3} \\
 \end{pmatrix}
$$

 - **영벡터** : 모든 성분이 0으로 구성된 벡터

$$
0 =
 \begin{pmatrix}
  0   \\
  0   \\
  0   \\
 \end{pmatrix}
$$

 - **일벡터** : 모든 성분이 1로 구성된 벡터

$$
1 =
 \begin{pmatrix}
  1   \\
  1   \\
  1   \\
 \end{pmatrix}
$$

3차원 일벡터

---

공부한 전체 코드는 깃허브에 올렸습니다.

**[깃허브 링크](https://github.com/mgskko/linear-algebra-with-python/blob/master/%EC%A0%84%EC%B9%98%EC%97%B0%EC%82%B0.ipynb)**
{: .notice--primary}
