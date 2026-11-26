---
layout: single
title: "Hierarchical Methods"
description: "계층적 군집화(Hierarchical Methods)의 개념, 군집 간 거리 계산 방식, 장단점을 정리했어요."
categories: MachineLearning
tag: [python, Machine Learning]
toc: true
---

> **핵심 요약**
> - **계층적 군집화**는 가장 가까운 두 군집을 차례로 합쳐 가며 군집 수를 줄여 나간다.
> - K-means와 달리 **사전에 군집 수 k를 정할 필요가 없고**, 나무형 그림(덴드로그램)으로 과정을 볼 수 있다.
> - 한 번 병합·분리된 군집은 되돌릴 수 없고, 거리 계산 방식에 따라 노이즈·이상치에 취약할 수 있다.
{: .notice--primary}

## 1. Hierarchical Methods 알고리즘의 개념

Hierarchical Methods는 계층적 트리 모형을 이용해 여러 개의 군집 중에서 가장 유사도가 높은 혹은 거리가 가까운 군집 두 개를 선택하여 하나로 합치면서 군집 개수를 줄여 군집화를 수행하는 알고리즘이다.

![Alt text](https://i.esdrop.com/d/f/uVJApfFjHN/mjOgOZPN8y.jpg)

---

## 2. Hierarchical Methods 알고리즘의 특징

- 군집 분석에는 계층적인 방법(hierarchical clustering)과 비계층적인 방법(k-means)으로 순차적으로 그룹을 할당하는지의 여부에 따라 나누어 준다. 계층적인 방법은 가까운 대상끼리 순차적으로 군집을 묶어간다면, 비계층적인 방법은 랜덤하게 군집을 묶어 준다.
- Hierarchical Methods는 K-Means과 달리 사전에 군집수 k를 설정할 필요가 없다.

---

![Alt text](https://i.esdrop.com/d/f/uVJApfFjHN/0dsOxd07aS.jpg)

- Single-Link Distance : 생성된 군집에서 중심과 거리가 가까운 데이터끼리 비교하여 군집화
- Complete-Link Distance : 생성된 군집에서 중심과 거리가 먼 데이터끼리 비교하여 가장 먼 데이터끼리 군집화
- Average-Link Distance : 한 군집 안에 속한 모든 데이터와 다른 군집에 속한 모든 데이터의 두 집단에 대한 거리 평균을 계산하여 군집화
- Centroid Distance : 군집의 중심을 잡아 거리를 계산하여 군집화

---

#### 군집 간 거리 계산 방식

|방식|거리 계산 기준|
|:---:|:---|
|Single-Link|군집에서 거리가 가까운 데이터끼리 비교|
|Complete-Link|거리가 먼 데이터끼리 비교해 가장 먼 데이터끼리 군집화|
|Average-Link|두 군집의 모든 데이터 쌍 거리의 평균|
|Centroid|군집의 중심 사이의 거리|

## 3. Single-Link, Complete-Link 비교

아웃라이어에 취약하다.

---

## 4. Hierarchical Methods의 장단점

### 장점

- 구현이 간단하고 이해하기 쉽다.
- 나무형 그림을 통해 군집화 과정을 볼 수 있다.

### 단점

- 계층적 클러스터링의 최대 문제점은 한 번 병합이 되거나 분리된 군집은 다시 되돌릴 수 없다.
- 군집 간의 거리를 어떻게 계산하는지에 따라 노이즈와 아웃라이어에 취약하거나, 복잡한 군집을 다루지 못하는 등의 한계를 갖게 된다.
