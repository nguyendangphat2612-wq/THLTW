const authMessages = {
  "The email has already been taken.": "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
  "The provided credentials are incorrect.": "Email hoặc mật khẩu không chính xác.",
  "The password field must be at least 8 characters.": "Mật khẩu cần có ít nhất 8 ký tự.",
  "The password field confirmation does not match.": "Mật khẩu nhập lại không khớp.",
  "The email field must be a valid email address.": "Vui lòng nhập địa chỉ email hợp lệ.",
  "The name field is required.": "Vui lòng nhập họ tên.",
  "The email field is required.": "Vui lòng nhập email.",
  "The password field is required.": "Vui lòng nhập mật khẩu.",
};

export function getAuthErrorMessage(error, fallback) {
  if (error instanceof TypeError) {
    return "Không thể kết nối máy chủ. Kiểm tra Laravel API đang chạy rồi thử lại.";
  }

  return authMessages[error?.message] || error?.message || fallback;
}