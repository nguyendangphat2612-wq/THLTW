<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BrandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->value('cat_id');

        $brands = Brand::query()
            ->active()
            ->where('parent_id', $phoneCategoryId ?? -1)
            ->when(isset($filters['category_id']), function ($query) use ($filters) {
                $query->where('parent_id', (int) $filters['category_id']);
            })
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('cat_name', 'like', '%'.trim($filters['search']).'%');
            })
            ->orderBy('sort_order')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        $brands->setCollection($brands->getCollection()->map(fn (Brand $brand) => $this->brandPayload($brand)));

        return response()->json($brands);
    }

    public function show(Brand $brand): JsonResponse
    {
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->value('cat_id');

        abort_unless(
            (int) $brand->status === 1 && (int) $brand->trash === 0 && $phoneCategoryId !== null && (int) $brand->parent_id === (int) $phoneCategoryId,
            404
        );

        return response()->json(['data' => $this->brandPayload($brand)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateBrand($request);

        $brand = Brand::create($data);

        return response()->json(['data' => $this->brandPayload($brand)], 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $this->validateBrand($request, $brand);

        $brand->update($data);

        return response()->json(['data' => $this->brandPayload($brand->fresh())]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->update(['trash' => 1]);

        return response()->json(['message' => 'Thương hiệu đã được xóa.']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->value('cat_id');

        $brands = Brand::query()
            ->where('parent_id', $phoneCategoryId ?? -1)
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('cat_name', 'like', '%'.trim($filters['search']).'%');
            })
            ->orderBy('sort_order')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($brands);
    }

    public function restore(Brand $brand): JsonResponse
    {
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->value('cat_id');
        abort_unless((int) $brand->parent_id === (int) $phoneCategoryId && (int) $brand->trash === 1, 404);
        $brand->update(['trash' => 0]);

        return response()->json(['data' => $this->brandPayload($brand->fresh()), 'message' => 'Thương hiệu đã được khôi phục.']);
    }

    public function forceDestroy(Brand $brand): JsonResponse
    {
        abort_unless((int) $brand->trash === 1, 404);

        if (Product::query()
            ->where('cat_id', $brand->cat_id)
            ->orWhere('brand_id', $brand->cat_id)
            ->exists()) {
            return response()->json([
                'message' => 'Không thể xóa thương hiệu đang được sản phẩm sử dụng.',
            ], 409);
        }

        $brand->delete();

        return response()->json(['message' => 'Thương hiệu đã được xóa vĩnh viễn.']);
    }

    protected function validateBrand(Request $request, ?Brand $brand = null): array
    {
        $phoneCategoryId = Category::query()
            ->where('alias', 'dien-thoai-di-dong')
            ->value('cat_id');

        if ($phoneCategoryId === null) {
            throw ValidationException::withMessages([
                'parent_id' => ['Danh mục điện thoại chưa được tạo.'],
            ]);
        }

        $validated = $request->validate([
            'cat_name' => ['required', 'string', 'max:255'],
            'alias' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', Rule::in([(int) $phoneCategoryId])],
            'status' => ['nullable', 'integer', 'in:0,1'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['cat_name'] = trim($validated['cat_name']);
        $this->ensureUniqueName(Brand::class, 'cat_name', $validated['cat_name'], 'cat_name', $brand?->cat_id);
        $validated['alias'] = $this->generateUniqueAlias(
            $validated['alias'] ?? $validated['cat_name'],
            $brand?->cat_id
        );
        $validated['parent_id'] = (int) ($validated['parent_id'] ?? $brand?->parent_id ?? $phoneCategoryId);
        $validated['status'] = (int) ($validated['status'] ?? $brand?->status ?? 1);
        $validated['sort_order'] = (int) ($validated['sort_order'] ?? $brand?->sort_order ?? 0);

        return $validated;
    }

    protected function brandPayload(Brand $brand): array
    {
        return [
            'cat_id' => $brand->cat_id,
            'parent_id' => $brand->parent_id,
            'cat_name' => $brand->cat_name,
            'alias' => $brand->alias,
            'status' => $brand->status,
            'sort_order' => $brand->sort_order,
            'id' => $brand->cat_id,
            'name' => $brand->cat_name,
            'slug' => $brand->alias,
            'category_id' => $brand->parent_id,
        ];
    }

    protected function generateUniqueAlias(string $source, ?int $ignoreId = null): string
    {
        $base = trim((string) $source);
        $slug = Str::slug($base) ?: 'brand';
        $alias = $slug;
        $counter = 1;

        while (Brand::query()
            ->where('alias', $alias)
            ->when($ignoreId !== null, fn ($query) => $query->where('cat_id', '!=', $ignoreId))
            ->exists()) {
            $alias = $slug.'-'.$counter;
            $counter++;
        }

        return $alias;
    }
}
