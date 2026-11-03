<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        if (Schema::hasTable('users')) {
            User::updateOrCreate(
                ['email' => 'test@example.com'],
                [
                    'name' => 'Test User',
                    'password' => bcrypt('password'),
                ]
            );

            if (app()->environment(['local', 'testing'])) {
                User::updateOrCreate(
                    ['email' => env('ADMIN_EMAIL', 'admin@example.com')],
                    [
                        'name' => env('ADMIN_NAME', 'Admin User'),
                        'password' => bcrypt(env('ADMIN_PASSWORD', 'password123')),
                        'role' => 'admin',
                    ]
                );
            }
        }

        $mobileCategory = Category::updateOrCreate(
            ['alias' => 'dien-thoai-di-dong'],
            [
                'parent_id' => 0,
                'cat_name' => 'Điện thoại di động',
                'status' => 1,
                'sort_order' => 1,
            ]
        );

        $brands = [
            ['name' => 'Iphone', 'alias' => 'apple', 'sort_order' => 1],
            ['name' => 'Samsung', 'alias' => 'samsung', 'sort_order' => 2],
            ['name' => 'Xiaomi', 'alias' => 'xiaomi', 'sort_order' => 3],
            ['name' => 'OPPO', 'alias' => 'oppo', 'sort_order' => 4],
            ['name' => 'Vivo', 'alias' => 'vivo', 'sort_order' => 5],
            ['name' => 'realme', 'alias' => 'realme', 'sort_order' => 6],
            ['name' => 'Nokia', 'alias' => 'nokia', 'sort_order' => 7],
            ['name' => 'ASUS', 'alias' => 'asus', 'sort_order' => 8],
        ];

        foreach ($brands as $brand) {
            Category::updateOrCreate(
                ['alias' => $brand['alias']],
                [
                    'parent_id' => $mobileCategory->cat_id,
                    'cat_name' => $brand['name'],
                    'status' => 1,
                    'sort_order' => $brand['sort_order'],
                ]
            );
        }

        $allBrandAliases = array_column($brands, 'alias');

        $brandIds = Category::whereIn('alias', $allBrandAliases)
            ->pluck('cat_id', 'alias');

        $products = [
            ['name' => 'iPhone 15 128GB', 'alias' => 'iphone-15-128gb', 'brand' => 'apple', 'price' => 18990000, 'sale_price' => 17490000],
            ['name' => 'Samsung Galaxy S24 256GB', 'alias' => 'samsung-galaxy-s24-256gb', 'brand' => 'samsung', 'price' => 22990000, 'sale_price' => 19990000],
            ['name' => 'Xiaomi Redmi Note 13 Pro', 'alias' => 'xiaomi-redmi-note-13-pro', 'brand' => 'xiaomi', 'price' => 8990000, 'sale_price' => 7990000],
            ['name' => 'OPPO Reno 11 5G', 'alias' => 'oppo-reno-11-5g', 'brand' => 'oppo', 'price' => 10990000, 'sale_price' => 9490000],
            ['name' => 'vivo V30 5G', 'alias' => 'vivo-v30-5g', 'brand' => 'vivo', 'price' => 11990000, 'sale_price' => 10490000],
            ['name' => 'realme 12 Pro+', 'alias' => 'realme-12-pro-plus', 'brand' => 'realme', 'price' => 9990000, 'sale_price' => 8990000],
            ['name' => 'Nokia C32', 'alias' => 'nokia-c32', 'brand' => 'nokia', 'price' => 3490000, 'sale_price' => 2990000],
            ['name' => 'ASUS ROG Phone 8', 'alias' => 'asus-rog-phone-8', 'brand' => 'asus', 'price' => 23990000, 'sale_price' => 21990000],
        ];

        foreach ($products as $product) {
            Product::updateOrCreate(
                ['alias' => $product['alias']],
                [
                    'product_name' => $product['name'],
                    'cat_id' => $brandIds[$product['brand']],
                    'brand_id' => $brandIds[$product['brand']],
                    'price' => $product['price'],
                    'sale_price' => $product['sale_price'],
                    'image' => null,
                    'summary' => 'Sản phẩm chính hãng, bảo hành đầy đủ.',
                    'status' => 1,
                    'trash' => 0,
                ]
            );
        }

        $this->call(CatalogSeeder::class);
    }
}
