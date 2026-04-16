# 본사 지사 관리 시스템 — Claude Code 가이드

## 프로젝트 개요

본사에서 지사들의 프로그램 판매권한과 판매부수를 관리하는 내부 전용 웹 앱 (MVP).

- **기술 스택**: Next.js 16 (App Router, TypeScript) · Prisma 6 + SQLite · React 19.2 · Tailwind CSS 4 · recharts · xlsx
- **DB**: `prisma/dev.db` (절대경로 `C:/dev/jisa/prisma/dev.db` — schema.prisma에 하드코딩)
- **빌드 출력**: `.next-jisa/` (next.config.ts의 `distDir` 커스텀)

## 개발 환경

```bash
npm run dev        # 개발 서버 (--webpack 플래그로 Turbopack 아닌 Webpack 사용)
npm run build      # 프로덕션 빌드 (--webpack)
npm run db:push    # Prisma 스키마 → DB 동기화
npm run db:seed    # 시드 데이터 삽입
```

> **주의**: 이 프로젝트는 `--webpack` 플래그로 실행한다. Next.js 16은 기본이 Turbopack이지만 이 프로젝트는 Webpack을 명시적으로 사용한다.

## 파일 구조

```
src/
  app/
    page.tsx                        # 대시보드
    layout.tsx                      # 루트 레이아웃
    branches/
      page.tsx                      # 지사 목록 (검색/필터/정렬)
      actions.ts                    # Server Actions
      new/page.tsx                  # 지사 등록
      [id]/page.tsx                 # 지사 상세/수정
      [id]/actions.ts               # 지사 수정용 Server Actions
    permissions/
      page.tsx                      # 판매권한 매트릭스
      upload-client.tsx             # 엑셀 업로드 Client Component
    sales/
      page.tsx                      # 판매부수 현황
      upload-client.tsx             # 엑셀 업로드 Client Component
    api/
      permissions/excel/preview/    # 권한 엑셀 미리보기
      permissions/excel/apply/      # 권한 엑셀 적용
      sales/excel/preview/          # 판매부수 엑셀 미리보기
      sales/excel/apply/            # 판매부수 엑셀 적용
      sales/excel/download/         # 판매부수 엑셀 다운로드
  components/
    nav.tsx                         # 사이드바 네비게이션 (Client Component)
    dashboard-charts.tsx            # recharts 차트 (Client Component)
  lib/
    prisma.ts                       # Prisma 클라이언트 싱글톤
    month.ts                        # 연월 유틸 함수
prisma/
  schema.prisma                     # DB 스키마
  seed.js                           # 시드 데이터
  dev.db                            # SQLite DB 파일
```

## DB 모델

| 모델 | 주요 필드 |
|------|-----------|
| `Branch` | `branchCode`(unique), `name`, `region`, `status`(active/inactive), `managerName`, `phone`, `memo` |
| `Program` | `name` — 초기 8개 고정 (프로그램 1~8) |
| `BranchProgramPermission` | `branchId` + `programId` (unique), `isEnabled` |
| `Sale` | `branchId` + `yearMonth`(YYYY-MM) + `programId` (unique), `quantity` |

## Next.js 16 — 반드시 알아야 할 Breaking Changes

코드 작성 전 반드시 확인. 상세 내용: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

### 1. Async Request APIs (가장 중요)

`cookies()`, `headers()`, `draftMode()`, `params`, `searchParams`는 **모두 async**다. 동기 접근은 v16에서 완전 제거됨.

```ts
// ❌ 틀림 (v15 이하 방식)
export default function Page({ params }) {
  const { id } = params
}

// ✅ 맞음 (v16)
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
}
```

이 프로젝트의 `branches/page.tsx`, `branches/[id]/page.tsx`는 이미 `await searchParams` 패턴을 사용하고 있다.

### 2. Turbopack 기본값 (이 프로젝트는 Webpack 유지)

v16부터 `next dev` / `next build`는 Turbopack이 기본. 이 프로젝트는 `--webpack` 플래그로 Webpack을 명시 사용. **스크립트에서 `--webpack` 플래그를 제거하지 말 것.**

### 3. `middleware` → `proxy` 파일명 변경

미들웨어 파일명이 `middleware.ts` → `proxy.ts`, export도 `middleware` → `proxy`로 변경. (이 프로젝트는 현재 미사용)

### 4. `next lint` 명령 제거

`next lint`가 제거됨. ESLint CLI 직접 사용: `npx eslint .` 또는 `npm run lint`.

### 5. Server Actions에서 데이터 갱신

`revalidatePath`를 사용하거나, 즉각 반영이 필요하면 `refresh()` (from `next/cache`) 사용.

```ts
import { revalidatePath } from 'next/cache'
// 또는 즉각 반영:
import { refresh } from 'next/cache'
```

### 6. `revalidateTag` 시그니처 변경

두 번째 인자(cacheLife 프로필)가 필수: `revalidateTag('tag', 'max')`. 단일 인자는 deprecated.

### 7. Server Actions 파일 구조

Client Component에서 Server Action을 쓰려면 별도 파일에 `'use server'` 선언 필요.

```ts
// actions.ts
'use server'
export async function myAction() { ... }
```

## 코드 컨벤션

- **Server Component 우선** — `'use client'`는 꼭 필요한 경우만 (인터랙션, hooks, recharts 등)
- **Prisma 쿼리는 Server Component / Server Action에서만** — Client Component에서 직접 Prisma 접근 금지
- **`src/lib/prisma.ts`의 싱글톤 인스턴스** 사용 (`import { prisma } from '@/lib/prisma'`)
- **연월 유틸**: `getCurrentYearMonth()`, `getPreviousYearMonth()`, `getRecentMonths()` — `src/lib/month.ts`
- **스타일**: Tailwind CSS 4만 사용. 인라인 스타일은 폰트 설정 등 최소한으로만

## 주의사항

- DB 절대경로(`C:/dev/jisa/prisma/dev.db`)는 `schema.prisma`에 하드코딩되어 있음 — 환경 이전 시 수정 필요
- `distDir: '.next-jisa'`로 빌드 출력 경로가 커스텀되어 있음
- `dev.db`는 git에 포함하지 않음 (로컬 개발용 SQLite)
