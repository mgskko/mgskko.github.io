---
layout: single
title: "[파이썬] lambda & apply 사용법"
description: "판다스 전처리에서 자주 쓰는 lambda와 apply()의 사용법을 날짜 데이터 예제로 정리했어요."
categories: Python
tag: [python]
toc: true
author_profile: true
---

> **핵심 요약**
> - `lambda 매개변수 : 표현식`은 이름 없는 한 줄짜리 함수다. 3줄짜리 `def` 함수를 1줄로 줄일 수 있다.
> - `apply()`는 내가 정의한 함수를 DataFrame 열의 각 값에 적용해 값을 바꾼다.
> - `apply(lambda ...)`로 함께 쓰면 별도 함수 없이 한 줄로 전처리한다 (예: 연도 추출, 나이 계산).
{: .notice--primary}

## lambda & apply 사용이유

데이터 전처리 과정에서 `DataFrame`을 원하는 대로 조작해야 할 경우가 생긴다. 여러 가지 방법들 중에 apply() 함수와 lambda 사용법은 자주 사용한다.

## lambda

lambda 매개변수 : 표현식

```python
def add(x, y):
    return x + y

add(1, 2)
```

```
3
```

두 수를 더하는 함수로 def()같은 경우 함수의 이름을 만들어야 되는데 lambda는 함수의 이름을 정의해주지 않아도 된다.
또한 코드가 3줄에서 1줄로 코드도 짧아진다.

```python
(lambda x,y : x + y)(1,2)
```

```
3
```

## apply

`DataFrame`을 조작하다보면 내가 정의한 함수에 따라 데이터프레임의 값들을 변경하고 싶을 때 사용된다.

```python
import pandas as pd

date_list = [{'yyyy-mm-dd': '2000-06-27'},
         {'yyyy-mm-dd': '2002-09-24'},
         {'yyyy-mm-dd': '2005-12-20'}]
df = pd.DataFrame(date_list, columns = ['yyyy-mm-dd'])
df
```

![image](https://user-images.githubusercontent.com/100071667/219605044-b5433e13-817a-4294-a00c-cf71a317834a.png)

```python
def extract_year(row):
    return row.split('-')[0]

df['year'] = df['yyyy-mm-dd'].apply(extract_year)
df
```

![image](https://user-images.githubusercontent.com/100071667/219605580-7aa89344-defe-4875-8ed9-0b4de44a374c.png)

#### def와 lambda 비교

|구분|def|lambda|
|:---:|:---|:---|
|함수 이름|정의해야 한다|정의하지 않아도 된다|
|코드 길이|3줄|1줄|

## lambda & apply 함께 사용

```python
df['year'] = df['yyyy-mm-dd'].apply(lambda row : row.split('-')[0])
df
```

![image](https://user-images.githubusercontent.com/100071667/219605580-7aa89344-defe-4875-8ed9-0b4de44a374c.png)

위와 똑같은 결과를 얻을 수 있다.

```python
df['age'] = df['year'].apply(lambda year : 2023 - int(year))
df
```

![image](https://user-images.githubusercontent.com/100071667/219607355-578beb3d-8cce-48ec-a512-4b592e7f50bc.png)
