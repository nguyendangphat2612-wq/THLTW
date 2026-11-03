<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('confirmation_email_status', 32)->default('unknown')->index();
            $table->timestamp('confirmation_email_sent_at')->nullable();
            $table->string('confirmation_email_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['confirmation_email_status']);
            $table->dropColumn([
                'confirmation_email_status',
                'confirmation_email_sent_at',
                'confirmation_email_error',
            ]);
        });
    }
};
