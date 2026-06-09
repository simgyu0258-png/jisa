"use client";

import { useState } from "react";

type Tab = "dashboard" | "sales" | "onlyone" | "target" | "branch" | "upload" | "erp-rules";

const tabs: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "대시보드" },
  { key: "sales", label: "판매 현황" },
  { key: "onlyone", label: "온리원 현황" },
  { key: "target", label: "목표 관리" },
  { key: "branch", label: "지사 관리" },
  { key: "upload", label: "자료 업데이트" },
  { key: "erp-rules", label: "ERP 규칙 관리" },
];

export function GuideClient() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">이용 가이드</h1>
        <p className="mt-1 text-sm text-slate-500">메뉴별 기능과 사용 방법을 안내합니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="max-w-3xl space-y-6">
        {tab === "dashboard" && <DashboardGuide />}
        {tab === "sales" && <SalesGuide />}
        {tab === "onlyone" && <OnlyOneGuide />}
        {tab === "target" && <TargetGuide />}
        {tab === "branch" && <BranchGuide />}
        {tab === "upload" && <UploadGuide />}
        {tab === "erp-rules" && <ErpRulesGuide />}
      </div>
    </div>
  );
}

/* ────────── 공통 컴포넌트 ────────── */

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-800 border-b border-slate-200 pb-2">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700 mt-4 mb-1">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{children}</p>;
}

function Ul({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ steps }: { steps: { title: string; desc: React.ReactNode }[] }) {
  return (
    <ol className="mt-2 space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-600">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
          <div><b className="text-slate-800">{s.title}</b><br />{s.desc}</div>
        </li>
      ))}
    </ol>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-slate-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────── 탭별 내용 ────────── */

function DashboardGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>대시보드</H2>
        <P>로그인 후 첫 화면으로, 전체 판매 현황을 한눈에 파악할 수 있습니다.</P>
      </section>
      <section>
        <H3>목표 달성 현황</H3>
        <P>올해 목표가 설정된 경우 상단에 전체 합계, 연간 누계 실적, 달성률이 표시됩니다. 달성률 상위·하위 지사 순위도 함께 보여줍니다.</P>
      </section>
      <section>
        <H3>월 현황 / 호 현황</H3>
        <P>탭을 전환해 이번 달 판매부수와 현재 호 판매부수를 확인할 수 있습니다.</P>
        <Ul items={[
          "이번 달 총 판매 부수",
          "전월 대비 증감률",
          "전년 동월(동호) 대비 증감률",
        ]} />
      </section>
      <section>
        <H3>판매 추이 차트</H3>
        <P>최근 12개월 월별 판매 추이, 프로그램별 이번 달 판매 현황, 호별 누적 판매 현황을 차트로 확인할 수 있습니다.</P>
      </section>
    </div>
  );
}

function SalesGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>판매 현황</H2>
        <P>지사별·기관별 판매부수를 조회하고 관리합니다. 상단에서 지사와 연도를 선택해 필터링할 수 있습니다.</P>
      </section>
      <section>
        <H3>월별 현황</H3>
        <P>지사별로 월별 판매부수를 표시합니다. 셀의 숫자를 클릭하면 해당 지사의 기관·프로그램별 상세 내역을 확인할 수 있습니다.</P>
      </section>
      <section>
        <H3>호별 현황</H3>
        <P>지사별로 호별 판매부수를 표시합니다. 셀 클릭 시 기관·프로그램별 상세 내역을 확인할 수 있습니다.</P>
      </section>
      <section>
        <H3>목표 현황</H3>
        <P>지사별 프로그램 목표 대비 실적과 달성률을 표시합니다. 온리원 현황은 별도 컬럼으로 구분됩니다. 판매권한이 없는 프로그램 셀은 비어있습니다.</P>
      </section>
      <section>
        <H3>기관 현황</H3>
        <P>특정 지사를 선택하면 소속 기관별로 호별 주문 여부를 확인할 수 있습니다.</P>
        <Ul items={[
          "✕ 표시: 해당 호에 주문이 없는 기관",
          "음수(주황색) 표시: 반품이 등록된 경우",
          "미주문 기관만 보기 필터로 미주문 기관만 추출 가능",
          "기관명 클릭 시 프로그램별 호별 상세 현황 확인",
          "프로그램 필터로 특정 프로그램의 주문 현황만 조회 가능",
        ]} />
      </section>
      <section>
        <H3>판매부수 입력</H3>
        <P>우측 상단 <b>판매부수 입력</b> 버튼으로 개별 주문을 직접 등록할 수 있습니다. 대량 등록은 자료 업데이트(ERP 업로드)를 이용하세요.</P>
      </section>
      <section>
        <H3>엑셀 다운로드</H3>
        <P>현재 선택한 연도·지사 기준으로 상세 자료를 엑셀로 다운로드할 수 있습니다. 시트 1은 기관별 호별 판매부수, 시트 2는 지사·프로그램별 요약입니다.</P>
      </section>
    </div>
  );
}

function OnlyOneGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>온리원 현황</H2>
        <P>온리원키즈포스쿨은 클래스 단위 연간 계약으로 관리됩니다. 판매권한이 활성화된 지사만 표시됩니다.</P>
      </section>
      <section>
        <H3>화면 구성</H3>
        <Ul items={[
          "전체 목표·계약 클래스 수·달성률 요약 카드",
          "지사별 목표 / 계약 / 달성률 테이블",
          "지사명 클릭 → 해당 지사의 기관별 계약 현황 및 이력 확인",
        ]} />
      </section>
      <section>
        <H3>데이터 입력 방법 (일괄등록)</H3>
        <Steps steps={[
          { title: "양식 다운로드", desc: "우측 상단 일괄등록 버튼 클릭 후 양식 다운로드를 클릭합니다." },
          { title: "양식 작성", desc: "지사명, 기관명, 클래스 수, 시작일, 종료일을 입력합니다. 계약 건별로 한 행씩 입력합니다." },
          { title: "업로드 및 미리보기", desc: "파일을 선택하고 미리보기를 클릭해 내용을 확인합니다." },
          { title: "적용", desc: "적용 버튼을 클릭하면 등록됩니다." },
        ]} />
        <H3>양식 예시</H3>
        <Table
          headers={["지사명", "기관명", "클래스 수", "시작일", "종료일"]}
          rows={[
            ["서울지사", "OO초등학교", "3", "2025-03-01", ""],
            ["서울지사", "OO초등학교", "2", "2025-09-01", ""],
            ["서울지사", "XX학원", "5", "2025-03-01", "2025-08-31"],
          ]}
        />
      </section>
      <section>
        <H3>계약 관리 규칙</H3>
        <Ul items={[
          "같은 기관에 클래스가 추가되면 새 행으로 입력합니다. 활성 계약의 클래스 수가 합산됩니다.",
          "종료일이 비어있으면 현재 진행 중인 계약으로 처리됩니다.",
          "해지 시 해당 행의 종료일에 해지일을 입력합니다.",
          "같은 날 해지하는 계약이 여러 건이면 동일한 종료일을 입력합니다.",
        ]} />
      </section>
      <section>
        <H3>활성 계약 판단 기준</H3>
        <P>선택한 회계연도 기준으로 아래 두 조건을 모두 만족하는 계약이 집계됩니다.</P>
        <Ul items={[
          "시작일이 회계연도 종료일 이전",
          "종료일이 없거나, 종료일이 회계연도 시작일 이후",
        ]} />
        <Callout>예: 2026년(2026-03 ~ 2027-02) 기준 → 2026-09-01 시작, 종료일 없음 → 활성 / 2025-03-01 시작, 2025-08-31 종료 → 미포함</Callout>
      </section>
      <section>
        <H3>이력 확인</H3>
        <P>지사명 클릭 시 모달에서 기관별 모든 계약 건을 시간순으로 확인할 수 있습니다. 종료된 계약은 흐리게 표시됩니다.</P>
      </section>
    </div>
  );
}

function TargetGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>목표 관리</H2>
        <P>연도별로 지사·프로그램별 판매 목표를 입력합니다. 입력 후 반드시 <b>저장</b> 버튼을 클릭해야 반영됩니다.</P>
      </section>
      <section>
        <H3>목표 입력</H3>
        <Ul items={[
          "각 셀에 목표 판매부수를 숫자로 입력합니다.",
          "판매권한이 없는 프로그램 셀은 비어있으며 입력할 수 없습니다.",
          "온리원 목표는 별도 컬럼에서 클래스 수로 입력합니다.",
        ]} />
      </section>
      <section>
        <H3>전년도 대비 증감</H3>
        <P>전년도 목표가 있는 경우 입력값 아래에 증감이 표시됩니다.</P>
        <Ul items={[
          "▲ 숫자: 전년 대비 증가",
          "▼ 숫자: 전년 대비 감소",
          "—: 전년과 동일",
        ]} />
      </section>
      <section>
        <H3>연도 조회</H3>
        <P>우측 상단에서 연도를 선택하고 <b>조회</b> 버튼을 클릭하면 해당 연도의 목표를 불러옵니다. 회계연도 기준(3월 ~ 다음해 2월)으로 관리됩니다.</P>
      </section>
    </div>
  );
}

function BranchGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>지사 관리</H2>
        <P>지사 기본 정보, 판매권한, 사업자명 별칭을 관리합니다.</P>
      </section>
      <section>
        <H3>지사 목록</H3>
        <Ul items={[
          "지사명, 지역, 상태(활성/비활성), 담당자 등을 한눈에 확인할 수 있습니다.",
          "검색창에서 지사명, 담당자 등으로 검색 가능합니다.",
          "지사명 클릭 시 상세 페이지로 이동합니다.",
        ]} />
      </section>
      <section>
        <H3>지사 상세 — 기본 정보</H3>
        <P>지사명, 지역, 담당자, 연락처, 주소, 상태, 메모를 수정하고 저장합니다.</P>
      </section>
      <section>
        <H3>지사 상세 — 사업자명 별칭</H3>
        <P>ERP 파일에서 거래처명이 지사명과 다르게 등록된 경우 별칭을 등록합니다. 등록된 별칭은 ERP 업로드 시 해당 지사로 자동 매핑됩니다.</P>
        <Callout>예: "서울지사"로 등록됐지만 ERP에서는 "서울교육주식회사"로 표기되는 경우 → 별칭에 "서울교육주식회사" 추가</Callout>
      </section>
      <section>
        <H3>지사 상세 — 판매권한 관리</H3>
        <P>해당 지사가 판매할 수 있는 프로그램을 설정합니다. 권한이 없는 프로그램은 목표 현황에서 제외됩니다.</P>
      </section>
      <section>
        <H3>판매권한 조회</H3>
        <P>전체 지사의 프로그램별 판매권한을 매트릭스 형태로 확인할 수 있습니다.</P>
      </section>
      <section>
        <H3>일괄 등록</H3>
        <Steps steps={[
          { title: "양식 다운로드", desc: "지사 목록 페이지 우측 상단 일괄 등록 버튼에서 양식을 다운로드합니다." },
          { title: "양식 작성", desc: "지사명(필수), 별칭, 지역, 담당자, 연락처 등을 입력합니다. 별칭이 있는 경우 지사명과 별칭을 함께 입력한 행을 추가합니다." },
          { title: "업로드 및 적용", desc: "파일을 업로드하고 미리보기 확인 후 등록 버튼을 클릭합니다." },
        ]} />
      </section>
    </div>
  );
}

function UploadGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>자료 업데이트 (ERP 파일 업로드)</H2>
        <P>ERP에서 다운로드한 판매 내역 파일을 그대로 업로드하면 자동으로 처리됩니다.</P>
      </section>
      <section>
        <H3>업로드 흐름</H3>
        <Steps steps={[
          { title: "ERP에서 파일 다운로드", desc: "ERP 시스템에서 판매 내역을 엑셀 파일로 다운로드합니다." },
          { title: "시스템 > 자료 업데이트 이동", desc: "좌측 메뉴에서 시스템 → 자료 업데이트로 이동합니다." },
          { title: "파일 선택 후 미리보기", desc: "파일을 선택하고 미리보기 버튼을 클릭합니다. 지사·기관·프로그램·호수가 자동으로 매핑됩니다." },
          { title: "미리보기 카테고리 확인", desc: "유효·건너뜀·오류·미매핑·반품 카테고리 칩이 표시됩니다. 각 칩을 클릭하면 해당 항목의 상세 내역을 펼쳐볼 수 있습니다." },
          { title: "미매핑 항목 처리", desc: "자동 인식에 실패한 품목은 미매핑 카테고리에 표시됩니다. 각 행에서 프로그램과 호수를 직접 지정합니다." },
          { title: "반품 처리", desc: "반품(음수 수량) 항목이 있으면 반품 카테고리에 별도 표시됩니다. 귀속 회계연도를 확인하고 필요 시 수정합니다. 자동계산 버튼으로 전체 일괄 적용도 가능합니다." },
          { title: "적용", desc: "적용 버튼을 클릭하면 데이터가 등록됩니다. 동일 기관·프로그램·호·주문일의 수량은 최신 자료로 교체됩니다." },
        ]} />
      </section>
      <section>
        <H3>미매핑 항목</H3>
        <P>한 번 수동 지정하면 해당 품목명이 매핑 목록에 저장되어 다음 업로드부터 자동으로 처리됩니다. 잘못 지정된 경우 ERP 규칙 관리 → 품목명 매핑에서 수정할 수 있습니다.</P>
      </section>
      <section>
        <H3>반품 귀속 연도</H3>
        <P>반품은 원래 구매가 이루어진 회계연도에 귀속시켜야 합니다. 시스템이 품목의 호수와 주문일을 기준으로 귀속 연도를 자동 계산하며, 전체 자동계산 적용 버튼으로 일괄 적용할 수 있습니다. 필요한 경우 행별로 연도를 직접 선택할 수 있습니다.</P>
        <Callout>예: 2026년 3월에 업로드된 파일에 11호(1월) 반품이 있다면 → 2025년도(2025-03 ~ 2026-02)로 자동 귀속됩니다.</Callout>
      </section>
      <section>
        <H3>자동 제외 항목</H3>
        <P>제외 규칙에 등록된 키워드를 포함한 품목은 자동으로 건너뜁니다. 기본으로 워크북, 꼬모아르떼+바인더 조합이 등록되어 있습니다.</P>
      </section>
      <section>
        <H3>신규 기관 자동 등록</H3>
        <P>ERP 파일의 배송처명이 시스템에 없는 경우 신규 기관으로 자동 등록됩니다. 미리보기에서 <b>신규</b> 배지로 표시됩니다.</P>
      </section>
    </div>
  );
}

function ErpRulesGuide() {
  return (
    <div className="space-y-5">
      <section>
        <H2>ERP 규칙 관리</H2>
        <P>ERP 업로드 시 적용되는 규칙을 관리합니다. 품목명 형식이 바뀌거나 새로운 제외 조건이 생겼을 때 코드 수정 없이 여기서 변경합니다.</P>
      </section>
      <section>
        <H3>제외 규칙</H3>
        <P>업로드 시 건너뛸 품목명 조건을 등록합니다.</P>
        <Ul items={[
          "키워드1만 입력: 해당 문자열이 포함된 품목 전체 제외",
          "키워드1 + 키워드2 입력: 두 문자열이 모두 포함된 경우에만 제외",
        ]} />
        <Table
          headers={["키워드1", "키워드2", "설명"]}
          rows={[
            ["워크북", "", "품목명에 '워크북'이 포함되면 제외"],
            ["꼬모아르떼", "바인더", "두 단어 모두 포함된 경우만 제외"],
          ]}
        />
      </section>
      <section>
        <H3>자동 매핑 기준</H3>
        <P>품목명에서 프로그램을 자동으로 인식하는 키워드를 확인하고 수정합니다. 키워드가 비어있으면 프로그램명을 그대로 키워드로 사용합니다.</P>
        <Callout>예: ERP 품목명이 "누뿔"에서 "NP"로 변경된 경우 → 누뿔 프로그램의 키워드를 "NP"로 수정</Callout>
      </section>
      <section>
        <H3>품목명 매핑</H3>
        <P>자동 인식에 실패해 수동으로 지정한 품목명 매핑 목록입니다.</P>
        <Ul items={[
          "잘못 지정된 매핑은 수정 버튼으로 프로그램·호수를 변경할 수 있습니다.",
          "더 이상 사용하지 않는 매핑은 삭제합니다.",
          "새로운 매핑은 자료 업데이트 업로드 시 미매핑 항목을 지정하면 자동으로 추가됩니다.",
        ]} />
      </section>
    </div>
  );
}
