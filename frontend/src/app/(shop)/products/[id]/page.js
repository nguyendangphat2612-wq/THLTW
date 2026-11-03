"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, getStoredToken } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import ProductImage from "@/app/_components/ProductImage";
import { fallbackProducts } from "../../_components/FallbackProducts";
import ProductCard from "../../_components/ProductCard";

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")} đ`;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedError, setRelatedError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/api/products/${encodeURIComponent(id)}`)
      .then((productResponse) => {
        if (active) setProduct(productResponse.data);
      })
      .catch((requestError) => {
        if (!active) return;
        const fallbackProduct = fallbackProducts.find((item) => String(item.id) === String(id));
        if (fallbackProduct) {
          setProduct(fallbackProduct);
          setReviews([]);
          setRatingSummary({ average: 0, count: 0 });
          return;
        }
        setError(requestError.message || "Không thể tải thông tin sản phẩm.");
      });

    apiRequest(`/api/products/${encodeURIComponent(id)}/reviews?per_page=20`)
      .then((reviewResponse) => {
        if (!active) return;
        setReviews(reviewResponse.data || []);
        setRatingSummary({
          average: Number(reviewResponse.average_rating || 0),
          count: Number(reviewResponse.review_count || 0),
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải đánh giá sản phẩm.");
      });

    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!product?.brand_id && !product?.cat_id) return undefined;

    let active = true;
    const brandId = product.brand_id || product.cat_id;
    apiRequest(`/api/products?brand_id=${encodeURIComponent(brandId)}&per_page=5`)
      .then((response) => {
        if (!active) return;
        setRelatedProducts((response.data || [])
          .filter((item) => String(item.id) !== String(product.id))
          .slice(0, 4));
      })
      .catch((requestError) => {
        if (active) setRelatedError(requestError.message || "Không thể tải sản phẩm liên quan.");
      });
    return () => { active = false; };
  }, [product]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!getStoredToken()) {
      setError("Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const savedReview = await apiRequest(`/api/products/${encodeURIComponent(id)}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: Number(rating), comment }),
      });
      setComment("");
      setNotice(savedReview.message || "Cảm ơn bạn đã gửi đánh giá.");
      try {
        const response = await apiRequest(`/api/products/${encodeURIComponent(id)}/reviews?per_page=20`);
        setReviews(response.data || []);
        setRatingSummary({
          average: Number(response.average_rating || 0),
          count: Number(response.review_count || 0),
        });
      } catch (requestError) {
        setError(`Đánh giá đã được lưu nhưng không thể tải lại danh sách: ${requestError.message}`);
      }
    } catch (requestError) {
      setError(requestError.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !product) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10"><p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p><Link href="/products" className="mt-5 inline-block text-teal-800">← Quay lại sản phẩm</Link></main>;
  }

  if (!product) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 text-slate-600">Đang tải sản phẩm...</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <nav aria-label="Điều hướng" className="text-sm text-slate-500"><Link href="/products" className="text-teal-800">Sản phẩm</Link> / {product.name}</nav>
      <section className="grid gap-8 border border-slate-200 bg-white p-6 md:grid-cols-2 md:p-8">
        <div className="grid min-h-72 place-items-center bg-slate-50 p-6">
          <ProductImage product={product} alt={product.name} width={400} height={400} unoptimized priority className="h-auto max-h-96 w-full object-contain" />
        </div>
        <div className="flex flex-col items-start">
          <p className="text-sm font-semibold uppercase text-teal-800">{product.brand?.name || product.category?.name || "Điện thoại chính hãng"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product.name}</h1>
          <p className="mt-4 text-sm text-slate-500">★ {ratingSummary.average.toFixed(1)} · {ratingSummary.count} đánh giá · {Number(product.view || 0).toLocaleString("vi-VN")} lượt xem</p>
          <p className="mt-7 text-sm text-slate-400 line-through">{formatPrice(product.price)}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{formatPrice(product.sale_price || product.price)}</p>
          {product.summary ? <p className="mt-5 leading-7 text-slate-600">{product.summary}</p> : null}
          <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="min-h-12 bg-red-700 px-5 font-semibold text-white hover:bg-red-800"
              onClick={() => router.push(`/checkout/${product.id}`)}
            >
              Mua ngay
            </button>
            <button
              type="button"
              className="min-h-12 border border-teal-800 px-5 font-semibold text-teal-800 hover:bg-teal-50"
              onClick={() => {
                try {
                  addToCart(product);
                  setError("");
                  setNotice("Đã thêm sản phẩm vào giỏ hàng.");
                } catch (requestError) {
                  setError(requestError.message || "Không thể thêm sản phẩm vào giỏ hàng.");
                }
              }}
            >
              Thêm vào giỏ hàng
            </button>
          </div>
          {notice ? <p className="mt-3 text-sm text-teal-800" role="status">{notice}</p> : null}
        </div>
      </section>

      {product.detail ? <section className="border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Thông tin chi tiết</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">{product.detail}</p></section> : null}

      <section className="border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase text-teal-800">Gợi ý cho bạn</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Sản phẩm liên quan</h2></div>
          <Link href="/products" className="text-sm font-semibold text-teal-800">Xem thêm →</Link>
        </div>
        {relatedError ? <p role="alert" className="text-sm text-red-700">{relatedError}</p> : null}
        {relatedProducts.length ? (
          <div className="product-related-grid">
            {relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} onError={setError} />)}
          </div>
        ) : !relatedError ? <p className="text-sm text-slate-500">Chưa có sản phẩm liên quan.</p> : null}
      </section>

      <section className="border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Đánh giá sản phẩm</h2>
          <p className="text-sm text-slate-600">★ {ratingSummary.average.toFixed(1)} / 5 ({ratingSummary.count} đánh giá)</p>
        </div>
        {reviews.length ? (
          <ul className="mt-5 divide-y divide-slate-200">
            {reviews.map((review) => (
              <li key={review.id} className="py-4">
                <div className="flex items-center justify-between gap-3"><strong>{review.user?.name || "Khách hàng"}</strong><span className="text-amber-600" aria-label={`${review.rating} trên 5 sao`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">{review.comment}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-5 text-slate-500">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ trải nghiệm.</p>}

        <form onSubmit={submitReview} className="mt-6 grid gap-3 border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-600"><Link href="/login" className="font-semibold text-teal-800">Đăng nhập</Link> để gửi đánh giá.</p>
            <label className="grid gap-2 text-sm font-medium">Số sao
              <select value={rating} onChange={(event) => setRating(event.target.value)} className="min-h-10 max-w-48 border border-slate-300 px-3">
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">Nhận xét
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={2000} rows={4} className="border border-slate-300 p-3" placeholder="Chia sẻ trải nghiệm của bạn..." />
            </label>
            <button type="submit" disabled={submitting} className="min-h-10 w-fit bg-teal-800 px-5 font-semibold text-white disabled:opacity-60">{submitting ? "Đang gửi..." : "Gửi đánh giá"}</button>
        </form>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
