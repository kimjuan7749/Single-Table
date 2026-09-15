import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Utensils, AlertTriangle, CheckCircle, ShoppingBag, X, User, LogOut, Plus, Minus, Trash2, ChefHat } from 'lucide-react';

// Render production 백엔드 URL
const API_BASE_URL = 'https://single-table-server.onrender.com';

function App() {
  const [tools, setTools] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 회원 인증 상태
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    fetchTools();
    fetchProducts();
    fetchRecipes();
    fetchCart();
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (selectedTools.length === 0) {
      fetchProducts();
    } else {
      fetchFilteredProducts();
    }
  }, [selectedTools]);

  const checkLoginStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setUser(res.data.data);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tools`);
      if (res.data.success) setTools(res.data.data);
    } catch (err) {
      console.error('조리 기구 로드 오류:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/products`);
      if (res.data.success) {
        setProducts(res.data.data.map((p) => ({ ...p, isCookable: true })));
      }
    } catch (err) {
      console.error('상품 목록 로드 오류:', err);
    }
  };

  const fetchFilteredProducts = async () => {
    try {
      const toolIds = selectedTools.join(',');
      const res = await axios.get(`${API_BASE_URL}/api/products/filter?tools=${toolIds}`);
      if (res.data.success) setProducts(res.data.data);
    } catch (err) {
      console.error('필터링 로드 오류:', err);
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/recipes`);
      if (res.data.success) setRecipes(res.data.data);
    } catch (err) {
      console.error('레시피 로드 오류:', err);
    }
  };

  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/cart`);
      if (res.data.success) setCartItems(res.data.data);
    } catch (err) {
      console.error('장바구니 로드 오류:', err);
    }
  };

  const addToCart = async (productId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/cart`, { productId, quantity: 1 });
      if (res.data.success) {
        fetchCart();
        setIsCartOpen(true);
      }
    } catch (err) {
      console.error('장바구니 담기 오류:', err);
    }
  };

  // 수량 조절 API 연동 (PATCH)
  const updateQuantity = async (cartId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/cart/${cartId}`, { quantity: newQuantity });
      if (res.data.success) fetchCart();
    } catch (err) {
      console.error('수량 변경 에러:', err);
    }
  };

  // 삭제 API 연동 (DELETE)
  const removeCartItem = async (cartId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/cart/${cartId}`);
      if (res.data.success) fetchCart();
    } catch (err) {
      console.error('삭제 에러:', err);
    }
  };

  // 레시피 원클릭 장바구니 담기 연동 (POST)
  const addRecipeToCart = async (recipeId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/cart/recipe`, { recipeId });
      if (res.data.success) {
        fetchCart();
        setIsCartOpen(true);
      }
    } catch (err) {
      console.error('레시피 담기 오류:', err);
    }
  };

  const toggleTool = (toolId) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await axios.post(`${API_BASE_URL}${endpoint}`, formData);
      if (res.data.success) {
        if (authMode === 'login') {
          localStorage.setItem('token', res.data.token);
          setUser(res.data.user);
          setIsAuthModalOpen(false);
          setFormData({ email: '', password: '', name: '' });
        } else {
          alert('회원가입이 완료되었습니다!');
          setAuthMode('login');
        }
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              ST
            </div>
            <h1 className="text-xl font-bold text-gray-900">Single Table</h1>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">{user.name} 님</span>
                <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
              >
                <User className="w-4 h-4" />
                로그인
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* 사이드바 */}
        <aside className="w-full md:w-64 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-1">나의 조리 기구</h2>
          <p className="text-xs text-gray-500 mb-4">보유 중인 기구를 선택해 보세요.</p>
          <div className="space-y-2">
            {tools.map((tool) => {
              const isSelected = selectedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Utensils className="w-4 h-4" />
                    <span>{tool.name}</span>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* 메인 영역 */}
        <section className="flex-1">
          {/* 레시피 추천 및 원클릭 장바구니 영역 */}
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-2xl mb-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="bg-white/20 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center w-fit gap-1">
                    <ChefHat className="w-3.5 h-3.5" /> 오늘의 추천 레시피
                  </span>
                  <h3 className="text-xl font-bold mt-2">{recipe.title}</h3>
                  <p className="text-sm opacity-90 mt-1">{recipe.description}</p>
                </div>
                <button
                  onClick={() => addRecipeToCart(recipe.id)}
                  className="bg-white text-orange-600 font-bold px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                >
                  <ShoppingBag className="w-4 h-4" />
                  재료 한 번에 담기
                </button>
              </div>
            </div>
          ))}

          {/* 상품 목록 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">소용량 식자재 목록</h2>
            <span className="text-sm text-gray-500">총 {products.length}개 상품</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const isCookable = product.isCookable;
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all relative flex flex-col justify-between ${
                    !isCookable ? 'opacity-60 border-red-200' : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    {!isCookable && (
                      <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        조리 기구 부족
                      </div>
                    )}
                    <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 font-medium p-4 text-center">
                      {product.name}
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-gray-900 mt-2 text-base line-clamp-1">{product.name}</h3>
                      <p className="text-lg font-extrabold text-gray-900 mt-1">
                        {product.price.toLocaleString()}원
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      장바구니 담기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 장바구니 패널 */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900">장바구니</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-center text-gray-500 py-12">장바구니가 비어 있습니다.</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-sm text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.product.price.toLocaleString()}원
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity, -1)}
                            className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity, 1)}
                            className="w-6 h-6 rounded bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => removeCartItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-sm text-blue-600">
                          {(item.product.price * item.quantity).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 font-medium">총 결제 금액</span>
                <span className="text-xl font-extrabold text-gray-900">{totalPrice.toLocaleString()}원</span>
              </div>
              <button
                disabled={cartItems.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
              >
                주문하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그인/회원가입 모달 */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
              {authMode === 'login' ? '로그인' : '회원가입'}
            </h3>
            {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg font-medium">{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="홍길동"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="example@singletable.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors mt-2">
                {authMode === 'login' ? '로그인' : '가입하기'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setAuthError('');
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                {authMode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;