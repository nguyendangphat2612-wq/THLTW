<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'customer_name',
        'email',
        'phone',
        'address',
        'items',
        'subtotal',
        'discount',
        'coupon_code',
        'coupon_discount_percent',
        'coupon_discount_type',
        'coupon_discount_value',
        'total',
        'payment_method',
        'payment_status',
        'payment_reference',
        'notification_email_status',
        'notification_email_sent_at',
        'notification_email_error',
        'confirmation_email_status',
        'confirmation_email_sent_at',
        'confirmation_email_error',
        'status',
        'trash',
    ];

    protected function casts(): array
    {
        return [
            'items' => 'array',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'coupon_discount_value' => 'decimal:2',
            'total' => 'decimal:2',
            'trash' => 'integer',
            'notification_email_sent_at' => 'datetime',
            'confirmation_email_sent_at' => 'datetime',
        ];
    }
}
