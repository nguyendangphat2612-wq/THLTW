# Hướng dẫn dành cho quản trị viên

Tài liệu này hướng dẫn sử dụng khu vực quản trị LocPhat Mobile. Đăng nhập tại
`/admin/login` bằng tài khoản quản trị được cửa hàng cấp.

Trang đăng nhập quản trị chỉ nhận tài khoản có quyền quản trị. Tài khoản khách
hàng cần đăng nhập ở trang **Đăng nhập** của cửa hàng; việc nhập nhầm loại tài
khoản sẽ không cấp quyền hoặc thay đổi thông tin/tokens của tài khoản đó.
Phiên admin được lưu riêng; trang **Thông tin cá nhân** của khách hàng không
hiển thị và không cho phép sửa thông tin admin.

--------Tài khoảng Admin:

---Email: 1@gmail.com

---Mật khẩu: 12345678

## 1. Bảo mật tài khoản quản trị

- Không chia sẻ tài khoản/mật khẩu và không ghi thông tin đăng nhập thật vào
  README, tài liệu hướng dẫn, mã nguồn hoặc repository.
- Đổi mật khẩu mẫu trước khi đưa hệ thống lên môi trường thật.
- Chỉ cấp quyền quản trị cho người được ủy quyền; tài khoản khách hàng không tự
  đăng ký thành quản trị viên.

## 2. Bảng điều khiển và điều hướng

Sau khi đăng nhập, dùng thanh điều hướng quản trị để mở các mục bên dưới. Nếu
trang yêu cầu đăng nhập lại, phiên đăng nhập có thể đã hết hạn.

## 3. Quản lý đơn hàng — `/admin/order`

1. Mở **Đơn hàng** và tìm đơn theo thông tin khách hàng.
2. Chọn **Chi tiết** để xem sản phẩm, số lượng, người nhận, địa chỉ, phương
   thức và trạng thái thanh toán.
3. Duyệt đơn theo đúng thứ tự **Chờ xác nhận → Đã xác nhận → Đang giao →
   Hoàn tất**. Cập nhật lần lượt từng bước.
4. Dùng chức năng **Hủy đơn hàng** nếu cần hủy; xác nhận thao tác sau khi kiểm
   tra đơn.
5. Có thể làm mới danh sách sau khi cập nhật để kiểm tra trạng thái mới.

Không thể bỏ qua bước trạng thái. Đơn đã hoàn tất hoặc đã hủy không thể tiếp
tục xử lý; đơn thanh toán online cần có trạng thái thanh toán phù hợp trước khi
được hoàn tất.

Khi hủy đơn, hệ thống hoàn lại số lượng vào kho nếu sản phẩm đang được theo dõi
tồn kho. Đơn thanh toán online đang chờ hoặc đã thanh toán cần được xử lý giao
dịch trước khi hủy.

## 4. Quản lý sản phẩm — `/admin/product`

1. Xem danh sách hoặc tìm sản phẩm.
2. Chọn thêm mới hoặc sửa để cập nhật tên, danh mục, giá, thông tin và ảnh.
3. Kiểm tra ảnh xem trước, sau đó lưu thay đổi.
4. Nếu xóa nhầm, mở mục thùng rác để khôi phục khi còn khả dụng.

## 5. Thương hiệu và danh mục

- **Thương hiệu — `/admin/brand`:** thêm hoặc cập nhật thương hiệu dùng để phân
  loại sản phẩm.
- **Danh mục — `/admin/category`:** tạo và cập nhật nhóm sản phẩm.

Kiểm tra sản phẩm đang tham chiếu tới thương hiệu/danh mục trước khi xóa.

## 6. Quản lý khuyến mãi — `/admin/promotions`

1. Xem danh sách mã đang có.
2. Chọn thêm mới hoặc sửa để cấu hình mã, loại và mức giảm, thời gian áp dụng
   cùng trạng thái hoạt động.
3. Lưu và kiểm tra mã còn hiệu lực; khách hàng sẽ nhập mã ở bước thanh toán.
4. Chỉ xóa mã khi cửa hàng không còn cần áp dụng mã đó.

## 7. Quản lý thành viên — `/admin/members`

1. Tìm thành viên và mở hồ sơ để xem thông tin cùng hoạt động liên quan.
2. Dùng khóa/mở khóa để tạm ngăn hoặc cho phép thành viên đăng nhập.
3. Chỉ xóa tài khoản khi đã xác nhận yêu cầu và hệ quả đối với hồ sơ.

Tài khoản quản trị không thể bị khóa hoặc xóa qua mục thành viên. Việc xóa tài
khoản thành viên giữ lại lịch sử đơn hàng nhưng gỡ liên kết với tài khoản.

## 8. Quản lý kho — `/admin/inventory`

1. Tìm sản phẩm cần nhập hoặc điều chỉnh.
2. Ghi nhận số lượng nhập kho hoặc điều chỉnh tăng/giảm theo số lượng thực tế.
3. Kiểm tra số dư tồn kho và lịch sử biến động sau khi lưu.

Sản phẩm bắt đầu được theo dõi tồn kho từ lần ghi nhận nhập kho đầu tiên. Khi
đặt đơn, hệ thống trừ hàng; khi hủy đơn hợp lệ, hệ thống hoàn hàng và ghi lịch
sử biến động.

## 9. Bài viết và liên hệ

- **Bài viết — `/admin/article`:** thêm hoặc sửa bài; kiểm tra nội dung và trạng
  thái hiển thị trước khi lưu. Dùng thùng rác để khôi phục hoặc xóa theo nhu
  cầu.
- **Liên hệ — `/admin/contact`:** xem nội dung khách gửi, tìm tin nhắn và quản
  lý mục trong danh sách/thùng rác. Liên hệ khách qua kênh của cửa hàng nếu cần
  phản hồi.

## 10. Cấu hình email đơn hàng

Quản trị viên kỹ thuật cấu hình SMTP trong `backend/.env`, gồm tài khoản gửi,
mật khẩu ứng dụng và địa chỉ nhận thông báo `MAIL_ORDER_TO`. Với Gmail, dùng
Google App Password; không dùng mật khẩu đăng nhập Gmail thông thường. Không
đưa các giá trị này vào tài liệu hoặc frontend.

Sau khi thay cấu hình, chạy trong thư mục `backend`:

```powershell
php artisan config:clear
```

Khởi động lại backend. Trạng thái gửi email khách và email cửa hàng được hiển
thị riêng trong thông tin đơn hàng. Đơn vẫn được lưu nếu gửi email thất bại.

## 11. Cổng thanh toán thử nghiệm

VNPay và MoMo chỉ chạy sandbox trong dự án; giao dịch sandbox không thu tiền
thật. Cần cấu hình thông tin sandbox trong `backend/.env`. Callback từ nhà cung
cấp cần truy cập được backend qua HTTPS. Không đưa khóa bí mật vào frontend,
tài liệu hoặc repository.

## 12. Thùng rác và dữ liệu

Một số mục quản trị có trang thùng rác riêng, ví dụ `/admin/order/trash`.
Khôi phục mục nếu cần sử dụng lại; chỉ xóa vĩnh viễn sau khi xác nhận vì thao
tác này không thể hoàn tác.

Khi cần hỗ trợ kỹ thuật, cung cấp mã đơn hoặc mô tả lỗi; không gửi mật khẩu,
token đăng nhập hay khóa thanh toán.
