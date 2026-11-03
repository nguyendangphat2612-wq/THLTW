"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, setStoredToken } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth";

export default function LoginForm({ isAdmin = false }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (isAdmin && data.user?.role !== "admin") {
        setError("Tài khoản này chưa có quyền quản trị.");
        return;
      }

      if (!isAdmin && data.user?.role === "admin") {
        setError("Tài khoản quản trị vui lòng đăng nhập tại trang dành cho admin.");
        return;
      }

      setStoredToken(data.token, data.user);

      if (isAdmin) {
        const requestedPath = new URLSearchParams(window.location.search).get("redirect");
        const isAdminPath = requestedPath === "/admin" || requestedPath?.startsWith("/admin/");
        router.push(isAdminPath ? requestedPath : "/admin");
      } else {
        router.push("/me");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Không thể đăng nhập."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-1 items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          {isAdmin ? "Khu vực quản trị" : "Khu vực người dùng"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          {isAdmin ? "Đăng nhập Admin" : "Đăng nhập người dùng"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isAdmin
            ? "Chỉ dành cho tài khoản quản trị được cấp riêng."
            : "Đăng nhập để quản lý thông tin và đơn hàng của bạn."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-600"
              required
            />
          </div>

          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          {isAdmin ? (
            <Link href="/" className="font-semibold text-teal-700">Quay lại cửa hàng</Link>
          ) : (
            <>
              <span>
                Chưa có tài khoản?{" "}
                <Link href="/register" className="font-semibold text-teal-700">Đăng ký</Link>
              </span>
              <Link href="/admin/login" className="font-semibold text-teal-700">Đăng nhập Admin</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
