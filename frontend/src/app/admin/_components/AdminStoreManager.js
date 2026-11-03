"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";

const emptyCoupon = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const definitions = {
  promotions: { title: "Quản lý khuyến mãi", endpoint: "/api/admin/coupons", route: "/admin/promotions" },
  members: { title: "Quản lý thành viên", endpoint: "/api/admin/members", route: "/admin/members" },
  inventory: { title: "Quản lý kho", endpoint: "/api/admin/inventory", route: "/admin/inventory" },
};

function getErrorMessage(error, fallback) {
  return Object.values(error.errors || {}).flat()[0] || error.message || fallback;
}

function formatDateTime(value) {
  return value ? String(value).slice(0, 16) : "";
}

export default function AdminStoreManager({ section }) {
  const router = useRouter();
  const definition = definitions[section];
  const [admin, setAdmin] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [memberForm, setMemberForm] = useState(null);
  const [memberDetail, setMemberDetail] = useState(null);
  const [adjustment, setAdjustment] = useState({ product_id: "", direction: "in", quantity: 1, note: "" });
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const query = new URLSearchParams({ per_page: "100" });
    if (search.trim()) query.set("search", search.trim());
    return apiRequest(`${definition.endpoint}?${query}`);
  }, [definition.endpoint, search]);

  const applyData = useCallback((response) => {
    if (section === "promotions") setCoupons(response.data || []);
    if (section === "members") setMembers(response.data || []);
    if (section === "inventory") {
      setProducts(response.products?.data || []);
      setMovements(response.movements || []);
      setAdjustment((previous) => ({
        ...previous,
        product_id: previous.product_id || String(response.products?.data?.[0]?.product_id || ""),
      }));
    }
  }, [section]);

  const loadData = useCallback(async () => applyData(await fetchData()), [applyData, fetchData]);

  useEffect(() => {
    let active = true;
    const redirect = `/admin/login?redirect=${encodeURIComponent(definition.route)}`;

    if (!getStoredToken()) {
      router.replace(redirect);
      return () => { active = false; };
    }

    Promise.all([apiRequest("/api/admin"), fetchData()])
      .then(([response, data]) => {
        if (!active) return;
        setAdmin(response.data);
        applyData(data);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          clearStoredToken();
          router.replace(redirect);
          return;
        }
        setError(getErrorMessage(requestError, `Không thể tải ${definition.title.toLowerCase()}.`));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [applyData, definition.route, definition.title, fetchData, router]);

  const submitCoupon = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
        discount_value: Number(couponForm.discount_value),
        starts_at: couponForm.starts_at ? new Date(couponForm.starts_at).toISOString() : null,
        ends_at: couponForm.ends_at ? new Date(couponForm.ends_at).toISOString() : null,
      };
      await apiRequest(editingCouponId ? `${definition.endpoint}/${editingCouponId}` : definition.endpoint, {
        method: editingCouponId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setCouponForm(emptyCoupon);
      setEditingCouponId(null);
      setNotice(editingCouponId ? "Đã cập nhật mã khuyến mãi." : "Đã tạo mã khuyến mãi.");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể lưu mã khuyến mãi."));
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon) => {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      starts_at: formatDateTime(coupon.starts_at),
      ends_at: formatDateTime(coupon.ends_at),
      is_active: Boolean(coupon.is_active),
    });
  };

  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Xóa mã ${coupon.code}?`)) return;
    setError("");
    try {
      await apiRequest(`${definition.endpoint}/${coupon.id}`, { method: "DELETE" });
      setNotice(`Đã xóa mã ${coupon.code}.`);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể xóa mã khuyến mãi."));
    }
  };

  const submitMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`${definition.endpoint}/${memberForm.id}`, {
        method: "PUT",
        body: JSON.stringify(memberForm),
      });
      setNotice(`Đã cập nhật thành viên ${memberForm.name}.`);
      setMemberForm(null);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể cập nhật thành viên."));
    } finally {
      setSaving(false);
    }
  };

  const viewMember = async (member) => {
    setError("");
    setNotice("");
    try {
      const response = await apiRequest(`${definition.endpoint}/${member.id}`);
      setMemberDetail(response.data);
      setMemberForm(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể tải chi tiết thành viên."));
    }
  };

  const toggleMemberLock = async (member) => {
    const action = member.is_locked ? "unlock" : "lock";
    const message = member.is_locked
      ? `Mở khóa tài khoản ${member.name}?`
      : `Khóa tài khoản ${member.name}? Thành viên sẽ bị đăng xuất và không thể đăng nhập.`;
    if (!window.confirm(message)) return;
    setError("");
    setNotice("");
    try {
      const response = await apiRequest(`${definition.endpoint}/${member.id}/${action}`, { method: "POST" });
      setNotice(response.message);
      if (memberDetail?.id === member.id) {
        setMemberDetail((previous) => ({ ...previous, is_locked: !member.is_locked }));
      }
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể thay đổi trạng thái tài khoản."));
    }
  };

  const deleteMember = async (member) => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${member.name} (${member.email})?\n\nĐơn hàng được giữ lại nhưng sẽ không còn liên kết với thành viên. Đánh giá sản phẩm của thành viên sẽ bị xóa.`)) return;
    setError("");
    setNotice("");
    try {
      const response = await apiRequest(`${definition.endpoint}/${member.id}`, { method: "DELETE" });
      setNotice(response.message);
      if (memberDetail?.id === member.id) setMemberDetail(null);
      if (memberForm?.id === member.id) setMemberForm(null);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể xóa thành viên."));
    }
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest("/api/admin/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify({
          ...adjustment,
          product_id: Number(adjustment.product_id),
          quantity: Number(adjustment.quantity),
        }),
      });
      setNotice(response.message || "Đã cập nhật tồn kho.");
      setAdjustment((previous) => ({ ...previous, quantity: 1, note: "" }));
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể cập nhật tồn kho."));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
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
  if (!admin) return <main className="admin-loading"><p role="alert">{error || "Bạn không có quyền truy cập trang quản trị."}</p><Link href="/admin">Về trang quản trị</Link></main>;

  const setCouponField = (field, value) => setCouponForm((previous) => ({ ...previous, [field]: value }));
  const setMemberField = (field, value) => setMemberForm((previous) => ({ ...previous, [field]: value }));

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">▦</span><span>LocPhat Admin</span></Link>
        <div className="admin-account"><Link href="/me">{admin.name}</Link><button type="button" onClick={logout} aria-label="Đăng xuất">↪</button></div>
      </header>
      <div className="admin-contextbar">
        <h1>{definition.title}</h1>
        <div className="admin-context-actions"><span className="admin-live-status"><span aria-hidden="true" /> Dữ liệu đang đồng bộ</span><button type="button" onClick={() => loadData().catch((err) => setError(getErrorMessage(err, "Không thể tải dữ liệu.")))}>↻ Cập nhật</button></div>
      </div>
      <div className="admin-workspace">
        <aside className="admin-sidebar" aria-label="Các mục quản trị">
          <div className="admin-side-group"><p>TỔNG QUAN</p><Link href="/admin" className="admin-side-link">Bảng tổng hợp</Link></div>
          <div className="admin-side-group"><p>QUẢN LÝ CATALOG</p><Link href="/admin/category" className="admin-side-link">Danh mục</Link><Link href="/admin/brand" className="admin-side-link">Thương hiệu</Link><Link href="/admin/product" className="admin-side-link">Sản phẩm</Link></div>
          <div className="admin-side-group"><p>VẬN HÀNH</p><Link href="/admin/promotions" className={`admin-side-link ${section === "promotions" ? "is-active" : ""}`}>Khuyến mãi</Link><Link href="/admin/members" className={`admin-side-link ${section === "members" ? "is-active" : ""}`}>Thành viên</Link><Link href="/admin/inventory" className={`admin-side-link ${section === "inventory" ? "is-active" : ""}`}>Kho hàng</Link><Link href="/admin/cart" className="admin-side-link">Đơn hàng</Link></div>
          <div className="admin-side-group"><p>NỘI DUNG</p><Link href="/admin/contact" className="admin-side-link">Liên hệ</Link><Link href="/admin/article" className="admin-side-link">Bài viết</Link></div>
          <div className="admin-side-account"><span className="admin-avatar" aria-hidden="true">{admin.name?.slice(0, 1)?.toUpperCase() || "A"}</span><span><strong>{admin.name}</strong><small>{admin.email}</small></span></div>
        </aside>
        <section className="admin-content" aria-label={definition.title}>
          <div className="admin-page-heading"><div><p className="admin-eyebrow">LOC PHAT MOBILE / QUẢN TRỊ</p><h2>{definition.title}</h2><p>{section === "inventory" ? "Ghi nhận nhập xuất và theo dõi tồn kho theo sản phẩm." : section === "members" ? "Tìm kiếm, cập nhật thông tin và quyền thành viên." : "Tạo mã giảm theo phần trăm hoặc số tiền, thời hạn và trạng thái."}</p></div><span className="admin-period">{section === "promotions" ? coupons.length : section === "members" ? members.length : products.length} mục</span></div>
          {error ? <p role="alert" className="admin-inline-error">{error}</p> : null}
          {notice ? <p role="status" className="admin-inline-notice">{notice}</p> : null}
          <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={section === "promotions" ? "Tìm mã khuyến mãi" : section === "members" ? "Tìm tên, email, số điện thoại" : "Tìm sản phẩm"} aria-label="Tìm kiếm" />
            <button type="submit">Tìm kiếm</button>
          </form>

          {section === "promotions" ? (
            <div className="admin-manage-grid">
              <section className="admin-panel"><h2>Danh sách mã</h2><div className="admin-list-items">
                {coupons.map((coupon) => (
                  <article className="admin-list-item" key={coupon.id}>
                    <div><p className="admin-record-name">{coupon.code}</p><p className="admin-record-meta">{coupon.discount_type === "percent" ? `Giảm ${coupon.discount_value}%` : `Giảm ${Number(coupon.discount_value).toLocaleString("vi-VN")} đ`} · {coupon.is_active ? "Đang bật" : "Đã tắt"} · Đã dùng {coupon.usage_count} lần</p><p className="admin-record-meta">Hiệu lực: {coupon.starts_at ? new Date(coupon.starts_at).toLocaleString("vi-VN") : "Ngay"} – {coupon.ends_at ? new Date(coupon.ends_at).toLocaleString("vi-VN") : "Không thời hạn"}</p></div>
                    <div className="admin-list-actions"><button type="button" className="admin-edit-button" onClick={() => editCoupon(coupon)}>Sửa</button><button type="button" className="admin-delete-button" onClick={() => deleteCoupon(coupon)}>Xóa</button></div>
                  </article>
                ))}
                {!coupons.length ? <p className="admin-empty-chart">Chưa có mã khuyến mãi.</p> : null}
              </div></section>
              <form className="admin-panel admin-form" onSubmit={submitCoupon}>
                <h2>{editingCouponId ? "Cập nhật khuyến mãi" : "Tạo khuyến mãi"}</h2>
                <label>Mã khuyến mãi<input required maxLength={50} value={couponForm.code} onChange={(event) => setCouponField("code", event.target.value)} placeholder="VD: LOCPHAT20" /></label>
                <label>Loại giảm giá<select value={couponForm.discount_type} onChange={(event) => setCouponField("discount_type", event.target.value)}><option value="percent">Phần trăm</option><option value="fixed">Số tiền cố định</option></select></label>
                <label>Mức giảm<input required type="number" min="0.01" step="0.01" max={couponForm.discount_type === "percent" ? 100 : undefined} value={couponForm.discount_value} onChange={(event) => setCouponField("discount_value", event.target.value)} /></label>
                <label>Bắt đầu (để trống nếu có hiệu lực ngay)<input type="datetime-local" value={couponForm.starts_at} onChange={(event) => setCouponField("starts_at", event.target.value)} /></label>
                <label>Kết thúc (để trống nếu không giới hạn)<input type="datetime-local" value={couponForm.ends_at} onChange={(event) => setCouponField("ends_at", event.target.value)} /></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={couponForm.is_active} onChange={(event) => setCouponField("is_active", event.target.checked)} /> Đang kích hoạt</label>
                <div className="admin-form-actions"><button type="submit" disabled={saving}>{saving ? "Đang lưu..." : editingCouponId ? "Cập nhật" : "Tạo mã"}</button>{editingCouponId ? <button type="button" className="admin-cancel-button" onClick={() => { setEditingCouponId(null); setCouponForm(emptyCoupon); }}>Hủy</button> : null}</div>
              </form>
            </div>
          ) : null}

          {section === "members" ? (
            <div className="admin-manage-grid">
              <section className="admin-panel"><h2>Thành viên</h2><div className="admin-list-items">
                {members.map((member) => <article className="admin-list-item" key={member.id}><div><p className="admin-record-name">{member.name} · {member.is_locked ? "Đã khóa" : "Đang hoạt động"}</p><p className="admin-record-meta">{member.email} · {member.phone || "Chưa có số điện thoại"} · {member.role === "admin" ? "Quản trị viên" : "Thành viên"}</p><p className="admin-record-meta">{member.address || "Chưa có địa chỉ"} · {member.orders_count} đơn hàng · {member.reviews_count} đánh giá</p></div><div className="admin-list-actions"><button type="button" className="admin-view-button" onClick={() => viewMember(member)}>Chi tiết</button><button type="button" className="admin-edit-button" onClick={() => { setMemberForm({ ...member }); setMemberDetail(null); }}>Sửa</button>{member.role !== "admin" ? <><button type="button" className="admin-edit-button" onClick={() => toggleMemberLock(member)}>{member.is_locked ? "Mở khóa" : "Khóa"}</button><button type="button" className="admin-delete-button" onClick={() => deleteMember(member)}>Xóa</button></> : null}</div></article>)}
                {!members.length ? <p className="admin-empty-chart">Không tìm thấy thành viên.</p> : null}
              </div></section>
              {memberForm ? <form className="admin-panel admin-form" onSubmit={submitMember}><h2>Cập nhật thành viên</h2><label>Họ tên<input required maxLength={255} value={memberForm.name} onChange={(event) => setMemberField("name", event.target.value)} /></label><label>Email<input required type="email" maxLength={255} value={memberForm.email} onChange={(event) => setMemberField("email", event.target.value)} /></label><label>Số điện thoại<input maxLength={32} value={memberForm.phone || ""} onChange={(event) => setMemberField("phone", event.target.value)} /></label><label>Địa chỉ<textarea maxLength={1000} rows={3} value={memberForm.address || ""} onChange={(event) => setMemberField("address", event.target.value)} /></label><label>Vai trò<select value={memberForm.role} onChange={(event) => setMemberField("role", event.target.value)}><option value="user">Thành viên</option><option value="admin">Quản trị viên</option></select></label><div className="admin-form-actions"><button type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button><button type="button" className="admin-cancel-button" onClick={() => setMemberForm(null)}>Hủy</button></div></form> : memberDetail ? <section className="admin-panel"><h2>Chi tiết thành viên</h2><p className="admin-record-name">{memberDetail.name}</p><p className="admin-record-meta">{memberDetail.email} · {memberDetail.phone || "Chưa có số điện thoại"} · {memberDetail.is_locked ? "Đã khóa" : "Đang hoạt động"}</p><p className="admin-record-meta">Ngày tham gia: {new Date(memberDetail.created_at).toLocaleDateString("vi-VN")} · {memberDetail.orders_count} đơn hàng · {memberDetail.reviews_count} đánh giá</p><h3>Đơn hàng gần đây</h3><div className="admin-list-items">{memberDetail.orders.map((order) => <article className="admin-list-item" key={order.id}><div><p className="admin-record-name">Đơn #{order.id} · {order.status}</p><p className="admin-record-meta">{Number(order.total).toLocaleString("vi-VN")} đ · Thanh toán: {order.payment_status || "Chưa rõ"} · {new Date(order.created_at).toLocaleDateString("vi-VN")}</p></div></article>)}{!memberDetail.orders.length ? <p className="admin-record-meta">Chưa có đơn hàng.</p> : null}</div><h3>Đánh giá gần đây</h3><div className="admin-list-items">{memberDetail.reviews.map((review) => <article className="admin-list-item" key={review.id}><div><p className="admin-record-name">{review.product?.product_name || "Sản phẩm"} · {review.rating}/5</p><p className="admin-record-meta">{review.comment}</p></div></article>)}{!memberDetail.reviews.length ? <p className="admin-record-meta">Chưa có đánh giá.</p> : null}</div><button type="button" className="admin-cancel-button mt-4" onClick={() => setMemberDetail(null)}>Đóng chi tiết</button></section> : <section className="admin-panel"><h2>Quyền thành viên</h2><p>Chọn thành viên để xem hồ sơ, đơn hàng, đánh giá hoặc cập nhật quyền truy cập.</p><p className="admin-record-meta">Khóa tài khoản sẽ thu hồi phiên đăng nhập. Xóa tài khoản sẽ giữ đơn hàng (gỡ liên kết) và xóa các đánh giá sản phẩm của thành viên.</p></section>}
            </div>
          ) : null}

          {section === "inventory" ? (
            <>
              <div className="admin-manage-grid">
                <form className="admin-panel admin-form" onSubmit={submitAdjustment}><h2>Phiếu nhập / xuất kho</h2><label>Sản phẩm<select required value={adjustment.product_id} onChange={(event) => setAdjustment((previous) => ({ ...previous, product_id: event.target.value }))}><option value="">Chọn sản phẩm</option>{products.map((product) => <option value={product.product_id} key={product.product_id}>{product.product_name} · {product.track_inventory ? `${product.stock_quantity} còn` : "Chưa kiểm kê"}</option>)}</select></label><label>Loại phiếu<select value={adjustment.direction} onChange={(event) => setAdjustment((previous) => ({ ...previous, direction: event.target.value }))}><option value="in">Nhập kho</option><option value="out">Xuất kho</option></select></label><label>Số lượng<input required type="number" min="1" step="1" value={adjustment.quantity} onChange={(event) => setAdjustment((previous) => ({ ...previous, quantity: event.target.value }))} /></label><label>Ghi chú<input maxLength={500} value={adjustment.note} onChange={(event) => setAdjustment((previous) => ({ ...previous, note: event.target.value }))} placeholder="Ví dụ: Nhập hàng đợt mới" /></label><button type="submit" disabled={saving || !products.length}>{saving ? "Đang ghi nhận..." : adjustment.direction === "in" ? "Xác nhận nhập kho" : "Xác nhận xuất kho"}</button></form>
                <section className="admin-panel"><h2>Tồn kho sản phẩm</h2><div className="admin-list-items">{products.map((product) => <article className="admin-list-item" key={product.product_id}><div><p className="admin-record-name">{product.product_name}</p><p className="admin-record-meta">{product.track_inventory ? `${product.stock_quantity} sản phẩm trong kho` : "Chưa kiểm kê — nhập số lượng ban đầu để bật theo dõi"}{product.trash ? " · Đã ngừng kinh doanh" : ""}</p></div></article>)}{!products.length ? <p className="admin-empty-chart">Không tìm thấy sản phẩm.</p> : null}</div></section>
              </div>
              <section className="admin-panel mt-6"><h2>Lịch sử nhập xuất gần đây</h2><div className="admin-list-items">{movements.map((movement) => <article className="admin-list-item" key={movement.id}><div><p className="admin-record-name">{movement.product_name} · {movement.direction === "in" ? "Nhập" : "Xuất"} {movement.quantity}</p><p className="admin-record-meta">Tồn sau giao dịch: {movement.balance_after} · {movement.note || "Không có ghi chú"} · {movement.user?.name || "Hệ thống"}{movement.order_id ? ` · Đơn #${movement.order_id}` : ""} · {new Date(movement.created_at).toLocaleString("vi-VN")}</p></div></article>)}{!movements.length ? <p className="admin-empty-chart">Chưa có giao dịch kho.</p> : null}</div></section>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
