<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->cat_id,
            'name' => $this->cat_name,
            'slug' => $this->alias,
            'parent_id' => $this->parent_id,
            'status' => $this->status,
            'sort_order' => $this->sort_order,

            'children' => CategoryResource::collection(
                $this->whenLoaded('children')
            ),
        ];
    }
}
