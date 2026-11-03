import AdminResourceManager from "../../_components/AdminResourceManager";

export const metadata = {
  title: "Thùng rác danh mục | LocPhat Mobile",
};

export default function AdminCategoryTrashPage() {
  return <AdminResourceManager key="categories-trash" resourceType="categories" initialTrash />;
}