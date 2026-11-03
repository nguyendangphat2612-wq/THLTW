<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $categories = Category::where('status', 1)
            ->where('trash', 0)
            ->where('parent_id', 0)
            ->with([
                'children' => function ($query) {
                    $query->where('status', 1)
                        ->where('trash', 0)
                        ->orderBy('sort_order');
                },
            ])
            ->orderBy('sort_order')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return CategoryResource::collection($categories);
    }

    public function show(Category $category): CategoryResource
    {
        abort_unless($category->status === 1 && $category->trash === 0, 404);

        $category->load([
            'children' => fn ($query) => $query->where('status', 1)->where('trash', 0)->orderBy('sort_order'),
        ]);

        return new CategoryResource($category);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateCategory($request);

        $category = Category::create($data);

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validateCategory($request, $category);

        $category->update($data);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroy(Category $category): JsonResponse
    {
        abort_unless((int) $category->parent_id === 0, 404);

        $category->update(['trash' => 1]);

        return response()->json(['message' => 'Danh mục đã được xóa.']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $categories = Category::query()
            ->where('parent_id', 0)
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('cat_name', 'like', '%'.trim($filters['search']).'%');
            })
            ->orderBy('sort_order')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($categories);
    }

    public function restore(Category $category): JsonResponse
    {
        abort_unless((int) $category->parent_id === 0 && (int) $category->trash === 1, 404);
        $category->update(['trash' => 0]);

        return response()->json(['data' => $category->fresh(), 'message' => 'Danh mục đã được khôi phục.']);
    }

    public function forceDestroy(Category $category): JsonResponse
    {
        abort_unless((int) $category->parent_id === 0 && (int) $category->trash === 1, 404);

        if ($category->children()->exists() || Product::query()
            ->where('cat_id', $category->cat_id)
            ->orWhere('brand_id', $category->cat_id)
            ->exists()) {
            return response()->json([
                'message' => 'Không thể xóa danh mục đang có danh mục con hoặc sản phẩm tham chiếu.',
            ], 409);
        }

        $category->delete();

        return response()->json(['message' => 'Danh mục đã được xóa vĩnh viễn.']);
    }

    protected function validateCategory(Request $request, ?Category $category = null): array
    {
        $validated = $request->validate([
            'cat_name' => ['required', 'string', 'max:255'],
            'alias' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'integer', 'in:0,1'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['cat_name'] = trim($validated['cat_name']);
        $this->ensureUniqueName(Category::class, 'cat_name', $validated['cat_name'], 'cat_name', $category?->cat_id);
        $validated['alias'] = $this->generateUniqueAlias(
            $validated['alias'] ?? $validated['cat_name'],
            $category?->cat_id
        );
        $validated['parent_id'] = (int) ($validated['parent_id'] ?? $category?->parent_id ?? 0);
        if ($validated['parent_id'] > 0) {
            $parent = Category::query()->find($validated['parent_id']);

            if (! $parent || $parent->parent_id !== 0 || $parent->cat_id === $category?->cat_id) {
                throw ValidationException::withMessages([
                    'parent_id' => ['Danh mục cha phải là danh mục gốc hợp lệ.'],
                ]);
            }
        }
        $validated['status'] = (int) ($validated['status'] ?? $category?->status ?? 1);
        $validated['sort_order'] = (int) ($validated['sort_order'] ?? $category?->sort_order ?? 0);

        return $validated;
    }

    protected function generateUniqueAlias(string $source, ?int $ignoreId = null): string
    {
        $base = trim((string) $source);
        $slug = Str::slug($base) ?: 'category';
        $alias = $slug;
        $counter = 1;

        while (Category::query()
            ->where('alias', $alias)
            ->when($ignoreId !== null, fn ($query) => $query->where('cat_id', '!=', $ignoreId))
            ->exists()) {
            $alias = $slug.'-'.$counter;
            $counter++;
        }

        return $alias;
    }
}
