import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, User, LogOut, Search, Check, Utensils, Sparkles, Package, Calendar } from 'lucide-react';

const API_BASE_URL = 'https://single-table.onrender.com';

function App() {
  const [products, setProducts] = useState([]);
  const [cookingTools, setCookingTools] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  
  // 모달 상태
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [orders, setOrders] = useState([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const init = async () => {
      await fetchInitialData();
      const token = localStorage.getItem('token');
      if (token) {
        await checkLoginStatus(token);
      }
    };
    init();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [prodRes, toolRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/products`),
        axios.get(`${API_BASE_URL}/api/tools`),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (toolRes.data.success) setCookingTools(toolRes.data.data);

      try {
        const recipeRes = await axios.get(`${API_BASE_URL}/api/recipes`);
        if (recipeRes.data && recipeRes.data.success) {
          setRecipes(recipeRes.data.data);
        }
      } catch (e) {
        console.warn('레시피 로드 안됨:', e);
      }
    } catch (err) {
      console.error('초기 데이터 로드 실패:', err);
    }
  };

  const checkLoginStatus = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setUser(res.data.data);
        fetchUserTools(token);
      }
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const fetchUserTools = async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setSelectedTools(res.data.data);
      }
    } catch (err) {
      console.error('보유 기구 조회 실패:', err);
    }
  };

  // 주문 내역 목록 불러오기
  const fetchOrderHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('주문 내역 불러오기 실패:', err);
    }
  };

  const openOrderHistory = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    fetchOrderHistory();
    setIsOrderHistoryOpen(true);
  };

  const toggleTool = async (toolId) => {
    const token = localStorage.getItem('token');
    const isSelected = selectedTools.includes(toolId);
    const nextTools = isSelected
      ? selectedTools.filter((id) => id !== toolId)
      : [...selectedTools, toolId];

    setSelectedTools(nextTools);

    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/user/tools/toggle`,
          { toolId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('보유 기구 DB 저장 에러:', err);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      if (res.data.success) {
        const token = res.data.token;
        localStorage.setItem('token', token);
        setUser(res.data.user);
        await fetchUserTools(token);
        setIsLoginModalOpen(false);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      alert('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSelectedTools([]);
    setOrders([]);
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleAddRecipeToCart = (recipe) => {
    if (!recipe || !recipe.recipeItems) return;
    recipe.recipeItems.forEach((item) => {
      if (item.product) {
        addToCart(item.product);
      }
    });
  };

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      alert('장바구니가 비어 있습니다.');
      return;
    }

    const clientKey = 'test_ck_발급받으신_클라이언트_키';

    if (!window.TossPayments) {
      alert('토스페이먼츠 SDK를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    try {
      const tossPayments = window.TossPayments(clientKey);

      const orderTitle =
        cartItems.length === 1
          ? cartItems[0].product.name
          : `${cartItems[0].product.name} 외 ${cartItems.length - 1}건`;

      const orderId = `ORDER_${Date.now()}`;
      const token = localStorage.getItem('token');

      // 로그인한 경우 백엔드 DB에 주문 생성 요청
      if (token) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/orders`,
            {
              orderNumber: orderId,
              totalAmount: totalPrice,
              items: cartItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                price: item.product.price,
              })),
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (e) {
          console.error('DB 주문 저장 오류:', e);
        }
      }

      tossPayments
        .requestPayment('카드', {
          amount: totalPrice,
          orderId: orderId,
          orderName: orderTitle,
          customerName: user && user.name ? user.name : '구매자',
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
        })
        .catch((error) => {
          if (error.code === 'USER_CANCEL') {
            alert('결제가 취소되었습니다.');
          } else {
            alert(`결제 오류: ${error.message || '처리 중 오류가 발생했습니다.'}`);
          }
        });
    } catch (err) {
      console.error('TossPayments 초기화 오류:', err);
    }
  };

  const filteredProducts = products.filter((prod) => {
    if (selectedTools.length === 0) return true;
    if (!prod.productTools || prod.productTools.length === 0) return true;
    return prod.productTools.some((pt) => selectedTools.includes(pt.cookingToolId));
  });

  const totalPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#333333] font-sans">
      {/* 마켓컬리 스타일 최상단 가입/로그인 및 주문 내역 바 */}
      <div className="bg-white border-b border-gray-100 text-xs text-gray-600">
        <div className="max-w-6xl mx-auto px-4 h-9 flex justify-end items-center gap-4">
          {user ? (
            <>
              <span className="font-semibold text-[#5f0080]">{user.name} 님</span>
              <span className="text-gray-300">|</span>
              <button onClick={openOrderHistory} className="hover:text-[#5f0080] flex items-center gap-1 font-medium">
                <Package className="w-3.5 h-3.5 text-[#5f0080]" /> 주문 내역
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={handleLogout} className="hover:text-black flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsLoginModalOpen(true)} className="text-[#5f0080] font-medium hover:underline">
                로그인
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setIsLoginModalOpen(true)} className="hover:underline">
                회원가입
              </button>
            </>
          )}
        </div>
      </div>

      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-30 border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-[#5f0080] cursor-pointer" onClick={() => window.location.reload()}>
              Single Table <span className="text-xs text-[#5f0080] font-normal border border-[#5f0080] px-1.5 py-0.5 rounded-full ml-1">컬리 쿡</span>
            </h1>
          </div>

          <div className="relative w-96 hidden md:block">
            <input
              type="text"
              placeholder="보유 기구 맞춤 밀키트를 검색해 보세요"
              className="w-full bg-gray-100 rounded-full py-2.5 pl-5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5f0080] border border-transparent focus:bg-white transition-all"
            />
            <Search className="w-5 h-5 text-[#5f0080] absolute right-3.5 top-2.5 cursor-pointer" />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-700 hover:text-[#5f0080] transition-colors"
            >
              <ShoppingCart className="w-7 h-7 text-[#5f0080]" />
              {cartItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-[#5f0080] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {recipes.length > 0 && (
          <section className="mb-10 bg-gradient-to-r from-[#f7f2f9] to-[#ebdcf2] border border-[#e2d0ec] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-[#5f0080] text-white text-xs px-3 py-1 rounded-full font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> 오늘의 1인 전용 컬리 레시피
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{recipes[0].title}</h2>
              <p className="text-sm text-gray-600 max-w-xl">{recipes[0].description}</p>
            </div>
            <button
              onClick={() => handleAddRecipeToCart(recipes[0])}
              className="bg-[#5f0080] hover:bg-[#4a0064] text-white font-semibold px-6 py-3.5 rounded-xl text-sm shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> 세트 재료 한 번에 담기
            </button>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit sticky top-24">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-100">
              <Utensils className="w-5 h-5 text-[#5f0080]" />
              <h3 className="font-bold text-gray-900 text-base">나의 보유 조리 기구</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              집에 가지고 계신 기구를 선택하시면 요리 가능한 상품만 맞춤 추천해 드립니다.
            </p>
            <div className="space-y-2">
              {cookingTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? 'border-[#5f0080] bg-[#f7f2f9] text-[#5f0080] font-bold shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tool.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#5f0080]" />}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                1인 가구 추천 식자재 <span className="text-xs text-gray-500 font-normal ml-2">총 {filteredProducts.length}개</span>
              </h3>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
                선택하신 조리 기구로 조리 가능한 상품이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-44 bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform duration-300 relative overflow-hidden">
                        <span className="font-semibold text-gray-400">{product.name}</span>
                        <span className="absolute top-3 left-3 bg-white/90 text-[#5f0080] text-[10px] font-bold px-2 py-0.5 rounded border border-[#5f0080]/20">
                          {product.category}
                        </span>
                      </div>

                      <div className="p-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-gray-900">
                            {product.price.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">원</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full bg-[#f7f2f9] hover:bg-[#5f0080] text-[#5f0080] hover:text-white font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> 담기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 장바구니 슬라이더 */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#5f0080]" />
                  <h3 className="font-bold text-gray-900 text-lg">장바구니</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                  ✕
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto divide-y divide-gray-100">
                {cartItems.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-sm">
                    장바구니에 담긴 상품이 없습니다.
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.product.id} className="py-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-800 mb-1">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-gray-500">
                          {item.product.price.toLocaleString()}원 × {item.quantity}개
                        </div>
                      </div>
                      <div className="font-bold text-sm text-[#5f0080]">
                        {(item.product.price * item.quantity).toLocaleString()}원
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
                  <div className="flex justify-between items-center text-base font-bold">
                    <span>총 결제 금액</span>
                    <span className="text-lg text-[#5f0080]">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                  <button
                    onClick={handlePayment}
                    className="w-full bg-[#5f0080] hover:bg-[#4a0064] text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-md"
                  >
                    {totalPrice.toLocaleString()}원 결제하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 주문 내역 모달 */}
      {isOrderHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#f7f2f9]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#5f0080]" />
                <h3 className="text-lg font-bold text-gray-900">나의 주문 내역</h3>
              </div>
              <button
                onClick={() => setIsOrderHistoryOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  주문 내역이 존재하지 않습니다.
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white shadow-sm">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-[#5f0080]" />
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-mono">{order.orderNumber}</span>
                      </div>
                      <span className="bg-[#f7f2f9] text-[#5f0080] font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-800 font-medium">{item.product.name}</span>
                          <span className="text-xs text-gray-500">
                            {item.price.toLocaleString()}원 × {item.quantity}개
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-bold text-gray-900">
                      <span>결제 금액</span>
                      <span className="text-[#5f0080]">{order.totalAmount.toLocaleString()}원</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-center text-gray-900 mb-6">
              <span className="text-[#5f0080]">Single Table</span> 로그인
            </h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-[#5f0080]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-[#5f0080]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#5f0080] hover:bg-[#4a0064] text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2"
              >
                로그인
              </button>
            </form>
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;