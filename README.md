# 본사 지사 관리 시스템 (MVP)

Next.js + Prisma + SQLite 기반의 내부용 웹 관리 시스템입니다.

## 주요 기능

- 대시보드
  - 이번 달 총 판매 부수
  - 전월 대비 증감률
  - 프로그램별 판매 부수 차트
  - 최근 12개월 판매 추이 차트
- 지사 관리
  - 지사 목록/검색/필터/정렬
  - 지사 등록/상세 수정
  - 프로그램 권한 체크/전체선택/전체해제/다른 지사 복사
  - 월별 판매부수 입력/이전달 불러오기/초기화/이력 조회
- 판매권한 관리
  - 지사 x 프로그램 권한 매트릭스(O/X)
  - 프로그램 컬럼 클릭 필터
  - 엑셀 업로드 미리보기/적용
- 판매부수 관리
  - 연월 기준 지사 x 프로그램 판매부수 현황
  - 엑셀 다운로드
  - 엑셀 업로드 미리보기/적용

## 기술 스택

- Next.js (App Router, TypeScript)
- Prisma ORM
- SQLite
- xlsx (엑셀 업로드/다운로드)
- recharts (대시보드 그래프)

## 실행 방법

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 데이터 모델

- `branches`
- `programs` (초기 8개: 프로그램 1~8)
- `branch_program_permissions`
- `sales` (branch + year_month + program 단위 수량 저장)

## 엑셀 형식

- 판매권한 업로드:
  - `branch_code | program1 | program2 | ... | program8`
  - 값 예시: `Y/N`, `YES/NO`, `1/0`, `TRUE/FALSE`, `O/X`
- 판매부수 업로드:
  - `branch_code | year_month | program1 | ... | program8`
  - `year_month`는 `YYYY-MM`
