<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\WithdrawalRequest;
use App\Service\VendorWalletService;
use Symfony\Component\HttpFoundation\Response;

final class WithdrawalLedgerFlowTest extends ApiTestCase
{
    public function testWithdrawalApprovalAndPayoutWebhookProduceAuditableLedgerFlow(): void
    {
        $ctx = $this->bootstrapApprovedWithdrawal();
        $walletService = $ctx['walletService'];
        $vendorUser = $ctx['vendorUser'];
        $withdrawalId = $ctx['withdrawalId'];
        $withdrawalReference = $ctx['withdrawalReference'];
        $suffix = $ctx['suffix'];

        self::assertSame(48750, $walletService->getVendorBalance($vendorUser, 'TZS'));
        self::assertSame(
            '4',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $withdrawalReference]
            )
        );

        $timestamp = (string) time();
        $payoutBody = $this->jsonEncode([
            'id' => 'evt_withdraw_' . $suffix,
            'type' => 'payout.completed',
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'data' => [
                'reference' => 'payout_' . $withdrawalReference,
                'status' => 'success',
                'external_reference' => 'txn_withdraw_' . $suffix,
                'metadata' => [
                    'order_id' => $withdrawalReference,
                ],
            ],
        ]);

        $signature = hash_hmac('sha256', $payoutBody, $this->webhookSecret());

        $webhookResponse = $this->requestRawWebhook(
            '/api/payments/webhooks/payout',
            $payoutBody,
            $signature,
            $timestamp,
            'payout.completed'
        );
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Webhook processed', $webhookResponse['message'] ?? null);

        /** @var array<string,mixed>|false $paidWithdrawal */
        $paidWithdrawal = $this->db->fetchAssociative(
            'SELECT status, external_transaction_id FROM withdrawal_request WHERE id = :id LIMIT 1',
            ['id' => $withdrawalId]
        );

        self::assertIsArray($paidWithdrawal);
        self::assertSame(WithdrawalRequest::STATUS_PAID, $paidWithdrawal['status']);
        self::assertSame('txn_withdraw_' . $suffix, $paidWithdrawal['external_transaction_id']);
        self::assertSame(48750, $walletService->getVendorBalance($vendorUser, 'TZS'));

        self::assertSame(
            '6',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $withdrawalReference]
            )
        );
    }

    public function testFailedPayoutWebhookRecreditsVendorAndReversesFee(): void
    {
        $ctx = $this->bootstrapApprovedWithdrawal();
        $walletService = $ctx['walletService'];
        $vendorUser = $ctx['vendorUser'];
        $withdrawalId = $ctx['withdrawalId'];
        $withdrawalReference = $ctx['withdrawalReference'];
        $suffix = $ctx['suffix'];
        $vendorId = $ctx['vendorId'];

        $timestamp = (string) time();
        $payoutBody = $this->jsonEncode([
            'id' => 'evt_withdraw_fail_' . $suffix,
            'type' => 'payout.failed',
            'created_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'data' => [
                'reference' => 'payout_' . $withdrawalReference,
                'status' => 'failed',
                'external_reference' => 'txn_withdraw_fail_' . $suffix,
                'reason' => 'insufficient float',
                'metadata' => [
                    'order_id' => $withdrawalReference,
                ],
            ],
        ]);

        $signature = hash_hmac('sha256', $payoutBody, $this->webhookSecret());

        $webhookResponse = $this->requestRawWebhook(
            '/api/payments/webhooks/payout',
            $payoutBody,
            $signature,
            $timestamp,
            'payout.failed'
        );
        self::assertResponseStatusCodeSame(Response::HTTP_ACCEPTED);
        self::assertSame('Webhook processed', $webhookResponse['message'] ?? null);

        /** @var array<string,mixed>|false $failedWithdrawal */
        $failedWithdrawal = $this->db->fetchAssociative(
            'SELECT status, failure_reason, external_transaction_id FROM withdrawal_request WHERE id = :id LIMIT 1',
            ['id' => $withdrawalId]
        );

        self::assertIsArray($failedWithdrawal);
        self::assertSame(WithdrawalRequest::STATUS_FAILED, $failedWithdrawal['status']);
        self::assertStringContainsString('insufficient float', (string) $failedWithdrawal['failure_reason']);
        self::assertNull($failedWithdrawal['external_transaction_id']);
        self::assertSame(100000, $walletService->getVendorBalance($vendorUser, 'TZS'));

        self::assertSame(
            '8',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM wallet_ledger_entry WHERE reference = :reference',
                ['reference' => $withdrawalReference]
            )
        );
        self::assertSame(
            '1',
            (string) $this->db->fetchOne(
                'SELECT COUNT(*) FROM fraud_signal WHERE user_id = :user_id AND signal_type = :signal_type',
                [
                    'user_id' => $vendorId,
                    'signal_type' => 'RAPID_WITHDRAWAL_ATTEMPT',
                ]
            )
        );
    }

    /**
     * @return array{
     *   walletService: VendorWalletService,
     *   vendorUser: \App\Entity\User,
     *   withdrawalId: int,
     *   withdrawalReference: string,
     *   suffix: string,
     *   vendorId: int
     * }
     */
    private function bootstrapApprovedWithdrawal(): array
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $vendorRegistration = $this->registerUser("vendor_withdraw_{$suffix}@test.com", $password, 'vendor');
        $adminRegistration = $this->registerUser("admin_withdraw_{$suffix}@test.com", $password, 'client');

        $this->verifyUser($vendorRegistration['verification_url']);
        $this->verifyUser($adminRegistration['verification_url']);

        $this->promoteUserToAdmin($adminRegistration['user']['email']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Withdrawal Smoke Vendor');

        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $adminLogin = $this->loginUser($adminRegistration['user']['email'], $password);

        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);
        $walletService->manualCreditVendor(
            $vendorUser,
            100000,
            'TZS',
            'test_wallet_funding_' . $suffix,
            'test_wallet_funding_' . $suffix,
            ['movement' => 'TEST_FUNDING']
        );

        self::assertSame(100000, $walletService->getVendorBalance($vendorUser, 'TZS'));

        $withdrawalCreate = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 50000,
            'currency' => 'TZS',
            'msisdn' => '255700000111',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $withdrawalId = (int) $withdrawalCreate['id'];
        $withdrawalReference = (string) $withdrawalCreate['reference'];

        $this->requestJson('POST', "/api/withdrawals/{$withdrawalId}/approve", [
            'callback_url' => '/api/payments/webhooks/payout',
        ], $adminLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        /** @var WithdrawalRequest|null $processingWithdrawal */
        $processingWithdrawal = $this->db->fetchAssociative(
            'SELECT status, payout_reference, fee_minor FROM withdrawal_request WHERE id = :id LIMIT 1',
            ['id' => $withdrawalId]
        );

        self::assertIsArray($processingWithdrawal);
        self::assertSame(WithdrawalRequest::STATUS_PROCESSING, $processingWithdrawal['status']);
        self::assertSame('payout_' . $withdrawalReference, $processingWithdrawal['payout_reference']);
        self::assertSame('1250', (string) $processingWithdrawal['fee_minor']);

        return [
            'walletService' => $walletService,
            'vendorUser' => $vendorUser,
            'withdrawalId' => $withdrawalId,
            'withdrawalReference' => $withdrawalReference,
            'suffix' => $suffix,
            'vendorId' => (int) $vendorRegistration['user']['id'],
        ];
    }

    private function webhookSecret(): string
    {
        $secret = $_SERVER['SNIPPE_WEBHOOK_SECRET'] ?? $_ENV['SNIPPE_WEBHOOK_SECRET'] ?? getenv('SNIPPE_WEBHOOK_SECRET') ?: '';

        self::assertNotSame('', $secret, 'SNIPPE_WEBHOOK_SECRET must be available in the test environment.');

        return (string) $secret;
    }
}
