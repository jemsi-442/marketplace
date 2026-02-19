<?php

namespace App\Service;

use App\Entity\Wallet;
use App\Entity\WalletLedgerEntry;
use App\Repository\WalletLedgerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class WalletService
{
    public function __construct(
        private EntityManagerInterface $em,
        private WalletLedgerRepository $ledgerRepo
    ) {}

    public function credit(
        Wallet $wallet,
        int $amountMinor,
        string $referenceType,
        ?int $referenceId = null
    ): void {
        $this->em->wrapInTransaction(function() use ($wallet, $amountMinor, $referenceType, $referenceId) {

            $entry = new WalletLedgerEntry(
                $wallet,
                $amountMinor,
                'CREDIT',
                $referenceType,
                $referenceId
            );

            $this->em->persist($entry);
            $this->em->flush();
        });
    }

    public function debit(
        Wallet $wallet,
        int $amountMinor,
        string $referenceType,
        ?int $referenceId = null
    ): void {
        $this->em->wrapInTransaction(function() use ($wallet, $amountMinor, $referenceType, $referenceId) {

            $balance = $this->ledgerRepo->calculateBalance($wallet->getId());

            if ($balance < $amountMinor) {
                throw new BadRequestHttpException('Insufficient wallet balance.');
            }

            $entry = new WalletLedgerEntry(
                $wallet,
                $amountMinor,
                'DEBIT',
                $referenceType,
                $referenceId
            );

            $this->em->persist($entry);
            $this->em->flush();
        });
    }
}
