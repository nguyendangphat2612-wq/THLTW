# LocPhat Mobile

LocPhat Mobile là website bán điện thoại, gồm giao diện cửa hàng viết bằng
Next.js và API quản trị dữ liệu viết bằng Laravel. Tài liệu này hướng dẫn cách
khởi chạy dự án và sử dụng các chức năng dành cho khách hàng, quản trị viên.

## 1. Chuẩn bị môi trường

Cài đặt các công cụ sau trước khi chạy dự án:

- Node.js và npm.
- PHP, Composer và các extension PHP cần thiết cho Laravel.
- MySQL hoặc MariaDB.

Các lệnh `php artisan` chạy trong thư mục `backend`; lệnh `npm` chạy trong
thư mục `frontend`. Khi chạy website, cần mở riêng hai cửa sổ terminal để chạy
backend và frontend.

## 2. Cài đặt và khởi chạy

### 2.1. Cấu hình backend

Mở terminal tại thư mục `backend`, tạo file cấu hình môi trường và cài các gói
cần thiết:

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
```

Mở `backend/.env`, cấu hình thông tin kết nối cơ sở dữ liệu tại các biến
`DB_*`. Với cơ sở dữ liệu mới, chạy migration và dữ liệu mẫu:

```powershell
php artisan migrate --seed
```

Nếu cơ sở dữ liệu đã có dữ liệu, chỉ chạy `php artisan migrate` để cập nhật
cấu trúc; không nhập lại cơ sở dữ liệu mẫu nếu không muốn thêm dữ liệu mẫu.

Khởi động API:

```powershell
php artisan serve
```

Mặc định API chạy tại `http://127.0.0.1:8000`. Chức năng tải ảnh sản phẩm cần
PHP extension `fileinfo`; kiểm thử tải ảnh còn cần extension `gd`.

### 2.2. Cấu hình và khởi chạy frontend

Mở terminal khác tại thư mục `frontend`, cài đặt các gói và chạy website:

```powershell
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt. Mặc định
frontend gọi API tại `http://127.0.0.1:8000`. Nếu backend chạy ở địa chỉ khác,
đặt `NEXT_PUBLIC_API_BASE_URL` trong `frontend/.env.local`, rồi khởi động lại
frontend.

### 2.3. Kiểm tra trước khi triển khai

Chạy các lệnh sau trong thư mục `frontend` để kiểm tra mã nguồn và tạo bản dựng:

```powershell
npm run lint
npm run build
npm start
```

Kiểm thử API Laravel bằng lệnh `php artisan test` trong thư mục `backend`.

## 3. Hướng dẫn dành cho khách hàng

### 3.1. Tìm và xem sản phẩm

1. Chọn **Sản phẩm** trên thanh điều hướng để mở danh sách điện thoại.
2. Dùng bộ lọc thương hiệu, khoảng giá hoặc ô tìm kiếm để thu hẹp kết quả.
3. Chọn **Xem sản phẩm** để xem giá, thông tin và đánh giá.
4. Chọn **Mua ngay** để đi thẳng đến thanh toán, hoặc **Thêm vào giỏ** để
   tiếp tục chọn sản phẩm khác.

### 3.2. Tạo tài khoản và đăng nhập

- Chọn **Đăng ký** để tạo tài khoản khách hàng; chọn **Đăng nhập** để đăng nhập.
- Tài khoản khách hàng có thể cập nhật tên, số điện thoại và địa chỉ giao hàng
  mặc định trong trang **Tài khoản của tôi**.
- Đăng nhập để gửi đánh giá sản phẩm và xem các đơn hàng gắn với tài khoản.
- Tài khoản quản trị đăng nhập riêng tại `/admin/login`; không thể tự đăng ký
  quyền quản trị từ trang khách hàng.

### 3.3. Giỏ hàng và thanh toán

1. Mở **Giỏ hàng**, kiểm tra sản phẩm và số lượng.
2. Tiếp tục đến trang thanh toán, điền thông tin người nhận và địa chỉ giao hàng.
   Nếu đã đăng nhập và lưu hồ sơ, một số thông tin sẽ được điền sẵn.
3. Nhập mã khuyến mãi còn hiệu lực (nếu có) và chọn **Áp dụng** để xem số tiền
   được giảm.
4. Chọn thanh toán khi nhận hàng hoặc cổng VNPay/MoMo, sau đó xác nhận đặt hàng.

VNPay và MoMo trong dự án chỉ chạy ở chế độ thử nghiệm, không trừ tiền thật.
Để dùng cổng thử nghiệm, quản trị viên phải cấu hình thông tin sandbox trong
`backend/.env`. Nếu chưa có thông tin từ nhà cung cấp, API sẽ không tạo được đơn
hàng qua cổng tương ứng.

### 3.4. Xem và hủy đơn hàng

1. Đăng nhập, mở mục **Đơn hàng** để xem lịch sử mua hàng.
2. Chọn một đơn để xem sản phẩm, thông tin giao hàng, thanh toán và trạng thái.
3. Có thể hủy đơn đang chờ xử lý nếu đơn chưa thanh toán. Đơn đã được xác nhận,
   đang giao hoặc đã hoàn tất không thể hủy từ tài khoản khách hàng.

Trạng thái đơn hàng được cập nhật theo quy trình: **Chờ xác nhận → Đã xác nhận
→ Đang giao → Hoàn tất**. Đơn cũng có thể chuyển sang **Đã hủy**.

### 3.5. Bài viết, liên hệ và đánh giá

- Chọn **Bài viết** để đọc tin và bài viết công nghệ.
- Chọn **Liên hệ**, điền nội dung và gửi để lưu lời nhắn đến cửa hàng.
- Trên trang chi tiết sản phẩm, khách hàng đăng nhập có thể gửi hoặc cập nhật
  đánh giá của mình.

## 4. Hướng dẫn dành cho quản trị viên

Đăng nhập bằng tài khoản quản trị được cấp tại `/admin/login`. Tài khoản mẫu,
nếu được tạo trong môi trường phát triển, chỉ dùng để thử nghiệm; hãy thay mật
khẩu và không sử dụng thông tin mặc định khi triển khai thật.

| Chức năng | Trang quản trị | Hướng dẫn |
| --- | --- | --- |
| Sản phẩm | `/admin/product` | Xem danh sách, thêm hoặc sửa sản phẩm; cập nhật thông tin và ảnh. Có thể dùng mục thùng rác để khôi phục hoặc xóa theo tùy chọn của trang. |
| Thương hiệu | `/admin/brand` | Quản lý thương hiệu để phân loại sản phẩm. |
| Danh mục | `/admin/category` | Tạo và cập nhật danh mục, sắp xếp sản phẩm theo nhóm. |
| Đơn hàng | `/admin/order` | Mở đơn để xem chi tiết, cập nhật lần lượt trạng thái hoặc hủy đơn. Hãy kiểm tra thông tin giao hàng và thanh toán trước khi xử lý. |
| Khuyến mãi | `/admin/promotions` | Xem, thêm, sửa hoặc xóa mã giảm giá; cấu hình mức giảm, thời hạn và trạng thái áp dụng. Khách hàng nhập mã ở bước thanh toán. |
| Thành viên | `/admin/members` | Xem danh sách và hồ sơ thành viên, khóa/mở khóa tài khoản hoặc xóa tài khoản thành viên. Tài khoản quản trị không thể bị khóa hoặc xóa tại đây. |
| Kho hàng | `/admin/inventory` | Ghi nhận nhập kho hoặc điều chỉnh tăng/giảm; xem lịch sử biến động. Sản phẩm bắt đầu được theo dõi tồn kho từ lần nhập đầu tiên. |
| Bài viết | `/admin/article` | Tạo, sửa, đưa vào thùng rác, khôi phục hoặc xóa bài viết hiển thị ở trang tin. |
| Tin nhắn liên hệ | `/admin/contact` | Xem và xử lý nội dung khách gửi; quản lý các tin nhắn trong danh sách hoặc thùng rác. |

### 4.1. Quy trình xử lý đơn hàng

1. Mở danh sách đơn và chọn đơn cần xử lý.
2. Kiểm tra sản phẩm, số lượng, thông tin khách hàng và trạng thái thanh toán.
3. Cập nhật lần lượt **Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn tất**.
   Hệ thống không cho phép bỏ qua bước.
4. Nếu cần dừng xử lý, dùng chức năng hủy đơn riêng trước khi đơn hoàn tất.

Khi đặt hàng, tồn kho đã theo dõi sẽ được trừ; khi hủy đơn, số lượng hàng được
hoàn lại. Lịch sử nhập, xuất và điều chỉnh được lưu trong quản lý kho.

### 4.2. Cấu hình email xác nhận đơn

Để gửi email xác nhận cho khách và thông báo cho cửa hàng, cấu hình SMTP trong
`backend/.env`. Với Gmail, dùng tài khoản gửi hợp lệ cùng Google App Password,
không dùng mật khẩu đăng nhập Gmail thông thường. Đặt `MAIL_ORDER_TO` là địa
chỉ nhận thông báo đơn của cửa hàng. Sau khi đổi cấu hình, chạy trong thư mục
`backend`:

```powershell
php artisan config:clear
```

Đơn hàng vẫn được lưu nếu gửi email lỗi; trạng thái gửi email được quản trị viên
xem trong phần đơn hàng.

## 5. Hình ảnh sản phẩm

Ảnh tĩnh và minh họa dự phòng được lưu trong
[`public/product-images/`](public/product-images/). Một số ảnh được lấy từ
Wikimedia Commons; nguồn, tác giả và giấy phép được ghi trong
[`PRODUCT_IMAGE_CREDITS.md`](PRODUCT_IMAGE_CREDITS.md). Ảnh do quản trị viên tải
lên được phục vụ qua backend.

## 6. Xử lý sự cố thường gặp

- **Không kết nối được API:** kiểm tra backend đang chạy tại cổng 8000 và giá
  trị `NEXT_PUBLIC_API_BASE_URL` nếu đã cấu hình riêng.
- **Không kết nối được cơ sở dữ liệu hoặc không đăng nhập được:** kiểm tra các
  giá trị `DB_*` trong `backend/.env`; bảo đảm đã chạy migration.
- **Không tải được ảnh vừa tải lên:** bật extension PHP `fileinfo`, khởi động
  lại backend và thử lại.
- **Không đặt được đơn qua VNPay/MoMo:** kiểm tra thông tin sandbox trong
  `backend/.env`. Callback từ nhà cung cấp cần truy cập được backend qua HTTPS.
- **Thay đổi cấu hình backend chưa có hiệu lực:** chạy `php artisan config:clear`
  trong thư mục `backend`, sau đó khởi động lại backend.

## 7. Tài liệu tham khảo

- [Tài liệu Next.js](https://nextjs.org/docs)
- [Tài liệu Laravel](https://laravel.com/docs)
- [`backend/README.md`](../backend/README.md): thông tin cơ sở dữ liệu, API và
  kiểm thử backend.
