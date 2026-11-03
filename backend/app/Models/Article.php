<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'published_at',
        'status',
        'trash',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'date:Y-m-d',
            'status' => 'integer',
            'trash' => 'integer',
        ];
    }
}
