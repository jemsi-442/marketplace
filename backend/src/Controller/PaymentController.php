<?php

namespace App\Controller;

use App\Entity\Payment;
use App\Repository\BookingRepository;
use App\Repository\PaymentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/payments')]
class PaymentController extends AbstractController
{
    #[Route('/pay', name: 'payment_create', methods: ['POST'])]
    public function pay(
        Request $request,
        EntityManagerInterface $em,
        BookingRepository $bookingRepo,
        PaymentRepository $paymentRepo
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user || !in_array('ROLE_CLIENT', $user->getRoles())) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $bookingId = $data['bookingId'] ?? null;
        $amount = (float)($data['amount'] ?? 0);

        if (!$bookingId || $amount <= 0) {
            return $this->json(['error' => 'bookingId and valid amount required'], 400);
        }

        $booking = $bookingRepo->find($bookingId);
        if (!$booking || $booking->getClient()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Booking not found or unauthorized'], 404);
        }

        // Check if payment already exists for booking
        $existingPayment = $paymentRepo->findOneBy(['booking' => $booking]);
        if ($existingPayment) {
            return $this->json(['error' => 'Payment already exists for this booking'], 409);
        }

        $payment = new Payment();
        $payment->setBooking($booking);
        $payment->setAmount($amount);

        // Fake payment processing (replace with real gateway later)
        $payment->setStatus('completed');

        $em->persist($payment);
        $em->flush();

        return $this->json([
            'message' => 'Payment successful',
            'payment' => [
                'id' => $payment->getId(),
                'bookingId' => $booking->getId(),
                'amount' => $payment->getAmount(),
                'status' => $payment->getStatus(),
                'createdAt' => $payment->getCreatedAt()->format('Y-m-d H:i:s'),
            ]
        ], 201);
    }

    #[Route('/history', name: 'payment_history', methods: ['GET'])]
    public function history(PaymentRepository $repo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $payments = $repo->createQueryBuilder('p')
            ->join('p.booking', 'b')
            ->where('b.client = :user OR b.vendor = :user')
            ->setParameter('user', $user)
            ->orderBy('p.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($payments as $p) {
            $result[] = [
                'id' => $p->getId(),
                'bookingId' => $p->getBooking()->getId(),
                'amount' => $p->getAmount(),
                'status' => $p->getStatus(),
                'createdAt' => $p->getCreatedAt()->format('Y-m-d H:i:s'),
            ];
        }

        return $this->json(['payments' => $result]);
    }
}
