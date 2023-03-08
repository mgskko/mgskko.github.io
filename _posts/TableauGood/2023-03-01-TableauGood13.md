---
layout: single
title:  "라운드형 막대차트"
categories: Tableau
tag: [Tableau]
toc: true
---

## 라운드형 막대차트

**라운드형 막대차트(Rounded bar chart)**는 막대 끝이 사각형이 아닌 둥근 형태의 막대 차트이다. 기존 막대 차트보다는 좀 더 심미적으로 구성하고자 할 때 유용하며,모양 이미지 아이콘과 함께 스면 화면을 보다 예쁘게 구성할 수 있다. 다만 기존 막대보다는 끝이 둥글기 때문에 실제 값보다 레이블의 위치가 약간 왜곡될 수 있으므로 사용할 때 유의하여야 한다.

## 라운드형 막대차트 만들기

매출을 열 선반에 올린뒤 더블 클릭하여 임시 계산으로 AVG(0)을 만들어서 매출 바 오른쪽에 비어있는 바 차트가 하나 더 생기도록 만들어준다. 마크 카드에서 속성을 '라인'으로 변경 후 행 선반에 있는 '측정값 이름'을 마크 카드의 경로에 올려준다.

![image](https://user-images.githubusercontent.com/100071667/222195969-495a7b50-9466-43d9-98c7-5c444147376f.png)

차원에 있는 [제품 중분류]필드를 드래그해서 행 선반에 올리면 제품 중분류가 17개 덩어리로 나눠어진다. 그 후 행 선반에 있는 [제품 중분류]를 정렬 기준은 '필드', 정렬 순서는 '내림차순', 필드명은 '매출', 집계는 '합계'를 선택해준다.

![image](https://user-images.githubusercontent.com/100071667/222196931-0d0eda78-cb3d-4422-ae4d-05df5b3c8d4b.png)

![image](https://user-images.githubusercontent.com/100071667/222196973-7fe02e72-fd38-47de-b8ed-079f9585fed9.png)

[매출]필드를 드래그해서 <레이블>마크에 올려준 뒤 라인 양쪽에 표시되고 있는 레이블을 우측 끝에만 표시되도록 레이블 마크를 선택 후 레이블 마크 위를 '전체' 대신 '라인 끝'을 선택하고, 선 시작점 레이블은 체크 해제해준다.

![image](https://user-images.githubusercontent.com/100071667/222197880-bc0d24d6-9122-4d5d-9788-fcecadf5419f.png)

<레이블>마크에서 맞춤을 가로: 가운데, 세로:위쪽 정렬을 해주고 하단은 얇게 상단은 굵게 표현하고자 하면 [측정값]필드를 CTRL키를 누른채 크기 마크에 올려준다.

![image](https://user-images.githubusercontent.com/100071667/222198834-57c6549b-72df-4845-bcf5-4dbfc7f23fda.png)

라운드형 막대 차트에 하단의 색과 상단의 색을 다르게 입히려고 하면 행 선반에 있는 [측정값]필드를 색상 마크에도 올려준다. 뷰 안에 행 방향의 라인도 격자선: '없음'으로 바꿔어주고 화면 우측의 '측정값' 크기 범례와 '측정값' 색상 범례를 화면의 하단에 이동시켜 준다.

![image](https://user-images.githubusercontent.com/100071667/222199423-ee5383fd-17da-4fc7-9c3a-8af66e5122a4.png)