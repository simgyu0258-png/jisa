const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const branches = [
  { code: "JS001", name: "서울중앙지사", region: "서울", manager: "김민수", phone: "02-100-0001" },
  { code: "JS002", name: "부산지사", region: "부산", manager: "박지연", phone: "051-100-0002" },
  { code: "JS003", name: "대구지사", region: "대구", manager: "이도현", phone: "053-100-0003" },
  { code: "JS004", name: "인천지사", region: "인천", manager: "최수빈", phone: "032-100-0004" },
  { code: "JS005", name: "광주지사", region: "광주", manager: "정하늘", phone: "062-100-0005" },
  { code: "JS006", name: "대전지사", region: "대전", manager: "윤서준", phone: "042-100-0006" },
  { code: "JS007", name: "울산지사", region: "울산", manager: "한예린", phone: "052-100-0007" },
  { code: "JS008", name: "수원지사", region: "경기", manager: "오지훈", phone: "031-100-0008" },
  { code: "JS009", name: "춘천지사", region: "강원", manager: "신가은", phone: "033-100-0009", status: "inactive" },
  { code: "JS010", name: "제주지사", region: "제주", manager: "강태윤", phone: "064-100-0010" },
];

const programDefs = [
  { name: "프로그램 A", totalIssues: 12 },
  { name: "프로그램 B", totalIssues: 12 },
  { name: "프로그램 C", totalIssues: 6 },
  { name: "프로그램 D", totalIssues: 6 },
  { name: "프로그램 E", totalIssues: 12 },
  { name: "프로그램 F", totalIssues: 12 },
  { name: "프로그램 G", totalIssues: 6 },
  { name: "프로그램 H", totalIssues: 6 },
];

const institutionNames = [
  ["한빛초등학교", "푸른초등학교", "별빛초등학교"],
  ["해운대초등학교", "동래초등학교"],
  ["달성초등학교", "수성초등학교", "대명초등학교"],
  ["연수초등학교", "청라초등학교"],
  ["상무초등학교", "송정초등학교"],
  ["둔산초등학교", "유성초등학교", "도안초등학교"],
  ["남구초등학교", "동구초등학교"],
  ["매탄초등학교", "영통초등학교", "광교초등학교"],
  ["춘천초등학교"],
  ["제주중앙초등학교", "서귀포초등학교"],
];

function getRecentMonths(count) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

async function main() {
  console.log("시드 시작...");

  // 프로그램 생성
  const programs = [];
  for (let i = 0; i < programDefs.length; i++) {
    const p = await prisma.program.upsert({
      where: { id: i + 1 },
      update: { name: programDefs[i].name, totalIssues: programDefs[i].totalIssues },
      create: { id: i + 1, name: programDefs[i].name, totalIssues: programDefs[i].totalIssues },
    });
    programs.push(p);
  }
  console.log(`프로그램 ${programs.length}개 완료`);

  const recentMonths = getRecentMonths(12);
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 지사, 기관, 판매권한, 주문 생성
  for (let bi = 0; bi < branches.length; bi++) {
    const b = branches[bi];
    const branch = await prisma.branch.upsert({
      where: { branchCode: b.code },
      update: { name: b.name, region: b.region, managerName: b.manager, phone: b.phone, status: b.status ?? "active" },
      create: { branchCode: b.code, name: b.name, region: b.region, status: b.status ?? "active", managerName: b.manager, phone: b.phone },
    });

    // 판매권한 (지사마다 일부 프로그램)
    const enabledProgramIds = programs.filter((_, pi) => (bi + pi) % 3 !== 0).map((p) => p.id);
    for (const prog of programs) {
      await prisma.branchProgramPermission.upsert({
        where: { branchId_programId: { branchId: branch.id, programId: prog.id } },
        update: { isEnabled: enabledProgramIds.includes(prog.id) },
        create: { branchId: branch.id, programId: prog.id, isEnabled: enabledProgramIds.includes(prog.id) },
      });
    }

    // 기관 생성
    const instNames = institutionNames[bi] ?? ["샘플기관"];
    const institutions = [];
    for (const instName of instNames) {
      const inst = await prisma.institution.upsert({
        where: { id: (await prisma.institution.findFirst({ where: { branchId: branch.id, name: instName } }))?.id ?? 0 },
        update: {},
        create: { branchId: branch.id, name: instName, phone: `0${bi + 2}0-${1000 + bi}-${Math.floor(Math.random() * 9000 + 1000)}` },
      }).catch(async () => {
        // upsert 실패시 findFirst
        const existing = await prisma.institution.findFirst({ where: { branchId: branch.id, name: instName } });
        return existing ?? await prisma.institution.create({ data: { branchId: branch.id, name: instName } });
      });
      institutions.push(inst);
    }

    // 주문 데이터 생성 (활성 지사만)
    if (b.status !== "inactive") {
      for (const inst of institutions) {
        for (const prog of programs.filter((p) => enabledProgramIds.includes(p.id))) {
          for (let issue = 1; issue <= prog.totalIssues; issue++) {
            // 각 호에 대해 무작위 주문 (70% 확률)
            if (Math.random() < 0.7) {
              const monthIdx = Math.floor(Math.random() * recentMonths.length);
              const ym = recentMonths[monthIdx];
              const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
              const orderDate = `${ym}-${day}`;
              const quantity = Math.floor(Math.random() * 50) + 5;

              await prisma.saleOrder.upsert({
                where: { institutionId_programId_issueNumber: { institutionId: inst.id, programId: prog.id, issueNumber: issue } },
                update: { orderDate, quantity },
                create: { institutionId: inst.id, programId: prog.id, issueNumber: issue, orderDate, quantity },
              });
            }
          }
        }
      }
    }

    console.log(`지사 [${b.name}] 완료 (기관 ${institutions.length}개)`);
  }

  console.log("시드 완료!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
