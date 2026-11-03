"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, setStoredToken } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
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
      const data = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setStoredToken(data.token, data.user);
      router.push("/me");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Không thể tạo tài khoản."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-1 items-center px-6 py-16">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Khu vực người dùng</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Đăng ký người dùng</h1>
        <p className="mt-2 text-sm text-slate-600">Tài khoản quản trị được cấp riêng và không thể tự đăng ký.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Họ tên</label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
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
            <label className="mb-2 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nhập lại mật khẩu</label>
            <input
              type="password"
              name="password_confirmation"
              autoComplete="new-password"
              minLength={8}
              value={form.password_confirmation}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-600"
              required
            />
          </div>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-teal-700">Đăng nhập người dùng</Link>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Là quản trị viên?{" "}
          <Link href="/admin/login" className="font-semibold text-teal-700">Đăng nhập Admin</Link>
        </p>
      </div>
    </main>
  );
}
