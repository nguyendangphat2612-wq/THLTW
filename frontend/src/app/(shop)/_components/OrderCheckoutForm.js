"use client";

import { useEffect, useState } from "react";
import { apiRequest, getStoredToken } from "@/lib/api";

export default function OrderCheckoutForm({ items, onOrderPlaced, submitLabel = "Xác nhận đặt hàng" }) {
  const [customer, setCustomer] = useState({ customer_name: "", email: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) return;

    apiRequest("/api/me")
      .then(({ data }) => {
        setCustomer((previous) => ({
          customer_name: data.name || previous.customer_name,
          email: data.email || previous.email,
          phone: data.phone || previous.phone,
          address: data.address || previous.address,
        }));
      })
      .catch((requestError) => {
        setError(`Không thể tải thông tin đã lưu. Bạn vẫn có thể nhập thông tin bên dưới. ${requestError.message}`);
      });
  }, []);

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percent"
      ? Math.round(subtotal * appliedCoupon.discount_value) / 100
      : Math.min(subtotal, Number(appliedCoupon.discount_value))
    : 0;

  const applyCoupon = async () => {
    setApplyingCoupon(true);
    setCouponError("");

    try {
      const response = await apiRequest("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode }),
      });
      setAppliedCoupon(response.data);
      setCouponCode(response.data.code);
    } catch (requestError) {
      setAppliedCoupon(null);
      setCouponError(Object.values(requestError.errors || {}).flat()[0] || requestError.message || "Không thể áp dụng mã.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          ...customer,
          payment_method: paymentMethod,
          ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
          items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });
      onOrderPlaced(response);
      if (response.payment_url) {
        window.location.assign(response.payment_url);
      }
    } catch (requestError) {
      setError(Object.values(requestError.errors || {}).flat()[0] || requestError.message || "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submitOrder} className="grid gap-4 border border-slate-200 bg-white p-6 md:grid-cols-2">
      <h2 className="text-xl font-semibold md:col-span-2">Thông tin nhận hàng</h2>
      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-3 text-red-700 md:col-span-2">{error}</p> : null}
      <label className="grid gap-2 text-sm font-medium">Họ và tên
        <input required maxLength={255} value={customer.customer_name} onChange={(event) => setCustomer((previous) => ({ ...previous, customer_name: event.target.value }))} className="min-h-11 border border-slate-300 px-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Email
        <input required type="email" maxLength={255} value={customer.email} onChange={(event) => setCustomer((previous) => ({ ...previous, email: event.target.value }))} className="min-h-11 border border-slate-300 px-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Số điện thoại
        <input required maxLength={32} value={customer.phone} onChange={(event) => setCustomer((previous) => ({ ...previous, phone: event.target.value }))} className="min-h-11 border border-slate-300 px-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium md:col-span-2">Địa chỉ giao hàng
        <textarea required maxLength={1000} rows={3} value={customer.address} onChange={(event) => setCustomer((previous) => ({ ...previous, address: event.target.value }))} className="border border-slate-300 p-3" />
      </label>
      <fieldset className="grid gap-3 border border-slate-200 p-4 md:col-span-2">
        <legend className="px-1 text-sm font-semibold">Mã khuyến mãi</legend>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="coupon-code" className="visually-hidden">Nhập mã khuyến mãi</label>
          <input
            id="coupon-code"
            disabled={applyingCoupon}
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value);
              setAppliedCoupon(null);
              setCouponError("");
            }}
            maxLength={50}
            placeholder="Nhập mã khuyến mãi"
            className="min-h-11 flex-1 border border-slate-300 px-3"
          />
          <button type="button" onClick={applyCoupon} disabled={applyingCoupon || !couponCode.trim()} className="min-h-11 border border-teal-800 px-4 font-semibold text-teal-800 disabled:opacity-60">
            {applyingCoupon ? "Đang kiểm tra..." : "Áp dụng"}
          </button>
        </div>
        {couponError ? <p role="alert" className="text-sm text-red-700">{couponError}</p> : null}
        {appliedCoupon ? <p role="status" className="text-sm text-teal-800">Đã áp dụng {appliedCoupon.code} — {appliedCoupon.discount_type === "percent" ? `giảm ${appliedCoupon.discount_value}%` : `giảm ${Number(appliedCoupon.discount_value).toLocaleString("vi-VN")} đ`}.</p> : null}
        <div className="flex justify-between text-sm text-slate-600"><span>Tạm tính</span><span>{subtotal.toLocaleString("vi-VN")} đ</span></div>
        {appliedCoupon ? <div className="flex justify-between text-sm text-teal-800"><span>Giảm giá</span><span>−{discount.toLocaleString("vi-VN")} đ</span></div> : null}
        <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold"><span>Tổng thanh toán</span><span>{Math.max(0, subtotal - discount).toLocaleString("vi-VN")} đ</span></div>
      </fieldset>
      <fieldset className="grid gap-3 md:col-span-2">
        <legend className="text-sm font-semibold">Phương thức thanh toán</legend>
        <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-4">
          <input type="radio" name="payment_method" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1 accent-teal-800" />
          <span><strong className="block text-sm">Thanh toán khi nhận hàng</strong><span className="text-sm text-slate-600">Thanh toán trực tiếp cho nhân viên giao hàng.</span></span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-4">
          <input type="radio" name="payment_method" value="vnpay" checked={paymentMethod === "vnpay"} onChange={() => setPaymentMethod("vnpay")} className="mt-1 accent-teal-800" />
          <span><strong className="block text-sm">VNPay Sandbox</strong><span className="text-sm text-slate-600">Mở cổng VNPay thử nghiệm để chọn ngân hàng hoặc quét QR. Không trừ tiền thật.</span></span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 border border-slate-200 p-4">
          <input type="radio" name="payment_method" value="momo" checked={paymentMethod === "momo"} onChange={() => setPaymentMethod("momo")} className="mt-1 accent-teal-800" />
          <span><strong className="block text-sm">Ví MoMo Sandbox</strong><span className="text-sm text-slate-600">Mở ví MoMo thử nghiệm để xác nhận giao dịch. Không trừ tiền thật.</span></span>
        </label>
      </fieldset>
      <button type="submit" disabled={submitting || !items.length} className="min-h-11 w-fit bg-teal-800 px-6 font-semibold text-white disabled:opacity-60">
        {submitting ? "Đang xử lý..." : paymentMethod === "cod" ? submitLabel : "Tiếp tục đến thanh toán"}
      </button>
    </form>
  );
}
