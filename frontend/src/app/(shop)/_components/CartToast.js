"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_ITEM_ADDED_EVENT } from "@/lib/cart";

export default function CartToast() {
  const [productName, setProductName] = useState("");

  useEffect(() => {
    let timer;
    const handleItemAdded = (event) => {
      setProductName(event.detail.productName);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setProductName(""), 4000);
    };

    window.addEventListener(CART_ITEM_ADDED_EVENT, handleItemAdded);
    return () => {
      window.removeEventListener(CART_ITEM_ADDED_EVENT, handleItemAdded);
      window.clearTimeout(timer);
    };
  }, []);

  if (!productName) return null;

  return (
    <div className="cart-toast" role="status" aria-live="polite">
      <span className="cart-toast-icon" aria-hidden="true">✓</span>
      <span className="cart-toast-message"><strong>Đã thêm vào giỏ hàng</strong><small>{productName}</small></span>
      <Link href="/cart" className="cart-toast-link">Xem giỏ hàng</Link>
      <button type="button" className="cart-toast-close" onClick={() => setProductName("")} aria-label="Đóng thông báo">×</button>
    </div>
  );
}
