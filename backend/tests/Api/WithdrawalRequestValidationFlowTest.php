<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Service\VendorWalletService;
use Symfony\Component\HttpFoundation\Response;

final class WithdrawalRequestValidationFlowTest extends ApiTestCase
{
    public function testWithdrawalRequestNormalizesMobileMoneyInputsAndRejectsUnsupportedValues(): void
    {
        $suffix = $this->uniqueSuffix();
        $password = 'Password123!';

        $vendorRegistration = $this->registerUser("vendor_withdrawal_{$suffix}@test.com", $password, 'vendor');
        $this->verifyUser($vendorRegistration['verification_url']);
        $this->seedVendorProfile((int) $vendorRegistration['user']['id'], 'Withdrawal Validation Vendor');

        $vendorLogin = $this->loginUser($vendorRegistration['user']['email'], $password);
        $vendorUser = $this->reloadUserByEmail($vendorRegistration['user']['email']);

        /** @var VendorWalletService $walletService */
        $walletService = static::getContainer()->get(VendorWalletService::class);
        $walletService->manualCreditVendor(
            $vendorUser,
            200000,
            'TZS',
            'withdrawal_validation_funding_' . $suffix,
            'withdrawal_validation_funding_' . $suffix,
            ['movement' => 'TEST_FUNDING']
        );

        $response = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 50000,
            'currency' => 'TZS',
            'msisdn' => '0712345678',
            'provider' => 'm-pesa',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        self::assertSame('255712345678', $response['withdrawal']['destination_msisdn'] ?? null);
        self::assertSame('MPESA', $response['withdrawal']['provider'] ?? null);

        $badProvider = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 50000,
            'currency' => 'TZS',
            'msisdn' => '0712345678',
            'provider' => 'UNKNOWNPAY',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertSame('Unsupported mobile money provider', $badProvider['error'] ?? null);

        $badMsisdn = $this->requestJson('POST', '/api/withdrawals', [
            'amount_minor' => 50000,
            'currency' => 'TZS',
            'msisdn' => '12345',
            'provider' => 'MPESA',
        ], $vendorLogin['token']);
        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('valid Tanzania mobile number', (string) ($badMsisdn['error'] ?? ''));
    }
}
