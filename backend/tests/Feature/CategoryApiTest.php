<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_endpoint_returns_mobile_phone_brands(): void
    {
        $this->seed();

        $response = $this->getJson('/api/categories');

        $response
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Điện thoại di động')
            ->assertJsonPath('data.0.children.0.name', 'Iphone')
            ->assertJsonPath('data.0.children.1.name', 'Samsung')
            ->assertJsonCount(1, 'data')
            ->assertJsonCount(8, 'data.0.children');
    }

    public function test_products_endpoint_is_available_without_products(): void
    {
        $response = $this->getJson('/api/products');

        $response->assertOk()->assertJson(['data' => []]);
    }

    public function test_brands_endpoint_returns_active_brands(): void
    {
        $this->seed();

        $response = $this->getJson('/api/brands');

        $response
            ->assertOk()
            ->assertJsonFragment(['name' => 'Iphone', 'slug' => 'apple'])
            ->assertJsonFragment(['name' => 'Vivo', 'slug' => 'vivo'])
            ->assertJsonCount(8, 'data');
    }

    public function test_seeded_products_have_real_brand_names(): void
    {
        $this->seed();

        $response = $this->getJson('/api/products');

        $response
            ->assertOk()
            ->assertJsonFragment(['name' => 'iPhone 15 128GB'])
            ->assertJsonCount(8, 'data');
    }

    public function test_admin_can_create_update_and_delete_category(): void
    {
        $headers = $this->adminHeaders();

        $createResponse = $this->postJson('/api/categories', [
            'cat_name' => 'Tai nghe',
            'parent_id' => 0,
            'status' => 1,
            'sort_order' => 10,
        ], $headers);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.cat_name', 'Tai nghe')
            ->assertJsonPath('data.alias', 'tai-nghe');

        $categoryId = $createResponse->json('data.cat_id');
        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['id' => $categoryId, 'name' => 'Tai nghe']);
        $this->getJson('/api/categories/'.$categoryId)
            ->assertOk()
            ->assertJsonPath('data.name', 'Tai nghe');

        $updateResponse = $this->putJson('/api/categories/'.$categoryId, [
            'cat_name' => 'Tai nghe Bluetooth',
            'status' => 1,
            'sort_order' => 20,
        ], $headers);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.cat_name', 'Tai nghe Bluetooth')
            ->assertJsonPath('data.alias', 'tai-nghe-bluetooth');

        $deleteResponse = $this->deleteJson('/api/categories/'.$categoryId, [], $headers);

        $deleteResponse->assertOk()->assertJsonPath('message', 'Danh mục đã được xóa.');

        $this->assertDatabaseHas('categories', ['cat_id' => $categoryId, 'trash' => 1]);
    }

    public function test_products_endpoint_supports_pagination(): void
    {
        $this->seed();

        $response = $this->getJson('/api/products?per_page=4&page=1');

        $response
            ->assertOk()
            ->assertJsonPath('per_page', 4)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('price_range.min', 2990000)
            ->assertJsonPath('price_range.max', 21990000)
            ->assertJsonCount(4, 'data');

        $this->getJson('/api/products?per_page=4&page=2')
            ->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonCount(4, 'data');
    }

    public function test_products_endpoint_filters_by_effective_price_range(): void
    {
        $this->seed();

        $this->getJson('/api/products?min_price=7000000&max_price=10000000&per_page=20')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'realme 12 Pro+')
            ->assertJsonPath('data.1.name', 'OPPO Reno 11 5G')
            ->assertJsonPath('data.2.name', 'Xiaomi Redmi Note 13 Pro');

        $this->getJson('/api/products?min_price=10000000&max_price=5000000')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['max_price']);
    }

    public function test_products_endpoint_filters_by_category_and_search(): void
    {
        $this->seed();
        $mobileCategoryId = Category::where('alias', 'dien-thoai-di-dong')->value('cat_id');
        $samsungBrandId = Category::where('alias', 'samsung')->value('cat_id');

        $this->getJson('/api/products?category_id='.$mobileCategoryId.'&per_page=20')
            ->assertOk()
            ->assertJsonCount(8, 'data');

        $this->getJson('/api/products?category_id='.$samsungBrandId.'&search=Galaxy&per_page=20')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.name', 'Samsung Galaxy S24 256GB');
    }

    public function test_brand_crud_operations_work(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();

        $createResponse = $this->postJson('/api/brands', [
            'cat_name' => 'ASUS New',
            'parent_id' => 1,
            'status' => 1,
            'sort_order' => 99,
        ], $headers);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.cat_name', 'ASUS New')
            ->assertJsonPath('data.alias', 'asus-new');

        $brandId = $createResponse->json('data.cat_id');

        $updateResponse = $this->putJson('/api/brands/'.$brandId, [
            'cat_name' => 'ASUS Gaming',
            'status' => 1,
            'sort_order' => 100,
        ], $headers);

        $updateResponse
            ->assertOk()
            ->assertJsonPath('data.cat_name', 'ASUS Gaming')
            ->assertJsonPath('data.alias', 'asus-gaming');

        $deleteResponse = $this->deleteJson('/api/brands/'.$brandId, [], $headers);

        $deleteResponse->assertOk()->assertJsonPath('message', 'Thương hiệu đã được xóa.');

        $this->assertDatabaseHas('categories', ['cat_id' => $brandId, 'trash' => 1]);
    }

    public function test_product_creation_rejects_non_phone_categories(): void
    {
        $this->seed();

        $this->postJson('/api/products', [
            'product_name' => 'Tablet must be rejected',
            'cat_id' => 11,
            'brand_id' => 11,
            'price' => 100000,
        ], $this->adminHeaders())->assertUnprocessable();
    }

    public function test_product_names_are_unique_for_create_and_update(): void
    {
        $this->seed();
        $samsungId = Category::where('alias', 'samsung')->value('cat_id');
        $headers = $this->adminHeaders();

        $this->postJson('/api/products', [
            'product_name' => '  iphone 15 128gb ',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1000000,
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_name']);

        $firstProductId = \App\Models\Product::where('alias', 'iphone-15-128gb')->value('product_id');
        $secondProductId = \App\Models\Product::where('alias', 'samsung-galaxy-s24-256gb')->value('product_id');
        $this->putJson('/api/products/'.$firstProductId, [
            'product_name' => 'Samsung Galaxy S24 256GB',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 22990000,
            'sale_price' => 19990000,
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['product_name']);

        $this->putJson('/api/products/'.$firstProductId, [
            'product_name' => 'iPhone 15 128GB',
            'cat_id' => \App\Models\Category::where('alias', 'apple')->value('cat_id'),
            'brand_id' => \App\Models\Category::where('alias', 'apple')->value('cat_id'),
            'price' => 18990000,
            'sale_price' => 17490000,
        ], $headers)->assertOk();
        $this->assertDatabaseHas('products', ['product_id' => $secondProductId, 'product_name' => 'Samsung Galaxy S24 256GB']);
    }

    public function test_product_detail_increments_view_count(): void
    {
        $this->seed();
        $product = \App\Models\Product::where('alias', 'iphone-15-128gb')->firstOrFail();
        $initialViewCount = $product->view;

        $this->getJson('/api/products/'.$product->product_id)
            ->assertOk()
            ->assertJsonPath('data.view', $initialViewCount + 1);

        $this->assertDatabaseHas('products', [
            'product_id' => $product->product_id,
            'view' => $initialViewCount + 1,
        ]);
    }

    public function test_product_reviews_require_login_and_can_be_updated_by_their_author(): void
    {
        $this->seed();
        $product = \App\Models\Product::where('alias', 'iphone-15-128gb')->firstOrFail();

        $this->postJson('/api/products/'.$product->product_id.'/reviews', [
            'rating' => 5,
            'comment' => 'Máy hoạt động tốt.',
        ])->assertUnauthorized();

        $user = User::factory()->create();
        $headers = ['Authorization' => 'Bearer '.$user->api_token];
        $this->postJson('/api/products/'.$product->product_id.'/reviews', [
            'rating' => 5,
            'comment' => 'Máy hoạt động tốt.',
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('data.rating', 5)
            ->assertJsonPath('data.user.name', $user->name);

        $this->postJson('/api/products/'.$product->product_id.'/reviews', [
            'rating' => 4,
            'comment' => 'Sau khi sử dụng thêm, tôi cập nhật đánh giá.',
        ], $headers)->assertOk()->assertJsonPath('data.rating', 4);

        $this->getJson('/api/products/'.$product->product_id.'/reviews')
            ->assertOk()
            ->assertJsonPath('average_rating', 4)
            ->assertJsonPath('review_count', 1);
        $this->assertDatabaseCount('product_reviews', 1);
    }

    public function test_contact_messages_are_validated_and_saved(): void
    {
        $this->postJson('/api/contact', [
            'name' => 'Nguyen Van A',
            'email' => 'invalid-email',
            'subject' => 'Hỏi về sản phẩm',
            'message' => 'Tôi cần thêm thông tin.',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);

        $this->postJson('/api/contact', [
            'name' => 'Nguyen Van A',
            'email' => 'a@example.com',
            'subject' => 'Hỏi về sản phẩm',
            'message' => 'Tôi cần thêm thông tin.',
        ])->assertCreated();

        $this->assertDatabaseHas('contact_messages', [
            'email' => 'a@example.com',
            'subject' => 'Hỏi về sản phẩm',
        ]);
    }

    public function test_all_catalog_lists_support_bounded_pagination(): void
    {
        $this->seed();

        $this->getJson('/api/categories?per_page=2&page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonCount(1, 'data');

        foreach (['brands', 'products'] as $resource) {
            $this->getJson('/api/'.$resource.'?per_page=2&page=1')
                ->assertOk()
                ->assertJsonPath('per_page', 2)
                ->assertJsonPath('current_page', 1)
                ->assertJsonCount(2, 'data');
        }

        $this->getJson('/api/products?per_page=999')
            ->assertOk()
            ->assertJsonPath('per_page', 100);
    }

    public function test_catalog_filters_use_the_requested_values_and_reject_invalid_filters(): void
    {
        Category::create([
            'parent_id' => 0,
            'cat_name' => 'Other category',
            'alias' => 'other-category',
            'status' => 1,
        ]);
        $this->seed();

        $phoneCategoryId = Category::where('alias', 'dien-thoai-di-dong')->value('cat_id');
        $samsungId = Category::where('alias', 'samsung')->value('cat_id');

        $this->getJson('/api/products?search=Samsung')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Samsung Galaxy S24 256GB');

        $this->getJson('/api/products?category_id='.$samsungId)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.brand_id', $samsungId);

        $this->getJson('/api/brands?search=Samsung')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Samsung');

        $this->getJson('/api/brands?category_id='.$phoneCategoryId)
            ->assertOk()
            ->assertJsonCount(8, 'data');

        $this->getJson('/api/products?search[]=Samsung')->assertUnprocessable();
        $this->getJson('/api/brands?category_id=not-a-number')->assertUnprocessable();
        $this->getJson('/api/categories?page[]=1')->assertUnprocessable();
        $this->getJson('/api/brands?per_page[]=10')->assertUnprocessable();
        $this->getJson('/api/products?page=0')->assertUnprocessable();
    }

    public function test_brand_creation_defaults_to_the_actual_phone_category_id(): void
    {
        Category::create([
            'parent_id' => 0,
            'cat_name' => 'Other category',
            'alias' => 'other-category',
            'status' => 1,
        ]);
        $this->seed();

        $phoneCategoryId = Category::where('alias', 'dien-thoai-di-dong')->value('cat_id');
        $this->assertNotSame(1, $phoneCategoryId);

        $this->postJson('/api/brands', [
            'cat_name' => 'Test Brand',
        ], $this->adminHeaders())
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $phoneCategoryId);

        $this->postJson('/api/brands', [
            'cat_name' => 'Invalid Brand',
            'parent_id' => 1,
        ], $this->adminHeaders())->assertUnprocessable();
    }

    public function test_admin_can_create_update_list_and_soft_delete_products(): void
    {
        $this->seed();
        $samsungId = Category::where('alias', 'samsung')->value('cat_id');
        $headers = $this->adminHeaders();

        $created = $this->postJson('/api/products', [
            'product_name' => 'Samsung Test Phone',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1000000,
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('data.product_name', 'Samsung Test Phone');

        $productId = $created->json('data.product_id');
        $this->assertDatabaseHas('products', [
            'product_id' => $productId,
            'alias' => 'samsung-test-phone',
        ]);
        $this->getJson('/api/products/'.$productId)
            ->assertOk()
            ->assertJsonPath('data.brand.name', 'Samsung')
            ->assertJsonPath('data.category.name', 'Samsung')
            ->assertJsonPath('data.detail', null);
        $this->getJson('/api/brands/'.$samsungId)
            ->assertOk()
            ->assertJsonPath('data.name', 'Samsung');
        $this->deleteJson('/api/brands/'.$samsungId, [], $headers)->assertOk();
        $this->assertDatabaseHas('categories', ['cat_id' => $samsungId, 'trash' => 1]);
        $this->getJson('/api/products?search=Samsung')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/admin/brands/'.$samsungId.'/restore', [], $headers)->assertOk();
        $this->getJson('/api/brands/'.$samsungId)->assertOk();
        $this->deleteJson('/api/categories/'.$samsungId, [], $headers)->assertNotFound();

        $this->putJson('/api/products/'.$productId, [
            'product_name' => 'Updated Samsung Test Phone',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1200000,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('data.product_name', 'Updated Samsung Test Phone')
            ->assertJsonPath('data.price', 1200000);

        $this->getJson('/api/products?search=Updated%20Samsung')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Updated Samsung Test Phone']);

        $this->deleteJson('/api/products/'.$productId, [], $headers)
            ->assertOk();
        $this->assertDatabaseHas('products', [
            'product_id' => $productId,
            'trash' => 1,
        ]);
        $this->getJson('/api/products?search=Updated%20Samsung')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Updated Samsung Test Phone']);
        $this->getJson('/api/products/'.$productId)->assertNotFound();
    }

    public function test_admin_can_upload_and_replace_product_image(): void
    {
        $this->seed();
        Storage::fake('public');
        $samsungId = Category::where('alias', 'samsung')->value('cat_id');
        $headers = ['Accept' => 'application/json'] + $this->adminHeaders();

        $created = $this->post('/api/products', [
            'product_name' => 'Image upload test phone',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1000000,
            'image' => UploadedFile::fake()->image('phone.png', 40, 40),
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('data.product_name', 'Image upload test phone');

        $productId = $created->json('data.product_id');
        $previousImage = $created->json('data.image');
        $this->assertStringStartsWith('products/', $previousImage);
        Storage::disk('public')->assertExists($previousImage);

        $updated = $this->post('/api/products/'.$productId, [
            '_method' => 'PUT',
            'product_name' => 'Image upload test phone',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1000000,
            'image' => UploadedFile::fake()->image('replacement.png', 40, 40),
        ], $headers)
            ->assertOk();

        $replacementImage = $updated->json('data.image');
        $this->assertNotSame($previousImage, $replacementImage);
        Storage::disk('public')->assertExists($replacementImage);
        Storage::disk('public')->assertMissing($previousImage);
        $this->get('/api/product-images/'.$replacementImage)
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->deleteJson('/api/products/'.$productId, [], $this->adminHeaders())->assertOk();
        $this->postJson('/api/admin/products/'.$productId.'/restore', [], $this->adminHeaders())->assertOk();
        Storage::disk('public')->assertExists($replacementImage);
        $this->deleteJson('/api/products/'.$productId, [], $this->adminHeaders())->assertOk();
        $this->deleteJson('/api/admin/products/'.$productId.'/force', [], $this->adminHeaders())->assertOk();
        Storage::disk('public')->assertMissing($replacementImage);
    }

    public function test_trashing_root_category_hides_and_restoring_reveals_its_products(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $phoneCategoryId = Category::where('alias', 'dien-thoai-di-dong')->value('cat_id');

        $this->deleteJson('/api/categories/'.$phoneCategoryId, [], $headers)
            ->assertOk()
            ->assertJsonPath('message', 'Danh mục đã được xóa.');
        $this->assertDatabaseHas('categories', ['cat_id' => $phoneCategoryId, 'trash' => 1]);
        $this->getJson('/api/categories')->assertOk()->assertJsonMissing(['id' => $phoneCategoryId]);
        $this->getJson('/api/products')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/admin/categories/'.$phoneCategoryId.'/restore', [], $headers)->assertOk();
        $this->getJson('/api/categories')->assertOk()->assertJsonFragment(['id' => $phoneCategoryId]);
        $this->getJson('/api/products')->assertOk()->assertJsonCount(8, 'data');
    }

    public function test_catalog_rejects_invalid_relationships_and_missing_category_parents(): void
    {
        $this->seed();
        $samsungId = Category::where('alias', 'samsung')->value('cat_id');
        $headers = $this->adminHeaders();

        $this->postJson('/api/categories', [
            'cat_name' => 'Orphan category',
            'parent_id' => 999999,
        ], $headers)->assertUnprocessable();

        $this->postJson('/api/products', [
            'product_name' => 'Mismatched product',
            'cat_id' => $samsungId,
            'brand_id' => Category::where('alias', 'apple')->value('cat_id'),
            'price' => 1000000,
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['brand_id']);

        $this->postJson('/api/products', [
            'product_name' => 'Invalid sale price',
            'cat_id' => $samsungId,
            'brand_id' => $samsungId,
            'price' => 1000000,
            'sale_price' => 2000000,
        ], $headers)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sale_price']);
    }

    public function test_admin_catalog_lists_paginate_and_support_trash_restore_and_permanent_delete(): void
    {
        $this->seed();
        $headers = $this->adminHeaders();
        $phoneCategoryId = Category::where('alias', 'dien-thoai-di-dong')->value('cat_id');

        $categoryId = $this->postJson('/api/categories', [
            'cat_name' => 'Admin trash category',
        ], $headers)->assertCreated()->json('data.cat_id');
        $brandId = $this->postJson('/api/brands', [
            'cat_name' => 'Admin trash brand',
            'parent_id' => $phoneCategoryId,
        ], $headers)->assertCreated()->json('data.cat_id');
        $productId = $this->postJson('/api/products', [
            'product_name' => 'Admin trash product',
            'cat_id' => $brandId,
            'brand_id' => $brandId,
            'price' => 100000,
        ], $headers)->assertCreated()->json('data.product_id');

        foreach ([
            ['products', $productId, 'product_id'],
            ['brands', $brandId, 'cat_id'],
            ['categories', $categoryId, 'cat_id'],
        ] as [$resource, $id, $key]) {
            $this->getJson('/api/admin/'.$resource.'?per_page=1&page=1', $headers)
                ->assertOk()
                ->assertJsonPath('per_page', 1)
                ->assertJsonPath('current_page', 1);

            $this->deleteJson('/api/'.$resource.'/'.$id, [], $headers)->assertOk();
            $this->getJson('/api/admin/'.$resource.'?trash=1&search=Admin%20trash', $headers)
                ->assertOk()
                ->assertJsonFragment([$key => $id]);
            $this->postJson('/api/admin/'.$resource.'/'.$id.'/restore', [], $headers)->assertOk();
            $this->deleteJson('/api/'.$resource.'/'.$id, [], $headers)->assertOk();
            $this->deleteJson('/api/admin/'.$resource.'/'.$id.'/force', [], $headers)->assertOk();
        }

        $this->assertDatabaseMissing('categories', ['cat_id' => $categoryId]);
        $this->assertDatabaseMissing('categories', ['cat_id' => $brandId]);
        $this->assertDatabaseMissing('products', ['product_id' => $productId]);
    }

    public function test_api_errors_are_json_without_an_accept_header(): void
    {
        $this->get('/api/products?search[]=Samsung')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search'])
            ->assertHeader('content-type', 'application/json');

        $this->get('/api/products/999999')
            ->assertNotFound()
            ->assertJsonStructure(['message'])
            ->assertHeader('content-type', 'application/json');
    }

    private function adminHeaders(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);

        return ['Authorization' => 'Bearer '.$admin->api_token];
    }
}
