<?php

namespace App\DTO;

class DisputeAIResult
{
    public function __construct(
        public string $recommendation,
        public float $confidence,
        public array $signals,
        public string $explanation
    ) {}
}
