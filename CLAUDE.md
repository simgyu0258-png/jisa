# 본사 지사 관리 시스템 — Claude Code 가이드

## 프로젝트 개요

본사에서 지사들의 프로그램 판매권한·판매부수·목표를 관리하는 내부 전용 웹 앱.

- **기술 스택**: Next.js 16 (App Router, TypeScript) · Prisma 6 + PostgreSQL (Supabase) · React 19.2 · Tailwind CSS 4 · recharts · xlsx · exceljs · office-crypto
- **DB**: PostgreSQL (Supabase) — `DATABASE_URL` / `DIRECT_URL` 환경변수
- **배포**: Vercel (GitHub 연동 자동 배포) — `simgyu0258-png/jisa` 저장소

## 개발 환경

```bash
npm run dev        # 개발 서버 (--webpack 플래그로 Turbopack 아닌 Webpack 사용)
npm run build      # 프로덕션 빌드 (--webpack)
npm run db:push    # Prisma 스키마 → DB 동기화
npm run db:seed    # 시드 데이터 삽입
```

> **주의**: 이 프로젝트는 `--webpack` 플래그로 실행한다. Next.js 16은 기본이 Turbopack이지만 이 프로젝트는 Webpack을 명시적으로 사용한다. 스크립트에서 `--webpack` 플래그를 제거하지 말 것.

## 도메인 개념

- **회계연도**: 3월 ~ 다음해 2월. `getCurrentFiscalYear()` → 현재 회계연도 (3월이면 해당 연도, 1~2월이면 전년도).
- **호(issue)**: 회계연도 내 월 번호. 1호=3월, 2호=4월, …, 12호=2월. `issueNumber`로 저장.
- **온리원키즈포스쿨**: 반 단위로 과금하는 특수 프로그램. `Program.isOnlyOne = true`. 판매 실적은 `SaleOrder`가 아닌 `OnlyOneContract`(기간 계약)로 관리하고, 클래스 수 = 부수로 취급.
- **활성 온리원 계약**: `startDate <= 해당월-말일 AND (endDate IS NULL OR endDate >= 해당월-1일)`.
- **ERP 파일**: 지사에서 다운받아 업로드하는 판매 데이터. 거래처명=지사명, 배송처명=기관명으로 매핑.

## 파일 구조

```
src/
  app/
    page.tsx                          # 대시보드 (목표달성현황·월별·호별·차트)
    layout.tsx                        # 루트 레이아웃
    branches/
      page.tsx                        # 지사 목록 (검색/필터/정렬)
      actions.ts                      # 지사 등록 Server Action
      new/page.tsx                    # 지사 단건 등록 (사업자명 별칭 포함)
      bulk/page.tsx                   # 지사 일괄등록 페이지
      bulk-upload-client.tsx          # 지사 일괄등록 Client Component
      bulk-edit/page.tsx              # 지사 일괄수정 페이지
      [id]/page.tsx                   # 지사 상세/수정
      [id]/actions.ts                 # 지사 수정 Server Actions (별칭 추가/삭제 포함)
    permissions/
      page.tsx                        # 판매권한 매트릭스
      upload-client.tsx               # 엑셀 업로드 Client Component
    sales/
      page.tsx                        # 판매부수 현황 (Server Component — 뷰별 쿼리 분기)
      sales-view-client.tsx           # 월별/호별/기관/목표 탭 Client Component
      bulk/page.tsx                   # 판매부수 일괄등록
      bulk-edit/page.tsx              # 판매부수 일괄수정
    targets/
      page.tsx                        # 목표 관리 (Server Component)
      targets-client.tsx              # 목표 입력 테이블 + 일괄등록 Client Component
      actions.ts                      # saveTargetsAction, saveOnlyOneTargetsAction
    only-one/
      page.tsx                        # 온리원 현황 (Server Component)
      only-one-client.tsx             # 지사별 달성현황 + 일괄등록 Client Component
    analytics/
      page.tsx                        # 판매 분석 (다중 차트 카드)
      analytics-client.tsx            # sessionStorage 기반 차트 상태 유지
    upload/
      page.tsx                        # 자료 업데이트 (ERP 파일 업로드)
      upload-client.tsx               # ERP 업로드 미리보기/적용 Client Component
    erp-rules/
      page.tsx                        # ERP 규칙 관리
      erp-rules-client.tsx            # 제외규칙·자동매핑·품목명매핑 탭
      actions.ts                      # ERP 규칙 Server Actions
    programs/
      page.tsx                        # 프로그램 관리
    accounts/
      page.tsx                        # 계정 관리
    guide/
      page.tsx                        # 이용 가이드
      guide-client.tsx                # 탭별 가이드 Client Component
    login/page.tsx                    # 로그인
    api/
      auth/[...nextauth]/             # NextAuth
      branches/excel/
        template/                     # 지사 일괄등록 양식 다운로드
        preview/                      # 지사 일괄등록 미리보기
        apply/                        # 지사 일괄등록 적용
        bulk-edit/preview/            # 지사 일괄수정 미리보기
        bulk-edit/apply/              # 지사 일괄수정 적용
        bulk-edit/download/           # 지사 일괄수정 양식 다운로드
      permissions/excel/
        preview/                      # 권한 엑셀 미리보기
        apply/                        # 권한 엑셀 적용
      sales/excel/
        template/                     # 판매부수 일괄등록 양식
        preview/                      # 판매부수 일괄등록 미리보기
        apply/                        # 판매부수 일괄등록 적용
        download/                     # 판매부수 엑셀 다운로드 (피벗)
      targets/excel/
        template/                     # 목표 일괄등록 양식 (실제 프로그램명 컬럼)
        preview/                      # 목표 일괄등록 미리보기
        apply/                        # 목표 일괄등록 적용
      upload/erp/
        preview/                      # ERP 파일 파싱·미리보기
        apply/                        # ERP 파일 적용 (SaleOrder upsert)
      only-one/
        template/                     # 온리원 일괄등록 양식
        preview/                      # 온리원 일괄등록 미리보기
        apply/                        # 온리원 일괄등록 적용
        institutions/                 # 지사별 기관·계약 조회
  components/
    nav.tsx                           # 사이드바 네비게이션 (Client Component)
    dashboard-charts.tsx              # recharts 차트 (Client Component)
    dashboard-summary-cards.tsx       # 대시보드 요약 카드
    saved-toast.tsx                   # 저장 완료 토스트
  lib/
    prisma.ts                         # Prisma 클라이언트 싱글톤
    month.ts                          # 연월·회계연도·호 유틸 함수
    excel-reader.ts                   # 비밀번호 보호 엑셀 복호화 유틸 (office-crypto)
prisma/
  schema.prisma                       # DB 스키마
  seed.js                             # 시드 데이터
```

## DB 모델

| 모델 | 주요 필드 |
|------|-----------|
| `Branch` | `branchCode`(unique), `name`, `region`, `status`(active/inactive), `managerName`, `phone`, `memo` |
| `BranchAlias` | `branchId`, `name`(unique) — ERP 거래처명 별칭 매핑용 |
| `Program` | `name`, `totalIssues`, `matchKeyword`(ERP 매핑 키워드), `isOnlyOne`(온리원 여부) |
| `BranchProgramPermission` | `branchId` + `programId`(unique), `isEnabled` |
| `Institution` | `branchId`, `name`, `phone`, `address`, `status`, `memo` |
| `SaleOrder` | `institutionId`, `programId`, `issueNumber`, `orderDate`(YYYY-MM-DD), `quantity` — unique(institutionId, programId, issueNumber, orderDate) |
| `SalesTarget` | `branchId`, `programId`, `year`, `quantity` — unique(branchId, programId, year) |
| `OnlyOneContract` | `institutionId`, `classCount`, `startDate`(YYYY-MM-DD), `endDate`(nullable) — 기간 계약 |
| `OnlyOneTarget` | `branchId`, `year`, `classCount` — unique(branchId, year) |
| `ErpSkipRule` | `keyword1`, `keyword2`(nullable) — 품목명 제외 규칙 |
| `ErpProductMapping` | `productName`(unique), `programId`, `issueNumber` — 품목명 자동 매핑 |
| `User` | `email`(unique), `password`, `name`, `role`(admin/user) |

## 주요 유틸 함수 (`src/lib/month.ts`)

- `getCurrentFiscalYear()` — 현재 회계연도 (3월 기준)
- `getFiscalYearRange(year)` — `{ gte, lt }` (YYYY-03-01 ~ 다음해 YYYY-03-01)
- `getCurrentFiscalIssue()` — 현재 호 번호 (1~12)
- `getCurrentYearMonth()` — "YYYY-MM"
- `getFiscalYearFromDate(date)` — 날짜로부터 회계연도 계산

## 엑셀 업로드 공통 패턴

모든 업로드 라우트는 `src/lib/excel-reader.ts`의 `prepareExcelBuffer(buffer, password?)` 를 사용해 비밀번호 보호 파일을 복호화한 후 `xlsx`로 파싱한다.

```ts
const password = typeof formData.get("password") === "string" ... // optional
const buffer = await prepareExcelBuffer(rawBuffer, password);
const wb = XLSX.read(buffer, { type: "buffer" });
```

UI에서는 파일 input 옆에 `name="password"` 입력 필드를 배치한다.

## ERP 업로드 로직

1. 거래처명 → `Branch.name` 또는 `BranchAlias.name`으로 지사 매핑 (`㈜` → `(주)` 정규화 적용)
2. 배송처명 → `Institution.name`으로 기관 매핑 (없으면 신규 등록)
3. 품목명 → `ErpProductMapping` 저장 매핑 → 없으면 `Program.matchKeyword`로 자동 매핑
4. `ErpSkipRule`에 해당하는 품목명은 건너뜀
5. 미매핑 항목은 `unresolved`로 반환 → UI에서 수동 지정 후 재전송

## Next.js 16 — 반드시 알아야 할 Breaking Changes

### 1. Async Request APIs (가장 중요)

`cookies()`, `headers()`, `params`, `searchParams`는 **모두 async**.

```ts
// ✅ v16 방식
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
}
```

### 2. Turbopack 기본값 (이 프로젝트는 Webpack 유지)

`--webpack` 플래그 제거 금지.

### 3. `next lint` 명령 제거

`npx eslint .` 또는 `npm run lint` 사용.

### 4. Server Actions 파일 구조

Client Component에서 Server Action을 쓰려면 별도 파일에 `'use server'` 선언 필요.

## 코드 컨벤션

- **Server Component 우선** — `'use client'`는 인터랙션·hooks·recharts 등 필요한 경우만
- **Prisma 쿼리는 Server Component / Server Action에서만** — Client Component에서 직접 Prisma 접근 금지
- **`src/lib/prisma.ts`의 싱글톤** 사용 (`import { prisma } from '@/lib/prisma'`)
- **스타일**: Tailwind CSS 4만 사용
- **판매권한 필터**: 목표·실적 집계 시 `BranchProgramPermission.isEnabled = true` 확인 필수
- **온리원 제외**: 일반 프로그램 쿼리 시 `where: { isOnlyOne: false }` 추가

## 주의사항

- `next.config.ts`에 `serverExternalPackages: ["office-crypto"]` 설정 — ESM 전용 패키지를 webpack이 번들링하지 않도록 외부 처리
- ERP 거래처명 정규화: `㈜` → `(주)`, `㈔` → `(사)` (`normalizeName` 함수 적용)
- 온리원 SaleOrder가 DB에 남아 있더라도 집계 시 `isOnlyOne: false` 필터로 이중 집계 방지
- 판매 현황 `viewOnlyOneContracts`는 회계연도 내 겹치는 계약 전체 조회 (활성 여부는 클라이언트에서 월별 필터)
