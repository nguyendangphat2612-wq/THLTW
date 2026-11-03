"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { productImageUrl } from "@/lib/productImageUrl";
import ProductImage from "@/app/_components/ProductImage";

const orderStatuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  processing: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/orders/${encodeURIComponent(id)}`)
      .then((response) => {
        if (active) setOrder(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.status === 401
          ? "Vui lòng đăng nhập để xem đơn hàng."
          : requestError.status === 404
            ? "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này."
            : requestError.message || "Không thể tải chi tiết đơn hàng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  const cancelOrder = async () => {
    setCancelling(true);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      setOrder(response.data);
      setNotice(response.message || "Đơn hàng đã được hủy.");
    } catch (requestError) {
      setError(requestError.message || "Không thể hủy đơn hàng.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 text-slate-600">Đang tải chi tiết đơn hàng...</main>;
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        <Link href="/orders" className="mt-5 inline-block font-semibold text-teal-800">← Lịch sử đơn hàng</Link>
      </main>
    );
  }

  const canCancel = order.status === "pending" && !["pending", "paid"].includes(order.payment_status);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/orders" className="text-sm font-semibold text-teal-800">← Lịch sử đơn hàng</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-800">Chi tiết đơn hàng</p>
          <h1 className="mt-2 text-3xl font-semibold">Đơn hàng #{order.id}</h1>
          <p className="mt-2 text-sm text-slate-600">{new Date(order.created_at).toLocaleString("vi-VN")}</p>
        </div>
        <span className="bg-slate-100 px-3 py-2 text-sm font-medium">{orderStatuses[order.status] || order.status}</span>
      </header>
      {notice ? <p role="status" className="border border-teal-200 bg-teal-50 p-4 text-teal-800">{notice}</p> : null}
      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      <section className="divide-y divide-slate-200 border border-slate-200 bg-white">
        {(order.items || []).map((item, index) => (
          <article key={`${item.product_id}-${index}`} className="flex items-center gap-4 p-4">
            <ProductImage product={item} src={item.image ? productImageUrl(item.image) : undefined} alt={item.name} width={64} height={64} unoptimized className="h-16 w-16 object-contain" />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium">{item.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{Number(item.price).toLocaleString("vi-VN")} đ × {item.quantity}</p>
            </div>
            <p className="font-semibold">{(Number(item.price) * item.quantity).toLocaleString("vi-VN")} đ</p>
          </article>
        ))}
      </section>
      <section className="grid gap-3 border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div><h2 className="font-semibold">Thông tin giao hàng</h2><p className="mt-2">{order.customer_name}</p><p className="text-sm text-slate-600">{order.phone} · {order.email}</p><p className="mt-1 text-sm text-slate-600">{order.address}</p></div>
        <div><h2 className="font-semibold">Thanh toán</h2><p className="mt-2 text-sm text-slate-600">Phương thức: {order.payment_method?.toUpperCase()}</p><p className="text-sm text-slate-600">Trạng thái: {order.payment_status}</p></div>
      </section>
      <section className="ml-auto grid w-full max-w-sm gap-2 border border-slate-200 bg-white p-5 text-sm">
        <div className="flex justify-between"><span>Tạm tính</span><span>{Number(order.subtotal ?? order.total).toLocaleString("vi-VN")} đ</span></div>
        {Number(order.discount) > 0 ? <div className="flex justify-between text-teal-800"><span>Mã {order.coupon_code}</span><span>−{Number(order.discount).toLocaleString("vi-VN")} đ</span></div> : null}
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold"><span>Tổng cộng</span><span>{Number(order.total).toLocaleString("vi-VN")} đ</span></div>
      </section>
      {canCancel ? (
        <button type="button" onClick={cancelOrder} disabled={cancelling} className="min-h-11 w-fit border border-red-300 px-5 font-semibold text-red-700 disabled:opacity-60">
          {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
        </button>
      ) : null}
    </main>
  );
}
