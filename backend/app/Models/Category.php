<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'categories';

    protected $primaryKey = 'cat_id';

    protected $fillable = [
        'parent_id',
        'cat_name',
        'alias',
        'status',
        'trash',
        'sort_order',
    ];

    public $incrementing = true;

    protected $keyType = 'int';

    public function getRouteKeyName()
    {
        return 'cat_id';
    }

    protected function casts(): array
    {
        return [
            'cat_id' => 'integer',
            'parent_id' => 'integer',
            'status' => 'integer',
            'trash' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id', 'cat_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id', 'cat_id');
    }
}
