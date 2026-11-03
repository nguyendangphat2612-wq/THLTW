<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Brand extends Model
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 1)->where('trash', 0)->where('parent_id', '>', 0);
    }

    public function getNameAttribute(): string
    {
        return $this->cat_name;
    }

    public function getSlugAttribute(): string
    {
        return $this->alias;
    }
}