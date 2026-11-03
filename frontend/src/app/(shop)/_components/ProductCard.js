"use client";

import Link from "next/link";
import { addToCart } from "@/lib/cart";
import ProductImage from "@/app/_components/ProductImage";

export default function ProductCard({ product, onError }) {
  const price = Number(product.sale_price || product.price || 0);
  const regularPrice = Number(product.price || 0);

  return (
    <article className="product-list-card">
      <Link href={`/products/${product.id}`} className="product-list-image" aria-label={`Xem ${product.name}`}>
        <ProductImage product={product} alt={product.name} width={280} height={220} unoptimized />
      </Link>
      <div className="product-list-info">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{product.brand?.name || product.category?.name || "Điện thoại chính hãng"}</p>
        <h3><Link href={`/products/${product.id}`}>{product.name}</Link></h3>
        {regularPrice > price ? <p className="product-list-old-price">{regularPrice.toLocaleString("vi-VN")} đ</p> : null}
        <p className="product-list-price">{price.toLocaleString("vi-VN")} đ</p>
        <div className="product-card-actions">
          <Link href={`/products/${product.id}`} className="product-view-button">Xem sản phẩm</Link>
          <Link href={`/checkout/${product.id}`} className="product-buy-button">Mua ngay</Link>
          <button
            type="button"
            onClick={() => {
              try {
                addToCart(product);
              } catch (error) {
                onError?.(error.message || "Không thể thêm sản phẩm vào giỏ hàng.");
              }
            }}
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </article>
  );
}
