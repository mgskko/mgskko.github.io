---
layout: single
title: "[파이썬] enumerate() 함수"
description: "range(len())의 불편함을 해결하는 enumerate()로 반복문에서 인덱스와 값을 함께 꺼내는 방법을 정리했어요."
categories: Python
tag: [python]
toc: true
author_profile: true
---

> **핵심 요약**
> - `range(len(list))`는 인덱스 확인을 위해 코드가 길어진다.
> - `enumerate()`는 순서가 있는 자료형(list, set, tuple, dictionary, string)의 원소에 순서값을 붙여 `(인덱스, 값)`을 준다.
> - 문자열에도 쓸 수 있다. 공백도 한 글자로 센다.
{: .notice--primary}

## range()의 단점

다음과 같은 리스트가 있을 때 range를 활용하면 리스트의 요소를 반복할 때 현재 인덱스가 몇번째인지 확인도 해야 하고 코드도 길어진다.

```python
example_list = ["요소A","요소B","요소C"]

for i in range(len(example_list)):
    print("{}번째 요소는 {}입니다.".format(i,example_list[i]))
```

```
0번째 요소는 요소A입니다.
1번째 요소는 요소B입니다.
2번째 요소는 요소C입니다.
```

이런 코드를 쉽게 작성할 수 있도록 도와주는 함수가 enumerate() 함수입니다.

|구분|range(len())|enumerate()|
|:---:|:---|:---|
|인덱스|`i`로 직접 접근해야 한다|`i, val`로 한 번에 꺼낸다|
|코드|길어진다|간결하다|

## enumerate() 함수

반복문을 사용할 때 리스트의 인덱스 정보를 알고 싶을 때 사용한다. enumerate() 함수는 리스트의 원소에 순서값을 부여해주는 함수이다.

```python
example_list = ["요소A","요소B","요소C"]

for i, val in enumerate(example_list):
    print("{}번째 요소는 {}입니다.".format(i,val))
```

```
0번째 요소는 요소A입니다.
1번째 요소는 요소B입니다.
2번째 요소는 요소C입니다.
```
순서가 있는 자료형(list, set, tuple, dictionary, string)을 입력으로 받아 인덱스 값을 포함하는 enumerate 객체를 리턴도 한다.

- **string**

```python
data = enumerate("재미있는 파이썬")
for i, value in data:
    print(i, ":", value)
```

```
0 : 재
1 : 미
2 : 있
3 : 는
4 :  
5 : 파
6 : 이
7 : 썬
```
