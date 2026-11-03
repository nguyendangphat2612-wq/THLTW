<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductReviewController extends Controller
{
    public function index(Request $request, Product $product): JsonResponse
    {
        $this->ensureVisibleProduct($product);
        $filters = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $perPage = min((int) ($filters['per_page'] ?? 10), 50);
        $reviews = $product->reviews()
            ->with('user:id,name')
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => $reviews->getCollection()->map(fn (ProductReview $review) => $this->reviewData($review)),
            'average_rating' => round((float) $product->reviews()->avg('rating'), 1),
            'review_count' => $reviews->total(),
            'current_page' => $reviews->currentPage(),
            'last_page' => $reviews->lastPage(),
        ]);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $this->ensureVisibleProduct($product);
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'max:2000'],
        ]);

        $review = $product->reviews()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated,
        )->load('user:id,name');

        return response()->json([
            'data' => $this->reviewData($review),
            'message' => 'Đánh giá của bạn đã được lưu.',
        ], $review->wasRecentlyCreated ? 201 : 200);
    }

    private function ensureVisibleProduct(Product $product): void
    {
        abort_unless((int) $product->status === 1 && (int) $product->trash === 0, 404);
    }

    private function reviewData(ProductReview $review): array
    {
        return [
            'id' => $review->id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'created_at' => $review->created_at,
            'user' => [
                'name' => $review->user->name,
            ],
        ];
    }
}
