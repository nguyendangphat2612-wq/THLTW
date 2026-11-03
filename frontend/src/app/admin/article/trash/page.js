import AdminOperationsManager from "../../_components/AdminOperationsManager";

export const metadata = { title: "Thùng rác bài viết | LocPhat Mobile" };

export default function AdminArticleTrashPage() {
  return <AdminOperationsManager resourceType="articles" initialTrash />;
}
