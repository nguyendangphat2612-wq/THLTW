<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $table = 'products';

    protected $primaryKey = 'product_id';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $fillable = [
        'product_name',
        'alias',
        'cat_id',
        'brand_id',
        'detail',
        'price',
        'sale_price',
        'image',
        'summary',
        'tag',
        'view',
        'status',
        'trash',
        'launch_date',
        'stock_quantity',
        'track_inventory',
    ];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'integer',
            'track_inventory' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'cat_id', 'cat_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id', 'cat_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class, 'product_id', 'product_id');
    }
}
