"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ProductImage from "@/app/_components/ProductImage";
import { addToCart } from "@/lib/cart";
import { fallbackProducts } from "./_components/FallbackProducts";
import { newsPosts } from "./_components/NewsPosts";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    startTransition(() => {
      setSearch(new URLSearchParams(window.location.search).get("q") || "");
    });
    apiRequest("/api/products?per_page=4")
      .then((data) => setProducts(data.data || []))
      .catch(() => setProducts([]));
  }, []);

  const catalog = products.length ? products : fallbackProducts;
  const visibleProducts = catalog.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <main className="storefront">
      <nav className="category-bar" aria-label="Danh mục sản phẩm">
        <div className="category-inner">
          <Link href="/products">Điện thoại</Link>
          <Link href="/products">Laptop</Link>
          <Link href="/products">Apple</Link>
          <Link href="/products">Samsung</Link>
          <Link href="/products">Tablet</Link>
          <Link href="/products">Phụ kiện</Link>
          <Link href="/products" className="category-sale">Khuyến mãi</Link>
        </div>
      </nav>

      <div className="store-content">
        {cartError ? <p className="store-cart-error" role="alert">{cartError}</p> : null}
        <section className="showcase-grid" aria-label="Ưu đãi và tin công nghệ">
          <div className="hero-banner">
            <div className="hero-copy">
              <span className="campaign-tag">MÙA NÂNG CẤP ĐÃ TỚI</span>
              <p className="hero-kicker">MỞ HỘI CÔNG NGHỆ</p>
              <h1>Điện thoại mới.<br />Ưu đãi thật đã.</h1>
              <p className="hero-detail">Giảm đến 2.000.000đ · Trả góp 0%</p>
              <Link href="/products" className="hero-button">Khám phá ngay <span aria-hidden="true">→</span></Link>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-phone phone-back"><i /><i /><i /></div>
              <div className="hero-phone phone-front"><i /><i /><i /></div>
              <span className="hero-spark">✦</span>
              <span className="hero-price-note">0%<small>trả góp</small></span>
            </div>
          </div>

          <aside className="promo-column">
            <div className="promo-tile promo-tablet">
              <span className="promo-label">GÓC LÀM VIỆC MỚI</span>
              <strong>Laptop & tablet<br />giảm đến 3 triệu</strong>
              <span className="promo-link">Xem ưu đãi <span aria-hidden="true">↗</span></span>
              <div className="tablet-art" aria-hidden="true"><span /></div>
            </div>
            <div className="promo-tile promo-audio">
              <span className="promo-label">ÂM THANH CÁ TÍNH</span>
              <strong>Phụ kiện chính hãng<br />ưu đãi đến 30%</strong>
              <span className="promo-link">Mua ngay <span aria-hidden="true">↗</span></span>
              <div className="earbud-art" aria-hidden="true"><span /><span /></div>
            </div>
            <div className="news-panel">
                <div className="news-heading"><h2>TIN CÔNG NGHỆ</h2><Link href="/news">Xem tất cả</Link></div>
                {newsPosts.slice(0, 2).map((story, index) => (
                  <Link href={`/news/${story.slug}`} className="news-item" key={story.slug}>
                    <span className={`news-thumb news-thumb-${index === 0 ? "camera" : "phone"}`} aria-hidden="true" />
                  <span>{story.title}</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        <section className="product-section" aria-labelledby="featured-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">LỰA CHỌN NỔI BẬT</p>
              <h2 id="featured-heading">Điện thoại được quan tâm</h2>
            </div>
            <Link href="/products" className="all-products">Xem tất cả điện thoại <span aria-hidden="true">→</span></Link>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                <div className={`product-visual device-${product.color || fallbackProducts[index % fallbackProducts.length].color}`}>
                  <span className="discount-label">Giảm giá</span>
                  <ProductImage product={product} className="api-product-image" alt={product.name} width={180} height={180} unoptimized />
                </div>
                <div className="product-info">
                  <span className="product-brand">{product.brand?.name || product.brand || product.category?.name || "ĐIỆN THOẠI"}</span>
                  <h3><Link href={`/products/${product.id}`} className="text-inherit no-underline hover:text-teal-800">{product.name}</Link></h3>
                  <p className="product-price-old">{Number(product.price).toLocaleString("vi-VN")}đ</p>
                  <div className="product-price-row">
                    <strong>{Number(product.sale_price || product.price).toLocaleString("vi-VN")}đ</strong>
                    <span>Trả góp 0%</span>
                  </div>
                  <div className="product-card-actions">
                    <Link href={`/products/${product.id}`} className="product-view-button">Xem sản phẩm</Link>
                    <Link href={`/checkout/${product.id}`} className="product-buy-button">Mua ngay</Link>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          addToCart(product);
                          setCartError("");
                        } catch (error) {
                          setCartError(error.message || "Không thể thêm sản phẩm vào giỏ hàng.");
                        }
                      }}
                    >
                      Thêm vào giỏ
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {visibleProducts.length === 0 ? <p className="empty-products">Không tìm thấy sản phẩm phù hợp.</p> : null}
          </div>
        </section>
        <div className="store-footnote" aria-live="polite">
          <span>Chính hãng 100%</span><span>Giao nhanh toàn quốc</span><span>Đổi trả trong 30 ngày</span>
        </div>
      </div>
    </main>
  );
}