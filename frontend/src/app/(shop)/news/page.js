"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function NewsPage() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/articles")
      .then((response) => setPosts(response.data || []))
      .catch((requestError) => setError(requestError.message || "Không thể tải bài viết."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <header className="border-b border-slate-200 pb-6"><p className="text-sm font-semibold uppercase text-teal-800">LocPhat Mobile</p><h1 className="mt-2 text-3xl font-semibold">Bài viết công nghệ</h1><p className="mt-2 text-slate-600">Mẹo sử dụng thiết bị và thông tin hữu ích dành cho bạn.</p></header>
      {error ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {loading ? <p role="status" className="text-slate-600">Đang tải bài viết...</p> : null}
      {!loading && !error && !posts.length ? <p className="text-slate-600">Chưa có bài viết nào.</p> : null}
      <section className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">{post.published_at || "LocPhat Mobile"}</p>
            <h2 className="mt-2 text-xl font-semibold"><Link href={`/news/${post.slug}`} className="text-slate-950 no-underline hover:text-teal-800">{post.title}</Link></h2>
            <p className="mt-3 leading-6 text-slate-600">{post.excerpt}</p>
            <Link href={`/news/${post.slug}`} className="mt-5 inline-block font-semibold text-teal-800">Đọc bài viết →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
