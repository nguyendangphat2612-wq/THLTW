<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreManagementController extends Controller
{
    public function coupons(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $coupons = Coupon::query()
            ->when(filled($filters['search'] ?? null), fn ($query) => $query->where('code', 'like', '%'.trim($filters['search']).'%'))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 100));

        return response()->json($coupons);
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $coupon = Coupon::create($this->validateCoupon($request));

        return response()->json(['data' => $coupon, 'message' => 'Đã tạo mã khuyến mãi.'], 201);
    }

    public function updateCoupon(Request $request, Coupon $coupon): JsonResponse
    {
        $coupon->update($this->validateCoupon($request, $coupon));

        return response()->json(['data' => $coupon->fresh(), 'message' => 'Đã cập nhật mã khuyến mãi.']);
    }

    public function destroyCoupon(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json(['message' => 'Đã xóa mã khuyến mãi.']);
    }

    private function validateCoupon(Request $request, ?Coupon $coupon = null): array
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('coupons', 'code')->ignore($coupon?->id)],
            'discount_type' => ['required', Rule::in(['percent', 'fixed'])],
            'discount_value' => ['required', 'numeric', 'gt:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['required', 'boolean'],
        ]);

        $validated['code'] = Str::upper(trim($validated['code']));
        $duplicateCode = Coupon::query()
            ->whereRaw('LOWER(code) = ?', [mb_strtolower($validated['code'])])
            ->when($coupon, fn ($query) => $query->where('id', '!=', $coupon->id))
            ->exists();
        if ($duplicateCode) {
            throw ValidationException::withMessages([
                'code' => ['Mã khuyến mãi này đã tồn tại.'],
            ]);
        }
        if ($validated['discount_type'] === 'percent' && (float) $validated['discount_value'] > 100) {
            throw ValidationException::withMessages([
                'discount_value' => ['Mức giảm theo phần trăm không được vượt quá 100%.'],
            ]);
        }

        return $validated;
    }

    public function members(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', Rule::in(['user', 'admin'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $members = User::query()
            ->select(['id', 'name', 'email', 'phone', 'address', 'role', 'is_locked', 'created_at'])
            ->withCount(['orders', 'reviews'])
            ->when(filled($filters['search'] ?? null), function ($query) use ($filters) {
                $search = trim($filters['search']);
                $query->where(fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%"));
            })
            ->when(isset($filters['role']), fn ($query) => $query->where('role', $filters['role']))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 100));

        return response()->json($members);
    }

    public function showMember(User $member): JsonResponse
    {
        $orders = $member->orders()
            ->select(['id', 'user_id', 'status', 'payment_status', 'total', 'items', 'created_at'])
            ->orderByDesc('id')
            ->limit(20)
            ->get();
        $reviews = ProductReview::query()
            ->with('product:product_id,product_name')
            ->where('user_id', $member->id)
            ->orderByDesc('id')
            ->limit(20)
            ->get(['id', 'product_id', 'rating', 'comment', 'created_at']);

        return response()->json([
            'data' => [
                ...$member->only(['id', 'name', 'email', 'phone', 'address', 'role', 'is_locked', 'created_at']),
                'orders_count' => $member->orders()->count(),
                'reviews_count' => $member->reviews()->count(),
                'orders' => $orders,
                'reviews' => $reviews,
            ],
        ]);
    }

    public function updateMember(Request $request, User $member): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($member->id)],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
            'role' => ['sometimes', Rule::in(['user', 'admin'])],
        ]);

        if ($member->is($request->user()) && isset($validated['role']) && $validated['role'] !== $member->role) {
            throw ValidationException::withMessages([
                'role' => ['Không thể tự thay đổi quyền của tài khoản đang đăng nhập.'],
            ]);
        }
        if ($member->role === 'admin' && isset($validated['role']) && $validated['role'] !== 'admin'
            && User::query()->where('role', 'admin')->count() <= 1) {
            throw ValidationException::withMessages([
                'role' => ['Không thể hạ quyền quản trị viên cuối cùng.'],
            ]);
        }

        $member->update($validated);

        return response()->json([
            'data' => $member->only(['id', 'name', 'email', 'phone', 'address', 'role', 'is_locked', 'created_at']),
            'message' => 'Đã cập nhật thành viên.',
        ]);
    }

    public function lockMember(User $member): JsonResponse
    {
        if ($member->role === 'admin') {
            throw ValidationException::withMessages([
                'member' => ['Không thể khóa tài khoản quản trị viên.'],
            ]);
        }
        $member->update(['is_locked' => true, 'api_token' => null]);

        return response()->json([
            'data' => $member->only(['id', 'name', 'email', 'is_locked']),
            'message' => 'Đã khóa tài khoản. Phiên đăng nhập hiện tại đã bị thu hồi.',
        ]);
    }

    public function unlockMember(User $member): JsonResponse
    {
        $member->update(['is_locked' => false]);

        return response()->json([
            'data' => $member->only(['id', 'name', 'email', 'is_locked']),
            'message' => 'Đã mở khóa tài khoản. Thành viên có thể đăng nhập lại.',
        ]);
    }

    public function destroyMember(Request $request, User $member): JsonResponse
    {
        if ($member->is($request->user())) {
            throw ValidationException::withMessages([
                'member' => ['Không thể xóa tài khoản quản trị viên đang đăng nhập.'],
            ]);
        }
        if ($member->role === 'admin') {
            throw ValidationException::withMessages([
                'member' => ['Không thể xóa tài khoản quản trị viên tại mục thành viên.'],
            ]);
        }

        $member->delete();

        return response()->json([
            'message' => 'Đã xóa tài khoản. Lịch sử đơn hàng được giữ lại; đánh giá sản phẩm của thành viên đã bị xóa.',
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $products = Product::query()
            ->select(['product_id', 'product_name', 'alias', 'stock_quantity', 'track_inventory', 'status', 'trash'])
            ->when(filled($filters['search'] ?? null), fn ($query) => $query->where('product_name', 'like', '%'.trim($filters['search']).'%'))
            ->orderBy('product_name')
            ->paginate($request->integer('per_page', 100));
        $movements = InventoryMovement::query()
            ->with(['user:id,name', 'order:id,status'])
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'products' => $products,
            'movements' => $movements,
        ]);
    }

    public function adjustInventory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,product_id'],
            'direction' => ['required', Rule::in(['in', 'out'])],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $movement = DB::transaction(function () use ($request, $validated) {
            $product = Product::query()->lockForUpdate()->findOrFail($validated['product_id']);
            $currentQuantity = (int) $product->stock_quantity;
            $quantity = (int) $validated['quantity'];
            if ($validated['direction'] === 'out' && $quantity > $currentQuantity) {
                throw ValidationException::withMessages([
                    'quantity' => ['Số lượng xuất vượt quá tồn kho hiện tại.'],
                ]);
            }

            $balance = $validated['direction'] === 'in'
                ? $currentQuantity + $quantity
                : $currentQuantity - $quantity;
            $product->update(['stock_quantity' => $balance, 'track_inventory' => true]);

            return InventoryMovement::create([
                'product_id' => $product->product_id,
                'product_name' => $product->product_name,
                'user_id' => $request->user()->id,
                'direction' => $validated['direction'],
                'quantity' => $quantity,
                'balance_after' => $balance,
                'note' => $validated['note'] ?? null,
            ]);
        });

        return response()->json([
            'data' => $movement->load('user:id,name'),
            'message' => 'Đã ghi nhận phiếu '.($validated['direction'] === 'in' ? 'nhập' : 'xuất').' kho.',
        ], 201);
    }
}
