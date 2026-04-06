<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Escrow;

class EscrowDisputeRecommendationService
{
    /**
     * Internal advisory only.
     * This service must never be treated as a final dispute decision engine.
     *
     * @return array{
     *   recommendation: string,
     *   confidence: float,
     *   explanation: string,
     *   dispute_reason: string,
     *   source: string,
     *   signals: array<string, float>,
     *   advisory_only: bool,
     *   decision_owner: string
     * }
     */
    public function analyze(Escrow $escrow): array
    {
        $signals = $this->collectSignals($escrow);
        $score = $this->calculateScore($signals);

        [$recommendation, $confidence] = $this->resolveDecision($score, $signals['amount_pressure']);

        return [
            'recommendation' => $recommendation,
            'confidence' => $confidence,
            'explanation' => $this->explain($signals, $recommendation),
            'dispute_reason' => $this->extractDisputeReason($escrow),
            'source' => $this->extractSource($escrow),
            'signals' => $signals,
            'advisory_only' => true,
            'decision_owner' => 'admin',
        ];
    }

    /**
     * @return array<string, float>
     */
    private function collectSignals(Escrow $escrow): array
    {
        $booking = $escrow->getBooking();
        $reason = mb_strtolower(trim($this->extractDisputeReason($escrow)));

        return [
            'vendor_trust' => $this->normalizePercent($escrow->getVendor()->getTrustScore()),
            'client_trust' => $this->normalizePercent($escrow->getClient()->getTrustScore()),
            'delivery_compliance' => $this->deliveryComplianceSignal($booking?->getStatus()),
            'evidence_strength' => $this->evidenceStrengthSignal($reason),
            'message_sentiment' => $this->sentimentSignal($reason),
            'amount_pressure' => $this->amountPressureSignal($escrow->getAmountMinor()),
        ];
    }

    /**
     * @param array<string, float> $signals
     */
    private function calculateScore(array $signals): float
    {
        return round(
            ($signals['vendor_trust'] * 0.28) +
            ($signals['delivery_compliance'] * 0.24) +
            ($signals['client_trust'] * 0.18) +
            ($signals['evidence_strength'] * 0.18) +
            ($signals['message_sentiment'] * 0.08) +
            ((1.0 - $signals['amount_pressure']) * 0.04),
            4
        );
    }

    /**
     * @return array{0: string, 1: float}
     */
    private function resolveDecision(float $score, float $amountPressure): array
    {
        if ($amountPressure >= 0.8 && abs($score - 0.5) < 0.18) {
            return ['manual_review', 0.56];
        }

        if ($score >= 0.68) {
            return ['release', $this->confidenceFromScore($score)];
        }

        if ($score <= 0.38) {
            return ['refund', $this->confidenceFromScore($score)];
        }

        return ['manual_review', 0.5];
    }

    private function normalizePercent(?float $value): float
    {
        if ($value === null) {
            return 0.5;
        }

        return max(0.0, min(1.0, round($value / 100, 4)));
    }

    private function deliveryComplianceSignal(?string $bookingStatus): float
    {
        return match ($bookingStatus) {
            Booking::STATUS_COMPLETED => 1.0,
            Booking::STATUS_CONFIRMED => 0.75,
            Booking::STATUS_PENDING => 0.45,
            Booking::STATUS_CANCELLED => 0.1,
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

        foreach (['scam', 'fraud', 'fake', 'stolen', 'abuse', 'threat', 'missing', 'undelivered'] as $negativeKeyword) {
            if (str_contains($reason, $negativeKeyword)) {
                return 0.2;
            }
        }

        foreach (['resolved', 'thanks', 'complete', 'delivered', 'fixed', 'finished'] as $positiveKeyword) {
            if (str_contains($reason, $positiveKeyword)) {
                return 0.8;
            }
        }

        return 0.5;
    }

    private function amountPressureSignal(int $amountMinor): float
    {
        return match (true) {
            $amountMinor >= 500000 => 1.0,
            $amountMinor >= 250000 => 0.8,
            $amountMinor >= 100000 => 0.65,
            $amountMinor >= 50000 => 0.45,
            default => 0.25,
        };
    }

    private function confidenceFromScore(float $score): float
    {
        $distance = abs($score - 0.5) * 2;

        return round(min($distance, 1.0), 4);
    }

    /**
     * @param array<string, float> $signals
     */
    private function explain(array $signals, string $recommendation): string
    {
        $dominantSignal = $this->dominantSignal($signals);

        return match ($recommendation) {
            'release' => sprintf(
                'AI leans toward releasing payment because provider-side trust and delivery signals are currently stronger. Dominant factor: %s.',
                $dominantSignal
            ),
            'refund' => sprintf(
                'AI leans toward returning funds because buyer-side protection signals are stronger than delivery confidence. Dominant factor: %s.',
                $dominantSignal
            ),
            default => sprintf(
                'AI prefers manual review because the case is still balanced or high-pressure. Dominant factor: %s.',
                $dominantSignal
            ),
        };
    }

    /**
     * @param array<string, float> $signals
     */
    private function dominantSignal(array $signals): string
    {
        arsort($signals);

        return str_replace('_', ' ', (string) array_key_first($signals));
    }

    private function extractDisputeReason(Escrow $escrow): string
    {
        $snapshot = $escrow->getExternalStatusSnapshot();

        return is_array($snapshot) && isset($snapshot['reason']) && is_string($snapshot['reason'])
            ? $snapshot['reason']
            : 'Client dispute opened without a detailed reason.';
    }

    private function extractSource(Escrow $escrow): string
    {
        $snapshot = $escrow->getExternalStatusSnapshot();

        return is_array($snapshot) && isset($snapshot['source']) && is_string($snapshot['source'])
            ? $snapshot['source']
            : 'UNKNOWN';
    }
}
