import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = 'https://single-table.onrender.com';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/payments/confirm`, {
          paymentKey,
          orderId,
          amount,
        });

        if (res.data.success) {
          setLoading(false);
        }
      } catch (err) {
        console.error('결제 승인 오류:', err);
        setLoading(false);
      }
    };

    if (paymentKey && orderId && amount) {
      confirmPayment();
    } else {
      setLoading(false);
    }
  }, [paymentKey, orderId, amount]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-800">결제를 승인하고 있습니다...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h2>
        <p className="text-sm text-gray-500 mb-6">주문이 성공적으로 접수되었습니다.</p>

        <div className="bg-gray-50 p-4 rounded-xl text-left text-sm space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">주문번호</span>
            <span className="font-semibold text-gray-800">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">결제 금액</span>
            <span className="font-bold text-blue-600">{Number(amount || 0).toLocaleString()}원</span>
          </div>
        </div>

        <button
          onClick={() => (window.location.href = '/')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default PaymentSuccess;