import AdminResourceManager from "../_components/AdminResourceManager";

export const metadata = {
  title: "Danh mục | LocPhat Mobile",
};

export default function AdminCategoriesPage() {
  return <AdminResourceManager key="categories-active" resourceType="categories" />;
}
