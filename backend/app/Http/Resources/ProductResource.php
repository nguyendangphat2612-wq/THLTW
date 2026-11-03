<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->product_id,
            'name' => $this->product_name,
            'alias' => $this->alias,
            'cat_id' => $this->cat_id,
            'brand_id' => $this->brand_id,
            'detail' => $this->detail,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'image' => $this->image,
            'summary' => $this->summary,
            'tag' => $this->tag,
            'view' => $this->view,
            'status' => $this->status,
            'launch_date' => $this->launch_date,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category?->cat_id,
                'name' => $this->category?->cat_name,
                'slug' => $this->category?->alias,
            ]),
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand?->cat_id,
                'name' => $this->brand?->cat_name,
                'slug' => $this->brand?->alias,
            ]),
        ];
    }
}
