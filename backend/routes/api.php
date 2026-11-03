<?php

use App\Http\Controllers\Api\admin\AdminController;
use App\Http\Controllers\Api\admin\StoreManagementController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ContactAdminController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Các route trong file này tự động có tiền tố /api
|
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('api.token')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::get('/admin', [AdminController::class, 'show'])->middleware('api.admin');
});

// ===============================
// CATEGORIES
// ===============================

// GET /api/categories
// Lấy danh sách danh mục đang hiển thị
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

// GET /api/brands
// Lấy danh sách thương hiệu đang hiển thị
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/brands/{brand}', [BrandController::class, 'show']);

// ===============================
// PRODUCTS
// ===============================

// GET /api/products
// Lấy danh sách sản phẩm đang hiển thị
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/products/{product}/reviews', [ProductReviewController::class, 'index']);
Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:5,1');
Route::post('/coupons/validate', [OrderController::class, 'validateCoupon'])->middleware('throttle:10,1');
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:5,1');
Route::get('/payments/status/{reference}', [OrderController::class, 'paymentStatus'])->middleware('throttle:30,1');
Route::match(['get', 'post'], '/payments/vnpay/return', [OrderController::class, 'vnpayReturn']);
Route::get('/payments/vnpay/ipn', [OrderController::class, 'vnpayIpn']);
Route::match(['get', 'post'], '/payments/momo/return', [OrderController::class, 'momoReturn']);
Route::post('/payments/momo/ipn', [OrderController::class, 'momoIpn']);
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{slug}', [ArticleController::class, 'show']);
Route::get('/product-images/{path}', [ProductController::class, 'image'])->where('path', '.*');

Route::middleware('api.token')->group(function () {
    Route::get('/orders', [OrderController::class, 'customerIndex']);
    Route::get('/orders/{order}', [OrderController::class, 'customerShow']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'customerCancel']);
    Route::post('/products/{product}/reviews', [ProductReviewController::class, 'store']);
});

Route::middleware(['api.token', 'api.admin'])->group(function () {
    Route::get('/admin/coupons', [StoreManagementController::class, 'coupons']);
    Route::post('/admin/coupons', [StoreManagementController::class, 'storeCoupon']);
    Route::put('/admin/coupons/{coupon}', [StoreManagementController::class, 'updateCoupon']);
    Route::delete('/admin/coupons/{coupon}', [StoreManagementController::class, 'destroyCoupon']);
    Route::get('/admin/members', [StoreManagementController::class, 'members']);
    Route::get('/admin/members/{member}', [StoreManagementController::class, 'showMember']);
    Route::put('/admin/members/{member}', [StoreManagementController::class, 'updateMember']);
    Route::post('/admin/members/{member}/lock', [StoreManagementController::class, 'lockMember']);
    Route::post('/admin/members/{member}/unlock', [StoreManagementController::class, 'unlockMember']);
    Route::delete('/admin/members/{member}', [StoreManagementController::class, 'destroyMember']);
    Route::get('/admin/inventory', [StoreManagementController::class, 'inventory']);
    Route::post('/admin/inventory/adjustments', [StoreManagementController::class, 'adjustInventory']);

    Route::get('/admin/categories', [CategoryController::class, 'adminIndex']);
    Route::post('/admin/categories/{category}/restore', [CategoryController::class, 'restore']);
    Route::delete('/admin/categories/{category}/force', [CategoryController::class, 'forceDestroy']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::get('/admin/brands', [BrandController::class, 'adminIndex']);
    Route::post('/admin/brands/{brand}/restore', [BrandController::class, 'restore']);
    Route::delete('/admin/brands/{brand}/force', [BrandController::class, 'forceDestroy']);
    Route::post('/brands', [BrandController::class, 'store']);
    Route::put('/brands/{brand}', [BrandController::class, 'update']);
    Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);

    Route::get('/admin/products', [ProductController::class, 'adminIndex']);
    Route::post('/admin/products/{product}/restore', [ProductController::class, 'restore']);
    Route::delete('/admin/products/{product}/force', [ProductController::class, 'forceDestroy']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::get('/admin/contacts', [ContactAdminController::class, 'index']);
    Route::post('/admin/contacts', [ContactAdminController::class, 'store']);
    Route::put('/admin/contacts/{contactMessage}', [ContactAdminController::class, 'update']);
    Route::delete('/admin/contacts/{contactMessage}', [ContactAdminController::class, 'destroy']);
    Route::post('/admin/contacts/{contactMessage}/restore', [ContactAdminController::class, 'restore']);
    Route::delete('/admin/contacts/{contactMessage}/force', [ContactAdminController::class, 'forceDestroy']);

    Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
    Route::post('/admin/orders/{order}/cancel', [OrderController::class, 'adminCancel']);
    Route::post('/admin/orders', [OrderController::class, 'store']);
    Route::put('/admin/orders/{order}', [OrderController::class, 'update']);
    Route::delete('/admin/orders/{order}', [OrderController::class, 'destroy']);
    Route::post('/admin/orders/{order}/restore', [OrderController::class, 'restore']);
    Route::delete('/admin/orders/{order}/force', [OrderController::class, 'forceDestroy']);

    Route::get('/admin/articles', [ArticleController::class, 'adminIndex']);
    Route::post('/admin/articles', [ArticleController::class, 'store']);
    Route::put('/admin/articles/{article}', [ArticleController::class, 'update']);
    Route::delete('/admin/articles/{article}', [ArticleController::class, 'destroy']);
    Route::post('/admin/articles/{article}/restore', [ArticleController::class, 'restore']);
    Route::delete('/admin/articles/{article}/force', [ArticleController::class, 'forceDestroy']);
});
