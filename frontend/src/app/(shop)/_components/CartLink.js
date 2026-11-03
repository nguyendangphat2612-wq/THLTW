"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_CHANGED_EVENT, getCart } from "@/lib/cart";

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setCount(getCart().reduce((total, item) => total + item.quantity, 0));
    };

    updateCount();
    window.addEventListener(CART_CHANGED_EVENT, updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  return (
    <Link href="/cart" className="auth-link" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
      Giỏ hàng{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
