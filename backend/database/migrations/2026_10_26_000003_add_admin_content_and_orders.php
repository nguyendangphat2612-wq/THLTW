<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->unsignedTinyInteger('trash')->default(0)->index();
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt', 1000)->nullable();
            $table->longText('content');
            $table->date('published_at')->nullable();
            $table->unsignedTinyInteger('status')->default(1)->index();
            $table->unsignedTinyInteger('trash')->default(0)->index();
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('email');
            $table->string('phone', 32);
            $table->string('address', 1000);
            $table->json('items');
            $table->decimal('total', 15, 2);
            $table->string('status', 32)->default('pending')->index();
            $table->unsignedTinyInteger('trash')->default(0)->index();
            $table->timestamps();
        });

        $now = now();
        DB::table('articles')->insert([
            [
                'title' => 'Cách chọn điện thoại phù hợp với nhu cầu hằng ngày',
                'slug' => 'chon-dien-thoai-phu-hop',
                'excerpt' => 'Một vài tiêu chí thiết thực về pin, camera và hiệu năng giúp bạn chọn đúng chiếc điện thoại.',
                'content' => implode("\n\n", [
                    'Hãy bắt đầu từ cách bạn sử dụng điện thoại mỗi ngày. Nếu thường xuyên chụp ảnh, camera và dung lượng lưu trữ sẽ quan trọng hơn những thông số ít khi dùng đến.',
                    'Người dùng làm việc và giải trí nhiều nên ưu tiên pin tốt, màn hình phù hợp và thời gian cập nhật phần mềm. Đừng quên cầm thử máy để chọn kích thước vừa tay.',
                    'Cuối cùng, hãy đối chiếu ngân sách với chính sách bảo hành và chọn nơi bán minh bạch để an tâm sử dụng lâu dài.',
                ]),
                'published_at' => '2026-10-20',
                'status' => 1,
                'trash' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'title' => 'Mẹo đơn giản để pin điện thoại luôn bền',
                'slug' => 'meo-bao-ve-pin',
                'excerpt' => 'Thói quen sạc phù hợp và một vài cài đặt nhỏ có thể giúp pin hoạt động ổn định hơn.',
                'content' => implode("\n\n", [
                    'Dùng bộ sạc đạt chuẩn và tránh để điện thoại ở nơi quá nóng khi sạc. Nhiệt độ cao trong thời gian dài có thể làm pin xuống cấp nhanh hơn.',
                    'Bạn có thể bật chế độ tiết kiệm pin khi cần và kiểm tra ứng dụng chạy nền. Không cần cố xả pin về 0% trước mỗi lần sạc.',
                    'Nếu pin phồng, nóng bất thường hoặc thời lượng giảm rõ rệt, hãy ngừng sử dụng và mang thiết bị đến trung tâm sửa chữa uy tín.',
                ]),
                'published_at' => '2026-10-15',
                'status' => 1,
                'trash' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'title' => 'Bảo vệ dữ liệu cá nhân khi đổi điện thoại',
                'slug' => 'bao-ve-du-lieu-ca-nhan',
                'excerpt' => 'Sao lưu, đăng xuất tài khoản và xóa dữ liệu đúng cách trước khi chuyển sang thiết bị mới.',
                'content' => implode("\n\n", [
                    'Trước khi đổi máy, hãy sao lưu danh bạ, hình ảnh và các tệp quan trọng lên nơi lưu trữ an toàn. Kiểm tra bản sao lưu có thể khôi phục được trước khi xóa dữ liệu cũ.',
                    'Đăng xuất tài khoản, gỡ phương thức thanh toán và tháo SIM, thẻ nhớ. Sau đó khôi phục cài đặt gốc theo hướng dẫn chính thức của nhà sản xuất.',
                    'Chỉ đăng nhập trên thiết bị mới qua kết nối đáng tin cậy và bật xác thực nhiều lớp cho các tài khoản quan trọng.',
                ]),
                'published_at' => '2026-10-08',
                'status' => 1,
                'trash' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
        Schema::dropIfExists('articles');

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropColumn('trash');
        });
    }
};
