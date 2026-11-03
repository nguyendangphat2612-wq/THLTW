"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";
import BrandServices from "@/services/BrandServices";
import CategoryServices from "@/services/CategoryServices";

const emptyCategoryForm = { cat_name: "", parent_id: 0, status: 1, sort_order: 0 };
const emptyBrandForm = { cat_name: "", parent_id: "", status: 1, sort_order: 0 };

function getErrorMessage(error, fallback) {
  const response = error.response?.data;
  const validationMessage = Object.values(response?.errors || {}).flat()[0];
  return validationMessage || response?.message || error.message || fallback;
}

export default function AdminCatalogManager({ resourceType }) {
  const router = useRouter();
  const isBrand = resourceType === "brands";
  const resourceName = isBrand ? "thương hiệu" : "danh mục";
  const route = isBrand ? "/admin/brand" : "/admin/category";
  const service = isBrand ? BrandServices : CategoryServices;
  const emptyForm = isBrand ? emptyBrandForm : emptyCategoryForm;
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRecords = useCallback(async () => {
    const [items, categoryItems] = await Promise.all([
      service.list({ per_page: 100 }),
      isBrand ? CategoryServices.list({ per_page: 100 }) : Promise.resolve([]),
    ]);
    setRecords(items);
    setCategories(categoryItems);

    if (isBrand) {
      const phoneCategory = categoryItems.find((category) => category.slug === "dien-thoai-di-dong");
      setForm((previous) => ({
        ...previous,
        parent_id: previous.parent_id || phoneCategory?.id || "",
      }));
    }
  }, [isBrand, service]);

  useEffect(() => {
    let active = true;
    const loginUrl = `/admin/login?redirect=${encodeURIComponent(route)}`;

    if (!getStoredToken()) {
      router.replace(loginUrl);
      return () => { active = false; };
    }

    const loadPage = async () => {
      try {
        const [adminData] = await Promise.all([
          apiRequest("/api/admin"),
          loadRecords(),
        ]);
        if (active) setUser(adminData.data);
      } catch (requestError) {
        if (requestError.status === 401 || requestError.message === "Unauthenticated.") {
          clearStoredToken();
          router.replace(loginUrl);
          return;
        }
        if (active) {
          setError(requestError.message === "Forbidden. Admin access only."
            ? "Tài khoản chưa có quyền quản trị."
            : getErrorMessage(requestError, `Không thể tải ${resourceName}.`));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();
    return () => { active = false; };
  }, [loadRecords, resourceName, route, router]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEditing = (record) => {
    setEditingId(record.id || record.cat_id);
    setForm({
      cat_name: record.cat_name || record.name || "",
      parent_id: Number(record.parent_id || record.category_id || 0),
      status: Number(record.status ?? 1),
      sort_order: Number(record.sort_order || 0),
    });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      parent_id: Number(form.parent_id || 0),
      status: Number(form.status ?? 1),
      sort_order: Number(form.sort_order || 0),
    };

    try {
      if (editingId) {
        await service.update(editingId, payload);
      } else {
        await service.create(payload);
      }
      resetForm();
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể lưu ${resourceName}.`));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (record) => {
    setError("");
    try {
      await service.remove(record.id || record.cat_id);
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể xóa ${resourceName}.`));
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Clear the local session even if the API is unavailable.
    } finally {
      clearStoredToken();
      router.replace("/");
    }
  };

  const refresh = async () => {
    setError("");
    try {
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể tải lại ${resourceName}.`));
    }
  };

  if (loading) return <main className="admin-loading">Đang kiểm tra quyền admin...</main>;
  if (!user && error) {
    return (
      <main className="admin-loading">
        <p role="alert">{error}</p>
        <Link href="/admin">Về trang quản trị</Link>
      </main>
    );
  }

  const pageTitle = isBrand ? "Thương hiệu" : "Danh mục";
  const phoneCategory = categories.find((category) => category.slug === "dien-thoai-di-dong");

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">▦</span>
          <span>Bảng Tổng hợp</span>
        </Link>
        <nav className="admin-top-nav" aria-label="Điều hướng quản trị">
          <Link href="/admin">Bảng tổng hợp</Link>
          <Link href="/admin/category" aria-current={!isBrand ? "page" : undefined}>Danh mục</Link>
          <Link href="/admin/brand" aria-current={isBrand ? "page" : undefined}>Thương hiệu</Link>
          <Link href="/admin?tab=products">Sản phẩm</Link>
        </nav>
        <div className="admin-account">
          <Link href="/admin" title="Tài khoản quản trị">{user?.name}</Link>
          <button type="button" onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất">↪</button>
        </div>
      </header>

      <div className="admin-contextbar">
        <h1>{pageTitle}</h1>
        <div className="admin-context-actions">
          <span className="admin-live-status"><span aria-hidden="true" /> Dữ liệu đang đồng bộ</span>
          <button type="button" onClick={refresh}><span aria-hidden="true">↻</span> Cập nhật</button>
        </div>
      </div>

      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Các mục quản trị">
          <div className="admin-side-group">
            <p>TỔNG QUAN</p>
            <Link href="/admin" className="admin-side-link"><span aria-hidden="true">◫</span> Bảng tổng hợp</Link>
          </div>
          <div className="admin-side-group">
            <p>QUẢN LÝ CATALOG</p>
            <Link href="/admin/category" className={`admin-side-link ${!isBrand ? "is-active" : ""}`}><span aria-hidden="true">▤</span> Danh mục</Link>
            <Link href="/admin/brand" className={`admin-side-link ${isBrand ? "is-active" : ""}`}><span aria-hidden="true">◇</span> Thương hiệu</Link>
            <Link href="/admin?tab=products" className="admin-side-link"><span aria-hidden="true">▣</span> Sản phẩm</Link>
          </div>
          <div className="admin-side-group"><p>QUẢN LÝ CỬA HÀNG</p><Link href="/admin/promotions" className="admin-side-link">Khuyến mãi</Link><Link href="/admin/members" className="admin-side-link">Thành viên</Link><Link href="/admin/inventory" className="admin-side-link">Kho hàng</Link></div>
          <div className="admin-side-account">
            <span className="admin-avatar" aria-hidden="true">{user?.name?.slice(0, 1)?.toUpperCase() || "A"}</span>
            <span><strong>{user?.name}</strong><small>{user?.email}</small></span>
          </div>
        </aside>

        <section className="admin-content" aria-label={pageTitle}>
          <div className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">LOC PHAT MOBILE / QUẢN TRỊ</p>
              <h2>{editingId ? `Sửa ${resourceName}` : `Quản lý ${resourceName}`}</h2>
              <p>Danh sách và thông tin {resourceName} đang kinh doanh.</p>
            </div>
            <span className="admin-period">{records.length} mục</span>
          </div>

          {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}

          <div className="admin-manage-grid">
            <section className="admin-panel">
              <h2>{pageTitle}</h2>
              <div className="admin-list-items">
                {records.map((record) => (
                  <article className="admin-list-item" key={record.id || record.cat_id}>
                    <div>
                      <p className="admin-record-name">{record.cat_name || record.name}</p>
                      <p className="admin-record-meta">
                        {isBrand ? `Danh mục cha: ${record.parent_id}` : `Alias: ${record.slug || record.alias}`}
                      </p>
                    </div>
                    <div className="admin-list-actions">
                      <button type="button" onClick={() => startEditing(record)} className="admin-edit-button">Sửa</button>
                      <button type="button" onClick={() => removeRecord(record)} className="admin-delete-button">Xóa</button>
                    </div>
                  </article>
                ))}
                {!records.length ? <p className="admin-empty-chart">Chưa có {resourceName}.</p> : null}
              </div>
            </section>

            <form onSubmit={handleSubmit} className="admin-panel admin-form">
              <h2>{editingId ? `Sửa ${resourceName}` : `Thêm ${resourceName}`}</h2>
              <input
                value={form.cat_name}
                onChange={(event) => setForm((previous) => ({ ...previous, cat_name: event.target.value }))}
                placeholder={`Tên ${resourceName}`}
                aria-label={`Tên ${resourceName}`}
                required
              />
              {isBrand ? (
                <select
                  value={form.parent_id}
                  onChange={(event) => setForm((previous) => ({ ...previous, parent_id: Number(event.target.value) }))}
                  aria-label="Danh mục cha"
                  required
                >
                  <option value="">Chọn danh mục điện thoại</option>
                  {phoneCategory ? <option value={phoneCategory.id}>{phoneCategory.name}</option> : null}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.parent_id}
                  onChange={(event) => setForm((previous) => ({ ...previous, parent_id: Number(event.target.value) }))}
                  placeholder="ID danh mục cha (0 nếu là danh mục gốc)"
                  aria-label="ID danh mục cha"
                  min="0"
                />
              )}
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((previous) => ({ ...previous, sort_order: Number(event.target.value) }))}
                placeholder="Thứ tự hiển thị"
                aria-label="Thứ tự hiển thị"
                min="0"
              />
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: Number(event.target.value) }))}
                aria-label="Trạng thái"
              >
                <option value={1}>Đang hoạt động</option>
                <option value={0}>Đã ẩn</option>
              </select>
              <div className="admin-form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm mới"}
                </button>
                {editingId ? <button type="button" className="admin-cancel-button" onClick={resetForm}>Hủy</button> : null}
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
