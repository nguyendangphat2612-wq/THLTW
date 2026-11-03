"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [result, setResult] = useState({ slug: null, post: null, error: "" });

  useEffect(() => {
    let active = true;
    apiRequest(`/api/articles/${encodeURIComponent(slug)}`)
      .then((response) => { if (active) setResult({ slug, post: response.data, error: "" }); })
      .catch((requestError) => {
        if (active) {
          setResult({
            slug,
            post: null,
            error: requestError.status === 404 ? "Không tìm thấy bài viết." : requestError.message || "Không thể tải bài viết.",
          });
        }
      });
    return () => { active = false; };
  }, [slug]);

  const loading = result.slug !== slug;
  const post = loading ? null : result.post;
  const error = loading ? "" : result.error;

  if (loading) return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-10"><p role="status">Đang tải bài viết...</p></main>;
  if (error || !post) {
    return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-10"><h1 className="text-3xl font-semibold">{error || "Không tìm thấy bài viết"}</h1><Link href="/news" className="text-teal-800">← Xem các bài viết</Link></main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10 md:px-10">
      <Link href="/news" className="text-sm font-semibold text-teal-800">← Tất cả bài viết</Link>
      <article className="border border-slate-200 bg-white p-6 md:p-10">
        <p className="text-sm text-slate-500">{post.published_at || "LocPhat Mobile"} · LocPhat Mobile</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">{post.title}</h1>
        {post.excerpt ? <p className="mt-4 border-b border-slate-200 pb-5 text-lg text-slate-600">{post.excerpt}</p> : null}
        <div className="space-y-5 pt-5 leading-8 text-slate-700">{post.content.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}</div>
      </article>
    </main>
  );
}
