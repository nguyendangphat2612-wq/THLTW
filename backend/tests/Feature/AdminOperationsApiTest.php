<?php

namespace Tests\Feature;

use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Article;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class AdminOperationsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_inspect_lock_unlock_and_delete_members_without_deleting_orders(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $member = User::factory()->create(['role' => 'user']);
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $order = Order::query()->create([
            'user_id' => $member->id,
            'customer_name' => $member->name,
            'email' => $member->email,
            'phone' => '0900000000',
            'address' => 'Test address',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
            'subtotal' => 100000,
            'discount' => 0,
            'total' => 100000,
            'status' => 'pending',
        ]);
        ProductReview::query()->create([
            'product_id' => $product->product_id,
            'user_id' => $member->id,
            'rating' => 5,
            'comment' => 'Great product',
        ]);

        $this->getJson('/api/admin/members/'.$member->id, $headers)
            ->assertOk()
            ->assertJsonPath('data.orders_count', 1)
            ->assertJsonPath('data.reviews_count', 1)
            ->assertJsonPath('data.orders.0.id', $order->id)
            ->assertJsonPath('data.reviews.0.comment', 'Great product');

        $memberToken = $member->api_token;
        $this->postJson('/api/admin/members/'.$member->id.'/lock', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.is_locked', true);
        $this->assertDatabaseHas('users', ['id' => $member->id, 'is_locked' => true, 'api_token' => null]);
        $this->withHeader('Authorization', 'Bearer '.$memberToken)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/login', [
            'email' => $member->email,
            'password' => 'password',
        ])->assertUnprocessable();

        $this->postJson('/api/admin/members/'.$member->id.'/unlock', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.is_locked', false);
        $this->postJson('/api/login', [
            'email' => $member->email,
            'password' => 'password',
        ])->assertOk();

        $this->deleteJson('/api/admin/members/'.$member->id, [], $headers)
            ->assertOk()
            ->assertJsonPath('message', 'Đã xóa tài khoản. Lịch sử đơn hàng được giữ lại; đánh giá sản phẩm của thành viên đã bị xóa.');
        $this->assertDatabaseMissing('users', ['id' => $member->id]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'user_id' => null]);
        $this->assertDatabaseMissing('product_reviews', ['user_id' => $member->id]);
    }

    public function test_admin_member_management_cannot_lock_or_delete_admin_accounts(): void
    {
        $headers = $this->adminHeaders();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->postJson('/api/admin/members/'.$admin->id.'/lock', [], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['member']);
        $this->deleteJson('/api/admin/members/'.$admin->id, [], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['member']);
    }

    public function test_category_and_article_names_are_case_insensitively_unique_including_trash(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        Category::query()->where('alias', 'iphone')->update(['trash' => 1]);
        Category::query()->where('alias', 'dien-thoai-di-dong')->update(['trash' => 1]);

        $this->postJson('/api/categories', ['cat_name' => '  IPHONE  '], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cat_name']);
        $this->postJson('/api/categories', ['cat_name' => 'ĐIỆN THOẠI DI ĐỘNG'], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cat_name']);

        $articleId = $this->postJson('/api/admin/articles', [
            'title' => 'Unique Article Example',
            'content' => 'Article body.',
        ], $headers)->assertCreated()->json('data.id');
        Article::query()->whereKey($articleId)->update(['trash' => 1]);

        $this->postJson('/api/admin/articles', [
            'title' => ' unique article example ',
            'content' => 'Another body.',
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_brand_and_product_names_cannot_be_reused_from_the_trash(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $phoneCategoryId = Category::query()->where('alias', 'dien-thoai-di-dong')->value('cat_id');
        Category::query()->where('alias', 'xiaomi')->update(['trash' => 1]);

        $this->postJson('/api/brands', ['cat_name' => 'XIAOMI', 'parent_id' => $phoneCategoryId], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cat_name']);

        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $product->update(['trash' => 1]);
        $this->postJson('/api/products', [
            'product_name' => 'IPHONE 15 128GB',
            'cat_id' => $product->cat_id,
            'brand_id' => $product->brand_id,
            'price' => $product->price,
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_name']);
    }

    public function test_contact_admin_can_create_update_trash_restore_and_delete_messages(): void
    {
        $headers = $this->adminHeaders();
        $payload = [
            'name' => 'Nguyen Van A',
            'email' => 'customer@example.com',
            'subject' => 'Order question',
            'message' => 'Please contact me.',
        ];

        $contactId = $this->postJson('/api/admin/contacts', $payload, $headers)
            ->assertCreated()
            ->json('data.id');

        $this->putJson('/api/admin/contacts/'.$contactId, [...$payload, 'subject' => 'Updated subject'], $headers)
            ->assertOk()
            ->assertJsonPath('data.subject', 'Updated subject');

        $this->deleteJson('/api/admin/contacts/'.$contactId, [], $headers)->assertOk();
        $this->getJson('/api/admin/contacts?trash=1', $headers)->assertOk()->assertJsonPath('data.0.id', $contactId);
        $this->postJson('/api/admin/contacts/'.$contactId.'/restore', [], $headers)->assertOk();
        $this->deleteJson('/api/admin/contacts/'.$contactId, [], $headers)->assertOk();
        $this->deleteJson('/api/admin/contacts/'.$contactId.'/force', [], $headers)->assertOk();
        $this->assertDatabaseMissing('contact_messages', ['id' => $contactId]);
    }

    public function test_articles_are_public_and_support_admin_crud_and_trash(): void
    {
        $headers = $this->adminHeaders();
        $payload = [
            'title' => 'A new mobile article',
            'excerpt' => 'Short summary.',
            'content' => "First paragraph.\n\nSecond paragraph.",
            'published_at' => '2026-10-26',
            'status' => 1,
        ];
        $articleId = $this->postJson('/api/admin/articles', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.slug', 'a-new-mobile-article')
            ->json('data.id');

        $this->getJson('/api/articles/a-new-mobile-article')
            ->assertOk()
            ->assertJsonPath('data.title', $payload['title']);
        $this->putJson('/api/admin/articles/'.$articleId, [...$payload, 'title' => 'Updated mobile article'], $headers)
            ->assertOk()
            ->assertJsonPath('data.slug', 'updated-mobile-article');
        $this->deleteJson('/api/admin/articles/'.$articleId, [], $headers)->assertOk();
        $this->getJson('/api/articles/updated-mobile-article')->assertNotFound();
        $this->postJson('/api/admin/articles/'.$articleId.'/restore', [], $headers)->assertOk();
        $this->getJson('/api/articles/updated-mobile-article')->assertOk();
        $this->deleteJson('/api/admin/articles/'.$articleId, [], $headers)->assertOk();
        $this->deleteJson('/api/admin/articles/'.$articleId.'/force', [], $headers)->assertOk();
        $this->assertDatabaseMissing('articles', ['id' => $articleId]);
    }

    public function test_checkout_creates_server_priced_orders_that_admin_can_manage(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.gmail.com',
            'mail.mailers.smtp.username' => 'shop@example.com',
            'mail.mailers.smtp.password' => 'test-app-password',
            'mail.from.address' => 'shop@example.com',
            'mail.order_to' => 'shop@example.com',
        ]);
        Mail::fake();
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $payload = [
            'customer_name' => 'Nguyen Van B',
            'email' => 'buyer@example.com',
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1, 'price' => 1]],
        ];

        $this->postJson('/api/orders', [...$payload, 'status' => 'completed'])->assertUnprocessable();

        $orderId = $this->postJson('/api/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('data.total', number_format((float) ($product->sale_price ?? $product->price), 2, '.', ''))
            ->assertJsonPath('data.confirmation_email_status', 'sent')
            ->assertJsonPath('data.notification_email_status', 'sent')
            ->json('data.id');
        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'confirmation_email_status' => 'sent',
            'notification_email_status' => 'sent',
        ]);
        $this->assertNotNull(Order::findOrFail($orderId)->notification_email_sent_at);
        $this->assertNotNull(Order::findOrFail($orderId)->confirmation_email_sent_at);
        $this->getJson('/api/admin/orders', $headers)
            ->assertOk()
            ->assertJsonPath('data.0.confirmation_email_status', 'sent')
            ->assertJsonPath('data.0.notification_email_status', 'sent');
        Mail::assertSent(OrderConfirmation::class, fn (OrderConfirmation $mail) => $mail->hasTo('buyer@example.com')
            && $mail->order->id === $orderId
            && str_contains($mail->render(), $product->product_name)
            && str_contains($mail->render(), 'không thu tiền thật'));
        Mail::assertSent(OrderPlaced::class, fn (OrderPlaced $mail) => $mail->hasTo('shop@example.com')
            && $mail->order->id === $orderId
            && str_contains($mail->render(), $product->product_name));

        $originalPrice = (float) ($product->sale_price ?? $product->price);
        $product->update(['sale_price' => 1]);
        $this->putJson('/api/admin/orders/'.$orderId, [
            'customer_name' => 'Updated buyer',
            'email' => $payload['email'],
            'phone' => $payload['phone'],
            'address' => $payload['address'],
            'status' => 'confirmed',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('data.total', number_format($originalPrice, 2, '.', ''));

        $this->putJson('/api/admin/orders/'.$orderId, [
            ...$payload,
            'status' => 'confirmed',
            'items' => [['product_id' => $product->product_id, 'quantity' => 2]],
        ], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.total', number_format($originalPrice * 2, 2, '.', ''));

        $this->deleteJson('/api/admin/orders/'.$orderId, [], $headers)->assertOk();
        $this->getJson('/api/admin/orders?trash=1', $headers)->assertOk()->assertJsonPath('data.0.id', $orderId);
        $this->postJson('/api/admin/orders/'.$orderId.'/restore', [], $headers)->assertOk();
        $this->deleteJson('/api/admin/orders/'.$orderId, [], $headers)->assertOk();
        $this->deleteJson('/api/admin/orders/'.$orderId.'/force', [], $headers)->assertOk();
        $this->assertDatabaseMissing('orders', ['id' => $orderId]);
    }

    public function test_admin_order_status_must_advance_in_sequence_or_be_cancelled(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $orderId = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van C',
            'email' => 'sequence@example.com',
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])->assertCreated()->json('data.id');

        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'shipping'], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'confirmed'], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');
        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'pending'], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'shipping'], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'shipping');
        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'completed'], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
        $this->putJson('/api/admin/orders/'.$orderId, ['status' => 'shipping'], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
        $this->postJson('/api/admin/orders/'.$orderId.'/cancel', [], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    public function test_checkout_records_order_when_gmail_is_not_configured(): void
    {
        $this->seed();
        config(['mail.default' => 'log', 'mail.order_to' => null]);
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van B',
            'email' => 'buyer@example.com',
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])
            ->assertCreated()
            ->assertJsonPath('data.confirmation_email_status', 'not_configured')
            ->assertJsonPath('data.notification_email_status', 'not_configured')
            ->assertJsonPath('message', 'Đặt hàng thành công. Email xác nhận chưa gửi được vì cửa hàng chưa cấu hình Gmail SMTP.');

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', ['confirmation_email_status' => 'not_configured']);
        $this->assertDatabaseHas('orders', ['notification_email_status' => 'not_configured']);
    }

    public function test_customer_can_apply_coupon_view_owned_orders_and_cancel_unpaid_pending_order(): void
    {
        $this->seed();
        $user = User::factory()->create(['role' => 'user']);
        $headers = ['Authorization' => 'Bearer '.$user->api_token];
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $price = (float) ($product->sale_price ?? $product->price);

        $this->postJson('/api/coupons/validate', ['code' => 'invalid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
        $this->postJson('/api/coupons/validate', ['code' => 'locphat10'])
            ->assertOk()
            ->assertJsonPath('data.code', 'LOCPHAT10')
            ->assertJsonPath('data.discount_percent', 10);

        $orderId = $this->postJson('/api/orders', [
            'customer_name' => $user->name,
            'email' => $user->email,
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'coupon_code' => 'locphat10',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.coupon_code', 'LOCPHAT10')
            ->assertJsonPath('data.subtotal', number_format($price, 2, '.', ''))
            ->assertJsonPath('data.discount', number_format(round($price * 0.1, 2), 2, '.', ''))
            ->assertJsonPath('data.total', number_format(round($price * 0.9, 2), 2, '.', ''))
            ->json('data.id');

        $this->getJson('/api/orders', $headers)
            ->assertOk()
            ->assertJsonPath('data.0.id', $orderId);
        $this->getJson('/api/orders/'.$orderId, $headers)
            ->assertOk()
            ->assertJsonPath('data.id', $orderId);

        $otherUser = User::factory()->create(['role' => 'user']);
        $otherHeaders = ['Authorization' => 'Bearer '.$otherUser->api_token];
        $this->getJson('/api/orders/'.$orderId, $otherHeaders)->assertNotFound();
        $this->postJson('/api/orders/'.$orderId.'/cancel', [], $otherHeaders)->assertNotFound();

        $this->postJson('/api/orders/'.$orderId.'/cancel', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
        $this->postJson('/api/orders/'.$orderId.'/cancel', [], $headers)
            ->assertUnprocessable();
    }

    public function test_admin_can_manage_promotions_and_members_without_removing_accounts(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $couponId = $this->postJson('/api/admin/coupons', [
            'code' => ' save50 ',
            'discount_type' => 'fixed',
            'discount_value' => 50000,
            'starts_at' => null,
            'ends_at' => null,
            'is_active' => true,
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('data.code', 'SAVE50')
            ->assertJsonPath('data.discount_type', 'fixed')
            ->json('data.id');

        $this->postJson('/api/admin/coupons', [
            'code' => 'save50',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'is_active' => true,
        ], $headers)->assertUnprocessable()->assertJsonValidationErrors(['code']);

        $this->postJson('/api/coupons/validate', ['code' => 'save50'])
            ->assertOk()
            ->assertJsonPath('data.discount_type', 'fixed')
            ->assertJsonPath('data.discount_value', 50000);

        $buyer = User::factory()->create(['role' => 'user']);
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();
        $this->postJson('/api/orders', [
            'customer_name' => $buyer->name,
            'email' => $buyer->email,
            'phone' => '0900000000',
            'address' => 'Test address',
            'coupon_code' => 'SAVE50',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ], ['Authorization' => 'Bearer '.$buyer->api_token])
            ->assertCreated()
            ->assertJsonPath('data.coupon_discount_type', 'fixed')
            ->assertJsonPath('data.coupon_discount_value', '50000.00')
            ->assertJsonPath('data.discount', '50000.00');

        $this->putJson('/api/admin/coupons/'.$couponId, [
            'code' => 'SAVE50',
            'discount_type' => 'percent',
            'discount_value' => 15,
            'starts_at' => null,
            'ends_at' => null,
            'is_active' => false,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('data.discount_type', 'percent')
            ->assertJsonPath('data.discount_value', '15.00');
        $this->postJson('/api/coupons/validate', ['code' => 'SAVE50'])->assertUnprocessable();
        $this->deleteJson('/api/admin/coupons/'.$couponId, [], $headers)->assertOk();
        $this->postJson('/api/coupons/validate', ['code' => 'SAVE50'])->assertUnprocessable();

        $member = User::factory()->create(['role' => 'user']);
        $this->getJson('/api/admin/members?search='.urlencode($member->email), $headers)
            ->assertOk()
            ->assertJsonPath('data.0.email', $member->email);
        $this->putJson('/api/admin/members/'.$member->id, [
            'name' => 'Updated Member',
            'email' => $member->email,
            'phone' => '0900000000',
            'address' => 'Updated address',
            'role' => 'admin',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.name', 'Updated Member');

        $admin = User::query()->where('api_token', substr($headers['Authorization'], 7))->firstOrFail();
        $this->putJson('/api/admin/members/'.$admin->id, [
            'name' => $admin->name,
            'email' => $admin->email,
            'phone' => $admin->phone,
            'address' => $admin->address,
            'role' => 'user',
        ], $headers)->assertUnprocessable()->assertJsonValidationErrors(['role']);
        $this->assertDatabaseHas('users', ['id' => $member->id]);
    }

    public function test_inventory_movements_are_tracked_and_order_cancellation_restores_stock(): void
    {
        $this->seed();
        $adminHeaders = $this->adminHeaders();
        $user = User::factory()->create(['role' => 'user']);
        $userHeaders = ['Authorization' => 'Bearer '.$user->api_token];
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $this->postJson('/api/admin/inventory/adjustments', [
            'product_id' => $product->product_id,
            'direction' => 'out',
            'quantity' => 1,
        ], $adminHeaders)->assertUnprocessable()->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/admin/inventory/adjustments', [
            'product_id' => $product->product_id,
            'direction' => 'in',
            'quantity' => 5,
            'note' => 'Initial stock',
        ], $adminHeaders)->assertCreated()->assertJsonPath('data.balance_after', 5);

        $orderId = $this->postJson('/api/orders', [
            'customer_name' => $user->name,
            'email' => $user->email,
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 2]],
        ], $userHeaders)->assertCreated()->json('data.id');
        $this->assertDatabaseHas('products', ['product_id' => $product->product_id, 'stock_quantity' => 3, 'track_inventory' => 1]);
        $this->assertDatabaseHas('inventory_movements', [
            'order_id' => $orderId,
            'direction' => 'out',
            'quantity' => 2,
            'balance_after' => 3,
        ]);

        $this->postJson('/api/orders/'.$orderId.'/cancel', [], $userHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('products', ['product_id' => $product->product_id, 'stock_quantity' => 5]);
        $this->assertDatabaseHas('inventory_movements', [
            'order_id' => $orderId,
            'direction' => 'in',
            'quantity' => 2,
            'balance_after' => 5,
        ]);

        $this->postJson('/api/admin/inventory/adjustments', [
            'product_id' => $product->product_id,
            'direction' => 'out',
            'quantity' => 6,
        ], $adminHeaders)->assertUnprocessable();
        $this->getJson('/api/admin/inventory?search=iphone', $adminHeaders)
            ->assertOk()
            ->assertJsonPath('products.data.0.track_inventory', true)
            ->assertJsonPath('movements.0.order_id', $orderId);
        $this->assertGreaterThanOrEqual(3, InventoryMovement::query()->count());

        $adminCancelOrderId = $this->postJson('/api/orders', [
            'customer_name' => $user->name,
            'email' => $user->email,
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ], $userHeaders)->assertCreated()->json('data.id');
        $this->assertDatabaseHas('products', ['product_id' => $product->product_id, 'stock_quantity' => 4]);
        $this->putJson('/api/admin/orders/'.$adminCancelOrderId, ['status' => 'confirmed'], $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');
        $this->postJson('/api/admin/orders/'.$adminCancelOrderId.'/cancel', [], $adminHeaders)
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('message', 'Đơn hàng đã được hủy và tồn kho đã được hoàn lại.');
        $this->assertDatabaseHas('products', ['product_id' => $product->product_id, 'stock_quantity' => 5]);
    }

    public function test_checkout_records_order_when_gmail_rejects_notification(): void
    {
        $this->seed();
        $this->configureCheckoutMail();
        $pendingMail = \Mockery::mock(PendingMail::class);
        $pendingMail->shouldReceive('send')
            ->once()
            ->with(\Mockery::type(OrderPlaced::class))
            ->andThrow(new TransportException('SMTP authentication failed'));
        $customerPendingMail = \Mockery::mock(PendingMail::class);
        $customerPendingMail->shouldReceive('send')
            ->once()
            ->with(\Mockery::type(OrderConfirmation::class))
            ->andThrow(new TransportException('SMTP authentication failed'));
        Mail::shouldReceive('to')->once()->with('buyer@example.com')->andReturn($customerPendingMail);
        Mail::shouldReceive('to')->once()->with('shop@example.com')->andReturn($pendingMail);
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Nguyen Van B',
            'email' => 'buyer@example.com',
            'phone' => '0900000000',
            'address' => 'Ho Chi Minh City',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])
            ->assertCreated()
            ->assertJsonPath('data.confirmation_email_status', 'failed')
            ->assertJsonPath('data.notification_email_status', 'failed')
            ->assertJsonPath('message', 'Đặt hàng thành công. Gmail từ chối đăng nhập SMTP (535), email chưa được gửi. Hãy cập nhật App Password của tài khoản gửi trong backend/.env rồi thử đơn mới.');

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'confirmation_email_status' => 'failed',
            'confirmation_email_error' => 'Gmail từ chối đăng nhập SMTP (535); hãy cập nhật App Password của tài khoản gửi.',
            'notification_email_status' => 'failed',
            'notification_email_error' => 'Gmail từ chối đăng nhập SMTP (535); hãy cập nhật App Password của tài khoản gửi.',
        ]);
    }

    public function test_vnpay_sandbox_checkout_verifies_signed_return_before_marking_order_paid(): void
    {
        $this->seed();
        $this->configureCheckoutMail();
        config([
            'app.url' => 'https://shop.example',
            'app.frontend_url' => 'https://store.example',
            'services.vnpay.tmn_code' => 'TESTCODE',
            'services.vnpay.hash_secret' => 'vnpay-test-secret',
        ]);
        Mail::fake();
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'VNPay Buyer',
            'email' => 'vnpay@example.com',
            'phone' => '0900000001',
            'address' => 'Test Address',
            'payment_method' => 'vnpay',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])->assertCreated();

        $this->assertStringStartsWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?', $response->json('payment_url'));
        parse_str((string) parse_url($response->json('payment_url'), PHP_URL_QUERY), $callback);
        $callback['vnp_ResponseCode'] = '00';
        $callback['vnp_TransactionStatus'] = '00';
        $invalidCallback = $callback;
        $invalidCallback['vnp_Amount'] = (string) ((int) $invalidCallback['vnp_Amount'] + 100);
        $invalidCallback['vnp_SecureHash'] = $this->vnpaySignature($invalidCallback);

        $this->get('/api/payments/vnpay/return?'.http_build_query($invalidCallback))
            ->assertRedirect('https://store.example/payment/return?gateway=vnpay&status=invalid');
        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'payment_status' => 'pending',
        ]);

        $callback['vnp_SecureHash'] = $this->vnpaySignature($callback);

        $this->get('/api/payments/vnpay/return?'.http_build_query($callback))
            ->assertRedirect('https://store.example/payment/return?gateway=vnpay&status=success&reference='.$response->json('data.payment_reference'));

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('data.id'),
            'payment_method' => 'vnpay',
            'payment_status' => 'paid',
            'status' => 'confirmed',
        ]);

        $this->getJson('/api/payments/status/'.$response->json('data.payment_reference'))
            ->assertOk()
            ->assertExactJson(['data' => ['gateway' => 'vnpay', 'status' => 'paid']]);
    }

    public function test_momo_sandbox_checkout_verifies_signed_ipn_before_marking_order_paid(): void
    {
        $this->seed();
        $this->configureCheckoutMail();
        config([
            'app.url' => 'https://shop.example',
            'services.momo.partner_code' => 'MOMO_TEST',
            'services.momo.access_key' => 'momo-test-access',
            'services.momo.secret_key' => 'momo-test-secret',
        ]);
        Http::fake([
            'https://test-payment.momo.vn/v2/gateway/api/create' => Http::response([
                'resultCode' => 0,
                'payUrl' => 'https://test-payment.momo.vn/pay/test-transaction',
            ]),
        ]);
        Mail::fake();
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'MoMo Buyer',
            'email' => 'momo@example.com',
            'phone' => '0900000002',
            'address' => 'Test Address',
            'payment_method' => 'momo',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])->assertCreated()
            ->assertJsonPath('payment_url', 'https://test-payment.momo.vn/pay/test-transaction');

        Http::assertSent(fn (ClientRequest $request) => $request->url() === 'https://test-payment.momo.vn/v2/gateway/api/create'
            && $request['requestType'] === 'captureWallet'
            && isset($request['signature']));

        $order = Order::query()->findOrFail($response->json('data.id'));
        $callback = [
            'partnerCode' => 'MOMO_TEST',
            'orderId' => $order->payment_reference,
            'requestId' => $order->payment_reference,
            'amount' => (string) ((int) round((float) $order->total)),
            'orderInfo' => 'Thanh toan don hang '.$order->id,
            'orderType' => 'momo_wallet',
            'transId' => 'SANDBOX-TRANSACTION',
            'resultCode' => '0',
            'message' => 'Successful.',
            'payType' => 'qr',
            'responseTime' => '1793650000000',
            'extraData' => '',
        ];
        $callback['signature'] = $this->momoSignature($callback);

        $this->postJson('/api/payments/momo/ipn', $callback)
            ->assertOk()
            ->assertJsonPath('resultCode', 0);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_method' => 'momo',
            'payment_status' => 'paid',
            'status' => 'confirmed',
        ]);
    }

    public function test_checkout_does_not_create_gateway_orders_without_sandbox_credentials(): void
    {
        $this->seed();
        $this->configureCheckoutMail();
        config([
            'services.vnpay.tmn_code' => null,
            'services.vnpay.hash_secret' => null,
        ]);
        $product = Product::query()->where('alias', 'iphone-15-128gb')->firstOrFail();

        $this->postJson('/api/orders', [
            'customer_name' => 'VNPay Buyer',
            'email' => 'vnpay@example.com',
            'phone' => '0900000001',
            'address' => 'Test Address',
            'payment_method' => 'vnpay',
            'items' => [['product_id' => $product->product_id, 'quantity' => 1]],
        ])->assertStatus(503)
            ->assertJsonPath('message', 'Cổng thanh toán được chọn chưa được cấu hình sandbox. Đơn hàng chưa được ghi nhận.');

        $this->assertDatabaseCount('orders', 0);
    }

    private function configureCheckoutMail(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.gmail.com',
            'mail.mailers.smtp.username' => 'shop@example.com',
            'mail.mailers.smtp.password' => 'test-app-password',
            'mail.from.address' => 'shop@example.com',
            'mail.order_to' => 'shop@example.com',
        ]);
    }

    private function vnpaySignature(array $data): string
    {
        unset($data['vnp_SecureHash'], $data['vnp_SecureHashType']);
        ksort($data);
        $hashData = collect($data)
            ->map(fn ($value, $key) => urlencode((string) $key).'='.urlencode((string) $value))
            ->implode('&');

        return hash_hmac('sha512', $hashData, 'vnpay-test-secret');
    }

    private function momoSignature(array $data): string
    {
        $signatureData = [
            'accessKey' => 'momo-test-access',
            'amount' => $data['amount'],
            'extraData' => $data['extraData'],
            'message' => $data['message'],
            'orderId' => $data['orderId'],
            'orderInfo' => $data['orderInfo'],
            'orderType' => $data['orderType'],
            'partnerCode' => $data['partnerCode'],
            'payType' => $data['payType'],
            'requestId' => $data['requestId'],
            'responseTime' => $data['responseTime'],
            'resultCode' => $data['resultCode'],
            'transId' => $data['transId'],
        ];
        $signatureText = collect($signatureData)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode('&');

        return hash_hmac('sha256', $signatureText, 'momo-test-secret');
    }

    private function adminHeaders(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);

        return ['Authorization' => 'Bearer '.$admin->api_token];
    }
}
