"use client";

import { startTransition, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ProductCard from "../_components/ProductCard";

const pageSize = 4;

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")} đ`;
}

export default function ProductsPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [completedQuery, setCompletedQuery] = useState("");
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const [priceFilter, setPriceFilter] = useState({ min: 0, max: 0 });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const queryKey = `${page}:${search}:${selectedCategory}:${selectedBrand}:${priceFilter.min}:${priceFilter.max}`;
  const loading = completedQuery !== queryKey;

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("q") || "";
    startTransition(() => {
      setSearchInput(initialSearch);
      setSearch(initialSearch);
    });
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest("/api/categories")
      .then((categoryData) => { if (active) setCategories(categoryData.data || []); })
      .catch((requestError) => { if (active) setError(requestError.message || "Không thể tải danh mục."); });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), per_page: String(pageSize) });
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category_id", selectedCategory);
    if (selectedBrand) params.set("brand_id", selectedBrand);
    if (priceBounds.max > priceBounds.min && (priceFilter.min > priceBounds.min || priceFilter.max < priceBounds.max)) {
      params.set("min_price", String(priceFilter.min));
      params.set("max_price", String(priceFilter.max));
    }

    const timer = window.setTimeout(() => {
      apiRequest(`/api/products?${params}`)
        .then((response) => {
          if (!active) return;
          setProducts(response.data || []);
          setPageInfo({
            currentPage: response.current_page || 1,
            lastPage: response.last_page || 1,
            total: response.total || 0,
          });
          setCompletedQuery(queryKey);
          setError("");

          if (response.price_range && priceBounds.max === 0) {
            const bounds = {
              min: Math.floor(Number(response.price_range.min || 0)),
              max: Math.ceil(Number(response.price_range.max || 0)),
            };
            setPriceBounds(bounds);
            setPriceFilter(bounds);
          }
        })
        .catch((requestError) => {
          if (active) {
            setError(requestError.message || "Không thể tải sản phẩm.");
            setCompletedQuery(queryKey);
          }
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, priceBounds.max, priceBounds.min, priceFilter.max, priceFilter.min, queryKey, search, selectedBrand, selectedCategory]);

  const brands = categories.flatMap((category) => category.children || []);
  const productCategories = categories.filter((category) => (category.children || []).length > 0);
  const step = Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 100));

  const changePrice = (bound, value) => {
    const amount = Number(value);
    setPriceFilter((previous) => ({
      min: bound === "min" ? Math.min(amount, previous.max) : previous.min,
      max: bound === "max" ? Math.max(amount, previous.min) : previous.max,
    }));
    setPage(1);
  };

  const changeBrand = (brandId) => {
    setSelectedBrand(brandId);
    setPage(1);
  };

  const changeCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(1);

    const url = new URL(window.location.href);
    if (nextSearch) url.searchParams.set("q", nextSearch);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-6 py-10 md:px-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase text-teal-800">LocPhat Mobile</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Điện thoại</h1>
        <p className="mt-2 text-slate-600">Lọc theo thương hiệu và khoảng giá để tìm mẫu bạn cần.</p>
      </header>

      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}

      <div className="grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="grid gap-5 border border-slate-200 bg-white p-5" aria-label="Bộ lọc sản phẩm">
          <section>
            <label htmlFor="product-category" className="text-base font-semibold text-slate-950">Danh mục</label>
            <select
              id="product-category"
              className="mt-3 min-h-10 w-full border border-slate-300 bg-white px-2 text-sm text-slate-700"
              value={selectedCategory}
              onChange={(event) => changeCategory(event.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">Thương hiệu</h2>
            <div className="product-filter-brands mt-3" role="group" aria-label="Lọc theo thương hiệu">
              <button type="button" onClick={() => changeBrand("")} aria-pressed={!selectedBrand} className={`product-filter-brand ${!selectedBrand ? "is-selected" : ""}`}>Tất cả thương hiệu</button>
              {brands.map((brand) => (
                <button key={brand.id} type="button" onClick={() => changeBrand(String(brand.id))} aria-pressed={String(selectedBrand) === String(brand.id)} className={`product-filter-brand ${String(selectedBrand) === String(brand.id) ? "is-selected" : ""}`}>{brand.name}</button>
              ))}
            </div>
          </section>

          {priceBounds.max > priceBounds.min ? (
            <section className="border-t border-slate-200 pt-4">
              <h2 className="text-base font-semibold text-slate-950">Khoảng giá</h2>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-xs text-slate-600">
                  Giá từ <strong className="text-sm text-slate-950">{formatPrice(priceFilter.min)}</strong>
                  <input type="range" min={priceBounds.min} max={priceBounds.max} step={step} value={priceFilter.min} onChange={(event) => changePrice("min", event.target.value)} aria-label="Giá thấp nhất" />
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  Giá đến <strong className="text-sm text-slate-950">{formatPrice(priceFilter.max)}</strong>
                  <input type="range" min={priceBounds.min} max={priceBounds.max} step={step} value={priceFilter.max} onChange={(event) => changePrice("max", event.target.value)} aria-label="Giá cao nhất" />
                </label>
                <button type="button" className="text-left text-xs font-semibold text-teal-800 underline" onClick={() => { setPriceFilter(priceBounds); setPage(1); }}>Xóa lọc giá</button>
              </div>
            </section>
          ) : null}
        </aside>

        <section className="min-w-0">
          <form onSubmit={submitSearch} role="search" className="mb-5 flex gap-2">
            <label htmlFor="product-search" className="visually-hidden">Tìm kiếm sản phẩm</label>
            <input
              id="product-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm tên điện thoại..."
              className="min-h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
            <button type="submit" className="min-h-11 bg-teal-800 px-5 text-sm font-semibold text-white hover:bg-teal-700">Tìm kiếm</button>
          </form>

          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Danh sách điện thoại</h2>
              <p className="mt-1 text-sm text-slate-600">{pageInfo.total} sản phẩm · {pageSize} sản phẩm mỗi trang</p>
            </div>
            {selectedBrand || selectedCategory ? (
              <button
                type="button"
                onClick={() => { changeBrand(""); changeCategory(""); }}
                className="text-sm font-semibold text-teal-800 underline"
              >
                Xóa lọc danh mục/thương hiệu
              </button>
            ) : null}
          </div>

          {loading ? <p role="status" className="py-10 text-center text-slate-600">Đang tải sản phẩm...</p> : null}
          {!loading && products.length > 0 ? (
            <div className="product-list-grid mt-4" aria-label="Danh sách sản phẩm" aria-busy={loading}>
              {products.map((product) => <ProductCard key={product.id} product={product} onError={setError} />)}
            </div>
          ) : null}
          {!loading && !products.length && !error ? <p className="mt-4 border border-slate-200 bg-white p-8 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p> : null}

          {pageInfo.lastPage > 1 ? (
            <nav className="product-pagination" aria-label="Phân trang sản phẩm">
              <button type="button" onClick={() => goToPage(pageInfo.currentPage - 1)} disabled={pageInfo.currentPage <= 1}>← Trước</button>
              <div>
                {Array.from({ length: pageInfo.lastPage }, (_, index) => index + 1).map((pageNumber) => (
                  <button type="button" key={pageNumber} onClick={() => goToPage(pageNumber)} aria-current={pageNumber === pageInfo.currentPage ? "page" : undefined} className={pageNumber === pageInfo.currentPage ? "is-current" : ""}>{pageNumber}</button>
                ))}
              </div>
              <button type="button" onClick={() => goToPage(pageInfo.currentPage + 1)} disabled={pageInfo.currentPage >= pageInfo.lastPage}>Sau →</button>
            </nav>
          ) : null}
          {pageInfo.lastPage > 0 ? <p className="mt-3 text-center text-xs text-slate-500">Trang {pageInfo.currentPage} / {pageInfo.lastPage}</p> : null}
        </section>
      </div>
    </main>
  );
}
