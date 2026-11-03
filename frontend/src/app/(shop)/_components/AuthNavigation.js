"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, AUTH_STATE_EVENT, clearStoredToken, getStoredToken, getStoredUser } from "@/lib/api";

export default function AuthNavigation() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      if (!getStoredToken()) {
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
        return;
      }

      const cachedUser = getStoredUser();
      if (mounted) {
        setUser(cachedUser?.role === "user" ? cachedUser : null);
        setIsAuthenticated(cachedUser?.role === "user");
      }

      try {
        const response = await apiRequest("/api/me");
        if (mounted) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          clearStoredToken("customer");
          if (mounted) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    };

    syncUser();
    window.addEventListener(AUTH_STATE_EVENT, syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_STATE_EVENT, syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Clear the local session even if the API is temporarily unavailable.
    } finally {
      clearStoredToken();
      setUser(null);
      router.replace("/");
    }
  };

  return (
    <nav className="auth-navigation">
      <Link href="/" className="auth-link">Trang chủ</Link>
      <Link href="/products" className="auth-link">Sản phẩm</Link>
      <Link href="/news" className="auth-link">Bài viết</Link>
      <Link href="/contact" className="auth-link">Liên hệ</Link>
      {isAuthenticated ? (
        <>
          <Link href="/me" className="auth-link">Thông tin</Link>
          <Link href="/orders" className="auth-link">Đơn hàng</Link>
          <Link
            href={user?.role === "admin" ? "/admin" : "/admin/login"}
            className="auth-link auth-primary"
          >
            {user?.role === "admin" ? "Quản trị" : "Đăng nhập Admin"}
          </Link>
          <button type="button" onClick={handleLogout} className="auth-link">
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="auth-link">Đăng nhập</Link>
          <Link href="/register" className="auth-link auth-primary">Đăng ký</Link>
          <Link href="/admin/login" className="auth-link">Quản trị</Link>
        </>
      )}
    </nav>
  );
}