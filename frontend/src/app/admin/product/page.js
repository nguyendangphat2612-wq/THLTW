import AdminResourceManager from "../_components/AdminResourceManager";

export const metadata = {
  title: "Sản phẩm | LocPhat Mobile",
};

export default function AdminProductsPage() {
  return <AdminResourceManager key="products-active" resourceType="products" />;
}