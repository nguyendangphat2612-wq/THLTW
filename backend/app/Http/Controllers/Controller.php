<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

abstract class Controller
{
    /**
     * @param class-string<Model> $modelClass
     */
    protected function ensureUniqueName(
        string $modelClass,
        string $column,
        string $name,
        string $attribute,
        ?int $ignoreId = null
    ): void {
        $model = new $modelClass;
        $keyName = $model->getKeyName();
        $normalizedName = mb_strtolower(trim($name));
        $records = $modelClass::query()
            ->select([$keyName, $column])
            ->when($ignoreId !== null, fn ($query) => $query->where($keyName, '!=', $ignoreId))
            ->cursor();

        foreach ($records as $record) {
            if (mb_strtolower(trim((string) $record->{$column})) === $normalizedName) {
                throw ValidationException::withMessages([
                    $attribute => ['Tên đã tồn tại. Vui lòng chọn tên khác.'],
                ]);
            }
        }
    }
}
