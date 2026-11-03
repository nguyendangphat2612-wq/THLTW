# Hướng dẫn chạy app LocPhat Mobile

Tài liệu này hướng dẫn cài đặt và khởi chạy ứng dụng LocPhat Mobile, gồm giao
diện Next.js và API Laravel. Hướng dẫn sử dụng theo từng đối tượng được tách
riêng:

- [Hướng dẫn dành cho khách hàng](./HUONG-DAN-NGUOI-DUNG.md): tìm sản phẩm,
  mua hàng, thanh toán, theo dõi đơn và liên hệ cửa hàng.
- [Hướng dẫn dành cho quản trị viên](./HUONG-DAN-QUAN-TRI-VIEN.md): quản lý
  đơn hàng, sản phẩm, khuyến mãi, thành viên, kho và nội dung.

## Khởi chạy dự án

### Yêu cầu

- Node.js và npm.
- PHP, Composer và các extension PHP cần thiết cho Laravel.
- MySQL hoặc MariaDB.

Mở hai cửa sổ terminal riêng. Các lệnh `php artisan` chạy tại thư mục
`backend`; lệnh `npm` chạy tại thư mục `frontend`.

### 1. Cài đặt backend

Tại thư mục `backend`, tạo file cấu hình và cài các gói:

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
```

Cấu hình kết nối cơ sở dữ liệu trong `backend/.env`. Với cơ sở dữ liệu mới,
chạy migration và dữ liệu mẫu:

```powershell
php artisan migrate --seed
```

Với cơ sở dữ liệu đã có dữ liệu, chỉ chạy `php artisan migrate` để cập nhật cấu
trúc. Sau đó khởi động API:

```powershell
php artisan serve
```

API mặc định chạy tại `http://127.0.0.1:8000`. Tải ảnh sản phẩm cần PHP
extension `fileinfo`; kiểm thử tải ảnh còn cần extension `gd`.

### 2. Cài đặt frontend

Tại thư mục `frontend`, cài các gói và khởi động website:

```powershell
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Frontend mặc định gọi API
tại `http://127.0.0.1:8000`. Nếu backend chạy ở địa chỉ khác, đặt
`NEXT_PUBLIC_API_BASE_URL` trong `frontend/.env.local` rồi khởi động lại
frontend.

## Kiểm tra mã nguồn

Chạy tại thư mục `frontend`:

```powershell
npm run lint
npm run build
npm start
```

Chạy kiểm thử API tại thư mục `backend`:

```powershell
php artisan test
```

## Tài liệu kỹ thuật

- [README backend](../backend/README.md): cơ sở dữ liệu, API và kiểm thử.
- [Ghi công hình ảnh sản phẩm](./PRODUCT_IMAGE_CREDITS.md): nguồn, tác giả
  và giấy phép của ảnh.
