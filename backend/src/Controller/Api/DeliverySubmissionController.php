<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\DeliveryAttachment;
use App\Entity\DeliverySubmission;
use App\Entity\Escrow;
use App\Entity\Notification;
use App\Entity\User;
use App\Repository\DeliverySubmissionRepository;
use App\Security\BookingVoter;
use App\Service\DeliveryAttachmentStorage;
use App\Service\DeliverySubmissionLifecycleService;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bookings/{booking}/deliveries')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class DeliverySubmissionController extends AbstractController
{
    private const MAX_ATTACHMENTS = 8;

    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly DeliveryAttachmentStorage $deliveryAttachmentStorage,
        private readonly DeliverySubmissionLifecycleService $deliverySubmissionLifecycleService,
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    private function isClientOwner(Booking $booking, User $user): bool
    {
        return $booking->getClient()->getId() === $user->getId();
    }

    private function isAssignedVendor(Booking $booking, User $user): bool
    {
        return $booking->resolveVendorUser()?->getId() === $user->getId();
    }

    private function hasFinalizedEscrow(Booking $booking): bool
    {
        $status = $booking->getEscrow()?->getStatus();

        return in_array($status, [Escrow::STATUS_RELEASED, Escrow::STATUS_RESOLVED], true);
    }

    private function syncRequestAndBookingStatusAfterDeliveryMutation(
        Booking $booking,
        DeliverySubmissionRepository $repository
    ): void {
        $clientRequest = $booking->getClientRequest();
        $escrowStatus = $booking->getEscrow()?->getStatus();
        $latestDelivery = $repository->findLatestForBooking($booking);

        if ($latestDelivery instanceof DeliverySubmission) {
            if ($latestDelivery->getStatus() === DeliverySubmission::STATUS_APPROVED) {
                $booking->setStatus(Booking::STATUS_COMPLETED);
                if ($clientRequest instanceof ClientRequest) {
                    $clientRequest->setStatus(ClientRequest::STATUS_COMPLETED);
                }

                return;
            }

            $booking->setStatus(Booking::STATUS_CONFIRMED);

            if ($clientRequest instanceof ClientRequest) {
                $clientRequest->setStatus(
                    $latestDelivery->getStatus() === DeliverySubmission::STATUS_CHANGES_REQUESTED
                        ? ClientRequest::STATUS_REVISION_REQUESTED
                        : ClientRequest::STATUS_DELIVERY_SUBMITTED
                );
            }

            return;
        }

        $booking->setStatus(
            in_array($escrowStatus, [Escrow::STATUS_RELEASED, Escrow::STATUS_RESOLVED], true)
                ? Booking::STATUS_COMPLETED
                : Booking::STATUS_CONFIRMED
        );

        if (!$clientRequest instanceof ClientRequest) {
            return;
        }

        $nextRequestStatus = match ($escrowStatus) {
            Escrow::STATUS_DISPUTED => ClientRequest::STATUS_DISPUTED,
            Escrow::STATUS_FUNDED, Escrow::STATUS_ACTIVE => ClientRequest::STATUS_FUNDED,
            Escrow::STATUS_RELEASED, Escrow::STATUS_RESOLVED => ClientRequest::STATUS_COMPLETED,
            default => ClientRequest::STATUS_AWAITING_PAYMENT,
        };

        $clientRequest->setStatus($nextRequestStatus);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAttachment(DeliveryAttachment $attachment): array
    {
        $delivery = $attachment->getDeliverySubmission();
        $booking = $delivery?->getBooking();
        $fileUrl = $attachment->getFileUrl();

        if ($attachment->getStoragePath() !== null && $delivery instanceof DeliverySubmission && $booking instanceof Booking) {
            $fileUrl = $this->urlGenerator->generate('booking_delivery_attachment_download', [
                'booking' => $booking->getId(),
                'delivery' => $delivery->getId(),
                'attachment' => $attachment->getId(),
            ]);
        }

        return [
            'id' => $attachment->getId(),
            'file_name' => $attachment->getFileName(),
            'file_url' => $fileUrl,
            'mime_type' => $attachment->getMimeType(),
            'size_bytes' => $attachment->getSizeBytes(),
            'created_at' => $attachment->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * @return array<int, array{name: string, url: string, mime_type: ?string, size_bytes: ?int}>
     */
    private function normalizeAttachments(mixed $payload): array
    {
        if ($payload === null) {
            return [];
        }

        if (!is_array($payload)) {
            throw new \InvalidArgumentException('attachments must be an array');
        }

        if (count($payload) > self::MAX_ATTACHMENTS) {
            throw new \InvalidArgumentException(sprintf('attachments must not exceed %d items', self::MAX_ATTACHMENTS));
        }

        $attachments = [];
        foreach ($payload as $index => $item) {
            if (!is_array($item)) {
                throw new \InvalidArgumentException(sprintf('attachments[%d] must be an object', $index));
            }

            $name = isset($item['file_name']) && is_string($item['file_name']) ? trim($item['file_name']) : '';
            $url = isset($item['file_url']) && is_string($item['file_url']) ? trim($item['file_url']) : '';
            $mimeType = isset($item['mime_type']) && is_string($item['mime_type']) ? trim($item['mime_type']) : null;
            $sizeBytes = isset($item['size_bytes']) && is_numeric($item['size_bytes']) ? (int) $item['size_bytes'] : null;

            if ($name === '' || mb_strlen($name) > 180) {
                throw new \InvalidArgumentException(sprintf('attachments[%d].file_name is required and must not exceed 180 characters', $index));
            }

            if ($url === '' || mb_strlen($url) > 500) {
                throw new \InvalidArgumentException(sprintf('attachments[%d].file_url is required and must not exceed 500 characters', $index));
            }
            if (!$this->isSafeExternalUrl($url)) {
                throw new \InvalidArgumentException(sprintf('attachments[%d].file_url must be a valid http or https URL', $index));
            }

            if ($mimeType !== null && mb_strlen($mimeType) > 120) {
                throw new \InvalidArgumentException(sprintf('attachments[%d].mime_type must not exceed 120 characters', $index));
            }

            if ($sizeBytes !== null && $sizeBytes < 0) {
                throw new \InvalidArgumentException(sprintf('attachments[%d].size_bytes cannot be negative', $index));
            }

            $attachments[] = [
                'name' => $name,
                'url' => $url,
                'mime_type' => $mimeType !== '' ? $mimeType : null,
                'size_bytes' => $sizeBytes,
            ];
        }

        return $attachments;
    }

    private function normalizeOptionalExternalUrl(?string $value, string $field): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        if (!$this->isSafeExternalUrl($normalized)) {
            throw new \InvalidArgumentException(sprintf('%s must be a valid http or https URL', $field));
        }

        return $normalized;
    }

    private function isSafeExternalUrl(string $value): bool
    {
        if (filter_var($value, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https'], true);
    }

    /**
     * @return array<int, UploadedFile>
     */
    private function normalizeUploadedFiles(Request $request): array
    {
        $payload = $request->files->get('files', []);

        if ($payload instanceof UploadedFile) {
            return [$payload];
        }

        if (!is_array($payload)) {
            return [];
        }

        return array_values(array_filter($payload, static fn (mixed $file): bool => $file instanceof UploadedFile));
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeDelivery(DeliverySubmission $delivery, User $viewer): array
    {
        $isAdminViewer = $this->isAdmin($viewer);

        return [
            'id' => $delivery->getId(),
            'booking_id' => $delivery->getBooking()->getId(),
            'status' => $delivery->getStatus(),
            'delivery_note' => $delivery->getDeliveryNote(),
            'delivery_link' => $delivery->getDeliveryLink(),
            'attachments' => array_map(
                fn (DeliveryAttachment $attachment): array => $this->serializeAttachment($attachment),
                $delivery->getAttachments()->toArray()
            ),
            'review_note' => $delivery->getReviewNote(),
            'submitted_at' => $delivery->getSubmittedAt()->format('Y-m-d H:i:s'),
            'reviewed_at' => $delivery->getReviewedAt()?->format('Y-m-d H:i:s'),
            'vendor_user_id' => $isAdminViewer ? $delivery->getVendor()->getId() : null,
        ];
    }

    #[Route('', name: 'booking_delivery_list', methods: ['GET'])]
    public function list(Booking $booking, DeliverySubmissionRepository $repository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::VIEW, $booking);

        $deliveries = $repository->findForBooking($booking);

        return $this->json([
            'deliveries' => array_map(fn (DeliverySubmission $delivery): array => $this->serializeDelivery($delivery, $user), $deliveries),
        ]);
    }

    #[Route('', name: 'booking_delivery_submit', methods: ['POST'])]
    public function submit(Booking $booking, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isAssignedVendor($booking, $user)) {
            return $this->json(['error' => 'Only the assigned vendor can submit delivery'], 403);
        }

        if (!in_array($booking->getStatus(), [Booking::STATUS_CONFIRMED, Booking::STATUS_PENDING], true)) {
            return $this->json(['error' => 'This booking is not ready for delivery submission'], 409);
        }

        $hasFormPayload = $request->request->count() > 0 || $request->files->count() > 0;
        $isMultipart = str_contains((string) $request->headers->get('Content-Type', ''), 'multipart/form-data');
        if ($isMultipart || $hasFormPayload) {
            $payload = $request->request->all();
        } else {
            $payload = json_decode($request->getContent(), true);
            if (!is_array($payload)) {
                return $this->json(['error' => 'Invalid JSON payload'], 400);
            }
        }

        $deliveryNote = isset($payload['delivery_note']) && is_string($payload['delivery_note']) ? trim($payload['delivery_note']) : '';
        $deliveryLink = isset($payload['delivery_link']) && is_string($payload['delivery_link']) ? trim($payload['delivery_link']) : null;
        try {
            $attachments = $this->normalizeAttachments($payload['attachments'] ?? null);
            $deliveryLink = $this->normalizeOptionalExternalUrl($deliveryLink, 'delivery_link');
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], 400);
        }
        $uploadedFiles = $this->normalizeUploadedFiles($request);

        if (mb_strlen($deliveryNote) < 12) {
            return $this->json(['error' => 'delivery_note must be at least 12 characters'], 400);
        }
        if (mb_strlen($deliveryNote) > 5000) {
            return $this->json(['error' => 'delivery_note must not exceed 5000 characters'], 400);
        }
        if ($deliveryLink !== null && $deliveryLink !== '' && mb_strlen($deliveryLink) > 500) {
            return $this->json(['error' => 'delivery_link must not exceed 500 characters'], 400);
        }

        $delivery = new DeliverySubmission();
        $delivery->setBooking($booking);
        $delivery->setVendor($user);
        $delivery->setDeliveryNote($deliveryNote);
        $delivery->setDeliveryLink($deliveryLink);
        $delivery->setStatus(DeliverySubmission::STATUS_SUBMITTED);

        foreach ($attachments as $attachmentPayload) {
            $attachment = new DeliveryAttachment();
            $attachment
                ->setFileName($attachmentPayload['name'])
                ->setFileUrl($attachmentPayload['url'])
                ->setStoragePath(null)
                ->setMimeType($attachmentPayload['mime_type'])
                ->setSizeBytes($attachmentPayload['size_bytes']);
            $delivery->addAttachment($attachment);
        }

        try {
            foreach ($uploadedFiles as $uploadedFile) {
                $stored = $this->deliveryAttachmentStorage->storeForBooking($uploadedFile, $booking->getId() ?? 0);
                $attachment = new DeliveryAttachment();
                $attachment
                    ->setFileName($stored['file_name'])
                    ->setFileUrl('')
                    ->setStoragePath($stored['storage_path'])
                    ->setMimeType($stored['mime_type'])
                    ->setSizeBytes($stored['size_bytes']);
                $delivery->addAttachment($attachment);
            }
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return $this->json(['error' => $exception->getMessage()], 400);
        }

        $em->persist($delivery);

        $clientRequest = $booking->getClientRequest();
        if ($clientRequest instanceof ClientRequest) {
            $clientRequest->setStatus(ClientRequest::STATUS_DELIVERY_SUBMITTED);
        }

        $em->flush();

        $this->notificationService->notifyMany(
            array_filter([$booking->getClient(), $clientRequest?->getAssignedByAdmin()]),
            'Delivery submitted for review',
            sprintf('A delivery update is ready for booking #%d review.', $booking->getId()),
            Notification::CATEGORY_PLATFORM
        );

        return $this->json([
            'message' => 'Delivery submitted successfully',
            'delivery' => $this->serializeDelivery($delivery, $user),
        ], 201);
    }

    #[Route('/{delivery}/attachments/{attachment}/download', name: 'booking_delivery_attachment_download', methods: ['GET'])]
    public function downloadAttachment(
        Booking $booking,
        DeliverySubmission $delivery,
        DeliveryAttachment $attachment
    ): BinaryFileResponse|JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $this->denyAccessUnlessGranted(BookingVoter::VIEW, $booking);

        if ($delivery->getBooking()->getId() !== $booking->getId()) {
            return $this->json(['error' => 'Delivery does not belong to this booking'], 404);
        }

        if ($attachment->getDeliverySubmission()?->getId() !== $delivery->getId()) {
            return $this->json(['error' => 'Attachment does not belong to this delivery'], 404);
        }

        $absolutePath = $this->deliveryAttachmentStorage->resolveStoredAttachmentPath($attachment->getStoragePath());
        if ($absolutePath === null) {
            return $this->json(['error' => 'Stored attachment file was not found'], 404);
        }

        $response = new BinaryFileResponse($absolutePath);
        $response->setPrivate();
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            $attachment->getFileName() !== '' ? $attachment->getFileName() : basename($absolutePath)
        );

        $mimeType = $attachment->getMimeType();
        if (is_string($mimeType) && $mimeType !== '') {
            $response->headers->set('Content-Type', $mimeType);
        }

        return $response;
    }

    #[Route('/{id}/request-changes', name: 'booking_delivery_request_changes', methods: ['POST'])]
    public function requestChanges(
        Booking $booking,
        DeliverySubmission $delivery,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($delivery->getBooking()->getId() !== $booking->getId()) {
            return $this->json(['error' => 'Delivery does not belong to this booking'], 404);
        }

        if (!$this->isAdmin($user) && !$this->isClientOwner($booking, $user)) {
            return $this->json(['error' => 'Only the client or admin can request changes'], 403);
        }

        if ($delivery->getStatus() !== DeliverySubmission::STATUS_SUBMITTED) {
            return $this->json(['error' => 'Only a submitted delivery can move to changes requested'], 409);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $reviewNote = isset($payload['review_note']) && is_string($payload['review_note']) ? trim($payload['review_note']) : '';
        if (mb_strlen($reviewNote) < 8) {
            return $this->json(['error' => 'review_note must be at least 8 characters'], 400);
        }
        if (mb_strlen($reviewNote) > 500) {
            return $this->json(['error' => 'review_note must not exceed 500 characters'], 400);
        }

        $delivery->setStatus(DeliverySubmission::STATUS_CHANGES_REQUESTED);
        $delivery->setReviewNote($reviewNote);
        $delivery->setReviewedAt(new \DateTimeImmutable());

        $clientRequest = $booking->getClientRequest();
        if ($clientRequest instanceof ClientRequest) {
            $clientRequest->setStatus(ClientRequest::STATUS_REVISION_REQUESTED);
        }

        $em->flush();

        $this->notificationService->notify(
            $delivery->getVendor(),
            'Changes requested on delivery',
            sprintf('WOLFIX requested changes on booking #%d before completion.', $booking->getId()),
            Notification::CATEGORY_PLATFORM,
            false
        );

        if ($this->isAdmin($user)) {
            $this->notificationService->notify(
                $booking->getClient(),
                'Your booking needs one more revision',
                sprintf('WOLFIX requested one more revision for booking #%d.', $booking->getId()),
                Notification::CATEGORY_PLATFORM,
                false
            );
        }

        $em->flush();

        return $this->json([
            'message' => 'Changes requested successfully',
            'delivery' => $this->serializeDelivery($delivery, $user),
        ]);
    }

    #[Route('/{id}/approve', name: 'booking_delivery_approve', methods: ['POST'])]
    public function approve(
        Booking $booking,
        DeliverySubmission $delivery,
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if ($delivery->getBooking()->getId() !== $booking->getId()) {
            return $this->json(['error' => 'Delivery does not belong to this booking'], 404);
        }

        if (!$this->isAdmin($user) && !$this->isClientOwner($booking, $user)) {
            return $this->json(['error' => 'Only the client or admin can approve delivery'], 403);
        }

        if (!in_array($delivery->getStatus(), [
            DeliverySubmission::STATUS_SUBMITTED,
            DeliverySubmission::STATUS_CHANGES_REQUESTED,
        ], true)) {
            return $this->json(['error' => 'This delivery is not in a reviewable state'], 409);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            $payload = [];
        }

        $reviewNote = isset($payload['review_note']) && is_string($payload['review_note']) ? trim($payload['review_note']) : null;
        if ($reviewNote !== null && mb_strlen($reviewNote) > 500) {
            return $this->json(['error' => 'review_note must not exceed 500 characters'], 400);
        }

        $delivery->setStatus(DeliverySubmission::STATUS_APPROVED);
        $delivery->setReviewNote($reviewNote !== '' ? $reviewNote : null);
        $delivery->setReviewedAt(new \DateTimeImmutable());
        $booking->setStatus(Booking::STATUS_COMPLETED);

        $clientRequest = $booking->getClientRequest();
        if ($clientRequest instanceof ClientRequest) {
            $clientRequest->setStatus(ClientRequest::STATUS_COMPLETED);
        }

        $em->flush();

        $this->notificationService->notifyMany(
            array_filter([$delivery->getVendor(), $booking->getClient(), $clientRequest?->getAssignedByAdmin()]),
            'Delivery approved',
            sprintf('Booking #%d delivery was approved and is ready for release or final wrap-up.', $booking->getId()),
            Notification::CATEGORY_PLATFORM
        );

        return $this->json([
            'message' => 'Delivery approved successfully',
            'delivery' => $this->serializeDelivery($delivery, $user),
            'booking_status' => $booking->getStatus(),
        ]);
    }

    #[Route('/{delivery}', name: 'booking_delivery_delete', methods: ['DELETE'])]
    public function deleteDelivery(
        Booking $booking,
        DeliverySubmission $delivery,
        DeliverySubmissionRepository $repository,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isAdmin($user)) {
            return $this->json(['error' => 'Only admin can delete delivery submissions'], 403);
        }

        if ($delivery->getBooking()->getId() !== $booking->getId()) {
            return $this->json(['error' => 'Delivery does not belong to this booking'], 404);
        }

        if (
            $delivery->getStatus() === DeliverySubmission::STATUS_APPROVED
            && $this->hasFinalizedEscrow($booking)
        ) {
            return $this->json(['error' => 'Approved delivery cannot be deleted after final payout or resolution'], 409);
        }

        $deletedDeliveryId = $delivery->getId();
        $this->deliverySubmissionLifecycleService->deleteSubmission($delivery);
        $this->syncRequestAndBookingStatusAfterDeliveryMutation($booking, $repository);
        $em->flush();

        $clientRequest = $booking->getClientRequest();
        $this->notificationService->notifyMany(
            array_filter([$booking->getClient(), $booking->resolveVendorUser(), $clientRequest?->getAssignedByAdmin()]),
            'Delivery submission removed',
            sprintf('WOLFIX removed a delivery submission from booking #%d during admin review.', $booking->getId()),
            Notification::CATEGORY_PLATFORM
        );

        return $this->json([
            'message' => 'Delivery submission deleted successfully',
            'deleted_delivery_id' => $deletedDeliveryId,
            'booking_status' => $booking->getStatus(),
            'client_request_status' => $clientRequest?->getStatus(),
            'deliveries_remaining' => count($repository->findForBooking($booking)),
        ]);
    }

    #[Route('/{delivery}/attachments/{attachment}', name: 'booking_delivery_attachment_delete', methods: ['DELETE'])]
    public function deleteAttachment(
        Booking $booking,
        DeliverySubmission $delivery,
        DeliveryAttachment $attachment,
        EntityManagerInterface $em
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$this->isAdmin($user)) {
            return $this->json(['error' => 'Only admin can delete delivery attachments'], 403);
        }

        if ($delivery->getBooking()->getId() !== $booking->getId()) {
            return $this->json(['error' => 'Delivery does not belong to this booking'], 404);
        }

        if ($attachment->getDeliverySubmission()?->getId() !== $delivery->getId()) {
            return $this->json(['error' => 'Attachment does not belong to this delivery'], 404);
        }

        if (
            $delivery->getStatus() === DeliverySubmission::STATUS_APPROVED
            && $this->hasFinalizedEscrow($booking)
        ) {
            return $this->json(['error' => 'Approved delivery attachments cannot be deleted after final payout or resolution'], 409);
        }

        $deletedAttachmentId = $attachment->getId();
        $this->deliverySubmissionLifecycleService->deleteAttachment($attachment);
        $em->refresh($delivery);

        $clientRequest = $booking->getClientRequest();
        $this->notificationService->notifyMany(
            array_filter([$booking->getClient(), $booking->resolveVendorUser(), $clientRequest?->getAssignedByAdmin()]),
            'Delivery attachment removed',
            sprintf('WOLFIX removed one delivery attachment from booking #%d during admin review.', $booking->getId()),
            Notification::CATEGORY_PLATFORM
        );

        return $this->json([
            'message' => 'Delivery attachment deleted successfully',
            'deleted_attachment_id' => $deletedAttachmentId,
            'delivery' => $this->serializeDelivery($delivery, $user),
        ]);
    }
}
