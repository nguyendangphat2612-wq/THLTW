<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->decimal('subtotal', 15, 2)->default(0)->after('items');
            $table->decimal('discount', 15, 2)->default(0)->after('subtotal');
            $table->string('coupon_code', 50)->nullable()->after('discount');
            $table->unsignedTinyInteger('coupon_discount_percent')->default(0)->after('coupon_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['subtotal', 'discount', 'coupon_code', 'coupon_discount_percent']);
        });
    }
};
