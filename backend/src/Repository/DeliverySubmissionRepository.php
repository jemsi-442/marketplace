<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Booking;
use App\Entity\DeliverySubmission;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DeliverySubmission>
 */
final class DeliverySubmissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DeliverySubmission::class);
    }

    /**
     * @return array<int, DeliverySubmission>
     */
    public function findForBooking(Booking $booking): array
    {
        return $this->createQueryBuilder('d')
            ->where('d.booking = :booking')
            ->setParameter('booking', $booking)
            ->orderBy('d.submittedAt', 'DESC')
            ->addOrderBy('d.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findLatestForBooking(Booking $booking): ?DeliverySubmission
    {
        /** @var DeliverySubmission|null $delivery */
        $delivery = $this->createQueryBuilder('d')
            ->where('d.booking = :booking')
            ->setParameter('booking', $booking)
            ->orderBy('d.submittedAt', 'DESC')
            ->addOrderBy('d.id', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        return $delivery;
    }
}
