const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // 모든 도메인에서의 요청 허용
  credentials: true
}));
app.use(express.json());

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: '인증 토큰이 없습니다.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    req.user = user;
    next();
  });
};

// 1. 기본 서버 상태 확인
app.get('/', (req, res) => {
  res.send('🍳 Single Table Express Server is Running!');
});

// 2. 전체 조리 기구 목록 조회
app.get('/api/tools', async (req, res) => {
  try {
    const tools = await prisma.cookingTool.findMany();
    res.json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 3. 소용량 상품 목록 조회
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        productTools: {
          include: { cookingTool: true },
        },
      },
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 4. 보유 조리 기구 맞춤 상품 필터링
app.get('/api/products/filter', async (req, res) => {
  try {
    const { tools } = req.query;
    if (!tools) {
      const allProducts = await prisma.product.findMany({
        include: { productTools: { include: { cookingTool: true } } },
      });
      return res.json({ success: true, data: allProducts });
    }

    const userToolIds = tools.split(',').map((id) => parseInt(id, 10));
    const products = await prisma.product.findMany({
      include: { productTools: { include: { cookingTool: true } } },
    });

    const filteredProducts = products.map((product) => {
      const requiredToolIds = product.productTools.map((pt) => pt.cookingToolId);
      const isCookable = requiredToolIds.some((toolId) => userToolIds.includes(toolId));
      return { ...product, isCookable };
    });

    res.json({ success: true, data: filteredProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 5. 장바구니 담기
app.post('/api/cart', async (req, res) => {
  try {
    const { userId = 1, productId, quantity = 1 } = req.body;

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'test@singletable.com',
          password: 'password123',
          name: '테스트 자취생',
        },
      });
    }

    const existingCart = await prisma.cart.findFirst({
      where: { userId, productId },
    });

    if (existingCart) {
      const updated = await prisma.cart.update({
        where: { id: existingCart.id },
        data: { quantity: existingCart.quantity + quantity },
      });
      return res.json({ success: true, data: updated });
    }

    const cartItem = await prisma.cart.create({
      data: { userId, productId, quantity },
    });
    res.json({ success: true, data: cartItem });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 6. 장바구니 목록 조회
app.get('/api/cart', async (req, res) => {
  try {
    const userId = 1;
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });
    res.json({ success: true, data: cartItems });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 7. 장바구니 수량 변경
app.patch('/api/cart/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: '수량은 1개 이상이어야 합니다.' });
    }

    const updatedCart = await prisma.cart.update({
      where: { id: parseInt(id, 10) },
      data: { quantity },
    });
    res.json({ success: true, data: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 8. 장바구니 항목 삭제
app.delete('/api/cart/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cart.delete({
      where: { id: parseInt(id, 10) },
    });
    res.json({ success: true, message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 9. 레시피 목록 조회
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
    });
    res.json({ success: true, data: recipes });
  } catch (error) {
    res.status(500).json({ success: false, message: '레시피 조회 오류' });
  }
});

// 10. 레시피 재료 원클릭 장바구니 담기
app.post('/api/cart/recipe', async (req, res) => {
  try {
    const { userId = 1, recipeId } = req.body;

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await prisma.user.create({
        data: { id: userId, email: 'test@singletable.com', password: 'password123', name: '테스트 자취생' },
      });
    }

    const recipeItems = await prisma.recipeItem.findMany({ where: { recipeId } });
    if (!recipeItems.length) {
      return res.status(404).json({ success: false, message: '레시피 재료가 없습니다.' });
    }

    for (const item of recipeItems) {
      const existing = await prisma.cart.findFirst({
        where: { userId, productId: item.productId },
      });

      if (existing) {
        await prisma.cart.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + 1 },
        });
      } else {
        await prisma.cart.create({
          data: { userId, productId: item.productId, quantity: 1 },
        });
      }
    }

    res.json({ success: true, message: '모든 재료가 장바구니에 담겼습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 11. 회원가입 API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    res.json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 12. 로그인 API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 13. 내 정보 프로필 조회 API
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Single Table 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});