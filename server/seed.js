const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 초기 테스트 데이터 입력 시작...');

  // 1. 기본 조리 기구 생성
  const microwave = await prisma.cookingTool.upsert({
    where: { name: '전자레인지' },
    update: {},
    create: { name: '전자레인지' },
  });

  const airFryer = await prisma.cookingTool.upsert({
    where: { name: '에어프라이어' },
    update: {},
    create: { name: '에어프라이어' },
  });

  const induction = await prisma.cookingTool.upsert({
    where: { name: '1구 인덕션' },
    update: {},
    create: { name: '1구 인덕션' },
  });

  // 2. 소용량 상품 생성 (기존 상품이 있으면 찾고 없으면 생성)
  let product1 = await prisma.product.findFirst({ where: { name: '1인분 부대찌개 밀키트' } });
  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: '1인분 부대찌개 밀키트',
        price: 12000,
        category: '밀키트',
        productTools: {
          create: [{ cookingToolId: microwave.id }, { cookingToolId: induction.id }],
        },
      },
    });
  }

  let product2 = await prisma.product.findFirst({ where: { name: '에어프라이어용 치킨 가라아게 300g' } });
  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: '에어프라이어용 치킨 가라아게 300g',
        price: 29000,
        category: '소용량 식자재',
        productTools: {
          create: [{ cookingToolId: airFryer.id }],
        },
      },
    });
  }

  // 3. 레시피 및 재료 매핑 데이터 생성
  const existingRecipe = await prisma.recipe.findFirst({ where: { title: '초간단 1인분 부대찌개 모둠' } });
  if (!existingRecipe) {
    await prisma.recipe.create({
      data: {
        title: '초간단 1인분 부대찌개 모둠',
        description: '1구 인덕션과 전자레인지로 10분 만에 완성하는 얼큰한 부대찌개 모둠 세트',
        items: {
          create: [
            { productId: product1.id },
            { productId: product2.id },
          ],
        },
      },
    });
    console.log('✅ 추천 레시피 생성 완료');
  }

  console.log('🎉 모든 데이터 생성이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });