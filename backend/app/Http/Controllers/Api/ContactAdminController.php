<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactAdminController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $contact = ContactMessage::create($request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]));

        return response()->json(['data' => $contact], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'trash' => ['sometimes', 'integer', 'in:0,1'],
            'search' => ['sometimes', 'string', 'max:255'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $contacts = ContactMessage::query()
            ->where('trash', (int) ($filters['trash'] ?? 0))
            ->when(isset($filters['search']) && trim($filters['search']) !== '', function ($query) use ($filters) {
                $search = trim($filters['search']);
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 15), 1), 100));

        return response()->json($contacts);
    }

    public function update(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $contactMessage->update($request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]));

        return response()->json(['data' => $contactMessage->fresh()]);
    }

    public function destroy(ContactMessage $contactMessage): JsonResponse
    {
        $contactMessage->update(['trash' => 1]);

        return response()->json(['message' => 'Liên hệ đã được chuyển vào thùng rác.']);
    }

    public function restore(ContactMessage $contactMessage): JsonResponse
    {
        abort_unless((int) $contactMessage->trash === 1, 404);
        $contactMessage->update(['trash' => 0]);

        return response()->json(['data' => $contactMessage->fresh(), 'message' => 'Liên hệ đã được khôi phục.']);
    }

    public function forceDestroy(ContactMessage $contactMessage): JsonResponse
    {
        abort_unless((int) $contactMessage->trash === 1, 404);
        $contactMessage->delete();

        return response()->json(['message' => 'Liên hệ đã được xóa vĩnh viễn.']);
    }
}
