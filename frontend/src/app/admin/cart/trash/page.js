import AdminOperationsManager from "../../_components/AdminOperationsManager";

export const metadata = { title: "Thùng rác đơn hàng | LocPhat Mobile" };

export default function AdminCartTrashPage() {
  return <AdminOperationsManager resourceType="orders" initialTrash />;
}
