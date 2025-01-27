---
layout: single
title:  "[MySQL] DATE_FORMAT 날짜 변환"
categories: DataBase
tag: [MySQL, DATABASE, cs]
toc: true
---


## DATE_FORMAT 날짜 변환


### DATE_FORMAT 사용 방법

DATE_FORMAT(날짜 , 형식) : 날짜를 지정한 형식으로 출력
첫번째 파라미터에는 원하는 컬럼, 데이터를 넣고 두번째 파라미터값에는 원하는 출력 형태의 포맷 문자열을 넣는다.
특히 `대소문자`에 따라 형식이 바뀌는 것을 조심해야 한다.

### NOW()

가장 먼저 NOW()는 현재 시간을 출력해준다.

```sql
SELECT NOW()
```

```
2023-02-09 07:45:36
```

### 날짜 8자리 표현
 

가장 많이 사용되는 표현 형태로 DATE(년/월/일) 관련 정보를 VARCHAR 형태로 저장할 때 많이 사용된다.


```sql
SELECT DATE_FORMAT(NOW(),'%Y%m%d');
```

```
20230209
```

### 다양한 기호와 함께 사용
 
```sql
SELECT DATE_FORMAT(NOW(),'%Y-%m-%d'); -- 2023-02-09
SELECT DATE_FORMAT(NOW(),'%Y/%m/%d'); -- 2023/02/09
SELECT DATE_FORMAT(NOW(),'%Y~%m~%d'); -- 2023~02~09
SELECT DATE_FORMAT(NOW(),'%H:%i:%s'); -- 23:41:54
```

### 시간 정보만 출력

시간 정보 표기방식은 크게 24시간제와 12시간 제로 나눌 수 있다.

#### 24시간제

```sql
SELECT DATE_FORMAT(NOW(),'%H-%i-%s');
```

```
19-51-52
```

#### 12시간제

대문자 `H`를 소문자 `h`로 바꿔주면 된다.

```sql
SELECT DATE_FORMAT(NOW(),'%h-%i-%s');
```

```
07-51-52
```

### 그 외 표시형식

| 지정값                    | 구분        | 표시형식                                |
| ---------------------- | --------- | ----------------------------------- |
| %Y                     | 연         | 4자리 연도                              |
| %y                     | 연         | 2자리 연도                              |
| %m                     | 월         | 2자리 (00-12)                         |
| %c                     | 월         | 1자리, 10보다 작을경우 (1-12)               |
| %M                     | 월         | 이름(January, February…)              |
| %b                     | 월         | 줄인 이름(Jan, Feb…)                    |
| %d                     | 일         | 2자리 (00-31)                         |
| %e                     | 일         | 1자리, 10보다 작을경우 (0-31)               |
| %D                     | 일         | 1st, 2nd…                           |
| %H                     | 시         | 24시간 형식 (00-23)                     |
| %h                     | 시         | 12시간 형식 (01-12)                     |
| %I                     | 시         | 12시간 형식 (01-13)                     |
| %k                     | 시         | 24시간 형식, 10보다 작을경우 한자리 (0-23)       |
| %l                     | 시         | 12시간 형식, 10보다 작을경우 한자리 (1-12)       |
| %i                     | 분         | 2자리 (00-59)                         |
| %S                     | 초         | 2자리 (00-59)                         |
| %s                     | 초         | 2자리 (00-59)                         |
| %f                     | 마이크로초     | 100만분의 1초                           |
| %p                     | 오전/오후     | AM/PM                               |
| %T                     | 시분초       | 24시간 형식 (hh:mm:ss)                  |
| %r                     | 시분초 오전/오후 | 12시간 형식 (hh:mm:ss AM/PM)            |
| %j                     | 일         | 그해의 몇번째 일인지 표시 (001-366)            |
| %w                     | 일         | 그주의 몇번째 일인지 표시 (0=일요일, 6=토요일)       |
| %W                     | 주         | 이름(Monday,Tuesday…)                 |
| %a                     | 주         | 줄인 이름(Mon,Tue…)                     |
| %U                     | 주         | 그해의 몇번째 주인지 표시 (00-53) 일요일이 주의 첫번째일 |
| %u                     | 주         | 그해의 몇번째 주인지 표시 (00-54) 월요일이 주의 첫번째일 |
| %X                     | 연         | 그주가 시작된 해을 표시, %V와 같이 사용            |
| %x                     | 연         | 그주가 시작된 해을 표시, %v와 같이 사용            |
| %V                     | 주         | 그주가 시작된 해의 몇번째 주인지 표시 (01-53) <br>  일요일이 주의 첫번째일 %X 와 함께사용    
| %v                     | 주         | 그주가 시작된 해의 몇번째 주인지 표시 (01-53) <br>    월요일이 주의 첫번째일 %x 와 함께사용    |

### 참고 사이트

더 자세한 변경 양식을 보고 싶다면 아래 링크를 참고

**[참고 사이트 링크](<https://www.w3schools.com/sql/func_mysql_date_format.asp>)**
{: .notice--primary}