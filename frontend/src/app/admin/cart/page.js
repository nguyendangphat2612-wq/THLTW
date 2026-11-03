import AdminOperationsManager from "../_components/AdminOperationsManager";

export const metadata = { title: "Giỏ hàng / Đơn hàng | LocPhat Mobile" };

export default function AdminCartPage() {
  return <AdminOperationsManager resourceType="orders" />;
}
