<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id('product_id');
            $table->string('product_name');
            $table->string('alias')->unique();
            $table->unsignedBigInteger('cat_id')->nullable()->index();
            $table->unsignedBigInteger('brand_id')->nullable()->index();
            $table->text('detail')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->decimal('sale_price', 15, 2)->nullable();
            $table->string('image')->nullable();
            $table->text('summary')->nullable();
            $table->string('tag')->nullable();
            $table->unsignedInteger('view')->default(0);
            $table->unsignedTinyInteger('status')->default(1)->index();
            $table->unsignedTinyInteger('trash')->default(0)->index();
            $table->date('launch_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};