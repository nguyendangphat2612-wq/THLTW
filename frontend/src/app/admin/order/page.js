import AdminOperationsManager from "../_components/AdminOperationsManager";

export const metadata = { title: "Đơn hàng | LocPhat Mobile" };

export default function AdminOrdersPage() {
  return <AdminOperationsManager resourceType="orders" />;
}
