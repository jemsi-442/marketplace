<?php

namespace App\DTO;

class DisputeAIResult
{
    /**
     * @param array<string, float> $signals
     */
    public function __construct(
        public string $recommendation,
        public float $confidence,
        public array $signals,
        public string $explanation
    ) {}
}
