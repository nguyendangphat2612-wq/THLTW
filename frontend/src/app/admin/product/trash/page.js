import AdminResourceManager from "../../_components/AdminResourceManager";

export const metadata = {
  title: "Thùng rác sản phẩm | LocPhat Mobile",
};

export default function AdminProductTrashPage() {
  return <AdminResourceManager key="products-trash" resourceType="products" initialTrash />;
}