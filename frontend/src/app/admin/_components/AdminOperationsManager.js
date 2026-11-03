"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";

const definitions = {
  contacts: {
    label: "Liên hệ",
    singular: "liên hệ",
    base: "/api/admin/contacts",
    route: "/admin/contact",
    empty: { name: "", email: "", subject: "", message: "" },
  },
  orders: {
    label: "Giỏ hàng / Đơn hàng",
    singular: "đơn hàng",
    base: "/api/admin/orders",
    route: "/admin/cart",
    empty: { customer_name: "", email: "", phone: "", address: "", status: "pending", items: [] },
  },
  articles: {
    label: "Bài viết",
    singular: "bài viết",
    base: "/api/admin/articles",
    route: "/admin/article",
    empty: { title: "", excerpt: "", content: "", published_at: "", status: 1 },
  },
};

const statusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const nextOrderStatus = {
  pending: "confirmed",
  confirmed: "shipping",
  shipping: "completed",
};

const paymentMethodLabels = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPay Sandbox",
  momo: "MoMo Sandbox",
};

const paymentStatusLabels = {
  unpaid: "Chưa thanh toán",
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
};

const notificationEmailStatusLabels = {
  unknown: "Chưa có dữ liệu email",
  pending: "Đang gửi email",
  sent: "SMTP đã chấp nhận email",
  failed: "Gửi email thất bại",
  not_configured: "Chưa cấu hình Gmail",
};

const confirmationEmailStatusLabels = {
  unknown: "Chưa có dữ liệu",
  pending: "Đang gửi",
  sent: "Đã được Gmail chấp nhận",
  failed: "Gửi thất bại",
  not_configured: "SMTP chưa cấu hình",
};

function getErrorMessage(error, fallback) {
  return Object.values(error.errors || {}).flat()[0] || error.message || fallback;
}

function recordTitle(record, type) {
  if (type === "contacts") return record.subject;
  if (type === "orders") return `Đơn #${record.id} · ${record.customer_name}`;
  return record.title;
}

function recordId(record) {
  return record.id;
}

