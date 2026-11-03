"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setNotice("");

    try {
      const response = await apiRequest("/api/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNotice(response.message);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (requestError) {
      setError(Object.values(requestError.errors || {}).flat()[0] || requestError.message || "Không thể gửi liên hệ.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <header className="border-b border-slate-200 pb-6"><p className="text-sm font-semibold uppercase text-teal-800">LocPhat Mobile</p><h1 className="mt-2 text-3xl font-semibold">Liên hệ với chúng tôi</h1><p className="mt-2 text-slate-600">Gửi câu hỏi hoặc yêu cầu hỗ trợ, đội ngũ của chúng tôi sẽ phản hồi sớm nhất.</p></header>
      <form onSubmit={handleSubmit} className="grid gap-4 border border-slate-200 bg-white p-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">Họ và tên
          <input required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="min-h-11 border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">Email
          <input required type="email" maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-h-11 border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">Chủ đề
          <input required maxLength={255} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="min-h-11 border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">Nội dung
          <textarea required maxLength={5000} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="border border-slate-300 p-3" />
        </label>
        <button type="submit" disabled={sending} className="min-h-11 w-fit bg-teal-800 px-6 font-semibold text-white disabled:opacity-60">{sending ? "Đang gửi..." : "Gửi liên hệ"}</button>
        {notice ? <p role="status" className="self-center text-sm text-teal-800">{notice}</p> : null}
        {error ? <p role="alert" className="self-center text-sm text-red-700">{error}</p> : null}
      </form>
    </main>
  );
}
