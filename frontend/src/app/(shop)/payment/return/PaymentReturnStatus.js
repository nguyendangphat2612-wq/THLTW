"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export default function PaymentReturnStatus({ reference, callbackStatus }) {
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(Boolean(reference));

  const fetchPayment = useCallback(
    () => apiRequest(`/api/payments/status/${encodeURIComponent(reference)}`),
    [reference],
  );

  const checkPayment = useCallback(async () => {
    if (!reference) return;
    setChecking(true);
    setError("");

    try {
      const response = await fetchPayment();
      setPayment(response.data);
    } catch (requestError) {
      setError(requestError.status === 404
        ? "Không tìm thấy giao dịch này. Hãy kiểm tra lại đường dẫn thanh toán."
        : "Không thể kiểm tra trạng thái thanh toán.");
    } finally {
      setChecking(false);
    }
  }, [fetchPayment, reference]);

  useEffect(() => {
    if (!reference) return undefined;
    let active = true;

    fetchPayment()
      .then((response) => {
        if (active) setPayment(response.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.status === 404
            ? "Không tìm thấy giao dịch này. Hãy kiểm tra lại đường dẫn thanh toán."
            : "Không thể kiểm tra trạng thái thanh toán.");
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => { active = false; };
  }, [fetchPayment, reference]);

  const gateway = payment?.gateway === "momo" ? "MoMo" : "VNPay";
  const paid = payment?.status === "paid";
  const invalid = !reference && callbackStatus === "invalid";
  const heading = checking
    ? "Đang xác minh thanh toán"
    : paid
      ? "Thanh toán thử nghiệm thành công"
      : invalid
        ? "Không thể xác minh giao dịch"
        : payment?.status === "failed"
          ? "Giao dịch chưa hoàn tất"
          : error
            ? "Chưa thể xác minh thanh toán"
            : "Đang chờ xác nhận kết quả";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <section className={`border p-8 ${paid ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">LocPhat Mobile · Sandbox</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{heading}</h1>
        <p className="mt-4 leading-7 text-slate-700">
          {checking
            ? "Đang kiểm tra trạng thái đã được xác nhận ở máy chủ."
            : paid
              ? `Cổng ${gateway} đã xác nhận giao dịch sandbox. Đây chỉ là giao dịch thử nghiệm, không có tiền thật bị trừ.`
              : invalid
                ? `Chữ ký phản hồi từ ${gateway} không hợp lệ. Trạng thái đơn hàng chưa được xác nhận đã thanh toán.`
                : payment?.status === "failed"
                  ? `Giao dịch ${gateway} bị hủy hoặc thất bại. Đơn hàng vẫn chưa được xác nhận đã thanh toán.`
                  : error
                    ? `${error} Nếu vừa hoàn tất thanh toán, hãy thử kiểm tra lại sau.`
                    : "Cổng thanh toán chưa xác nhận giao dịch. Bạn có thể kiểm tra lại trạng thái."}
        </p>
        {!paid && reference ? (
          <button type="button" onClick={checkPayment} disabled={checking} className="mt-5 min-h-10 border border-slate-300 bg-white px-4 font-semibold text-slate-800 disabled:opacity-60">
            Kiểm tra lại
          </button>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/products" className="inline-flex min-h-11 items-center bg-teal-800 px-5 font-semibold text-white">Tiếp tục mua sắm</Link>
          <Link href="/cart" className="inline-flex min-h-11 items-center border border-slate-300 bg-white px-5 font-semibold text-slate-800">Xem giỏ hàng</Link>
        </div>
      </section>
    </main>
  );
}
