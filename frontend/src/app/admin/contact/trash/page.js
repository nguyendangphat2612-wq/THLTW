import AdminOperationsManager from "../../_components/AdminOperationsManager";

export const metadata = { title: "Thùng rác liên hệ | LocPhat Mobile" };

export default function AdminContactTrashPage() {
  return <AdminOperationsManager resourceType="contacts" initialTrash />;
}
