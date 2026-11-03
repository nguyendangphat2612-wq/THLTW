<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = [
        'name',
        'email',
        'subject',
        'message',
        'trash',
    ];

    protected function casts(): array
    {
        return ['trash' => 'integer'];
    }
}
