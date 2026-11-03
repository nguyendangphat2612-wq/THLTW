"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";

const emptyProductForm = {
  product_name: "",
  cat_id: "",
  brand_id: "",
  price: "",
  sale_price: "",
  detail: "",
  summary: "",
  status: 1,
  trash: 0,
  image: "",
  view: 0,
};

const adminTabs = [
  ["dashboard", "Bảng tổng hợp"],
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingItem, setEditingItem] = useState(null);

  const fetchAdminData = useCallback(async () => {
    const [categoryData, brandData, productData] = await Promise.all([
      apiRequest("/api/categories"),
      apiRequest("/api/brands"),
      apiRequest("/api/products"),
    ]);

    const categoryItems = categoryData.data || categoryData || [];
    const brandItems = brandData.data || brandData || [];

    return {
      categories: categoryItems,
      brands: brandItems,
      products: productData.data || productData || [],
    };
  }, []);

  const applyAdminData = useCallback(({ categories: categoryItems, brands: brandItems, products: productItems }) => {
    const phoneCategory = categoryItems.find((category) => category.slug === "dien-thoai-di-dong");
    const defaultBrandId = brandItems[0]?.id || "";

    setCategories(categoryItems);
    setBrands(brandItems);
    setProducts(productItems);
    setProductForm((prev) => {
      const selectedBrandExists = brandItems.some((brand) => Number(brand.id) === Number(prev.cat_id));
      const selectedBrandId = selectedBrandExists ? prev.cat_id : defaultBrandId;

      return {
        ...prev,
        cat_id: selectedBrandId,
        brand_id: selectedBrandId,
      };
    });
  }, []);

  const loadAdminData = useCallback(
    async () => applyAdminData(await fetchAdminData()),
    [applyAdminData, fetchAdminData],
  );

  const cancelEditing = () => {
    setEditingItem(null);
    setProductForm(emptyProductForm);
  };

  const editProduct = (product) => {
    setEditingItem({ type: "product", id: product.id || product.product_id });
    setProductForm({
      ...emptyProductForm,
      product_name: product.product_name || product.name || "",
      cat_id: Number(product.cat_id || ""),
      brand_id: Number(product.brand_id || product.cat_id || ""),
      price: product.price ?? "",
      sale_price: product.sale_price ?? "",
      detail: product.detail || "",
      summary: product.summary || "",
      status: Number(product.status ?? 1),
      trash: Number(product.trash ?? 0),
      image: product.image || "",
      view: Number(product.view || 0),
    });
    setError("");
  };

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      router.replace("/admin/login?redirect=%2Fadmin");
      return;
    }

    Promise.all([
      apiRequest("/api/admin"),
      fetchAdminData(),
    ])
      .then(([adminData, catalogData]) => {
        setUser(adminData.data);
        applyAdminData(catalogData);
      })
      .catch((err) => {
        if (err.message === "Unauthenticated.") {
          clearStoredToken();
          router.replace("/admin/login?redirect=%2Fadmin");
          return;
        }

        if (err.message === "Forbidden. Admin access only.") {
          setError("Bạn đã đăng nhập nhưng tài khoản chưa có quyền quản trị.");
          return;
        }

        setError(err.message || "Bạn không có quyền truy cập trang admin.");
      })
      .finally(() => setLoading(false));
  }, [applyAdminData, fetchAdminData, router]);

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    const productId = editingItem?.type === "product" ? editingItem.id : null;
    try {
      await apiRequest(productId ? `/api/products/${productId}` : "/api/products", {
        method: productId ? "PUT" : "POST",
        body: JSON.stringify({
          ...productForm,
          price: Number(productForm.price || 0),
          sale_price: Number(productForm.sale_price || 0),
          view: Number(productForm.view || 0),
          cat_id: Number(productForm.cat_id),
          brand_id: Number(productForm.brand_id),
        }),
      });
      setProductForm(emptyProductForm);
      setEditingItem(null);
      await loadAdminData();
    } catch (err) {
      setError(err.message || "Không thể tạo sản phẩm.");
    }
  };

  const removeProduct = async (id) => {
    try {
      await apiRequest(`/api/products/${id}`, { method: "DELETE" });
      await loadAdminData();
    } catch (err) {
      setError(err.message || "Không thể xóa sản phẩm.");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // The local session must still be cleared when the API is unavailable.
    } finally {
      clearStoredToken();
      router.replace("/");
    }
  };

  const activeTabLabel = adminTabs.find(([key]) => key === tab)?.[1] || "Bảng tổng hợp";
  const averagePrice = products.length
    ? Math.round(products.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0) / products.length)
    : 0;
  const discountedProducts = products.filter((product) => Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price));
  const brandMetrics = brands.map((brand) => {
    const brandProducts = products.filter((product) => Number(product.brand_id || product.cat_id) === Number(brand.id));
    const brandAverage = brandProducts.length
      ? Math.round(brandProducts.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0) / brandProducts.length)
      : 0;

    return { ...brand, productCount: brandProducts.length, averagePrice: brandAverage };
  }).filter((brand) => brand.productCount > 0);
  const chartMaximum = Math.max(...brandMetrics.map((brand) => brand.averagePrice), 1);
  const chartPoints = brandMetrics.map((brand, index) => ({
    ...brand,
    x: brandMetrics.length > 1 ? 28 + (index * 744) / (brandMetrics.length - 1) : 400,
    y: 174 - (brand.averagePrice / chartMaximum) * 142,
  }));
  const chartTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
    label: `${Math.round((chartMaximum * fraction) / 1000000)} tr`,
    y: 24 + (1 - fraction) * 150,
  }));
  const topProducts = [...products]
    .sort((first, second) => Number(second.sale_price || second.price || 0) - Number(first.sale_price || first.price || 0))
    .slice(0, 5);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-6 py-16 text-slate-600">Đang kiểm tra quyền admin...</main>;
  }

  if (error) {
    const isForbidden = error === "Bạn đã đăng nhập nhưng tài khoản chưa có quyền quản trị.";

    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        <div className="mt-4">
          <Link href={isForbidden ? "/" : "/login"} className="font-semibold text-teal-700">
            {isForbidden ? "Về trang chủ" : "Đăng nhập lại"}
          </Link>
        </div>
      </main>
    );
  }

  const summaryStats = [
    { label: "Sản phẩm", value: products.length.toLocaleString("vi-VN"), detail: "Đang có trong catalog", tone: "blue" },
    { label: "Thương hiệu", value: brands.length.toLocaleString("vi-VN"), detail: "Đang kinh doanh", tone: "green" },
    { label: "Giảm giá", value: discountedProducts.length.toLocaleString("vi-VN"), detail: "Sản phẩm có giá ưu đãi", tone: "coral" },
    { label: "Giá bán trung bình", value: `${averagePrice.toLocaleString("vi-VN")} đ`, detail: "Tính trên giá hiện tại", tone: "gold" },
  ];

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">▦</span>
          <span>LocPhat Admin</span>
        </Link>
        <div className="admin-account">
          <Link href="/admin" title="Tài khoản quản trị">{user?.name}</Link>
          <button type="button" onClick={handleAdminLogout} title="Đăng xuất" aria-label="Đăng xuất">↪</button>
        </div>
      </header>

      <div className="admin-contextbar">
        <h1>{activeTabLabel}</h1>
        <div className="admin-context-actions">
          <span className="admin-live-status"><span aria-hidden="true" /> Dữ liệu đang đồng bộ</span>
          <button
            type="button"
            onClick={async () => {
              setError("");
              try {
                await loadAdminData();
              } catch (err) {
                setError(err.message || "Không thể tải lại dữ liệu.");
              }
            }}
          >
            <span aria-hidden="true">↻</span> Cập nhật
          </button>
        </div>
      </div>

      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Các mục quản trị">
          <div className="admin-side-group">
            <p>TỔNG QUAN</p>
            <button type="button" className={tab === "dashboard" ? "is-active" : ""} onClick={() => setTab("dashboard")}>
              <span aria-hidden="true">◫</span> Bảng tổng hợp
            </button>
          </div>
          <div className="admin-side-group">
            <p>QUẢN LÝ CATALOG</p>
            <Link href="/admin/category" className="admin-side-link"><span aria-hidden="true">▤</span> Danh mục</Link>
            <Link href="/admin/brand" className="admin-side-link"><span aria-hidden="true">◇</span> Thương hiệu</Link>
            <Link href="/admin/product" className="admin-side-link">
              <span aria-hidden="true">▣</span> Sản phẩm
            </Link>
          </div>
          <div className="admin-side-group">
            <p>ĐƠN HÀNG & NỘI DUNG</p>
            <Link href="/admin/order" className="admin-side-link">Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact" className="admin-side-link">Liên hệ</Link>
            <Link href="/admin/article" className="admin-side-link">Bài viết</Link>
          </div>
          <div className="admin-side-group">
            <p>QUẢN LÝ CỬA HÀNG</p>
            <Link href="/admin/promotions" className="admin-side-link">Khuyến mãi</Link>
            <Link href="/admin/members" className="admin-side-link">Thành viên</Link>
            <Link href="/admin/inventory" className="admin-side-link">Kho hàng</Link>
          </div>
          <div className="admin-side-group admin-side-trash-group">
            <p>THÙNG RÁC</p>
            <Link href="/admin/category/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Danh mục</Link>
            <Link href="/admin/brand/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Thương hiệu</Link>
            <Link href="/admin/product/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Sản phẩm</Link>
            <Link href="/admin/order/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Liên hệ</Link>
            <Link href="/admin/article/trash" className="admin-side-link"><span aria-hidden="true">▧</span> Bài viết</Link>
          </div>
          <div className="admin-side-account">
            <span className="admin-avatar" aria-hidden="true">{user?.name?.slice(0, 1)?.toUpperCase() || "A"}</span>
            <span><strong>{user?.name}</strong><small>{user?.email}</small></span>
          </div>
        </aside>

        <section className="admin-content" aria-label={activeTabLabel}>
          <div className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">LOC PHAT MOBILE / QUẢN TRỊ</p>
              <h2>{tab === "dashboard" ? "Hiệu quả danh mục" : activeTabLabel}</h2>
              <p>{tab === "dashboard" ? "Tổng quan catalog điện thoại và mức giá đang kinh doanh." : `Quản lý dữ liệu ${activeTabLabel.toLowerCase()} trong cửa hàng.`}</p>
            </div>
            <span className="admin-period">Toàn bộ catalog</span>
          </div>

          {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}

          {tab === "dashboard" && (
            <>
              <div className="admin-kpi-grid">
                {summaryStats.map((stat) => (
                  <article className={`admin-kpi admin-kpi-${stat.tone}`} key={stat.label}>
                    <div className="admin-kpi-title"><span>{stat.label}</span><i aria-hidden="true" /></div>
                    <strong>{stat.value}</strong>
                    <small>{stat.detail}</small>
                  </article>
                ))}
              </div>

              <section className="admin-panel admin-chart-panel">
                <div className="admin-panel-heading">
                  <div>
                    <p className="admin-eyebrow">GIÁ BÁN HIỆN TẠI</p>
                    <h3>Giá trung bình theo thương hiệu</h3>
                  </div>
                  <span className="admin-chart-legend"><i aria-hidden="true" /> Giá ưu đãi trung bình</span>
                </div>
                {chartPoints.length ? (
                  <div className="admin-chart-wrap">
                    <div className="admin-chart-scale" aria-hidden="true">
                      {chartTicks.map((tick) => <span key={tick.y}>{tick.label}</span>)}
                    </div>
                    <div className="admin-chart-body">
                      <svg className="admin-line-chart" viewBox="0 0 800 200" preserveAspectRatio="none" role="img" aria-label="Giá bán trung bình theo thương hiệu">
                        {chartTicks.map((tick) => <line key={tick.y} x1="0" y1={tick.y} x2="800" y2={tick.y} />)}
                        <polyline points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")} />
                        {chartPoints.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r="4" />)}
                      </svg>
                      <div className="admin-chart-labels">
                        {chartPoints.map((point) => (
                          <div key={point.id}>
                            <strong>{(point.averagePrice / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr</strong>
                            <span>{point.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="admin-empty-chart">Chưa có sản phẩm để tổng hợp mức giá.</p>
                )}
              </section>

              <div className="admin-lower-grid">
                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div><p className="admin-eyebrow">CATALOG</p><h3>Thương hiệu nổi bật</h3></div>
                    <Link href="/admin/brand" className="admin-text-link">Quản lý</Link>
                  </div>
                  <div className="admin-brand-list">
                    {brandMetrics.slice(0, 5).map((brand) => (
                      <div className="admin-brand-row" key={brand.id}>
                        <span>{brand.name}</span>
                        <div><i style={{ width: `${Math.max(12, (brand.productCount / Math.max(products.length, 1)) * 100)}%` }} /></div>
                        <strong>{brand.productCount}</strong>
                      </div>
                    ))}
                    {!brandMetrics.length ? <p className="admin-empty-chart">Chưa có thương hiệu.</p> : null}
                  </div>
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div><p className="admin-eyebrow">GIÁ BÁN</p><h3>Sản phẩm giá cao</h3></div>
                  </div>
                  <div className="admin-top-products">
                    {topProducts.map((product) => (
                      <div className="admin-top-product" key={product.id}>
                        <span>{product.name}</span>
                        <strong>{Number(product.sale_price || product.price || 0).toLocaleString("vi-VN")} đ</strong>
                      </div>
                    ))}
                    {!topProducts.length ? <p className="admin-empty-chart">Chưa có sản phẩm.</p> : null}
                  </div>
                </section>
              </div>
            </>
          )}

      {tab === "products" && (
        <div className="admin-manage-grid">
          <div className="admin-panel">
            <h2 className="text-xl font-semibold text-slate-900">Danh sách sản phẩm</h2>
            <div className="mt-4 space-y-3">
              {products.map((item) => (
                <div key={item.product_id || item.id} className="admin-list-item">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product_name || item.name}</p>
                      <p className="text-sm text-slate-500">{item.price ? Number(item.price).toLocaleString("vi-VN") + " đ" : ""}</p>
                    </div>
                    <div className="admin-list-actions">
                      <button type="button" onClick={() => editProduct(item)} className="admin-edit-button">Sửa</button>
                      <button type="button" onClick={() => removeProduct(item.product_id || item.id)} className="admin-delete-button">Xóa</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleProductSubmit} className="admin-panel admin-form">
            <h2 className="text-xl font-semibold text-slate-900">{editingItem?.type === "product" ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={productForm.product_name}
                onChange={(event) => setProductForm({ ...productForm, product_name: event.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
                placeholder="Tên sản phẩm"
                required
              />
              <select
                value={productForm.cat_id}
                onChange={(event) => {
                  const brandId = Number(event.target.value);
                  setProductForm({ ...productForm, cat_id: brandId, brand_id: brandId });
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
                required
              >
                <option value="">Chọn thương hiệu</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={productForm.price}
                onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
                placeholder="Giá"
              />
              <input
                type="number"
                value={productForm.sale_price}
                onChange={(event) => setProductForm({ ...productForm, sale_price: event.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
                placeholder="Giá khuyến mại"
              />
              <textarea
                value={productForm.summary}
                onChange={(event) => setProductForm({ ...productForm, summary: event.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600"
                placeholder="Mô tả ngắn"
              />
              <button type="submit" className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white">
                {editingItem?.type === "product" ? "Cập nhật sản phẩm" : "Lưu sản phẩm"}
              </button>
              {editingItem?.type === "product" ? <button type="button" onClick={cancelEditing} className="admin-cancel-button">Hủy sửa</button> : null}
            </div>
          </form>
        </div>
      )}
        </section>
      </div>
    </main>
  );
}
