"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { apiRequest, clearStoredToken, getStoredToken } from "@/lib/api";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      startTransition(() => {
        setError("Bạn chưa đăng nhập.");
        setLoading(false);
      });
      return;
    }

    apiRequest("/api/me")
      .then((data) => {
        setUser(data.data);
      })
      .catch((err) => {
        setError(err.message || "Không thể lấy thông tin người dùng.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Clear the local session even if the API is temporarily unavailable.
    } finally {
      clearStoredToken();
      router.replace("/");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest("/api/me", {
        method: "PUT",
        body: JSON.stringify({
          name: user.name,
          phone: user.phone || "",
          address: user.address || "",
        }),
      });
      setUser(response.data);
      setNotice(response.message || "Đã cập nhật thông tin cá nhân.");
    } catch (requestError) {
      setError(Object.values(requestError.errors || {}).flat()[0] || requestError.message || "Không thể cập nhật thông tin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-2xl px-6 py-16 text-slate-600">Đang tải thông tin...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        <div className="mt-4">
          <Link href="/login" className="font-semibold text-teal-700">
            Đi đến trang đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Thông tin cá nhân</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{user?.name}</h1>

        {notice ? <p role="status" className="mt-5 border border-teal-200 bg-teal-50 p-3 text-teal-800">{notice}</p> : null}
        {error ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-red-700">{error}</p> : null}
        <form onSubmit={saveProfile} className="mt-6 grid gap-4 text-slate-700">
          <label className="grid gap-2 text-sm font-medium">Họ và tên
            <input required maxLength={255} value={user?.name || ""} onChange={(event) => setUser((previous) => ({ ...previous, name: event.target.value }))} className="min-h-11 border border-slate-300 px-3" />
          </label>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Email tài khoản</p>
            <p className="mt-1 font-medium">{user?.email}</p>
          </div>
          <label className="grid gap-2 text-sm font-medium">Số điện thoại
            <input maxLength={32} value={user?.phone || ""} onChange={(event) => setUser((previous) => ({ ...previous, phone: event.target.value }))} className="min-h-11 border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">Địa chỉ nhận hàng mặc định
            <textarea maxLength={1000} rows={3} value={user?.address || ""} onChange={(event) => setUser((previous) => ({ ...previous, address: event.target.value }))} className="border border-slate-300 p-3" />
          </label>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Vai trò</p>
            <p className="mt-1 font-medium capitalize">{user?.role}</p>
          </div>
          <button type="submit" disabled={saving} className="min-h-11 w-fit rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu thông tin"}</button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-400"
        >
          Đăng xuất
        </button>
      </div>
    </main>
  );
}
