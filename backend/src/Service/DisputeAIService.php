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
     *
     * @return array<string, float>
     */
    private function collectSignals(Dispute $dispute): array
    {
        $booking = $dispute->getBooking();
        $client = $booking->getClient();
        $vendor = $booking->getService()->getVendor()->getUser();
        $reason = mb_strtolower(trim($dispute->getReason()));

        return [
            'vendor_trust'        => $this->normalizePercent($vendor->getTrustScore()),
            'client_trust'        => $this->normalizePercent($client->getTrustScore()),
            'delivery_compliance' => $this->deliveryComplianceSignal($booking->getStatus()),
            'evidence_strength'   => $this->evidenceStrengthSignal($reason),
            'message_sentiment'   => $this->sentimentSignal($reason),
        ];
    }

    /**
     * Weighted scoring model
     *
     * @param array<string, float> $signals
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
     *
     * @return array{0: string, 1: float}
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
    private function normalizePercent(?float $value): float
    {
        if ($value === null) {
            return 0.5; // neutral fallback
        }

        return max(0.0, min(1.0, round($value / 100, 4)));
    }

    private function deliveryComplianceSignal(?string $bookingStatus): float
    {
        return match ($bookingStatus) {
            'completed' => 1.0,
            'confirmed' => 0.75,
            'pending' => 0.45,
            'cancelled' => 0.1,
            default => 0.5,
        };
    }

    private function evidenceStrengthSignal(string $reason): float
    {
        $length = mb_strlen($reason);

        return match (true) {
            $length >= 240 => 0.95,
            $length >= 120 => 0.8,
            $length >= 60 => 0.65,
            $length >= 20 => 0.5,
            $length > 0 => 0.35,
            default => 0.2,
        };
    }

    private function sentimentSignal(string $reason): float
    {
        if ($reason === '') {
            return 0.5;
        }

        foreach (['scam', 'fraud', 'fake', 'stolen', 'abuse', 'threat'] as $negativeKeyword) {
            if (str_contains($reason, $negativeKeyword)) {
                return 0.2;
            }
        }

        foreach (['resolved', 'thanks', 'complete', 'delivered', 'fixed'] as $positiveKeyword) {
            if (str_contains($reason, $positiveKeyword)) {
                return 0.8;
            }
        }

        return 0.5;
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
     *
     * @param array<string, float> $signals
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
     *
     * @param array<string, float> $signals
     */
    private function dominantSignal(array $signals): string
    {
        arsort($signals);
        return (string) array_key_first($signals);
    }
}
