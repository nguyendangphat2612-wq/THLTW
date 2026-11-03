<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPlaced extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Đơn hàng mới #'.$this->order->id,
            replyTo: [new Address($this->order->email, $this->order->customer_name)],
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.orders.placed',
            with: [
                'order' => $this->order,
                'paymentMethods' => [
                    'cod' => 'Thanh toán khi nhận hàng',
                    'vnpay' => 'VNPay Sandbox',
                    'momo' => 'MoMo Sandbox',
                ],
            ],
        );
    }
}
