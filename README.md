# Study Note

공부한 내용을 기록하는 블로그예요. https://mgskko.github.io

- Jekyll + GitHub Pages 기본 빌드로 배포돼요 (`main` 브랜치에 올리면 자동 반영).
- 테마는 직접 만든 것이에요: `_layouts`, `_includes`, `assets/css/main.css`, `assets/js/`.
- 글은 `_posts/<폴더>/YYYY-MM-DD-제목.md`에 쓰고, front matter의 `categories` 값은 `_data/categories.yml`의 키와 맞춰요.
- 새 카테고리를 만들면 `_data/categories.yml`에 항목을 추가하고 `_pages/categories/`에 페이지 파일을 하나 만들어요.

## 로컬에서 보기

```bash
bundle install
bundle exec jekyll serve
```
