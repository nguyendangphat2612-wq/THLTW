import PaymentReturnStatus from "./PaymentReturnStatus";

export default async function PaymentReturnPage({ searchParams }) {
  const params = await searchParams;

  return <PaymentReturnStatus reference={params.reference || ""} callbackStatus={params.status || ""} />;
}
