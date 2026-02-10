<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Dispute;
use App\DTO\DisputeAIResult;

class DisputeAIService
{
    /**
     * Main AI entry point
     */
    public function analyze(Dispute $dispute): DisputeAIResult
    {
        $signals = $this->collectSignals($dispute);
        $score = $this->calculateScore($signals);

        [$recommendation, $confidence] = $this->resolveDecision($score);

        return new DisputeAIResult(
            recommendation: $recommendation,
            confidence: $confidence,
            signals: $signals,
            explanation: $this->explain($signals, $recommendation)
        );
    }

    /**
     * Collect structured dispute signals
     */
    private function collectSignals(Dispute $dispute): array
    {
        return [
            'vendor_trust'        => $this->normalize($dispute->getVendorTrustScore()),
            'client_trust'        => $this->normalize($dispute->getClientTrustScore()),
            'delivery_compliance' => $this->normalize($dispute->getDeliveryComplianceScore()),
            'evidence_strength'   => $this->normalize($dispute->getEvidenceScore()),
            'message_sentiment'   => $this->normalize($dispute->getSentimentScore()),
        ];
    }

    /**
     * Weighted scoring model
     */
    private function calculateScore(array $signals): float
    {
        return round(
            ($signals['vendor_trust'] * 0.30) +
            ($signals['delivery_compliance'] * 0.25) +
            ($signals['client_trust'] * 0.20) +
            ($signals['evidence_strength'] * 0.15) +
            ($signals['message_sentiment'] * 0.10),
            4
        );
    }

    /**
     * Convert score → decision
     */
    private function resolveDecision(float $score): array
    {
        // Score range assumed 0.0 – 1.0

        if ($score >= 0.65) {
            return ['release', $this->confidenceFromScore($score)];
        }

        if ($score <= 0.40) {
            return ['refund', $this->confidenceFromScore($score)];
        }

        return ['manual_review', 0.50];
    }

    /**
     * Normalize score to 0–1 range
     */
    private function normalize(?float $value): float
    {
        if ($value === null) {
            return 0.5; // neutral fallback
        }

        if ($value < 0) {
            return 0.0;
        }

        if ($value > 1) {
            return 1.0;
        }

        return $value;
    }

    /**
     * Confidence scaling logic
     */
    private function confidenceFromScore(float $score): float
    {
        // Higher distance from neutral (0.5) = stronger confidence
        $distance = abs($score - 0.5) * 2; // scale 0–1
        return round(min($distance, 1.0), 4);
    }

    /**
     * Generate structured explanation
     */
    private function explain(array $signals, string $recommendation): string
    {
        $dominantSignal = $this->dominantSignal($signals);

        return match ($recommendation) {
            'release' =>
                "AI recommends RELEASE due to strong vendor compliance and positive signals. Dominant factor: {$dominantSignal}.",

            'refund' =>
                "AI recommends REFUND due to weak delivery compliance or strong client-side signals. Dominant factor: {$dominantSignal}.",

            default =>
                "AI suggests MANUAL REVIEW because signals are balanced. Dominant factor: {$dominantSignal}.",
        };
    }

    /**
     * Determine strongest contributing signal
     */
    private function dominantSignal(array $signals): string
    {
        arsort($signals);
        return array_key_first($signals);
    }
}
