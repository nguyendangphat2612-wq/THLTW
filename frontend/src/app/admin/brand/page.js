import AdminResourceManager from "../_components/AdminResourceManager";

export const metadata = {
  title: "Thương hiệu | LocPhat Mobile",
};

export default function AdminBrandsPage() {
  return <AdminResourceManager key="brands-active" resourceType="brands" />;
}
