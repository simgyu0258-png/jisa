export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">이용 가이드</h1>
        <p className="mt-1 text-sm text-slate-500">지사 관리 시스템의 주요 기능을 안내합니다.</p>
      </div>

      <Section title="자료 업데이트 (ERP 파일 업로드)">
        <Steps>
          <Step n={1} title="ERP에서 파일 다운로드">
            ERP 시스템에서 판매 내역을 엑셀 파일로 다운로드합니다.
          </Step>
          <Step n={2} title="시스템 &gt; 자료 업데이트 이동">
            좌측 메뉴에서 <b>시스템 → 자료 업데이트</b>로 이동합니다.
          </Step>
          <Step n={3} title="파일 업로드 및 미리보기">
            파일을 선택하고 <b>미리보기</b> 버튼을 클릭합니다. 자동으로 지사·기관·프로그램·호수가 매핑되며, 인식되지 않은 품목명은 별도 표시됩니다.
          </Step>
          <Step n={4} title="미매핑 항목 처리">
            자동 인식에 실패한 품목이 있으면 프로그램과 호수를 직접 지정합니다. 한 번 지정하면 다음 업로드부터는 자동으로 처리됩니다.
          </Step>
          <Step n={5} title="적용">
            <b>적용</b> 버튼을 클릭하면 데이터가 등록됩니다. 동일 기관·프로그램·호·주문일의 수량은 최신 자료로 교체됩니다.
          </Step>
        </Steps>
      </Section>

      <Section title="판매 현황">
        <p className="text-sm text-slate-600 mb-3">좌측 메뉴 <b>판매 → 판매 현황</b>에서 확인합니다.</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li><b>월별 현황</b>: 지사별 월별 판매부수. 숫자 클릭 시 기관·프로그램별 상세 내역 확인 가능.</li>
          <li><b>호별 현황</b>: 지사별 호별 판매부수.</li>
          <li><b>목표 현황</b>: 지사별 프로그램·온리원 목표 대비 실적 및 달성률.</li>
          <li><b>기관 현황</b>: 특정 지사의 기관별 주문 여부 확인. 미주문 기관만 필터링 가능.</li>
        </ul>
      </Section>

      <Section title="온리원 현황">
        <p className="text-sm text-slate-600 mb-3">좌측 메뉴 <b>판매 → 온리원 현황</b>에서 확인합니다.</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>온리원키즈포스쿨은 클래스 단위 연간 계약으로 관리됩니다.</li>
          <li>지사명 클릭 시 해당 지사의 기관별 계약 현황과 이력을 확인할 수 있습니다.</li>
          <li><b>일괄등록</b> 버튼으로 엑셀 양식을 다운로드 후 계약 내역을 일괄 등록할 수 있습니다.</li>
          <li>계약 클래스 수가 변경되면 새 건으로 추가하고, 해지 시 종료일을 입력합니다.</li>
        </ul>
      </Section>

      <Section title="목표 관리">
        <p className="text-sm text-slate-600 mb-3">좌측 메뉴 <b>지사 → 목표 관리</b>에서 설정합니다.</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>연도별로 지사·프로그램별 판매 목표를 입력합니다.</li>
          <li>온리원 목표는 별도 컬럼에서 클래스 수로 입력합니다.</li>
          <li>전년도 목표 대비 증감이 화살표로 표시됩니다.</li>
          <li>입력 후 우측 상단 <b>저장</b> 버튼을 클릭합니다.</li>
        </ul>
      </Section>

      <Section title="지사·기관 관리">
        <p className="text-sm text-slate-600 mb-3">좌측 메뉴 <b>지사 → 지사 관리</b>에서 관리합니다.</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>지사 목록에서 지사명을 클릭하면 기본 정보 수정 및 판매권한 관리가 가능합니다.</li>
          <li><b>사업자명 별칭</b>: 지사가 ERP에서 다른 사업자명을 사용할 경우 별칭을 등록하면 자동 매핑됩니다.</li>
          <li><b>일괄 등록</b>: 엑셀 양식으로 여러 지사를 한 번에 등록할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="ERP 규칙 관리">
        <p className="text-sm text-slate-600 mb-3">좌측 메뉴 <b>시스템 → ERP 규칙 관리</b>에서 설정합니다.</p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li><b>제외 규칙</b>: 업로드 시 건너뛸 품목명 키워드를 등록합니다. 두 키워드를 모두 포함할 때만 제외하는 AND 조건도 설정 가능합니다.</li>
          <li><b>자동 매핑 기준</b>: 품목명에서 프로그램을 인식하는 키워드를 확인하고 수정합니다.</li>
          <li><b>품목명 매핑</b>: 자동 인식에 실패한 품목명을 수동 지정한 매핑 목록입니다. 잘못된 매핑은 수정하거나 삭제할 수 있습니다.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-3">{children}</ol>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-slate-600">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{n}</span>
      <div><b className="text-slate-800">{title}</b><br />{children}</div>
    </li>
  );
}
