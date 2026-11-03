<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable();
            $table->string('address', 1000)->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method', 32)->default('cod');
            $table->string('payment_status', 32)->default('unpaid')->index();
            $table->string('payment_reference', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['payment_reference']);
            $table->dropIndex(['payment_status']);
            $table->dropColumn(['payment_method', 'payment_status', 'payment_reference']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'address']);
        });
    }
};
