<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\PaymentGatewayException;
use App\Services\PaymentGatewayService;
use App\Services\CouponService;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class OrderController extends Controller
{
    private const STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

    private const NEXT_STATUSES = [
        'pending' => 'confirmed',
        'confirmed' => 'shipping',
        'shipping' => 'completed',
    ];

    private const PAYMENT_METHODS = ['cod', 'vnpay', 'momo'];

    public function __construct(
        private readonly PaymentGatewayService $paymentGateway,
        private readonly CouponService $couponService,
        private readonly InventoryService $inventoryService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOrder($request);
        $paymentMethod = $validated['payment_method'] ?? 'cod';
        if (! $this->paymentGateway->isConfigured($paymentMethod)) {
            return response()->json([
                'message' => 'Cổng thanh toán được chọn chưa được cấu hình sandbox. Đơn hàng chưa được ghi nhận.',
            ], 503);
        }

        $token = $request->bearerToken();
        $customer = $request->user() ?? ($token
            ? User::query()->where('api_token', $token)->first()
            : null);
        $order = DB::transaction(function () use ($validated, $customer) {
            $coupon = filled($validated['coupon_code'] ?? null)
                ? $this->couponService->findActive($validated['coupon_code'], true)
                : null;
            $order = Order::create([
                ...$this->orderData($validated, null, $coupon),
                'user_id' => $customer?->role === 'admin' ? null : $customer?->id,
                'notification_email_status' => 'pending',
                'confirmation_email_status' => 'pending',
            ]);
            $this->inventoryService->syncOrderItems($order, $order->items, $customer?->id, []);
            if ($coupon) {
                $coupon->increment('usage_count');
            }

            return $order;
        });

        if (! $this->hasSmtpConfiguration()) {
            $order->update([
                'notification_email_status' => 'not_configured',
                'confirmation_email_status' => 'not_configured',
                'notification_email_error' => 'Chưa cấu hình đầy đủ Gmail SMTP.',
                'confirmation_email_error' => 'Chưa cấu hình đầy đủ Gmail SMTP.',
            ]);
        } else {
            try {
                Mail::to($order->email)->send(new OrderConfirmation($order));
                $order->update([
                    'confirmation_email_status' => 'sent',
                    'confirmation_email_sent_at' => now(),
                    'confirmation_email_error' => null,
                ]);
            } catch (TransportExceptionInterface $exception) {
                $order->update([
                    'confirmation_email_status' => 'failed',
                    'confirmation_email_error' => $this->emailDeliveryError($exception),
                ]);
                Log::error('Customer order confirmation email failed.', [
                    'order_id' => $order->id,
                    'exception_class' => $exception::class,
                    'exception_message' => $exception->getMessage(),
                ]);
            }

            if (! filter_var(config('mail.order_to'), FILTER_VALIDATE_EMAIL)) {
                $order->update([
                    'notification_email_status' => 'not_configured',
                    'notification_email_error' => 'Chưa cấu hình email nhận thông báo của cửa hàng.',
                ]);
            } else {
                try {
                    Mail::to(config('mail.order_to'))->send(new OrderPlaced($order));
                    $order->update([
                        'notification_email_status' => 'sent',
                        'notification_email_sent_at' => now(),
                        'notification_email_error' => null,
                    ]);
                } catch (TransportExceptionInterface $exception) {
                    $order->update([
                        'notification_email_status' => 'failed',
                        'notification_email_error' => $this->emailDeliveryError($exception),
                    ]);
                    Log::error('Order notification email failed.', [
                        'order_id' => $order->id,
                        'exception_class' => $exception::class,
                        'exception_message' => $exception->getMessage(),
                    ]);
                }
            }
        }

        if (in_array($paymentMethod, ['vnpay', 'momo'], true)) {
            try {
                $paymentUrl = $this->paymentGateway->createPaymentUrl($order, $request->ip());
            } catch (PaymentGatewayException $exception) {
                $order->update(['payment_status' => 'failed']);
                Log::warning('Sandbox payment session creation failed.', [
                    'order_id' => $order->id,
                    'payment_method' => $paymentMethod,
                    'exception_class' => $exception::class,
                ]);

                return response()->json([
                    'message' => 'Không thể bắt đầu thanh toán sandbox. Đơn hàng đã được lưu nhưng chưa thanh toán; vui lòng liên hệ cửa hàng để tránh tạo đơn trùng.',
                ], 502);
            }

            return response()->json([
                'data' => $order->fresh(),
                'payment_url' => $paymentUrl,
                'message' => $this->orderCreatedMessage($order, true),
            ], 201);
        }

        return response()->json([
            'data' => $order->fresh(),
            'message' => $this->orderCreatedMessage($order),
        ], 201);
    }

    private function orderCreatedMessage(Order $order, bool $redirectingToPayment = false): string
    {
        $message = $redirectingToPayment
            ? 'Đơn hàng đã được tạo. Đang chuyển tới cổng thanh toán sandbox.'
            : 'Đặt hàng thành công.';

        return match ($order->confirmation_email_status) {
            'sent' => $message.' Email xác nhận đã được gửi đến địa chỉ bạn nhập.',
            'failed' => str_contains((string) $order->confirmation_email_error, 'từ chối đăng nhập SMTP')
                ? $message.' Gmail từ chối đăng nhập SMTP (535), email chưa được gửi. Hãy cập nhật App Password của tài khoản gửi trong backend/.env rồi thử đơn mới.'
                : $message.' Chưa gửi được email xác nhận; vui lòng kiểm tra địa chỉ Gmail hoặc liên hệ cửa hàng.',
            'not_configured' => $message.' Email xác nhận chưa gửi được vì cửa hàng chưa cấu hình Gmail SMTP.',
            default => $message,
        };
    }

    private function emailDeliveryError(TransportExceptionInterface $exception): string
    {
        $message = strtolower($exception->getMessage());
        if (str_contains($message, '535')
            || str_contains($message, 'badcredentials')
            || str_contains($message, 'authentication failed')
            || str_contains($message, 'username and password not accepted')) {
            return 'Gmail từ chối đăng nhập SMTP (535); hãy cập nhật App Password của tài khoản gửi.';
        }

        return 'Gmail SMTP từ chối hoặc không nhận được email.';
    }

    public function vnpayReturn(Request $request)
    {
        $order = $this->paymentGateway->verifyVnpay($request->all());
        if (! $order) {
            return $this->paymentResultRedirect('vnpay', 'invalid');
        }

        $paid = ($request->input('vnp_ResponseCode') === '00')
            && ($request->input('vnp_TransactionStatus') === '00');
        $this->recordPaymentResult($order, $paid);

        return $this->paymentResultRedirect('vnpay', $paid ? 'success' : 'failed', $order->payment_reference);
    }

    public function vnpayIpn(Request $request): JsonResponse
    {
        $order = $this->paymentGateway->verifyVnpay($request->all());
        if (! $order) {
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature or order']);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['RspCode' => '02', 'Message' => 'Order already confirmed']);
        }

        $paid = ($request->input('vnp_ResponseCode') === '00')
            && ($request->input('vnp_TransactionStatus') === '00');
        $this->recordPaymentResult($order, $paid);

        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
    }

    public function momoReturn(Request $request)
    {
        $order = $this->paymentGateway->verifyMomo($request->all());
        if (! $order) {
            return $this->paymentResultRedirect('momo', 'invalid');
        }

        $paid = (int) $request->input('resultCode', -1) === 0;
        $this->recordPaymentResult($order, $paid);

        return $this->paymentResultRedirect('momo', $paid ? 'success' : 'failed', $order->payment_reference);
    }

    public function momoIpn(Request $request): JsonResponse
    {
        $order = $this->paymentGateway->verifyMomo($request->all());
        if (! $order) {
            return response()->json(['resultCode' => 1, 'message' => 'Invalid signature or order']);
        }

        $paid = (int) $request->input('resultCode', -1) === 0;
        $this->recordPaymentResult($order, $paid);

        return response()->json(['resultCode' => 0, 'message' => 'Confirm Success']);
    }

    private function recordPaymentResult(Order $order, bool $paid): void
    {
        if ($order->payment_status === 'paid') {
            return;
        }

        $order->update([
            'payment_status' => $paid ? 'paid' : 'failed',
            'status' => $paid ? 'confirmed' : $order->status,
        ]);
    }

    public function paymentStatus(string $reference): JsonResponse
    {
        $order = Order::query()
            ->where('payment_reference', $reference)
            ->whereIn('payment_method', ['vnpay', 'momo'])
            ->firstOrFail(['payment_method', 'payment_status']);

        return response()->json([
            'data' => [
                'gateway' => $order->payment_method,
                'status' => $order->payment_status,
            ],
        ]);
    }

    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
        ]);
        $coupon = $this->couponService->findActive($validated['code']);

        return response()->json([
            'data' => [
                'code' => $coupon->code,
                'discount_type' => $coupon->discount_type,
                'discount_value' => (float) $coupon->discount_value,
                'discount_percent' => $coupon->discount_type === 'percent' ? (float) $coupon->discount_value : null,
            ],
            'message' => 'Áp dụng mã khuyến mãi thành công.',
        ]);
    }

    public function customerIndex(Request $request)
    {
        return response()->json(
            Order::query()
                ->where('user_id', $request->user()->id)
                ->where('trash', 0)
                ->orderByDesc('id')
                ->paginate(10)
        );
    }

    public function customerShow(Request $request, Order $order): JsonResponse
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id && (int) $order->trash === 0, 404);

        return response()->json(['data' => $order]);
    }

    public function customerCancel(Request $request, Order $order): JsonResponse
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id && (int) $order->trash === 0, 404);
        $order = DB::transaction(function () use ($request, $order) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->status !== 'pending' || in_array($lockedOrder->payment_status, ['pending', 'paid'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ có thể hủy đơn đang chờ xử lý và chưa thanh toán.'],
                ]);
            }

            $this->inventoryService->restoreOrder($lockedOrder, $request->user()->id);
            $lockedOrder->update(['status' => 'cancelled']);

            return $lockedOrder;
        });

        return response()->json([
            'data' => $order->fresh(),
            'message' => 'Đơn hàng đã được hủy.',
        ]);
    }

    public function adminCancel(Request $request, Order $order): JsonResponse
    {
        $order = DB::transaction(function () use ($request, $order) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'status' => ['Đơn hàng đã được hủy trước đó.'],
                ]);
            }
            if ($lockedOrder->status === 'completed') {
                throw ValidationException::withMessages([
                    'status' => ['Không thể hủy đơn hàng đã hoàn tất.'],
                ]);
            }
            if (in_array($lockedOrder->payment_status, ['pending', 'paid'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Đơn đang chờ thanh toán hoặc đã thanh toán; hãy xử lý giao dịch trước khi hủy.'],
                ]);
            }

            $this->inventoryService->restoreOrder($lockedOrder, $request->user()->id);
            $lockedOrder->update(['status' => 'cancelled']);

            return $lockedOrder;
        });

        return response()->json([
            'data' => $order->fresh(),
            'message' => 'Đơn hàng đã được hủy và tồn kho đã được hoàn lại.',
        ]);
    }

    private function paymentResultRedirect(string $gateway, string $status, ?string $reference = null)
    {
        $query = http_build_query(array_filter([
            'gateway' => $gateway,
            'status' => $status,
            'reference' => $reference,
        ]));

        return redirect(rtrim((string) config('app.frontend_url'), '/').'/payment/return?'.$query);
    }

    private function hasSmtpConfiguration(): bool
    {
        return config('mail.default') === 'smtp'
            && config('mail.mailers.smtp.host') === 'smtp.gmail.com'
            && filled(config('mail.mailers.smtp.username'))
            && filled(config('mail.mailers.smtp.password'))
            && filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL) !== false;
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $search = trim($filters['search']);
                $query->where(function ($query) use ($search) {
                    $query->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($orders);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $validated = $this->validateOrder($request, true, true, $order);
        $order = DB::transaction(function () use ($request, $order, $validated) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $newStatus = $validated['status'] ?? $lockedOrder->status;
            if ($lockedOrder->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'status' => ['Không thể cập nhật đơn hàng đã hủy.'],
                ]);
            }
            if ($newStatus === 'cancelled') {
                throw ValidationException::withMessages([
                    'status' => ['Vui lòng sử dụng chức năng hủy đơn hàng.'],
                ]);
            }
            if ($newStatus !== $lockedOrder->status
                && (self::NEXT_STATUSES[$lockedOrder->status] ?? null) !== $newStatus) {
                throw ValidationException::withMessages([
                    'status' => ['Trạng thái đơn hàng phải được cập nhật theo thứ tự: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn tất.'],
                ]);
            }
            if ($newStatus === 'completed' && $lockedOrder->payment_method !== 'cod' && $lockedOrder->payment_status !== 'paid') {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ hoàn tất đơn thanh toán online sau khi giao dịch đã thanh toán.'],
                ]);
            }

            $data = [
                'customer_name' => $validated['customer_name'] ?? $lockedOrder->customer_name,
                'email' => $validated['email'] ?? $lockedOrder->email,
                'phone' => $validated['phone'] ?? $lockedOrder->phone,
                'address' => $validated['address'] ?? $lockedOrder->address,
                'status' => $newStatus,
            ];
            if (array_key_exists('items', $validated)) {
                $data += $this->orderData($validated, $lockedOrder);
                $this->inventoryService->syncOrderItems(
                    $lockedOrder,
                    $data['items'],
                    $request->user()->id,
                );
            }
            $lockedOrder->update($data);

            return $lockedOrder;
        });

        return response()->json(['data' => $order->fresh()]);
    }

    public function destroy(Order $order): JsonResponse
    {
        $order->update(['trash' => 1]);

        return response()->json(['message' => 'Đơn hàng đã được chuyển vào thùng rác.']);
    }

    public function restore(Order $order): JsonResponse
    {
        abort_unless((int) $order->trash === 1, 404);
        $order->update(['trash' => 0]);

        return response()->json(['data' => $order->fresh(), 'message' => 'Đơn hàng đã được khôi phục.']);
    }

    public function forceDestroy(Order $order): JsonResponse
    {
        abort_unless((int) $order->trash === 1, 404);
        $order->delete();

        return response()->json(['message' => 'Đơn hàng đã được xóa vĩnh viễn.']);
    }

    private function validateOrder(
        Request $request,
        bool $sometimes = false,
        bool $allowStatus = false,
        ?Order $order = null
    ): array {
        $required = $sometimes ? 'sometimes' : 'required';
        $rules = [
            'customer_name' => [$required, 'string', 'max:255'],
            'email' => [$required, 'email', 'max:255'],
            'phone' => [$required, 'string', 'max:32'],
            'address' => [$required, 'string', 'max:1000'],
            'items' => [$required, 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required_with:items', 'integer', 'distinct'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1', 'max:99'],
            'coupon_code' => $allowStatus
                ? ['prohibited']
                : ['nullable', 'string', 'max:50'],
            'payment_method' => $allowStatus
                ? ['prohibited']
                : ['sometimes', Rule::in(self::PAYMENT_METHODS)],
            'payment_status' => ['prohibited'],
            'status' => $allowStatus ? ['sometimes', Rule::in(self::STATUSES)] : ['prohibited'],
        ];

        $validated = $request->validate($rules);

        if (! $allowStatus && filled($validated['coupon_code'] ?? null)) {
            $validated['coupon_code'] = Str::upper(trim($validated['coupon_code']));
        }

        if (array_key_exists('items', $validated)) {
            $savedProductIds = collect($order?->items ?? [])
                ->pluck('product_id')
                ->map(fn ($productId) => (int) $productId)
                ->all();

            foreach ($validated['items'] as $item) {
                $product = Product::query()->find($item['product_id']);
                $isExistingOrderItem = in_array((int) $item['product_id'], $savedProductIds, true);
                if (! $product && ! $isExistingOrderItem) {
                    throw ValidationException::withMessages([
                        'items' => ['Một sản phẩm trong giỏ hàng không còn tồn tại.'],
                    ]);
                }
                if ($product && ((int) $product->status !== 1 || (int) $product->trash !== 0) && ! $isExistingOrderItem) {
                    throw ValidationException::withMessages([
                        'items' => ['Một sản phẩm trong giỏ hàng không còn được kinh doanh.'],
                    ]);
                }
            }
        }

        return $validated;
    }

    private function orderData(array $validated, ?Order $order = null, ?Coupon $coupon = null): array
    {
        $items = [];
        $subtotal = 0;
        $paymentMethod = $validated['payment_method'] ?? $order?->payment_method ?? 'cod';
        $paymentStatus = array_key_exists('payment_method', $validated)
            ? ($paymentMethod === 'cod' ? 'unpaid' : 'pending')
            : ($order?->payment_status ?? 'unpaid');
        $paymentReference = in_array($validated['payment_method'] ?? null, ['vnpay', 'momo'], true)
            ? Str::upper(Str::random(32))
            : $order?->payment_reference;
        $savedItems = collect($order?->items ?? [])->keyBy('product_id');

        foreach ($validated['items'] as $item) {
            $savedItem = $savedItems->get($item['product_id']);
            $product = Product::query()->find($item['product_id']);
            if (! $product && ! $savedItem) {
                throw ValidationException::withMessages([
                    'items' => ['Một sản phẩm trong giỏ hàng không còn tồn tại.'],
                ]);
            }
            $price = (float) ($savedItem['price'] ?? $product->sale_price ?? $product->price);
            $quantity = (int) $item['quantity'];
            $items[] = [
                'product_id' => $product?->product_id ?? $savedItem['product_id'],
                'name' => $savedItem['name'] ?? $product->product_name,
                'image' => $savedItem['image'] ?? $product->image,
                'price' => $price,
                'quantity' => $quantity,
            ];
            $subtotal += $price * $quantity;
        }

        $subtotal = round($subtotal, 2);
        $couponCode = $validated['coupon_code'] ?? $order?->coupon_code;
        $discountType = $coupon?->discount_type ?? $order?->coupon_discount_type;
        $discountValue = $coupon?->discount_value ?? $order?->coupon_discount_value;
        if ($couponCode && $discountType === null) {
            $discountType = 'percent';
            $discountValue = $order?->coupon_discount_percent ?? 0;
        }
        $discount = ! $couponCode || ! $discountType
            ? 0
            : ($coupon
                ? $this->couponService->discount($coupon, $subtotal)
                : round(min(
                    $subtotal,
                    $discountType === 'percent'
                        ? $subtotal * (float) $discountValue / 100
                        : (float) $discountValue
                ), 2));

        return [
            'user_id' => $order?->user_id,
            'customer_name' => $validated['customer_name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'items' => $items,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'coupon_code' => $couponCode,
            'coupon_discount_percent' => $discountType === 'percent' ? $discountValue : 0,
            'coupon_discount_type' => $discountType,
            'coupon_discount_value' => $discountValue,
            'total' => round($subtotal - $discount, 2),
            'payment_method' => $paymentMethod,
            'payment_status' => $paymentStatus,
            'payment_reference' => $paymentReference,
            'status' => $validated['status'] ?? 'pending',
        ];
    }

}
