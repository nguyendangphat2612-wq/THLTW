"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCart, CART_CHANGED_EVENT, removeFromCart, saveCart, updateCartQuantity } from "@/lib/cart";
import { productImageUrl } from "@/lib/productImageUrl";
import ProductImage from "@/app/_components/ProductImage";
import OrderCheckoutForm from "../_components/OrderCheckoutForm";

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refreshCart = () => setItems(getCart());
    refreshCart();
    window.addEventListener(CART_CHANGED_EVENT, refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, []);

  const updateQuantity = (id, quantity) => {
    try {
      updateCartQuantity(id, quantity);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật giỏ hàng.");
    }
  };

  const removeItem = (id) => {
    try {
      removeFromCart(id);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Không thể xóa sản phẩm khỏi giỏ hàng.");
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <header><p className="text-sm font-semibold uppercase text-teal-800">LocPhat Mobile</p><h1 className="mt-2 text-3xl font-semibold">Giỏ hàng</h1></header>
      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="border border-teal-200 bg-teal-50 p-4 text-teal-800">{notice}</p> : null}
      {!items.length ? (
        <section className="border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-600">Giỏ hàng của bạn đang trống.</p>
          <Link href="/products" className="mt-5 inline-flex min-h-10 items-center bg-teal-800 px-5 font-semibold text-white">Tiếp tục mua sắm</Link>
        </section>
      ) : (
        <>
          <section className="divide-y divide-slate-200 border border-slate-200 bg-white">
            {items.map((item) => (
              <article key={item.id} className="grid items-center gap-4 p-4 sm:grid-cols-[90px_1fr_auto_auto]">
                <Link href={`/products/${item.id}`} className="grid h-20 place-items-center bg-slate-50">
                  <ProductImage product={item} src={item.image ? productImageUrl(item.image) : undefined} alt={item.name} width={80} height={80} unoptimized className="h-full w-full object-contain" />
                </Link>
                <div><Link href={`/products/${item.id}`} className="font-semibold text-slate-950 no-underline hover:text-teal-800">{item.name}</Link><p className="mt-1 text-sm text-slate-600">{Number(item.price).toLocaleString("vi-VN")} đ</p></div>
                <label className="flex items-center gap-2 text-sm text-slate-600">Số lượng
                  <input type="number" min="0" max="99" value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} className="w-16 border border-slate-300 px-2 py-2" />
                </label>
                <button type="button" onClick={() => removeItem(item.id)} className="text-sm font-semibold text-red-700">Xóa</button>
              </article>
            ))}
          </section>
          <section className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 bg-white p-5">
            <Link href="/products" className="text-sm font-semibold text-teal-800">← Tiếp tục mua sắm</Link>
            <p className="text-lg font-semibold">Tạm tính: {total.toLocaleString("vi-VN")} đ</p>
          </section>
          <OrderCheckoutForm
            items={items}
            onOrderPlaced={(response) => {
              saveCart([]);
              setItems([]);
              setNotice(response.message || "Đặt hàng thành công.");
            }}
          />
        </>
      )}
    </main>
  );
}
