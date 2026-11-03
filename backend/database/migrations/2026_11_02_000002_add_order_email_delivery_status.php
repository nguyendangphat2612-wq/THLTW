<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('notification_email_status', 32)->default('unknown')->index();
            $table->timestamp('notification_email_sent_at')->nullable();
            $table->string('notification_email_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['notification_email_status']);
            $table->dropColumn([
                'notification_email_status',
                'notification_email_sent_at',
                'notification_email_error',
            ]);
        });
    }
};
