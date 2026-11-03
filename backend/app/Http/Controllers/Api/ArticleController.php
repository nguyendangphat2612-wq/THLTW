<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Article::query()
                ->where('status', 1)
                ->where('trash', 0)
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $article = Article::query()
            ->where('slug', $slug)
            ->where('status', 1)
            ->where('trash', 0)
            ->firstOrFail();

        return response()->json(['data' => $article]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $articles = Article::query()
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $query->where('title', 'like', '%'.trim($filters['search']).'%');
            })
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($articles);
    }

    public function store(Request $request): JsonResponse
    {
        $article = Article::create($this->validateArticle($request));

        return response()->json(['data' => $article], 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $article->update($this->validateArticle($request, $article));

        return response()->json(['data' => $article->fresh()]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $article->update(['trash' => 1]);

        return response()->json(['message' => 'Bài viết đã được chuyển vào thùng rác.']);
    }

    public function restore(Article $article): JsonResponse
    {
        abort_unless((int) $article->trash === 1, 404);
        $article->update(['trash' => 0]);

        return response()->json(['data' => $article->fresh(), 'message' => 'Bài viết đã được khôi phục.']);
    }

    public function forceDestroy(Article $article): JsonResponse
    {
        abort_unless((int) $article->trash === 1, 404);
        $article->delete();

        return response()->json(['message' => 'Bài viết đã được xóa vĩnh viễn.']);
    }

    private function validateArticle(Request $request, ?Article $article = null): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'content' => ['required', 'string', 'max:50000'],
            'published_at' => ['nullable', 'date'],
            'status' => ['sometimes', 'integer', 'in:0,1'],
        ]);

        $validated['title'] = trim($validated['title']);
        $this->ensureUniqueName(Article::class, 'title', $validated['title'], 'title', $article?->id);
        $validated['slug'] = $this->generateUniqueSlug($validated['title'], $article?->id);
        $validated['excerpt'] = isset($validated['excerpt']) ? trim($validated['excerpt']) : null;
        $validated['published_at'] = array_key_exists('published_at', $validated)
            ? $validated['published_at']
            : $article?->published_at?->format('Y-m-d');
        $validated['status'] = (int) ($validated['status'] ?? $article?->status ?? 1);

        return $validated;
    }

    private function generateUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = substr(Str::slug($title) ?: 'article', 0, 230);
        $slug = $base;
        $counter = 1;

        while (Article::query()
            ->where('slug', $slug)
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $base.'-'.$counter++;
        }

        return $slug;
    }
}
