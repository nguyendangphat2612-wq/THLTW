<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('discount_type', 16);
            $table->decimal('discount_value', 15, 2);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('coupon_discount_type', 16)->nullable()->after('coupon_code');
            $table->decimal('coupon_discount_value', 15, 2)->nullable()->after('coupon_discount_type');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->boolean('track_inventory')->default(false)->index();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained('products', 'product_id')->nullOnDelete();
            $table->string('product_name');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('direction', 8);
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('balance_after');
            $table->string('note', 500)->nullable();
            $table->timestamps();
            $table->index(['product_id', 'created_at']);
        });

        $code = strtoupper(trim((string) config('services.store_coupon.code', 'LOCPHAT10')));
        $discount = (float) config('services.store_coupon.discount_percent', 10);
        if ($code !== '' && $discount > 0 && $discount <= 100) {
            DB::table('coupons')->insert([
                'code' => $code,
                'discount_type' => 'percent',
                'discount_value' => $discount,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['track_inventory']);
            $table->dropColumn(['stock_quantity', 'track_inventory']);
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['coupon_discount_type', 'coupon_discount_value']);
        });
        Schema::dropIfExists('coupons');
    }
};
