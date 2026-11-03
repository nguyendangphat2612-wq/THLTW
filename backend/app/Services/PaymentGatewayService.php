<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class PaymentGatewayService
{
    public function isConfigured(string $method): bool
    {
        return match ($method) {
            'vnpay' => filled(config('services.vnpay.tmn_code'))
                && filled(config('services.vnpay.hash_secret')),
            'momo' => filled(config('services.momo.partner_code'))
                && filled(config('services.momo.access_key'))
                && filled(config('services.momo.secret_key')),
            default => $method === 'cod',
        };
    }

    public function createPaymentUrl(Order $order, string $ipAddress): string
    {
        return match ($order->payment_method) {
            'vnpay' => $this->createVnpayUrl($order, $ipAddress),
            'momo' => $this->createMomoUrl($order),
            default => throw new PaymentGatewayException('Phương thức thanh toán không hợp lệ.'),
        };
    }

    public function verifyVnpay(array $data): ?Order
    {
        if (! $this->isConfigured('vnpay')
            || empty($data['vnp_SecureHash'])
            || ($data['vnp_TmnCode'] ?? null) !== config('services.vnpay.tmn_code')) {
            return null;
        }

        $providedHash = strtolower((string) $data['vnp_SecureHash']);
        unset($data['vnp_SecureHash'], $data['vnp_SecureHashType']);
        ksort($data);

        $hashData = collect($data)
            ->map(fn ($value, $key) => urlencode((string) $key).'='.urlencode((string) $value))
            ->implode('&');
        $expectedHash = hash_hmac('sha512', $hashData, (string) config('services.vnpay.hash_secret'));

        if (! hash_equals($expectedHash, $providedHash)) {
            return null;
        }

        $order = Order::query()
            ->where('payment_reference', $data['vnp_TxnRef'] ?? '')
            ->where('payment_method', 'vnpay')
            ->first();

        if (! $order || (int) ($data['vnp_Amount'] ?? 0) !== (int) round((float) $order->total * 100)) {
            return null;
        }

        return $order;
    }

    public function verifyMomo(array $data): ?Order
    {
        if (! $this->isConfigured('momo')
            || empty($data['signature'])
            || ($data['partnerCode'] ?? null) !== config('services.momo.partner_code')) {
            return null;
        }

        $signatureData = [
            'accessKey' => config('services.momo.access_key'),
            'amount' => $data['amount'] ?? '',
            'extraData' => $data['extraData'] ?? '',
            'message' => $data['message'] ?? '',
            'orderId' => $data['orderId'] ?? '',
            'orderInfo' => $data['orderInfo'] ?? '',
            'orderType' => $data['orderType'] ?? '',
            'partnerCode' => $data['partnerCode'] ?? '',
            'payType' => $data['payType'] ?? '',
            'requestId' => $data['requestId'] ?? '',
            'responseTime' => $data['responseTime'] ?? '',
            'resultCode' => $data['resultCode'] ?? '',
            'transId' => $data['transId'] ?? '',
        ];
        $signatureText = collect($signatureData)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode('&');
        $expectedSignature = hash_hmac(
            'sha256',
            $signatureText,
            (string) config('services.momo.secret_key'),
        );

        if (! hash_equals($expectedSignature, (string) $data['signature'])) {
            return null;
        }

        $order = Order::query()
            ->where('payment_reference', $data['orderId'] ?? '')
            ->where('payment_method', 'momo')
            ->first();

        if (! $order || (int) ($data['amount'] ?? 0) !== (int) round((float) $order->total)) {
            return null;
        }

        return $order;
    }

    private function createVnpayUrl(Order $order, string $ipAddress): string
    {
        $data = [
            'vnp_Version' => '2.1.0',
            'vnp_Command' => 'pay',
            'vnp_TmnCode' => config('services.vnpay.tmn_code'),
            'vnp_Amount' => (string) ((int) round((float) $order->total * 100)),
            'vnp_CurrCode' => 'VND',
            'vnp_TxnRef' => $order->payment_reference,
            'vnp_OrderInfo' => 'Thanh toan don hang '.$order->id,
            'vnp_OrderType' => 'other',
            'vnp_Locale' => 'vn',
            'vnp_ReturnUrl' => rtrim((string) config('app.url'), '/').'/api/payments/vnpay/return',
            'vnp_IpAddr' => $ipAddress,
            'vnp_CreateDate' => now()->format('YmdHis'),
        ];
        ksort($data);

        $hashData = collect($data)
            ->map(fn ($value, $key) => urlencode((string) $key).'='.urlencode((string) $value))
            ->implode('&');
        $query = $hashData.'&vnp_SecureHash='.hash_hmac(
            'sha512',
            $hashData,
            (string) config('services.vnpay.hash_secret'),
        );

        return rtrim((string) config('services.vnpay.url'), '?').'?'.$query;
    }

    private function createMomoUrl(Order $order): string
    {
        $data = [
            'partnerCode' => config('services.momo.partner_code'),
            'requestId' => $order->payment_reference,
            'amount' => (string) ((int) round((float) $order->total)),
            'orderId' => $order->payment_reference,
            'orderInfo' => 'Thanh toan don hang '.$order->id,
            'redirectUrl' => rtrim((string) config('app.url'), '/').'/api/payments/momo/return',
            'ipnUrl' => rtrim((string) config('app.url'), '/').'/api/payments/momo/ipn',
            'lang' => 'vi',
            'requestType' => 'captureWallet',
            'extraData' => '',
        ];
        $signatureData = [
            'accessKey' => config('services.momo.access_key'),
            'amount' => $data['amount'],
            'extraData' => $data['extraData'],
            'ipnUrl' => $data['ipnUrl'],
            'orderId' => $data['orderId'],
            'orderInfo' => $data['orderInfo'],
            'partnerCode' => $data['partnerCode'],
            'redirectUrl' => $data['redirectUrl'],
            'requestId' => $data['requestId'],
            'requestType' => $data['requestType'],
        ];
        $signatureText = collect($signatureData)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode('&');
        $data['signature'] = hash_hmac(
            'sha256',
            $signatureText,
            (string) config('services.momo.secret_key'),
        );

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->timeout(15)
                ->post((string) config('services.momo.url'), $data)
                ->throw()
                ->json();
        } catch (ConnectionException|RequestException $exception) {
            throw new PaymentGatewayException('Không thể kết nối cổng MoMo Sandbox.', previous: $exception);
        }

        if (! is_array($response)
            || (int) ($response['resultCode'] ?? -1) !== 0
            || ! filter_var($response['payUrl'] ?? null, FILTER_VALIDATE_URL)) {
            throw new PaymentGatewayException('MoMo không thể tạo liên kết thanh toán sandbox.');
        }

        return $response['payUrl'];
    }
}
