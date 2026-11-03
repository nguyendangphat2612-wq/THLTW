"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ProductImage from "@/app/_components/ProductImage";
import OrderCheckoutForm from "../../_components/OrderCheckoutForm";

export default function BuyNowCheckoutPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/api/products/${encodeURIComponent(id)}`)
      .then((response) => {
        if (active) setProduct(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải thông tin sản phẩm.");
      });

    return () => { active = false; };
  }, [id]);

  if (error && !product) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>
        <Link href="/products" className="mt-5 inline-block text-teal-800">← Quay lại sản phẩm</Link>
      </main>
    );
  }

  if (!product) {
    return <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 text-slate-600">Đang tải sản phẩm...</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="text-sm font-semibold uppercase text-teal-800">LocPhat Mobile</p>
        <h1 className="mt-2 text-3xl font-semibold">Mua ngay</h1>
      </header>
      {notice ? <p role="status" className="border border-teal-200 bg-teal-50 p-4 text-teal-800">{notice}</p> : null}
      <section className="grid gap-4 border border-slate-200 bg-white p-5 sm:grid-cols-[120px_1fr_auto] sm:items-center">
        <div className="grid h-28 place-items-center bg-slate-50 p-2">
          <ProductImage product={product} alt={product.name} width={110} height={110} unoptimized className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-teal-800">{product.brand?.name || product.category?.name || "Điện thoại chính hãng"}</p>
          <h2 className="mt-1 font-semibold text-slate-950">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-600">Số lượng: 1</p>
        </div>
        <p className="text-lg font-bold text-slate-950">{Number(product.sale_price || product.price || 0).toLocaleString("vi-VN")} đ</p>
      </section>
      <p className="text-sm leading-6 text-slate-600">
        Đơn hàng được gửi đến cửa hàng để xử lý. VNPay và MoMo đang ở chế độ sandbox nên giao dịch chỉ dùng thử, không thu tiền thật.
      </p>
      {notice ? null : (
        <OrderCheckoutForm
          items={[{ id: product.id, price: Number(product.sale_price || product.price || 0), quantity: 1 }]}
          onOrderPlaced={(response) => setNotice(response.message || "Đặt hàng thành công.")}
          submitLabel="Xác nhận đặt mua"
        />
      )}
      <Link href={`/products/${product.id}`} className="text-sm font-semibold text-teal-800">← Quay lại sản phẩm</Link>
    </main>
  );
}
