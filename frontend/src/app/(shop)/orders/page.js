"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

const orderStatuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  processing: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/orders")
      .then((response) => setOrders(response.data || []))
      .catch((requestError) => setError(requestError.status === 401
        ? "Vui lòng đăng nhập để xem lịch sử đơn hàng."
        : requestError.message || "Không thể tải lịch sử đơn hàng."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="text-sm font-semibold uppercase text-teal-800">Tài khoản của bạn</p>
        <h1 className="mt-2 text-3xl font-semibold">Lịch sử đơn hàng</h1>
      </header>
      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {loading ? <p className="text-slate-600">Đang tải đơn hàng...</p> : null}
      {!loading && !error && !orders.length ? (
        <section className="border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Bạn chưa có đơn hàng nào.</p>
          <Link href="/products" className="mt-5 inline-flex min-h-10 items-center bg-teal-800 px-5 font-semibold text-white">Khám phá sản phẩm</Link>
        </section>
      ) : null}
      <section className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Đơn hàng #{order.id}</h2>
                <p className="mt-1 text-sm text-slate-600">{new Date(order.created_at).toLocaleString("vi-VN")}</p>
              </div>
              <span className="bg-slate-100 px-3 py-1 text-sm font-medium">{orderStatuses[order.status] || order.status}</span>
            </div>
            <p className="mt-4 text-sm text-slate-600">{(order.items || []).length} sản phẩm · {order.payment_method?.toUpperCase()}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="font-semibold">{Number(order.total).toLocaleString("vi-VN")} đ</p>
              <Link href={`/orders/${order.id}`} className="font-semibold text-teal-800">Xem chi tiết →</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
