const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 테스트 데이터 초기화 및 생성을 시작합니다...');

  // 기존 데이터 완전 초기화 (참조 관계 순서대로 삭제)
  await prisma.userTool.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.productTool.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.cookingTool.deleteMany({});

  // 1. 조리 기구 안전하게 생성 (upsert 사용으로 중복 방지)
  const toolNames = ['1구 인덕션', '에어프라이어', '전자레인지', '오븐', '가스레인지'];
  const toolsMap = {};

  for (const name of toolNames) {
    const tool = await prisma.cookingTool.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    toolsMap[name] = tool.id;
  }

  // 2. 상품 데이터 및 매핑 조리 기구 정의
  const productsData = [
    { name: '1인분 부대찌개 밀키트', price: 12000, category: '밀키트', toolNames: ['1구 인덕션', '전자레인지'] },
    { name: '에어프라이어용 치킨 가라아게 300g', price: 9900, category: '소용량 식자재', toolNames: ['에어프라이어'] },
    { name: '초간단 감바스 알 아히요', price: 14500, category: '밀키트', toolNames: ['1구 인덕션', '가스레인지'] },
    { name: '훈제 오리 슬라이스 150g', price: 6800, category: '소용량 식자재', toolNames: ['에어프라이어', '가스레인지'] },
    { name: '1인용 등심 스테이크 180g', price: 15900, category: '소용량 식자재', toolNames: ['1구 인덕션', '오븐'] },
    { name: '냉동 냉면 사리 & 육수 세트', price: 5500, category: '소용량 식자재', toolNames: ['가스레인지'] },
    { name: '우삼겹 떡볶이 밀키트', price: 11900, category: '밀키트', toolNames: ['1구 인덕션', '가스레인지'] },
    { name: '냉동 볶음밥 5종 혼합 세트', price: 12900, category: '소용량 식자재', toolNames: ['전자레인지', '가스레인지'] },
    { name: '바질 페스토 파스타 밀키트', price: 10800, category: '밀키트', toolNames: ['1구 인덕션', '가스레인지'] },
    { name: '에어프라이어용 바삭 통삼겹 200g', price: 11500, category: '소용량 식자재', toolNames: ['에어프라이어', '오븐'] },
    { name: '초간단 김치찌개 밀키트', price: 8900, category: '밀키트', toolNames: ['1구 인덕션', '가스레인지'] },
    { name: '전자레인지용 간편 계란찜 세트', price: 4200, category: '소용량 식자재', toolNames: ['전자레인지'] },
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

    // 상품-조리기구 연관 매핑
    for (const tName of prod.toolNames) {
      if (toolsMap[tName]) {
        await prisma.productTool.create({
          data: {
            productId: product.id,
            cookingToolId: toolsMap[tName],
          },
        });
      }
    }
  }

  // 3. 추천 레시피 생성
  const recipe = await prisma.recipe.create({
    data: {
      title: '초간단 1인분 부대찌개 모둠',
      description: '1구 인덕션과 전자레인지로 10분 만에 완성하는 얼큰한 부대찌개 모둠 세트',
    },
  });

  if (createdProducts.length > 0) {
    await prisma.recipeItem.create({
      data: {
        recipeId: recipe.id,
        productId: createdProducts[0].id,
      },
    });
  }

  console.log('🎉 총 12개의 식자재 및 밀키트 더미 데이터 입력이 성공적으로 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('❌ 더미 데이터 입력 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });