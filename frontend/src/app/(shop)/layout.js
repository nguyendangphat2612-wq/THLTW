import Link from "next/link";
import AuthNavigation from "./_components/AuthNavigation";
import CartLink from "./_components/CartLink";
import CartToast from "./_components/CartToast";

export default function ShopLayout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="store-header">
        <div className="store-header-inner">
          <Link href="/" className="store-logo" aria-label="LocPhat Mobile, trang chủ">
            <span className="logo-mark" aria-hidden="true">L</span>
            <span>locphat<span className="logo-light">mobile</span></span>
          </Link>
          <form className="store-search" action="/products" role="search">
            <label className="visually-hidden" htmlFor="store-search">Tìm điện thoại, phụ kiện</label>
            <input id="store-search" name="q" placeholder="Bạn tìm điện thoại, phụ kiện...?" />
            <button type="submit" aria-label="Tìm kiếm">⌕</button>
          </form>
          <div className="store-shortcuts">
            <Link href="/news"><span aria-hidden="true">▣</span><span>Tin hay</span></Link>
            <Link href="/contact"><span aria-hidden="true">?</span><span>Liên hệ</span></Link>
          </div>
          <CartLink />
          <AuthNavigation />
        </div>
      </header>
      {children}
      <CartToast />
    </div>
  );
}
