import AdminResourceManager from "../../_components/AdminResourceManager";

export const metadata = {
  title: "Thùng rác thương hiệu | LocPhat Mobile",
};

export default function AdminBrandTrashPage() {
  return <AdminResourceManager key="brands-trash" resourceType="brands" initialTrash />;
}