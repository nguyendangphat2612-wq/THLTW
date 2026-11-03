ĐƠN HÀNG MỚI #{{ $order->id }}

Khách hàng: {{ $order->customer_name }}
Email khách hàng: {{ $order->email }}
Số điện thoại: {{ $order->phone }}
Địa chỉ giao hàng: {{ $order->address }}

Sản phẩm:
@foreach ($order->items as $item)
- {{ $item['name'] }} x{{ $item['quantity'] }} — {{ number_format((float) $item['price'], 0, ',', '.') }} đ
@endforeach

@if ((float) $order->discount > 0)
Tạm tính: {{ number_format((float) $order->subtotal, 0, ',', '.') }} đ
Mã {{ $order->coupon_code }}: -{{ number_format((float) $order->discount, 0, ',', '.') }} đ
@endif
Tổng đơn hàng: {{ number_format((float) $order->total, 0, ',', '.') }} đ
Phương thức thanh toán: {{ $paymentMethods[$order->payment_method] ?? $order->payment_method }}
Trạng thái thanh toán: {{ $order->payment_status }}
Trạng thái: {{ $order->status }}
