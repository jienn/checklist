# 체크리스트 도우미

키워드를 입력하면 규칙(`rules.json`)에 따라 체크리스트를 만들고, 작업정보를 입력하면 체크리스트를 수정하고 관련 키워드를 찾아주는 정적 웹서비스입니다. 서버 없이 브라우저에서만 동작합니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` / `style.css` / `app.js` | 화면과 로직 |
| `rules.json` | 키워드별 체크리스트와 수정 규칙 |
| `.github/workflows/pages.yml` | GitHub Pages 자동 배포 |

## 규칙 수정 (`rules.json`)

- `keywords[]`: `keyword`(대표 키워드), `aliases`(별칭), `checklist`(기본 항목)
- `modifiers[]`: 작업정보에 `triggers` 단어가 있으면 `add` 항목을 추가하고 `remove` 항목을 제거합니다. `keywords`를 지정하면 해당 키워드의 체크리스트에만 적용됩니다.
- 관련 키워드: 작업정보 안에서 다른 `keyword`/`aliases`가 발견되면 칩으로 표시되고, 클릭하면 그 체크리스트로 전환됩니다.

## 로컬 실행

`rules.json`을 fetch하므로 파일을 직접 열지 말고 간단한 서버로 실행하세요.

```
python3 -m http.server 8000
```

그다음 http://localhost:8000 으로 접속합니다.

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만들고 이 폴더 내용을 `main` 브랜치에 push 합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. push 하면 워크플로가 실행되고, 완료 후 `https://<계정>.github.io/<저장소>/` 에서 확인할 수 있습니다.

```
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```