export default function AdminOperationsManager({ resourceType, initialTrash = false }) {
  const router = useRouter();
  const definition = definitions[resourceType];
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [originalItems, setOriginalItems] = useState("");
  const [form, setForm] = useState(definition.empty);
  const [editingId, setEditingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const loadRecords = useCallback(async () => {
    const params = new URLSearchParams({ per_page: "100", trash: initialTrash ? "1" : "0" });
    if (search) params.set("search", search);
    const response = await apiRequest(`${definition.base}?${params}`);
    setRecords(response.data || []);
  }, [definition.base, initialTrash, search]);

  useEffect(() => {
    let active = true;
    const returnPath = initialTrash ? `${definition.route}/trash` : definition.route;
    const redirect = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;

    if (!getStoredToken()) {
      router.replace(redirect);
      return () => { active = false; };
    }

    async function loadPage() {
      try {
        const requests = [apiRequest("/api/admin"), loadRecords()];
        if (resourceType === "orders") requests.push(apiRequest("/api/products?per_page=100"));
        const results = await Promise.all(requests);
        if (!active) return;
        setUser(results[0].data);
        if (resourceType === "orders") setProducts(results[2].data || []);
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
  }, [definition.label, definition.route, loadRecords, initialTrash, resourceType, router]);

  const resetForm = () => {
    setForm(definition.empty);
    setEditingId(null);
    setOriginalItems("");
  };

  const editRecord = (record) => {
    setEditingId(record.id);
    if (resourceType === "orders") {
      const orderItems = (record.items || []).map((item) => ({
        product_id: String(item.product_id),
        quantity: Number(item.quantity),
        name: item.name || "",
      }));
      setForm({
        customer_name: record.customer_name || "",
        email: record.email || "",
        phone: record.phone || "",
        address: record.address || "",
        status: record.status || "pending",
        items: orderItems,
      });
      setOriginalItems(JSON.stringify(orderItems.map(({ product_id, quantity }) => ({ product_id: Number(product_id), quantity }))));
    } else if (resourceType === "articles") {
      setForm({
        title: record.title || "",
        excerpt: record.excerpt || "",
        content: record.content || "",
        published_at: record.published_at || "",
        status: Number(record.status ?? 1),
      });
    } else {
      setForm({
        name: record.name || "",
        email: record.email || "",
        subject: record.subject || "",
        message: record.message || "",
      });
    }
    setError("");
    setNotice("");
    document.getElementById("admin-operation-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const normalizedItems = resourceType === "orders"
      ? form.items.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) }))
      : null;
    const payload = resourceType === "orders"
      ? {
        ...form,
        ...(!editingId ? { status: undefined } : {}),
        ...(editingId && JSON.stringify(normalizedItems) === originalItems ? {} : { items: normalizedItems }),
      }
      : resourceType === "articles"
        ? { ...form, status: Number(form.status), published_at: form.published_at || null }
        : form;

    try {
      await apiRequest(editingId ? `${definition.base}/${editingId}` : definition.base, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editingId ? `${definition.singular} đã được cập nhật.` : `Đã thêm ${definition.singular}.`);
      resetForm();
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể lưu ${definition.singular}.`));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (record) => {
    const permanent = initialTrash;
    if (permanent && !window.confirm(`Xóa vĩnh viễn ${definition.singular} này? Thao tác không thể hoàn tác.`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(permanent ? `${definition.base}/${recordId(record)}/force` : `${definition.base}/${recordId(record)}`, {
        method: "DELETE",
      });
      setNotice(permanent ? "Đã xóa vĩnh viễn." : `Đã chuyển ${definition.singular} vào thùng rác.`);
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể xóa ${definition.singular}.`));
    }
  };

  const restoreRecord = async (record) => {
    setError("");
    setNotice("");
    try {
      await apiRequest(`${definition.base}/${recordId(record)}/restore`, { method: "POST" });
      setNotice(`Đã khôi phục ${definition.singular}.`);
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, `Không thể khôi phục ${definition.singular}.`));
    }
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !statusDraft || statusDraft === selectedOrder.status) return;
    setUpdatingStatus(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest(`${definition.base}/${selectedOrder.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: statusDraft }),
      });
      setSelectedOrder(response.data);
      setStatusDraft(response.data.status);
      setNotice(`Đã cập nhật trạng thái đơn #${response.data.id}.`);
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể cập nhật trạng thái đơn hàng."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const cancelOrder = async () => {
    if (!selectedOrder || !window.confirm(`Xác nhận hủy đơn #${selectedOrder.id}? Tồn kho sẽ được hoàn lại.`)) return;
    setCancellingOrder(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest(`${definition.base}/${selectedOrder.id}/cancel`, { method: "POST" });
      setSelectedOrder(response.data);
      setStatusDraft(response.data.status);
      setNotice(response.message || "Đã hủy đơn hàng.");
      await loadRecords();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể hủy đơn hàng."));
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // The local session must still be cleared when the API is unavailable.
    } finally {
      clearStoredToken();
      router.replace("/");
    }
  };

  if (loading) return <main className="admin-loading">Đang kiểm tra quyền admin...</main>;
  if (!user) {
    return <main className="admin-loading"><p role="alert">{error || "Bạn không có quyền truy cập trang quản trị."}</p><Link href="/admin">Về trang quản trị</Link></main>;
  }

  const title = initialTrash ? `Thùng rác ${definition.label.toLowerCase()}` : definition.label;
  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const updateOrderItem = (index, field, value) => setForm((previous) => ({
    ...previous,
    items: previous.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  }));

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">▦</span><span>LocPhat Admin</span></Link>
        <div className="admin-account"><Link href="/me">{user.name}</Link><button type="button" onClick={handleLogout} aria-label="Đăng xuất">↪</button></div>
      </header>
      <div className="admin-contextbar">
        <h1>{title}</h1>
        <div className="admin-context-actions">
          <span className="admin-live-status"><span aria-hidden="true" /> Dữ liệu đang đồng bộ</span>
          <button type="button" onClick={() => { setError(""); loadRecords().catch((loadError) => setError(getErrorMessage(loadError, "Không thể tải lại dữ liệu."))); }}><span aria-hidden="true">↻</span> Cập nhật</button>
        </div>
      </div>
      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Các mục quản trị">
          <div className="admin-side-group"><p>TỔNG QUAN</p><Link href="/admin" className="admin-side-link"><span aria-hidden="true">◫</span> Bảng tổng hợp</Link></div>
          <div className="admin-side-group"><p>QUẢN LÝ CATALOG</p>
            <Link href="/admin/category" className="admin-side-link">Danh mục</Link>
            <Link href="/admin/brand" className="admin-side-link">Thương hiệu</Link>
            <Link href="/admin/product" className="admin-side-link">Sản phẩm</Link>
          </div>
          <div className="admin-side-group"><p>ĐƠN HÀNG & NỘI DUNG</p>
            <Link href="/admin/cart" className={`admin-side-link ${resourceType === "orders" && !initialTrash ? "is-active" : ""}`}>Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact" className={`admin-side-link ${resourceType === "contacts" && !initialTrash ? "is-active" : ""}`}>Liên hệ</Link>
            <Link href="/admin/article" className={`admin-side-link ${resourceType === "articles" && !initialTrash ? "is-active" : ""}`}>Bài viết</Link>
          </div>
          <div className="admin-side-group"><p>QUẢN LÝ CỬA HÀNG</p>
            <Link href="/admin/promotions" className="admin-side-link">Khuyến mãi</Link>
            <Link href="/admin/members" className="admin-side-link">Thành viên</Link>
            <Link href="/admin/inventory" className="admin-side-link">Kho hàng</Link>
          </div>
          <div className="admin-side-group admin-side-trash-group"><p>THÙNG RÁC</p>
            <Link href="/admin/cart/trash" className={`admin-side-link ${resourceType === "orders" && initialTrash ? "is-active" : ""}`}>Giỏ hàng / Đơn hàng</Link>
            <Link href="/admin/contact/trash" className={`admin-side-link ${resourceType === "contacts" && initialTrash ? "is-active" : ""}`}>Liên hệ</Link>
            <Link href="/admin/article/trash" className={`admin-side-link ${resourceType === "articles" && initialTrash ? "is-active" : ""}`}>Bài viết</Link>
          </div>
          <div className="admin-side-account"><span className="admin-avatar" aria-hidden="true">{user.name?.slice(0, 1)?.toUpperCase() || "A"}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
        </aside>
        <section className="admin-content" aria-label={title}>
          <div className="admin-page-heading">
            <div><p className="admin-eyebrow">LOC PHAT MOBILE / QUẢN TRỊ</p><h2>{initialTrash ? title : `Quản lý ${definition.label.toLowerCase()}`}</h2><p>{initialTrash ? "Khôi phục mục đã xóa hoặc xóa vĩnh viễn." : `Theo dõi và cập nhật ${definition.label.toLowerCase()} của cửa hàng.`}</p></div>
            <div className="admin-resource-heading-actions"><span className="admin-period">{records.length} mục</span>{!initialTrash && <button className="admin-primary-action" type="button" onClick={() => { resetForm(); document.getElementById("admin-operation-form")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>＋ Thêm mới</button>}</div>
          </div>
          {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}
          {notice ? <p className="admin-inline-notice" role="status">{notice}</p> : null}
          <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Tìm ${definition.singular}`} aria-label={`Tìm ${definition.singular}`} />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="admin-manage-grid">
            <section className="admin-panel">
              <h2>{title}</h2>
              <div className="admin-list-items">
                {records.map((record) => (
                  <article className="admin-list-item" key={record.id}>
                    <div>
                      <p className="admin-record-name">{recordTitle(record, resourceType)}</p>
                      <p className="admin-record-meta">
                        {resourceType === "contacts" ? `${record.name} · ${record.email}` : null}
                        {resourceType === "orders" ? `${statusLabels[record.status] || record.status} · ${Number(record.total).toLocaleString("vi-VN")} đ · ${paymentMethodLabels[record.payment_method] || record.payment_method} (${paymentStatusLabels[record.payment_status] || record.payment_status}) · Email khách ${record.email}: ${confirmationEmailStatusLabels[record.confirmation_email_status] || record.confirmation_email_status}${record.confirmation_email_sent_at ? ` lúc ${new Date(record.confirmation_email_sent_at).toLocaleString("vi-VN")}` : ""}${record.confirmation_email_error ? ` · ${record.confirmation_email_error}` : ""} · Email cửa hàng: ${notificationEmailStatusLabels[record.notification_email_status] || record.notification_email_status}${record.notification_email_sent_at ? ` lúc ${new Date(record.notification_email_sent_at).toLocaleString("vi-VN")}` : ""}${record.notification_email_error ? ` · ${record.notification_email_error}` : ""}` : null}
                        {resourceType === "articles" ? `${record.published_at || "Chưa đặt ngày"} · ${record.status ? "Đang hiển thị" : "Đã ẩn"}` : null}
                      </p>
                    </div>
                    <div className="admin-list-actions">
                      {resourceType === "orders" && !initialTrash ? <button type="button" onClick={() => { setSelectedOrder(record); setStatusDraft(record.status); }} className="admin-edit-button">Chi tiết</button> : null}
                      {!initialTrash && <button type="button" onClick={() => editRecord(record)} className="admin-edit-button">Sửa</button>}
                      {initialTrash && <button type="button" onClick={() => restoreRecord(record)} className="admin-edit-button">Khôi phục</button>}
                      <button type="button" onClick={() => removeRecord(record)} className="admin-delete-button">{initialTrash ? "Xóa vĩnh viễn" : "Xóa"}</button>
                    </div>
                  </article>
                ))}
                {!records.length ? <p className="admin-empty-chart">Chưa có {definition.singular}.</p> : null}
              </div>
            </section>
            {!initialTrash && resourceType !== "orders" && (
              <form id="admin-operation-form" onSubmit={handleSubmit} className="admin-panel admin-form">
                <h2>{editingId ? `Sửa ${definition.singular}` : `Thêm ${definition.singular}`}</h2>
                {resourceType === "contacts" ? (
                  <>
                    <input required maxLength={255} value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Họ và tên" aria-label="Họ và tên" />
                    <input required type="email" maxLength={255} value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Email" aria-label="Email" />
                    <input required maxLength={255} value={form.subject} onChange={(event) => setField("subject", event.target.value)} placeholder="Chủ đề" aria-label="Chủ đề" />
                    <textarea required maxLength={5000} rows={6} value={form.message} onChange={(event) => setField("message", event.target.value)} placeholder="Nội dung liên hệ" aria-label="Nội dung liên hệ" />
                  </>
                ) : (
                  <>
                    <input required maxLength={255} value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Tiêu đề bài viết" aria-label="Tiêu đề bài viết" />
                    <textarea maxLength={1000} rows={3} value={form.excerpt} onChange={(event) => setField("excerpt", event.target.value)} placeholder="Mô tả ngắn" aria-label="Mô tả ngắn" />
                    <textarea required maxLength={50000} rows={10} value={form.content} onChange={(event) => setField("content", event.target.value)} placeholder="Nội dung bài viết" aria-label="Nội dung bài viết" />
                    <label>Ngày đăng<input type="date" value={form.published_at} onChange={(event) => setField("published_at", event.target.value)} /></label>
                    <select value={form.status} onChange={(event) => setField("status", Number(event.target.value))} aria-label="Trạng thái"><option value={1}>Đang hiển thị</option><option value={0}>Đã ẩn</option></select>
                  </>
                )}
                <div className="admin-form-actions">
                  <button type="submit" disabled={saving}>{saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm mới"}</button>
                  {editingId ? <button type="button" className="admin-cancel-button" onClick={resetForm}>Hủy</button> : null}
                </div>
              </form>
            )}
            {!initialTrash && resourceType === "orders" && (
              <form id="admin-operation-form" onSubmit={handleSubmit} className="admin-panel admin-form">
                <h2>{editingId ? `Sửa đơn #${editingId}` : "Thêm đơn hàng"}</h2>
                <input required maxLength={255} value={form.customer_name} onChange={(event) => setField("customer_name", event.target.value)} placeholder="Tên khách hàng" aria-label="Tên khách hàng" />
                <input required type="email" maxLength={255} value={form.email} onChange={(event) => setField("email", event.target.value)} placeholder="Email" aria-label="Email" />
                <input required maxLength={32} value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Số điện thoại" aria-label="Số điện thoại" />
                <textarea required maxLength={1000} rows={3} value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Địa chỉ giao hàng" aria-label="Địa chỉ giao hàng" />
                <select value={form.status} onChange={(event) => setField("status", event.target.value)} aria-label="Trạng thái đơn hàng">
                  {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <fieldset className="admin-order-items">
                  <legend>Sản phẩm</legend>
                  {form.items.map((item, index) => (
                    <div key={`${editingId}-${index}`} className="admin-order-item">
                      <select value={item.product_id} onChange={(event) => updateOrderItem(index, "product_id", event.target.value)} aria-label={`Sản phẩm dòng ${index + 1}`}>
                        {item.name && !products.some((product) => String(product.id) === String(item.product_id)) ? <option value={item.product_id}>{item.name} (đã ngừng kinh doanh)</option> : null}
                        {products.filter((product) => !form.items.some((selected, selectedIndex) => selectedIndex !== index && String(selected.product_id) === String(product.id))).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                      <input type="number" min="1" max="99" value={item.quantity} onChange={(event) => updateOrderItem(index, "quantity", Number(event.target.value))} aria-label={`Số lượng dòng ${index + 1}`} />
                      <button type="button" className="admin-delete-button" onClick={() => setForm((previous) => ({ ...previous, items: previous.items.filter((_, itemIndex) => itemIndex !== index) }))}>Bỏ</button>
                    </div>
                  ))}
                  <button type="button" className="admin-edit-button" onClick={() => {
                    const availableProduct = products.find((product) => !form.items.some((item) => String(item.product_id) === String(product.id)));
                    if (availableProduct) setForm((previous) => ({ ...previous, items: [...previous.items, { product_id: String(availableProduct.id), quantity: 1 }] }));
                  }} disabled={!products.some((product) => !form.items.some((item) => String(item.product_id) === String(product.id)))}>Thêm sản phẩm</button>
                </fieldset>
                <div className="admin-form-actions">
                  <button type="submit" disabled={saving || !form.items.length}>{saving ? "Đang lưu..." : editingId ? "Cập nhật đơn hàng" : "Thêm đơn hàng"}</button>
                  {editingId ? <button type="button" className="admin-cancel-button" onClick={resetForm}>Hủy</button> : null}
                </div>
              </form>
            )}
          </div>
          {resourceType === "orders" && selectedOrder ? (
            <section className="admin-panel mt-6" aria-label={`Chi tiết đơn hàng ${selectedOrder.id}`}>
              <div className="admin-panel-heading">
                <div><p className="admin-eyebrow">CHI TIẾT ĐƠN HÀNG</p><h2>Đơn #{selectedOrder.id} · {selectedOrder.customer_name}</h2><p>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString("vi-VN") : ""}</p></div>
                <button type="button" className="admin-cancel-button" onClick={() => setSelectedOrder(null)}>Đóng</button>
              </div>
              <div className="grid gap-4 py-4 md:grid-cols-2">
                <div><h3 className="font-semibold">Thông tin nhận hàng</h3><p className="mt-2">{selectedOrder.customer_name}</p><p>{selectedOrder.email}</p><p>{selectedOrder.phone}</p><p>{selectedOrder.address}</p></div>
                <div><h3 className="font-semibold">Thanh toán</h3><p className="mt-2">Phương thức: {paymentMethodLabels[selectedOrder.payment_method] || selectedOrder.payment_method}</p><p>Trạng thái: {paymentStatusLabels[selectedOrder.payment_status] || selectedOrder.payment_status}</p><p>Mã giao dịch: {selectedOrder.payment_reference || "—"}</p></div>
              </div>
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {(selectedOrder.items || []).map((item, index) => <div key={`${item.product_id}-${index}`} className="flex flex-wrap justify-between gap-2 py-3"><span>{item.name} × {item.quantity}</span><span>{(Number(item.price) * Number(item.quantity)).toLocaleString("vi-VN")} đ</span></div>)}
              </div>
              <div className="ml-auto mt-4 grid w-full max-w-sm gap-2 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span>{Number(selectedOrder.subtotal ?? selectedOrder.total).toLocaleString("vi-VN")} đ</span></div>
                {Number(selectedOrder.discount) > 0 ? <div className="flex justify-between text-teal-800"><span>Khuyến mãi {selectedOrder.coupon_code}</span><span>−{Number(selectedOrder.discount).toLocaleString("vi-VN")} đ</span></div> : null}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold"><span>Tổng cộng</span><span>{Number(selectedOrder.total).toLocaleString("vi-VN")} đ</span></div>
              </div>
              {!initialTrash ? (
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <label className="grid gap-2 text-sm font-medium">Trạng thái đơn hàng
                    <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} disabled={selectedOrder.status === "cancelled" || selectedOrder.status === "completed"} className="min-h-11 border border-slate-300 px-3">
                      {[selectedOrder.status, nextOrderStatus[selectedOrder.status]].filter(Boolean).map((value) => <option value={value} key={value}>{statusLabels[value] || value}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={updateOrderStatus} disabled={updatingStatus || statusDraft === selectedOrder.status || selectedOrder.status === "cancelled" || selectedOrder.status === "completed"} className="min-h-11 bg-teal-800 px-4 font-semibold text-white disabled:opacity-50">{updatingStatus ? "Đang cập nhật..." : "Cập nhật trạng thái"}</button>
                  {selectedOrder.status !== "cancelled" && selectedOrder.status !== "completed" ? <button type="button" onClick={cancelOrder} disabled={cancellingOrder} className="min-h-11 border border-red-300 px-4 font-semibold text-red-700 disabled:opacity-50">{cancellingOrder ? "Đang hủy..." : "Hủy đơn hàng"}</button> : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
