-- MySQL/MariaDB schema for the Laravel backend.
-- For an existing database, use `php artisan migrate` instead of importing this file.

CREATE DATABASE IF NOT EXISTS `locphat`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `locphat`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'user',
  `phone` varchar(32) DEFAULT NULL,
  `address` varchar(1000) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `api_token` varchar(80) DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_api_token_unique` (`api_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `cat_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned NOT NULL DEFAULT 0,
  `cat_name` varchar(255) NOT NULL,
  `alias` varchar(255) NOT NULL,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `trash` tinyint unsigned NOT NULL DEFAULT 0,
  `sort_order` int unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`cat_id`),
  UNIQUE KEY `categories_alias_unique` (`alias`),
  KEY `categories_parent_id_index` (`parent_id`),
  KEY `categories_status_index` (`status`),
  KEY `categories_trash_index` (`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `product_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_name` varchar(255) NOT NULL,
  `alias` varchar(255) NOT NULL,
  `cat_id` bigint unsigned DEFAULT NULL,
  `brand_id` bigint unsigned DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(15,2) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `tag` varchar(255) DEFAULT NULL,
  `view` int unsigned NOT NULL DEFAULT 0,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `trash` tinyint unsigned NOT NULL DEFAULT 0,
  `launch_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `products_alias_unique` (`alias`),
  KEY `products_cat_id_index` (`cat_id`),
  KEY `products_brand_id_index` (`brand_id`),
  KEY `products_status_index` (`status`),
  KEY `products_trash_index` (`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `trash` tinyint unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contact_messages_trash_index` (`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_reviews_product_id_user_id_unique` (`product_id`, `user_id`),
  CONSTRAINT `product_reviews_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `product_reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `articles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `excerpt` varchar(1000) DEFAULT NULL,
  `content` longtext NOT NULL,
  `published_at` date DEFAULT NULL,
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `trash` tinyint unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `articles_slug_unique` (`slug`),
  KEY `articles_status_index` (`status`),
  KEY `articles_trash_index` (`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(32) NOT NULL,
  `address` varchar(1000) NOT NULL,
  `items` json NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `payment_method` varchar(32) NOT NULL DEFAULT 'cod',
  `payment_status` varchar(32) NOT NULL DEFAULT 'unpaid',
  `payment_reference` varchar(64) DEFAULT NULL,
  `notification_email_status` varchar(32) NOT NULL DEFAULT 'unknown',
  `notification_email_sent_at` timestamp NULL DEFAULT NULL,
  `notification_email_error` varchar(255) DEFAULT NULL,
  `confirmation_email_status` varchar(32) NOT NULL DEFAULT 'unknown',
  `confirmation_email_sent_at` timestamp NULL DEFAULT NULL,
  `confirmation_email_error` varchar(255) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `trash` tinyint unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_payment_reference_unique` (`payment_reference`),
  KEY `orders_payment_status_index` (`payment_status`),
  KEY `orders_notification_email_status_index` (`notification_email_status`),
  KEY `orders_confirmation_email_status_index` (`confirmation_email_status`),
  KEY `orders_status_index` (`status`),
  KEY `orders_trash_index` (`trash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`)
SELECT `seed`.`migration`, `seed`.`batch`
FROM (
  SELECT '0001_01_01_000000_create_users_table' AS `migration`, 1 AS `batch`
  UNION ALL SELECT '0001_01_01_000001_create_cache_table', 1
  UNION ALL SELECT '0001_01_01_000002_create_jobs_table', 1
  UNION ALL SELECT '2026_09_27_000003_create_categories_table', 1
  UNION ALL SELECT '2026_09_27_000004_create_products_table', 1
  UNION ALL SELECT '2026_09_29_000005_add_auth_fields_to_users_table', 2
  UNION ALL SELECT '2026_10_14_000001_add_trash_to_categories_table', 3
  UNION ALL SELECT '2026_10_26_000001_create_product_reviews_table', 4
  UNION ALL SELECT '2026_10_26_000002_create_contact_messages_table', 4
  UNION ALL SELECT '2026_10_26_000003_add_admin_content_and_orders', 5
  UNION ALL SELECT '2026_11_02_000001_add_profile_and_payment_fields', 6
  UNION ALL SELECT '2026_11_02_000002_add_order_email_delivery_status', 7
  UNION ALL SELECT '2026_11_02_000003_add_customer_confirmation_email_status', 8
) AS `seed`
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations`
  WHERE `migrations`.`migration` = `seed`.`migration`
);

INSERT IGNORE INTO `categories`
  (`cat_id`, `parent_id`, `cat_name`, `alias`, `status`, `sort_order`)
VALUES
  (1, 0, 'Điện thoại di động', 'dien-thoai-di-dong', 1, 1),
  (2, 1, 'Iphone', 'apple', 1, 1),
  (3, 1, 'Samsung', 'samsung', 1, 2),
  (4, 1, 'Xiaomi', 'xiaomi', 1, 3),
  (5, 1, 'OPPO', 'oppo', 1, 4),
  (6, 1, 'Vivo', 'vivo', 1, 5),
  (7, 1, 'realme', 'realme', 1, 6),
  (8, 1, 'Nokia', 'nokia', 1, 7),
  (9, 1, 'ASUS', 'asus', 1, 8);

INSERT IGNORE INTO `products`
  (`product_name`, `alias`, `cat_id`, `brand_id`, `summary`, `price`, `sale_price`, `status`, `trash`)
VALUES
  ('iPhone 15 128GB', 'iphone-15-128gb', 2, 2, 'Điện thoại chính hãng, bảo hành đầy đủ.', 18990000.00, 17490000.00, 1, 0),
  ('Samsung Galaxy S24 256GB', 'samsung-galaxy-s24-256gb', 3, 3, 'Điện thoại chính hãng, bảo hành đầy đủ.', 22990000.00, 19990000.00, 1, 0),
  ('Xiaomi Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro', 4, 4, 'Điện thoại chính hãng, bảo hành đầy đủ.', 8990000.00, 7990000.00, 1, 0),
  ('OPPO Reno 11 5G', 'oppo-reno-11-5g', 5, 5, 'Điện thoại chính hãng, bảo hành đầy đủ.', 10990000.00, 9490000.00, 1, 0),
  ('vivo V30 5G', 'vivo-v30-5g', 6, 6, 'Điện thoại chính hãng, bảo hành đầy đủ.', 11990000.00, 10490000.00, 1, 0),
  ('realme 12 Pro+', 'realme-12-pro-plus', 7, 7, 'Điện thoại chính hãng, bảo hành đầy đủ.', 9990000.00, 8990000.00, 1, 0),
  ('Nokia C32', 'nokia-c32', 8, 8, 'Điện thoại chính hãng, bảo hành đầy đủ.', 3490000.00, 2990000.00, 1, 0),
  ('ASUS ROG Phone 8', 'asus-rog-phone-8', 9, 9, 'Sản phẩm chính hãng, bảo hành đầy đủ.', 23990000.00, 21990000.00, 1, 0);

INSERT IGNORE INTO `articles`
  (`title`, `slug`, `excerpt`, `content`, `published_at`, `status`, `trash`)
VALUES
  ('Cách chọn điện thoại phù hợp với nhu cầu hằng ngày', 'chon-dien-thoai-phu-hop', 'Một vài tiêu chí thiết thực về pin, camera và hiệu năng giúp bạn chọn đúng chiếc điện thoại.', 'Hãy bắt đầu từ cách bạn sử dụng điện thoại mỗi ngày. Nếu thường xuyên chụp ảnh, camera và dung lượng lưu trữ sẽ quan trọng hơn những thông số ít khi dùng đến.\n\nNgười dùng làm việc và giải trí nhiều nên ưu tiên pin tốt, màn hình phù hợp và thời gian cập nhật phần mềm. Đừng quên cầm thử máy để chọn kích thước vừa tay.\n\nCuối cùng, hãy đối chiếu ngân sách với chính sách bảo hành và chọn nơi bán minh bạch để an tâm sử dụng lâu dài.', '2026-10-20', 1, 0),
  ('Mẹo đơn giản để pin điện thoại luôn bền', 'meo-bao-ve-pin', 'Thói quen sạc phù hợp và một vài cài đặt nhỏ có thể giúp pin hoạt động ổn định hơn.', 'Dùng bộ sạc đạt chuẩn và tránh để điện thoại ở nơi quá nóng khi sạc. Nhiệt độ cao trong thời gian dài có thể làm pin xuống cấp nhanh hơn.\n\nBạn có thể bật chế độ tiết kiệm pin khi cần và kiểm tra ứng dụng chạy nền. Không cần cố xả pin về 0% trước mỗi lần sạc.\n\nNếu pin phồng, nóng bất thường hoặc thời lượng giảm rõ rệt, hãy ngừng sử dụng và mang thiết bị đến trung tâm sửa chữa uy tín.', '2026-10-15', 1, 0),
  ('Bảo vệ dữ liệu cá nhân khi đổi điện thoại', 'bao-ve-du-lieu-ca-nhan', 'Sao lưu, đăng xuất tài khoản và xóa dữ liệu đúng cách trước khi chuyển sang thiết bị mới.', 'Trước khi đổi máy, hãy sao lưu danh bạ, hình ảnh và các tệp quan trọng lên nơi lưu trữ an toàn. Kiểm tra bản sao lưu có thể khôi phục được trước khi xóa dữ liệu cũ.\n\nĐăng xuất tài khoản, gỡ phương thức thanh toán và tháo SIM, thẻ nhớ. Sau đó khôi phục cài đặt gốc theo hướng dẫn chính thức của nhà sản xuất.\n\nChỉ đăng nhập trên thiết bị mới qua kết nối đáng tin cậy và bật xác thực nhiều lớp cho các tài khoản quan trọng.', '2026-10-08', 1, 0);
