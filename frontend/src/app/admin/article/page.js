import AdminOperationsManager from "../_components/AdminOperationsManager";

export const metadata = { title: "Bài viết | LocPhat Mobile" };

export default function AdminArticlesPage() {
  return <AdminOperationsManager resourceType="articles" />;
}
