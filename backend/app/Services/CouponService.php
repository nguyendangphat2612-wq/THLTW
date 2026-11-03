<?php

namespace App\Services;

use App\Models\Coupon;
use Illuminate\Validation\ValidationException;

class CouponService
{
    public function findActive(string $code, bool $lock = false): Coupon
    {
        $query = Coupon::query()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))])
            ->where('is_active', true);
        if ($lock) {
            $query->lockForUpdate();
        }
        $coupon = $query->first();

        if (! $coupon
            || ($coupon->starts_at && $coupon->starts_at->isFuture())
            || ($coupon->ends_at && $coupon->ends_at->isPast())) {
            throw ValidationException::withMessages([
                'code' => ['Mã khuyến mãi không hợp lệ hoặc đã hết hạn.'],
            ]);
        }

        return $coupon;
    }

    public function discount(Coupon $coupon, float $subtotal): float
    {
        return round(min(
            $subtotal,
            $coupon->discount_type === 'percent'
                ? $subtotal * (float) $coupon->discount_value / 100
                : (float) $coupon->discount_value
        ), 2);
    }
}
