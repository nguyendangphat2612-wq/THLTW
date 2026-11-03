XÁC NHẬN ĐÃ NHẬN ĐƠN HÀNG #{{ $order->id }}

Xin chào {{ $order->customer_name }},

Cửa hàng Loc Phat Mobile đã nhận được đơn hàng của bạn.

Thông tin giao hàng:
Số điện thoại: {{ $order->phone }}
Địa chỉ: {{ $order->address }}

Sản phẩm đã đặt:
@foreach ($order->items as $item)
- {{ $item['name'] }} x{{ $item['quantity'] }} — {{ number_format((float) $item['price'], 0, ',', '.') }} đ
@endforeach

@if ((float) $order->discount > 0)
Tạm tính: {{ number_format((float) $order->subtotal, 0, ',', '.') }} đ
Mã {{ $order->coupon_code }}: -{{ number_format((float) $order->discount, 0, ',', '.') }} đ
@endif
Tổng đơn hàng: {{ number_format((float) $order->total, 0, ',', '.') }} đ
Phương thức thanh toán: {{ $paymentMethods[$order->payment_method] ?? $order->payment_method }}
Trạng thái đơn hàng: {{ $order->status }}

Lưu ý: VNPay Sandbox và MoMo Sandbox chỉ là thanh toán demo, không thu tiền thật.

Loc Phat Mobile
