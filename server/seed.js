const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 테스트 데이터 초기화 및 생성을 시작합니다...');

  // 1. 기존 데이터 완전 초기화 (참조 관계 순서대로 삭제)
  await prisma.userTool.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.recipeItem.deleteMany({});
  await prisma.productTool.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.cookingTool.deleteMany({});

  // 2. 조리 기구 생성 및 Map 객체로 ID 저장
  const toolNames = ['1구 인덕션', '에어프라이어', '전자레인지', '오븐', '가스레인지'];
  const toolsMap = {};

  for (const name of toolNames) {
    const tool = await prisma.cookingTool.create({
      data: { name },
    });
    toolsMap[name] = tool.id;
  }

  // 3. 상품 데이터 생성
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

  const productsByName = {};
  for (const prod of productsData) {
    const product = await prisma.product.create({
      data: {
        name: prod.name,
        price: prod.price,
        category: prod.category,
      },
    });
    productsByName[prod.name] = product;

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

  // 4. 추천 레시피 생성 (등심 스테이크 & 바질 페스토 파스타)
  const recipe = await prisma.recipe.create({
    data: {
      title: '근사한 1인 스테이크 & 파스타 세트',
      description: '1구 인덕션으로 즐기는 육즙 가득 등심 스테이크와 풍미 가득 바질 페스토 파스타 모둠 세트',
    },
  });

  const targetProducts = ['1인용 등심 스테이크 180g', '바질 페스토 파스타 밀키트'];
  for (const productName of targetProducts) {
    if (productsByName[productName]) {
      await prisma.recipeItem.create({
        data: {
          recipeId: recipe.id,
          productId: productsByName[productName].id,
        },
      });
    }
  }

  console.log('🎉 추천 레시피(스테이크 & 파스타) 및 데이터 생성이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('❌ 더미 데이터 입력 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });