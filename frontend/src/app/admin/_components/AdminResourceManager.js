"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";
import { productImageUrl } from "@/lib/productImageUrl";
import ProductImage from "@/app/_components/ProductImage";

const pageSize = 15;
const definitions = {
  categories: { label: "Danh mục", singular: "danh mục", base: "/api/categories", admin: "/api/admin/categories" },
  brands: { label: "Thương hiệu", singular: "thương hiệu", base: "/api/brands", admin: "/api/admin/brands" },
  products: { label: "Sản phẩm", singular: "sản phẩm", base: "/api/products", admin: "/api/admin/products" },
};

const emptyCategory = { cat_name: "", parent_id: 0, status: 1, sort_order: 0 };
const emptyBrand = { cat_name: "", parent_id: "", status: 1, sort_order: 0 };
const emptyProduct = {
  product_name: "", cat_id: "", brand_id: "", price: "", sale_price: "", detail: "",
  summary: "", image: "", tag: "", status: 1, view: 0, launch_date: "",
};

function getItems(response) {
  return response.data || [];
}

function getRecordId(record, type) {
  return type === "products" ? record.product_id : record.cat_id;
}

function getRecordName(record, type) {
  return type === "products" ? record.product_name : record.cat_name;
}

function getErrorMessage(error, fallback) {
  return Object.values(error.errors || {}).flat()[0] || error.message || fallback;
}

export default function AdminResourceManager({ resourceType, initialTrash = false }) {
  const router = useRouter();
  const definition = definitions[resourceType];
  const resourcePath = resourceType === "categories" ? "/admin/category" : resourceType === "brands" ? "/admin/brand" : "/admin/product";
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imageObjectUrlRef = useRef(null);
  const detailDialogRef = useRef(null);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [trash, setTrash] = useState(initialTrash);
  const [form, setForm] = useState(() => resourceType === "categories"
    ? emptyCategory
    : resourceType === "brands" ? emptyBrand : emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
  }, []);

  useEffect(() => {
    if (detailRecord && detailDialogRef.current && !detailDialogRef.current.open) {
      detailDialogRef.current.showModal();
    }
  }, [detailRecord]);

  const loadRecords = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), per_page: String(pageSize), trash: trash ? "1" : "0" });
    if (search) params.set("search", search);

    const response = await apiRequest(`${definition.admin}?${params}`);
    setRecords(getItems(response));
    setPagination({
      current_page: response.current_page || 1,
      last_page: response.last_page || 1,
      total: response.total || 0,
    });
  }, [definition.admin, page, search, trash]);

  useEffect(() => {
    let active = true;
    const redirect = `/admin/login?redirect=${encodeURIComponent(initialTrash ? `${resourcePath}/trash` : resourcePath)}`;

    if (!getStoredToken()) {
      router.replace(redirect);
      return () => { active = false; };
    }

    async function loadPage() {
      try {
        const requests = [apiRequest("/api/admin"), loadRecords()];
        if (resourceType !== "categories") {
          requests.push(apiRequest("/api/categories?per_page=100"));
        }
        if (resourceType === "products") {
          requests.push(apiRequest("/api/brands?per_page=100"));
        }
        const results = await Promise.all(requests);
        if (!active) return;

        setUser(results[0].data);
        if (resourceType !== "categories") setCategories(getItems(results[2]));
        if (resourceType === "products") setBrands(getItems(results[3]));

        if (resourceType === "brands") {
          const phone = getItems(results[2]).find((category) => category.slug === "dien-thoai-di-dong");
          setForm((previous) => ({ ...previous, parent_id: previous.parent_id || phone?.id || "" }));
        }
        if (resourceType === "products") {
          const firstBrand = getItems(results[3])[0];
          setForm((previous) => previous.cat_id ? previous : {
            ...previous,
            cat_id: firstBrand?.id || "",
            brand_id: firstBrand?.id || "",
          });
        }
      } catch (requestError) {
        if (requestError.status === 401 || requestError.message === "Unauthenticated.") {
          clearStoredToken();
          router.replace(redirect);
          return;
        }
        if (active) setError(getErrorMessage(requestError, `Không thể tải ${definition.label.toLowerCase()}.`));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();
    return () => { active = false; };
  }, [definition.label, initialTrash, loadRecords, resourcePath, resourceType, router]);

  const refresh = async () => {
    setError("");
    try {
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể tải ${definition.label.toLowerCase()}.`));
    }
  };

  const clearImageSelection = () => {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    imageObjectUrlRef.current = null;
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(resourceType === "categories" ? emptyCategory : resourceType === "brands" ? emptyBrand : emptyProduct);
    clearImageSelection();
  };

  const focusForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 250);
  };

  const editRecord = (record) => {
    setEditingId(getRecordId(record, resourceType));
    clearImageSelection();
    if (resourceType === "products") {
      setForm({
        ...emptyProduct,
        product_name: record.product_name || "",
        cat_id: record.cat_id || "",
        brand_id: record.brand_id || record.cat_id || "",
        price: record.price ?? "",
        sale_price: record.sale_price ?? "",
        detail: record.detail || "",
        summary: record.summary || "",
        image: record.image || "",
        tag: record.tag || "",
        status: Number(record.status ?? 1),
        view: Number(record.view || 0),
        launch_date: record.launch_date || "",
      });
    } else {
      setForm({
        cat_name: record.cat_name || "",
        parent_id: Number(record.parent_id || 0),
        status: Number(record.status ?? 1),
        sort_order: Number(record.sort_order || 0),
      });
    }
    setError("");
    setNotice("");
    focusForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = resourceType === "products"
      ? {
        ...form,
        cat_id: Number(form.cat_id),
        brand_id: Number(form.cat_id),
        price: Number(form.price || 0),
        sale_price: form.sale_price === "" ? null : Number(form.sale_price),
        view: Number(form.view || 0),
        status: Number(form.status),
      }
      : {
        ...form,
        parent_id: Number(form.parent_id || 0),
        status: Number(form.status),
        sort_order: Number(form.sort_order || 0),
      };

    try {
      let body = JSON.stringify(payload);
      let method = editingId ? "PUT" : "POST";

      if (resourceType === "products") {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value ?? ""));
        if (imageFile) formData.set("image", imageFile);
        if (editingId) formData.set("_method", "PUT");
        body = formData;
        method = "POST";
      }

      await apiRequest(editingId ? `${definition.base}/${editingId}` : definition.base, {
        method,
        body,
      });
      setNotice(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} ${editingId ? "đã được cập nhật." : "đã được thêm."}`);
      resetForm();
      try {
        await loadRecords();
      } catch (requestError) {
        setError(getErrorMessage(requestError, `Đã lưu thành công nhưng không thể tải lại ${definition.label.toLowerCase()}.`));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể lưu ${definition.singular}.`));
    } finally {
      setSaving(false);
    }
  };

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const removeRecord = async (record) => {
    const id = getRecordId(record, resourceType);
    const permanent = trash;
    if (permanent && !window.confirm(`Xóa vĩnh viễn ${definition.singular} này? Thao tác không thể hoàn tác.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(permanent ? `${definition.admin}/${id}/force` : `${definition.base}/${id}`, {
        method: "DELETE",
      });
      setNotice(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} ${permanent ? "đã được xóa vĩnh viễn." : "đã được chuyển vào thùng rác."}`);
      try {
        await loadRecords();
      } catch (requestError) {
        setError(getErrorMessage(requestError, `Đã xóa thành công nhưng không thể tải lại ${definition.label.toLowerCase()}.`));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể xóa ${definition.singular}.`));
    }
  };

  const restoreRecord = async (record) => {
    const id = getRecordId(record, resourceType);
    setError("");
    setNotice("");
    try {
      await apiRequest(`${definition.admin}/${id}/restore`, { method: "POST" });
      setNotice(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} đã được khôi phục.`);
      try {
        await loadRecords();
      } catch (requestError) {
        setError(getErrorMessage(requestError, `Đã khôi phục thành công nhưng không thể tải lại ${definition.label.toLowerCase()}.`));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể khôi phục ${definition.singular}.`));
    }
  };

  const closeProductDetails = () => detailDialogRef.current?.close();

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Always clear the local session when the API is unavailable.
    } finally {
      clearStoredToken();
      router.replace("/");
    }
  };

  if (loading) return <main className="admin-loading">Đang kiểm tra quyền admin...</main>;
  if (!user) {
    return (
      <main className="admin-loading">
        <p role="alert">{error || "Bạn không có quyền truy cập trang quản trị."}</p>
        <Link href="/admin">Về trang quản trị</Link>
      </main>
    );
  }

  const phoneCategory = categories.find((category) => category.slug === "dien-thoai-di-dong");
  const title = definition.label;

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">▦</span><span>LocPhat Admin</span></Link>
        <div className="admin-account">
          <Link href="/me" title="Thông tin tài khoản">{user.name}</Link>
          <button type="button" onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất">↪</button>
        </div>
      </header>

      <div className="admin-contextbar">
        <h1>{title}</h1>
        <div className="admin-context-actions">
          <span className="admin-live-status"><span aria-hidden="true" /> Dữ liệu đang đồng bộ</span>
          <button type="button" onClick={refresh}><span aria-hidden="true">↻</span> Cập nhật</button>
        </div>
      </div>

      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Các mục quản trị">
          <div className="admin-side-group"><p>TỔNG QUAN</p><Link href="/admin" className="admin-side-link"><span aria-hidden="true">◫</span> Bảng tổng hợp</Link></div>
          <div className="admin-side-group">
            <p>QUẢN LÝ CATALOG</p>
            <Link href="/admin/category" className={`admin-side-link ${resourceType === "categories" && !trash ? "is-active" : ""}`}><span aria-hidden="true">▤</span> Danh mục</Link>
            <Link href="/admin/brand" className={`admin-side-link ${resourceType === "brands" && !trash ? "is-active" : ""}`}><span aria-hidden="true">◇</span> Thương hiệu</Link>
            <Link href="/admin/product" className={`admin-side-link ${resourceType === "products" && !trash ? "is-active" : ""}`}><span aria-hidden="true">▣</span> Sản phẩm</Link>
          </div>
          <div className="admin-side-group"><p>QUẢN LÝ CỬA HÀNG</p><Link href="/admin/promotions" className="admin-side-link">Khuyến mãi</Link><Link href="/admin/members" className="admin-side-link">Thành viên</Link><Link href="/admin/inventory" className="admin-side-link">Kho hàng</Link></div>
          <div className="admin-side-group">
            <p>ĐƠN HÀNG & NỘI DUNG</p>
            <Link href="/admin/cart" className="admin-side-link">Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact" className="admin-side-link">Liên hệ</Link>
            <Link href="/admin/article" className="admin-side-link">Bài viết</Link>
          </div>
          <div className="admin-side-group admin-side-trash-group">
            <p>THÙNG RÁC</p>
            <Link href="/admin/category/trash" className={`admin-side-link ${resourceType === "categories" && trash ? "is-active" : ""}`}><span aria-hidden="true">▧</span> Danh mục</Link>
            <Link href="/admin/brand/trash" className={`admin-side-link ${resourceType === "brands" && trash ? "is-active" : ""}`}><span aria-hidden="true">▧</span> Thương hiệu</Link>
            <Link href="/admin/product/trash" className={`admin-side-link ${resourceType === "products" && trash ? "is-active" : ""}`}><span aria-hidden="true">▧</span> Sản phẩm</Link>
            <Link href="/admin/cart/trash" className="admin-side-link">Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact/trash" className="admin-side-link">Liên hệ</Link>
            <Link href="/admin/article/trash" className="admin-side-link">Bài viết</Link>
          </div>
          <div className="admin-side-account"><span className="admin-avatar" aria-hidden="true">{user.name?.slice(0, 1)?.toUpperCase() || "A"}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
        </aside>

        <section className="admin-content" aria-label={`Quản lý ${title.toLowerCase()}`}>
          <div className="admin-page-heading admin-resource-heading">
            <div className="admin-resource-heading-copy">
              <p className="admin-eyebrow">LOC PHAT MOBILE <span aria-hidden="true">/</span> QUẢN TRỊ CATALOG</p>
              <h2>{trash ? `Thùng rác ${title.toLowerCase()}` : `Quản lý ${title.toLowerCase()}`}</h2>
              <p>{trash ? "Khôi phục mục đã xóa hoặc xóa vĩnh viễn." : `Theo dõi và cập nhật ${title.toLowerCase()} của cửa hàng.`}</p>
            </div>
            <div className="admin-resource-heading-actions">
              <span className="admin-resource-count"><strong>{pagination.total.toLocaleString("vi-VN")}</strong><small>{trash ? "trong thùng rác" : "mục hiện có"}</small></span>
              {!trash && !editingId ? <button className="admin-primary-action" type="button" onClick={focusForm}><span aria-hidden="true">＋</span> Thêm {definition.singular}</button> : null}
            </div>
          </div>

          {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}
          {notice ? <p className="admin-inline-notice" role="status" aria-live="polite">{notice}</p> : null}

          <section className="admin-panel admin-resource-panel">
            <div className="admin-resource-toolbar">
              <div className="admin-resource-tabs" role="tablist" aria-label="Trạng thái bản ghi">
                <Link role="tab" aria-selected={!trash} className={!trash ? "is-active" : ""} href={resourcePath}>Đang quản lý</Link>
                <Link role="tab" aria-selected={trash} className={trash ? "is-active" : ""} href={`${resourcePath}/trash`}>Thùng rác</Link>
              </div>
              <form className="admin-resource-search" onSubmit={applySearch}>
                <label className="visually-hidden" htmlFor="admin-resource-search">Tìm {definition.singular}</label>
                <input id="admin-resource-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Tìm ${definition.singular}...`} />
                <button type="submit" aria-label="Tìm kiếm">⌕</button>
              </form>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-resource-table">
                <thead><tr><th>Tên</th><th>{resourceType === "products" ? "Giá bán" : "Alias"}</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                  {records.map((record) => {
                    const id = getRecordId(record, resourceType);
                    const name = getRecordName(record, resourceType);
                    const secondary = resourceType === "products"
                      ? record.brand?.cat_name || record.alias
                      : record.alias;
                    return (
                      <tr key={id}>
                        <td>
                          {resourceType === "products" ? (
                            <span className="admin-product-thumb">
                              <ProductImage product={record} src={record.image ? productImageUrl(record.image) : undefined} alt="" width={48} height={48} unoptimized />
                            </span>
                          ) : null}
                          <span className="admin-record-copy"><strong>{name}</strong><small>{resourceType === "products" ? `${secondary} · #${id}` : `#${id} · ${secondary || "Chưa có alias"}`}</small></span>
                        </td>
                        <td>{resourceType === "products" ? `${Number(record.price || 0).toLocaleString("vi-VN")} đ` : secondary || "—"}</td>
                        <td><span className={`admin-status ${Number(record.status) === 1 ? "is-enabled" : "is-disabled"}`}>{Number(record.status) === 1 ? "Hoạt động" : "Đã ẩn"}</span></td>
                        <td><div className="admin-list-actions">
                          {resourceType === "products" && !trash ? <button type="button" className="admin-view-button" onClick={() => setDetailRecord(record)}>Chi tiết</button> : null}
                          {trash ? <button type="button" className="admin-edit-button" onClick={() => restoreRecord(record)}>Khôi phục</button> : <button type="button" className="admin-edit-button" onClick={() => editRecord(record)}>Sửa</button>}
                          <button type="button" className="admin-delete-button" onClick={() => removeRecord(record)}>{trash ? "Xóa vĩnh viễn" : "Chuyển vào thùng rác"}</button>
                        </div></td>
                      </tr>
                    );
                  })}
                  {!records.length ? <tr><td colSpan="4" className="admin-table-empty">{trash ? "Thùng rác đang trống." : `Chưa có ${definition.singular} nào.`}</td></tr> : null}
                </tbody>
              </table>
            </div>

            <footer className="admin-pagination">
              <span>Trang {pagination.current_page} / {pagination.last_page} · {pagination.total.toLocaleString("vi-VN")} mục</span>
              <div><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Trang trước">←</button><button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((current) => current + 1)} aria-label="Trang sau">→</button></div>
            </footer>
          </section>

          {!trash ? (
            <form ref={formRef} onSubmit={handleSubmit} className="admin-panel admin-form admin-resource-form">
              <div className="admin-resource-form-heading">
                <div><p className="admin-eyebrow">{editingId ? "CHỈNH SỬA BẢN GHI" : "TẠO BẢN GHI MỚI"}</p><h3>{editingId ? `Sửa ${definition.singular}` : `Thêm ${definition.singular}`}</h3></div>
                {editingId ? <button type="button" className="admin-cancel-button" onClick={resetForm}>Hủy sửa</button> : <span>Thông tin có dấu * là bắt buộc</span>}
              </div>
              {resourceType === "products" ? (
                <>
                  <label>Tên sản phẩm *<input ref={nameInputRef} id="resource-name" value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} required /></label>
                  <label>Thương hiệu<select value={form.cat_id} onChange={(event) => setForm({ ...form, cat_id: event.target.value, brand_id: event.target.value })} required><option value="">Chọn thương hiệu</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
                  <label>Giá bán<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
                  <label>Giá khuyến mại<input type="number" min="0" step="0.01" value={form.sale_price} onChange={(event) => setForm({ ...form, sale_price: event.target.value })} /></label>
                  <div className="admin-image-field">
                    <label htmlFor="product-image">Ảnh sản phẩm</label>
                    <div className="admin-image-picker">
                      <input ref={imageInputRef} id="product-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        clearImageSelection();
                        if (file) {
                          const objectUrl = URL.createObjectURL(file);
                          imageObjectUrlRef.current = objectUrl;
                          setImageFile(file);
                          setImagePreview(objectUrl);
                        }
                      }} />
                      <small>JPG, PNG hoặc WEBP · tối đa 5 MB</small>
                    </div>
                    {(imagePreview || form.image) ? (
                      <div className="admin-image-preview">
                        <ProductImage product={{ product_name: form.product_name }} src={imagePreview || productImageUrl(form.image)} alt="Ảnh xem trước sản phẩm" width={96} height={96} unoptimized />
                        <div><strong>{imageFile?.name || "Ảnh hiện tại"}</strong><small>{imageFile ? `${Math.ceil(imageFile.size / 1024)} KB` : form.image}</small></div>
                        {imageFile ? <button type="button" className="admin-cancel-button" onClick={clearImageSelection}>Bỏ ảnh mới</button> : null}
                      </div>
                    ) : <div className="admin-image-empty">▣ <span>Chưa có ảnh sản phẩm</span></div>}
                  </div>
                  <label>Ngày mở bán<input type="date" value={form.launch_date} onChange={(event) => setForm({ ...form, launch_date: event.target.value })} /></label>
                  <label>Tags<input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} /></label>
                  <label>Mô tả ngắn<textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
                  <label>Chi tiết<textarea value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} /></label>
                </>
              ) : (
                <>
                  <label>Tên {definition.singular} *<input ref={nameInputRef} id="resource-name" value={form.cat_name} onChange={(event) => setForm({ ...form, cat_name: event.target.value })} required /></label>
                  {resourceType === "brands" ? (
                    <label>Danh mục<select value={form.parent_id} onChange={(event) => setForm({ ...form, parent_id: event.target.value })} required><option value="">Chọn danh mục điện thoại</option>{phoneCategory ? <option value={phoneCategory.id}>{phoneCategory.name}</option> : null}</select></label>
                  ) : (
                    <label>Danh mục cha<select value={form.parent_id} onChange={(event) => setForm({ ...form, parent_id: Number(event.target.value) })}><option value={0}>Danh mục gốc</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  )}
                  <label>Thứ tự hiển thị<input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} /></label>
                </>
              )}
              <label>Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value={1}>Đang hoạt động</option><option value={0}>Đã ẩn</option></select></label>
              <button type="submit" disabled={saving}>{saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : `Thêm ${definition.singular}`}</button>
            </form>
          ) : null}
        </section>
      </div>

      {resourceType === "products" ? (
        <dialog ref={detailDialogRef} className="admin-product-dialog" onClose={() => setDetailRecord(null)} onClick={(event) => {
          if (event.target === event.currentTarget) closeProductDetails();
        }}>
          {detailRecord ? (
            <article className="admin-product-detail">
              <header className="admin-product-detail-heading">
                <div><p className="admin-eyebrow">CHI TIẾT SẢN PHẨM · #{detailRecord.product_id}</p><h2>{detailRecord.product_name}</h2></div>
                <button type="button" className="admin-icon-button" aria-label="Đóng chi tiết" onClick={closeProductDetails}>×</button>
              </header>
              <div className="admin-product-detail-body">
                <div className="admin-product-detail-image">
                  <ProductImage product={detailRecord} src={detailRecord.image ? productImageUrl(detailRecord.image) : undefined} alt={detailRecord.product_name} width={280} height={280} unoptimized />
                </div>
                <div className="admin-product-detail-info">
                  <dl>
                    <div><dt>Thương hiệu</dt><dd>{detailRecord.brand?.cat_name || "Chưa có"}</dd></div>
                    <div><dt>Danh mục</dt><dd>{detailRecord.category?.cat_name || "Chưa có"}</dd></div>
                    <div><dt>Giá bán</dt><dd>{Number(detailRecord.price || 0).toLocaleString("vi-VN")} đ</dd></div>
                    <div><dt>Giá khuyến mại</dt><dd>{detailRecord.sale_price ? `${Number(detailRecord.sale_price).toLocaleString("vi-VN")} đ` : "Không áp dụng"}</dd></div>
                    <div><dt>Trạng thái</dt><dd>{Number(detailRecord.status) === 1 ? "Hoạt động" : "Đã ẩn"}</dd></div>
                    <div><dt>Lượt xem</dt><dd>{Number(detailRecord.view || 0).toLocaleString("vi-VN")}</dd></div>
                    <div><dt>Ngày mở bán</dt><dd>{detailRecord.launch_date || "Chưa cập nhật"}</dd></div>
                    <div><dt>Alias</dt><dd>{detailRecord.alias || "—"}</dd></div>
                  </dl>
                  {detailRecord.tag ? <p className="admin-product-detail-tags">{detailRecord.tag}</p> : null}
                </div>
              </div>
              {detailRecord.summary ? <section className="admin-product-detail-copy"><h3>Mô tả ngắn</h3><p>{detailRecord.summary}</p></section> : null}
              {detailRecord.detail ? <section className="admin-product-detail-copy"><h3>Thông tin chi tiết</h3><p>{detailRecord.detail}</p></section> : null}
              <footer><button type="button" className="admin-primary-action" onClick={closeProductDetails}>Đóng</button></footer>
            </article>
          ) : null}
        </dialog>
      ) : null}
    </main>
  );
}