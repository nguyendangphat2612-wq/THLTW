<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Xác nhận đơn hàng #'.$this->order->id,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.orders.confirmation',
            with: [
                'order' => $this->order,
                'paymentMethods' => [
                    'cod' => 'Thanh toán khi nhận hàng',
                    'vnpay' => 'VNPay Sandbox (demo)',
                    'momo' => 'MoMo Sandbox (demo)',
                ],
            ],
        );
    }
}
