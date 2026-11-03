<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'brand_id' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'min_price' => ['sometimes', 'numeric', 'min:0'],
            'max_price' => ['sometimes', 'numeric', 'min:0', 'gte:min_price'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $phoneBrandIds = $this->phoneBrandIds();

        $products = Product::query()
            ->with(['category', 'brand'])
            ->where('status', 1)
            ->where('trash', 0)
            ->whereIn('cat_id', $phoneBrandIds)
            ->when(isset($filters['category_id']), function ($query) use ($filters) {
                $categoryId = (int) $filters['category_id'];
                $childCategoryIds = Category::query()
                    ->where('parent_id', $categoryId)
                    ->where('status', 1)
                    ->where('trash', 0)
                    ->pluck('cat_id');

                $query->where(function ($categoryQuery) use ($categoryId, $childCategoryIds) {
                    $categoryQuery->where('cat_id', $categoryId);
                    if ($childCategoryIds->isNotEmpty()) {
                        $categoryQuery->orWhereIn('cat_id', $childCategoryIds);
                    }
                });
            })
            ->when(isset($filters['brand_id']), function ($query) use ($filters) {
                $query->where('brand_id', (int) $filters['brand_id']);
            })
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('product_name', 'like', '%'.trim($filters['search']).'%');
            })
            ->when(isset($filters['min_price']), function ($query) use ($filters) {
                $query->whereRaw('CAST(CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN sale_price ELSE price END AS DECIMAL(15, 2)) >= ?', [(float) $filters['min_price']]);
            })
            ->when(isset($filters['max_price']), function ($query) use ($filters) {
                $query->whereRaw('CAST(CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN sale_price ELSE price END AS DECIMAL(15, 2)) <= ?', [(float) $filters['max_price']]);
            })
            ->orderByDesc('product_id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        $products->setCollection($products->getCollection()->map(fn (Product $product) => (new ProductResource($product))->resolve()));

        $priceRange = Product::query()
            ->where('status', 1)
            ->where('trash', 0)
            ->whereIn('cat_id', $phoneBrandIds)
            ->selectRaw('MIN(CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN sale_price ELSE price END) as min_price')
            ->selectRaw('MAX(CASE WHEN sale_price IS NOT NULL AND sale_price > 0 AND sale_price < price THEN sale_price ELSE price END) as max_price')
            ->first();

        return response()->json([
            ...$products->toArray(),
            'price_range' => [
                'min' => (float) ($priceRange?->min_price ?? 0),
                'max' => (float) ($priceRange?->max_price ?? 0),
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        abort_unless((int) $product->status === 1 && (int) $product->trash === 0, 404);
        abort_unless(in_array((int) $product->cat_id, $this->phoneBrandIds(), true), 404);

        $product->increment('view');
        $product->refresh()->load(['category', 'brand']);

        return response()->json([
            'data' => (new ProductResource($product))->resolve(),
        ]);
    }

    public function image(string $path): BinaryFileResponse
    {
        $segments = explode('/', $path);
        abort_unless(
            array_shift($segments) === 'products'
                && $segments !== []
                && ! in_array('', $segments, true)
                && ! in_array('.', $segments, true)
                && ! in_array('..', $segments, true)
                && ! str_contains($path, '\\'),
            404
        );

        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);

        $contentType = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };

        return response()->file($disk->path($path), [
            'Content-Type' => $contentType,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProduct($request);
        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($data);

        return response()->json(['data' => $product], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validateProduct($request, $product);
        $previousImage = $product->image;
        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);
        if ($request->hasFile('image') && is_string($previousImage) && str_starts_with($previousImage, 'products/')) {
            Storage::disk('public')->delete($previousImage);
        }

        return response()->json(['data' => $product->fresh()]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->update(['trash' => 1]);

        return response()->json(['message' => 'Sản phẩm đã được xóa.']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $products = Product::query()
            ->with(['category', 'brand'])
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('product_name', 'like', '%'.trim($filters['search']).'%');
            })
            ->orderByDesc('product_id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($products);
    }

    public function restore(Product $product): JsonResponse
    {
        abort_unless((int) $product->trash === 1, 404);
        $product->update(['trash' => 0]);

        return response()->json(['data' => $product->fresh(), 'message' => 'Sản phẩm đã được khôi phục.']);
    }

    public function forceDestroy(Product $product): JsonResponse
    {
        abort_unless((int) $product->trash === 1, 404);
        $image = $product->image;
        $unusedUploadedImage = is_string($image)
            && str_starts_with($image, 'products/')
            && ! Product::query()
                ->where('image', $image)
                ->where('product_id', '!=', $product->product_id)
                ->exists();

        $product->delete();
        if ($unusedUploadedImage) {
            Storage::disk('public')->delete($image);
        }

        return response()->json(['message' => 'Sản phẩm đã được xóa vĩnh viễn.']);
    }

    protected function validateProduct(Request $request, ?Product $product = null): array
    {
        $phoneBrandIds = $this->phoneBrandIds();

        $validated = $request->validate([
            'product_name' => ['required', 'string', 'max:255'],
            'alias' => ['nullable', 'string', 'max:255'],
            'cat_id' => ['required', 'integer', Rule::in($phoneBrandIds)],
            'brand_id' => ['nullable', 'integer', Rule::in($phoneBrandIds)],
            'detail' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'image' => $request->hasFile('image')
                ? ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']
                : ['nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'string'],
            'tag' => ['nullable', 'string', 'max:255'],
            'view' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'integer', 'in:0,1'],
            'trash' => ['nullable', 'integer', 'in:0,1'],
            'launch_date' => ['nullable', 'date'],
        ]);

        $price = (float) ($validated['price'] ?? $product?->price ?? 0);
        $salePrice = array_key_exists('sale_price', $validated)
            ? $validated['sale_price']
            : $product?->sale_price;
        if ($salePrice !== null && (float) $salePrice > $price) {
            throw ValidationException::withMessages([
                'sale_price' => ['Giá khuyến mại không được cao hơn giá gốc.'],
            ]);
        }

        if (isset($validated['brand_id']) && (int) $validated['brand_id'] !== (int) $validated['cat_id']) {
            throw ValidationException::withMessages([
                'brand_id' => ['Thương hiệu phải khớp với danh mục thương hiệu đã chọn.'],
            ]);
        }

        $validated['product_name'] = trim($validated['product_name']);
        if ($validated['product_name'] === '') {
            throw ValidationException::withMessages([
                'product_name' => ['Tên sản phẩm không được để trống.'],
            ]);
        }

        $this->ensureUniqueName(Product::class, 'product_name', $validated['product_name'], 'product_name', $product?->product_id);

        $validated['alias'] = $this->generateUniqueAlias(
            $validated['alias'] ?? $validated['product_name'],
            $product?->product_id
        );
        $validated['cat_id'] = (int) $validated['cat_id'];
        $validated['brand_id'] = (int) ($validated['brand_id'] ?? $validated['cat_id']);
        $validated['price'] = isset($validated['price']) ? (float) $validated['price'] : ($product?->price ?? 0);
        $validated['sale_price'] = array_key_exists('sale_price', $validated)
            ? ($validated['sale_price'] === null ? null : (float) $validated['sale_price'])
            : ($product?->sale_price ?? null);
        $validated['view'] = (int) ($validated['view'] ?? $product?->view ?? 0);
        $validated['status'] = (int) ($validated['status'] ?? $product?->status ?? 1);
        $validated['trash'] = (int) ($validated['trash'] ?? $product?->trash ?? 0);

        return $validated;
    }

    protected function phoneBrandIds(): array
    {
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->where('status', 1)
            ->where('trash', 0)
            ->value('cat_id');

        if ($phoneCategoryId === null) {
            return [];
        }

        return Category::query()
            ->where('parent_id', $phoneCategoryId)
            ->where('status', 1)
            ->where('trash', 0)
            ->pluck('cat_id')
            ->all();
    }

    protected function generateUniqueAlias(string $source, ?int $ignoreId = null): string
    {
        $base = trim((string) $source);
        $slug = Str::slug($base) ?: 'product';
        $alias = $slug;
        $counter = 1;

        while (Product::query()
            ->where('alias', $alias)
            ->when($ignoreId !== null, fn ($query) => $query->where('product_id', '!=', $ignoreId))
            ->exists()) {
            $alias = $slug.'-'.$counter;
            $counter++;
        }

        return $alias;
    }
}
