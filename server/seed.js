const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 테스트 데이터 초기화 및 생성을 시작합니다...');

  // 기존 데이터 초기화
  await prisma.userTool.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.productTool.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.cookingTool.deleteMany({});

  // 1. 조리 기구 생성
  const tools = await Promise.all([
    prisma.cookingTool.create({ data: { name: '1구 인덕션' } }),
    prisma.cookingTool.create({ data: { name: '에어프라이어' } }),
    prisma.cookingTool.create({ data: { name: '전자레인지' } }),
    prisma.cookingTool.create({ data: { name: '오븐' } }),
    prisma.cookingTool.create({ data: { name: '가스레인지' } }),
  ]);

  const [induction, airfryer, microwave, oven, gasStove] = tools;

  // 2. 상품 생성
  const productsData = [
    { name: '1인분 부대찌개 밀키트', price: 12000, category: '밀키트', tools: [induction.id, microwave.id] },
    { name: '에어프라이어용 치킨 가라아게 300g', price: 9900, category: '소용량 식자재', tools: [airfryer.id] },
    { name: '초간단 감바스 알 아히요', price: 14500, category: '밀키트', tools: [induction.id, gasStove.id] },
    { name: '훈제 오리 슬라이스 150g', price: 6800, category: '소용량 식자재', tools: [airfryer.id, gasStove.id] },
    { name: '1인용 등심 스테이크 180g', price: 15900, category: '소용량 식자재', tools: [induction.id, oven.id] },
    { name: '냉동 냉면 사리 & 육수 세트', price: 5500, category: '소용량 식자재', tools: [gasStove.id] },
    { name: '우삼겹 떡볶이 밀키트', price: 11900, category: '밀키트', tools: [induction.id, gasStove.id] },
    { name: '냉동 볶음밥 5종 혼합 세트', price: 12900, category: '소용량 식자재', tools: [microwave.id, gasStove.id] },
    { name: '바질 페스토 파스타 밀키트', price: 10800, category: '밀키트', tools: [induction.id, gasStove.id] },
    { name: '에어프라이어용 바삭 통삼겹 200g', price: 11500, category: '소용량 식자재', tools: [airfryer.id, oven.id] },
    { name: '초간단 김치찌개 밀키트', price: 8900, category: '밀키트', tools: [induction.id, gasStove.id] },
    { name: '전자레인지용 간편 계란찜 세트', price: 4200, category: '소용량 식자재', tools: [microwave.id] },
  ];

  const createdProducts = [];
  for (const prod of productsData) {
    const product = await prisma.product.create({
      data: {
        name: prod.name,
        price: prod.price,
        category: prod.category,
      },
    });
    createdProducts.push(product);

    // 상품-조리기구 매핑
    for (const toolId of prod.tools) {
      await prisma.productTool.create({
        data: {
          productId: product.id,
          cookingToolId: toolId,
        },
      });
    }
  }

  // 3. 추천 레시피 생성
  const recipe = await prisma.recipe.create({
    data: {
      title: '초간단 1인분 부대찌개 모둠',
      description: '1구 인덕션과 전자레인지로 10분 만에 완성하는 얼큰한 부대찌개 모둠 세트',
    },
  });

  // 레시피-상품 매핑
  await prisma.recipeItem.create({
    data: {
      recipeId: recipe.id,
      productId: createdProducts[0].id, // 1인분 부대찌개 밀키트
    },
  });

  console.log('🎉 총 12개의 식자재/밀키트 더미 데이터 입력이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('❌ 더미 데이터 입력 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });