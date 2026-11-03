<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $nonPhoneRootIds = Category::query()
            ->whereIn('alias', ['may-tinh-bang', 'laptop', 'phu-kien'])
            ->pluck('cat_id');
        $nonPhoneBrandIds = Category::query()
            ->whereIn('parent_id', $nonPhoneRootIds)
            ->pluck('cat_id');

        Product::query()
            ->where(function ($query) use ($nonPhoneBrandIds) {
                $query->whereIn('cat_id', $nonPhoneBrandIds)
                    ->orWhereIn('brand_id', $nonPhoneBrandIds);
            })
            ->delete();

        Category::query()->whereIn('cat_id', $nonPhoneBrandIds)->delete();
        Category::query()->whereIn('cat_id', $nonPhoneRootIds)->delete();

        $mobileCategory = Category::firstOrCreate(
            ['alias' => 'dien-thoai-di-dong'],
            [
                'parent_id' => 0,
                'cat_name' => 'Điện thoại di động',
                'status' => 1,
                'sort_order' => 1,
            ]
        );

        $phoneBrands = [
            ['name' => 'Iphone', 'alias' => 'apple'],
            ['name' => 'Samsung', 'alias' => 'samsung'],
            ['name' => 'Xiaomi', 'alias' => 'xiaomi'],
            ['name' => 'OPPO', 'alias' => 'oppo'],
            ['name' => 'Vivo', 'alias' => 'vivo'],
            ['name' => 'realme', 'alias' => 'realme'],
            ['name' => 'Nokia', 'alias' => 'nokia'],
            ['name' => 'ASUS', 'alias' => 'asus'],
        ];

        foreach ($phoneBrands as $sortOrder => $brand) {
            Category::updateOrCreate(
                ['alias' => $brand['alias']],
                [
                    'parent_id' => $mobileCategory->cat_id,
                    'cat_name' => $brand['name'],
                    'status' => 1,
                    'sort_order' => $sortOrder + 1,
                ]
            );
        }

        $products = [
            ['iPhone 15 128GB', 'iphone-15-128gb', 'apple', 18990000, 17490000],
            ['Samsung Galaxy S24 256GB', 'samsung-galaxy-s24-256gb', 'samsung', 22990000, 19990000],
            ['Xiaomi Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro', 'xiaomi', 8990000, 7990000],
            ['OPPO Reno 11 5G', 'oppo-reno-11-5g', 'oppo', 10990000, 9490000],
            ['vivo V30 5G', 'vivo-v30-5g', 'vivo', 11990000, 10490000],
            ['realme 12 Pro+', 'realme-12-pro-plus', 'realme', 9990000, 8990000],
            ['Nokia C32', 'nokia-c32', 'nokia', 3490000, 2990000],
            ['ASUS ROG Phone 8', 'asus-rog-phone-8', 'asus', 23990000, 21990000],
        ];

        foreach ($products as [$name, $alias, $brandAlias, $price, $salePrice]) {
            $brand = Category::where('alias', $brandAlias)->firstOrFail();

            Product::firstOrCreate(
                ['alias' => $alias],
                [
                    'product_name' => $name,
                    'cat_id' => $brand->cat_id,
                    'brand_id' => $brand->cat_id,
                    'price' => $price,
                    'sale_price' => $salePrice,
                    'summary' => 'Sản phẩm chính hãng, bảo hành đầy đủ.',
                    'status' => 1,
                    'trash' => 0,
                ]
            );
        }
    }
}