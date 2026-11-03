<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function syncOrderItems(
        Order $order,
        array $newItems,
        ?int $userId = null,
        ?array $previousItems = null
    ): void
    {
        $previousQuantities = collect($previousItems ?? $order->items ?? [])->keyBy('product_id');
        $newQuantities = collect($newItems)->keyBy('product_id');
        $productIds = $previousQuantities->keys()->merge($newQuantities->keys())->unique()->sort();

        foreach ($productIds as $productId) {
            $difference = (int) ($newQuantities->get($productId)['quantity'] ?? 0)
                - (int) ($previousQuantities->get($productId)['quantity'] ?? 0);
            if ($difference === 0) {
                continue;
            }

            $product = Product::query()->lockForUpdate()->find($productId);
            if (! $product || ! $product->track_inventory) {
                continue;
            }

            $quantity = abs($difference);
            $direction = $difference > 0 ? 'out' : 'in';
            $currentQuantity = (int) $product->stock_quantity;
            if ($direction === 'out' && $quantity > $currentQuantity) {
                throw ValidationException::withMessages([
                    'items' => ["Không đủ tồn kho cho sản phẩm {$product->product_name}."],
                ]);
            }

            $balance = $direction === 'out'
                ? $currentQuantity - $quantity
                : $currentQuantity + $quantity;
            $product->update(['stock_quantity' => $balance]);
            InventoryMovement::create([
                'product_id' => $product->product_id,
                'product_name' => $product->product_name,
                'user_id' => $userId,
                'order_id' => $order->id,
                'direction' => $direction,
                'quantity' => $quantity,
                'balance_after' => $balance,
                'note' => $direction === 'out'
                    ? 'Xuất kho cho đơn #'.$order->id
                    : 'Hoàn kho khi cập nhật đơn #'.$order->id,
            ]);
        }
    }

    public function restoreOrder(Order $order, ?int $userId = null): void
    {
        $this->syncOrderItems($order, [], $userId);
    }
}
