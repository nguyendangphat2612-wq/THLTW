<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## MySQL database and authentication

The backend uses Laravel migrations to create the `users` table, including unique email addresses, hashed passwords, roles, and API tokens. Registration at `POST /api/register` inserts each account into this table; login checks the saved password hash and issues a token that is also stored there.

For a new MySQL/MariaDB database, either import [`docs/phaloc.sql`](../docs/phaloc.sql) in a SQL client, or configure `DB_*` in `.env` and run:

```bash
php artisan migrate --seed
```

Use the SQL import for a new/empty database only. For an existing installation, run `php artisan migrate` so Laravel can update the schema without replacing existing account data. Do not grant admin privileges to untrusted accounts.

## API Authentication and Postman

Run the backend and seed local data, including a local-only admin account:

```bash
php artisan migrate --seed
php artisan serve
```

Import `postman/PhatLoc-API.postman_collection.json` into Postman and run the collection in order. In local/testing, registered and logging-in accounts receive the admin role so the admin workflow can be tested. In production, registration remains a regular user and must never grant admin automatically. `DatabaseSeeder` can also create `admin@example.com` with password `password123` in local/testing; override `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD`. Never use the sample password in a deployed environment.

Register and login are public. Send the returned token as `Authorization: Bearer <token>` to view `/api/me`, logout, or access `/api/admin`. Catalog list endpoints are public; create, update, and delete require an admin token. List endpoints accept `page` and `per_page` (default 15, maximum 100).

`GET /api/products` also supports `category_id`, `brand_id`, and `search`; `GET /api/brands` supports `category_id` and `search`. Invalid filter values return a JSON validation error.

`GET /api/categories/{category}`, `GET /api/brands/{brand}`, and `GET /api/products/{product}` return public details for active catalog entries. Deleting a category or brand referenced by products returns `409 Conflict`; products are soft-deleted by setting `trash` to `1`.

Product, category, brand, and article titles must be unique regardless of case, including records in the trash. Public product detail requests increment the view count. Reviews are listed at `GET /api/products/{product}/reviews` and can be created or updated by an authenticated account at `POST /api/products/{product}/reviews`. Contact form submissions are validated and saved by `POST /api/contact`; administrators can edit, trash, restore, and permanently delete contacts at `/api/admin/contacts`.

The shop creates orders from the browser cart with `POST /api/orders`; the backend verifies product availability and calculates line prices, coupon discounts, and totals. `POST /api/coupons/validate` checks an active promotion before checkout. Administrators manage promotions at `/api/admin/coupons`, list members at `/api/admin/members`, and view a member's profile, recent orders, and reviews at `/api/admin/members/{member}`. They can update member information, lock or unlock accounts using `POST /api/admin/members/{member}/lock` and `/unlock`, and permanently delete non-admin accounts with `DELETE /api/admin/members/{member}`. Locking revokes the active token and blocks login; deleting a member preserves orders without their account link and deletes their product reviews. Administrators manage stock at `/api/admin/inventory` with adjustment records at `/api/admin/inventory/adjustments`. Product stock is untracked until its first receipt; tracked products are decremented on order placement and restocked when the order is cancelled. Authenticated customers can list their own orders at `GET /api/orders`, view one at `GET /api/orders/{order}`, and cancel pending unpaid orders at `POST /api/orders/{order}/cancel`; orders placed while signed in are associated with that account. Administrators can advance an order through `pending` (Chờ xác nhận) → `confirmed` (Đã xác nhận) → `shipping` (Đang giao) → `completed` (Hoàn tất) at `/api/admin/orders`; each transition must happen in sequence, or the order can be cancelled separately before completion. Public articles are served by `GET /api/articles` and `GET /api/articles/{slug}`; administrators can create and manage articles at `/api/admin/articles`. Contacts, orders, and articles support trash, restore, and permanent deletion.

Run the automated API tests with `php artisan test`.

Product image uploads and the uploaded-image endpoint require PHP's `fileinfo` extension. The image upload feature test also requires `gd`. Enable both extensions in the active PHP configuration and restart the Laravel server after changing them.
