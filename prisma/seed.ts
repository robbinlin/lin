import { prisma } from "../src/lib/db";

const STARTER_CATEGORIES = [
  "親子",
  "育兒",
  "三餐",
  "室外遊玩",
  "室內遊玩",
  "婚姻",
  "理財",
  "學術研究",
  "AI工具",
  "Chatgpt",
  "Claude",
  "科技",
  "健康",
  "職涯發展",
  "生活風格",
  "新聞時事",
  "其他",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  for (const name of STARTER_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name), isSeeded: true },
    });
  }
  console.log(`Seeded ${STARTER_CATEGORIES.length} starter categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
