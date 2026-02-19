<?php

namespace App\Service;

use App\Entity\Escrow;
use App\Entity\PlatformRevenueLedger;
use App\Entity\VendorWalletLedger;
use Doctrine\ORM\EntityManagerInterface;

class PlatformFeeService
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function applyPlatformFee(Escrow $escrow, float $feeRate = 0.10): void
    {
        $gross = (float)$escrow->getAmount();
        $feeAmount = round($gross * $feeRate, 2);
        $vendorNet = $gross - $feeAmount;

        // Credit Vendor Wallet
        $vendorLedger = new VendorWalletLedger();
        $vendorLedger->setVendor($escrow->getVendor());
        $vendorLedger->setAmount($vendorNet);
        $vendorLedger->setType('CREDIT');
        $vendorLedger->setReference('ESCROW_RELEASE_' . $escrow->getId());

        // Credit Platform Revenue
        $platformLedger = new PlatformRevenueLedger();
        $platformLedger->setAmount($feeAmount);
        $platformLedger->setType('FEE');
        $platformLedger->setReference('ESCROW_RELEASE_' . $escrow->getId());

        $this->em->persist($vendorLedger);
        $this->em->persist($platformLedger);

        $this->em->flush();
    }
}

