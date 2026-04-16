const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sampleBranches = [
  { code: "BR001", name: "서울중앙지사", region: "서울", status: "active", manager: "김민수", phone: "02-100-0001" },
  { code: "BR002", name: "부산지사", region: "부산", status: "active", manager: "박지연", phone: "051-100-0002" },
  { code: "BR003", name: "대구지사", region: "대구", status: "active", manager: "이도현", phone: "053-100-0003" },
  { code: "BR004", name: "인천지사", region: "인천", status: "active", manager: "최수빈", phone: "032-100-0004" },
  { code: "BR005", name: "광주지사", region: "광주", status: "active", manager: "정하늘", phone: "062-100-0005" },
  { code: "BR006", name: "대전지사", region: "대전", status: "active", manager: "윤서준", phone: "042-100-0006" },
  { code: "BR007", name: "울산지사", region: "울산", status: "active", manager: "한예린", phone: "052-100-0007" },
  { code: "BR008", name: "수원지사", region: "경기", status: "active", manager: "오지훈", phone: "031-100-0008" },
  { code: "BR009", name: "춘천지사", region: "강원", status: "inactive", manager: "신가은", phone: "033-100-0009" },
  { code: "BR010", name: "제주지사", region: "제주", status: "active", manager: "강태윤", phone: "064-100-0010" },
];

function getRecentMonths(count) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }
  return months;
}

async function main() {
  for (let i = 1; i <= 8; i += 1) {
    await prisma.program.upsert({
      where: { id: i },
      update: { name: `프로그램 ${i}` },
      create: { id: i, name: `프로그램 ${i}` },
    });
  }

  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });
  const months = getRecentMonths(12);

  for (let branchIndex = 0; branchIndex < sampleBranches.length; branchIndex += 1) {
    const item = sampleBranches[branchIndex];

    const branch = await prisma.branch.upsert({
      where: { branchCode: item.code },
      update: {
        name: item.name,
        region: item.region,
        status: item.status,
        managerName: item.manager,
        phone: item.phone,
        memo: "자동 생성된 샘플 지사 데이터입니다.",
      },
      create: {
        branchCode: item.code,
        name: item.name,
        region: item.region,
        status: item.status,
        managerName: item.manager,
        phone: item.phone,
        memo: "자동 생성된 샘플 지사 데이터입니다.",
      },
    });

    await prisma.branchProgramPermission.deleteMany({
      where: { branchId: branch.id },
    });

    await prisma.branchProgramPermission.createMany({
      data: programs.map((program) => ({
        branchId: branch.id,
        programId: program.id,
        isEnabled: (branchIndex + program.id) % 3 !== 0,
      })),
    });

    await prisma.sale.deleteMany({
      where: {
        branchId: branch.id,
        yearMonth: { in: months },
      },
    });

    const permissionMap = new Map(
      programs.map((program) => [program.id, (branchIndex + program.id) % 3 !== 0]),
    );

    await prisma.sale.createMany({
      data: months.flatMap((yearMonth, monthIndex) =>
        programs.map((program) => {
          const enabled = permissionMap.get(program.id);
          const base = (branchIndex + 1) * 5 + program.id * 3 + (monthIndex % 6) * 2;
          const quantity = enabled ? base : 0;
          return {
            branchId: branch.id,
            yearMonth,
            programId: program.id,
            quantity: item.status === "inactive" ? Math.floor(quantity * 0.4) : quantity,
          };
        }),
      ),
    });
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
