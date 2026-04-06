<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Booking;
use App\Entity\ClientRequest;
use App\Entity\Message;
use App\Entity\User;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ParameterType;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Message>
 */
final class MessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct(
            registry: $registry,
            entityClass: Message::class
        );
    }

    public function countUnreadForClientRequest(ClientRequest $clientRequest, User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.clientRequest = :clientRequest')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('clientRequest', $clientRequest)
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @param array<int, int> $clientRequestIds
     * @return array<int, int>
     */
    public function countUnreadForClientRequestIds(User $receiver, array $clientRequestIds): array
    {
        if ($clientRequestIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('m')
            ->select('IDENTITY(m.clientRequest) AS client_request_id, COUNT(m.id) AS unread_count')
            ->where('m.clientRequest IN (:clientRequestIds)')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('clientRequestIds', array_values(array_unique($clientRequestIds)))
            ->setParameter('receiver', $receiver)
            ->groupBy('client_request_id')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['client_request_id']] = (int) $row['unread_count'];
        }

        return $map;
    }

    public function countUnreadForBooking(Booking $booking, User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.booking = :booking')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('booking', $booking)
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @param array<int, int> $bookingIds
     * @return array<int, int>
     */
    public function countUnreadForBookingIds(User $receiver, array $bookingIds): array
    {
        if ($bookingIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('m')
            ->select('IDENTITY(m.booking) AS booking_id, COUNT(m.id) AS unread_count')
            ->where('m.booking IN (:bookingIds)')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('bookingIds', array_values(array_unique($bookingIds)))
            ->setParameter('receiver', $receiver)
            ->groupBy('booking_id')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['booking_id']] = (int) $row['unread_count'];
        }

        return $map;
    }

    public function countUnreadRequestMessagesForUser(User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.clientRequest IS NOT NULL')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUnreadRequestThreadsForUser(User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(DISTINCT IDENTITY(m.clientRequest))')
            ->where('m.clientRequest IS NOT NULL')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @param array<int, int> $clientRequestIds
     * @return array<int, array{preview:string,created_at:string}>
     */
    public function findLatestVisibleRequestMessageMetaByThreadIds(User $user, array $clientRequestIds): array
    {
        if ($clientRequestIds === []) {
            return [];
        }

        $connection = $this->getEntityManager()->getConnection();
        $rows = $connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                  latest.client_request_id,
                  latest.content_preview,
                  latest.created_at
                FROM (
                  SELECT
                    m.client_request_id,
                    SUBSTRING(m.content, 1, 180) AS content_preview,
                    m.created_at,
                    ROW_NUMBER() OVER (
                      PARTITION BY m.client_request_id
                      ORDER BY m.created_at DESC, m.id DESC
                    ) AS row_num
                  FROM message m
                  WHERE m.client_request_id IN (:clientRequestIds)
                    AND (m.sender_id = :userId OR m.receiver_id = :userId)
                ) latest
                WHERE latest.row_num = 1
            SQL,
            [
                'clientRequestIds' => array_values(array_unique($clientRequestIds)),
                'userId' => (int) $user->getId(),
            ],
            [
                'clientRequestIds' => ArrayParameterType::INTEGER,
                'userId' => ParameterType::INTEGER,
            ]
        );

        $map = [];
        foreach ($rows as $row) {
            $threadId = (int) ($row['client_request_id'] ?? 0);
            if ($threadId <= 0 || isset($map[$threadId])) {
                continue;
            }

            $map[$threadId] = [
                'preview' => (string) ($row['content_preview'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ];
        }

        return $map;
    }

    public function countUnreadBookingMessagesForUser(User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.booking IS NOT NULL')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUnreadBookingThreadsForUser(User $receiver): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(DISTINCT IDENTITY(m.booking))')
            ->where('m.booking IS NOT NULL')
            ->andWhere('m.receiver = :receiver')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('receiver', $receiver)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return array<int, array{
     *   thread_key:string,
     *   kind:string,
     *   id:int,
     *   title:string,
     *   subtitle:string,
     *   status:string,
     *   unread_count:int,
     *   preview:string,
     *   href:string,
     *   participant_id:?int,
     *   activity_at:string
     * }>
     */
    public function findClientThreadSummaryPageRows(User $user, int $limit, int $offset, bool $unreadOnly = false): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $params = [
            'userId' => (int) $user->getId(),
            'limit' => $limit,
            'offset' => $offset,
        ];
        $types = [
            'userId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];
        $unreadSql = $unreadOnly ? 'WHERE unread_count > 0' : '';

        $sql = <<<SQL
            WITH latest_request_messages AS (
              SELECT
                m.client_request_id AS thread_id,
                SUBSTRING(m.content, 1, 180) AS preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.client_request_id
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND (m.sender_id = :userId OR m.receiver_id = :userId)
            ),
            request_unread_counts AS (
              SELECT
                m.client_request_id AS thread_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND m.receiver_id = :userId
                AND m.read_at IS NULL
              GROUP BY m.client_request_id
            ),
            latest_booking_messages AS (
              SELECT
                m.booking_id AS thread_id,
                SUBSTRING(m.content, 1, 180) AS preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.booking_id
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND (m.sender_id = :userId OR m.receiver_id = :userId)
            ),
            booking_unread_counts AS (
              SELECT
                m.booking_id AS thread_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND m.receiver_id = :userId
                AND m.read_at IS NULL
              GROUP BY m.booking_id
            )
            SELECT *
            FROM (
              SELECT
                CONCAT('request:', cr.id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'request' COLLATE utf8mb4_unicode_ci AS kind,
                cr.id AS id,
                st.name COLLATE utf8mb4_unicode_ci AS title,
                'WOLFIX request coordination' COLLATE utf8mb4_unicode_ci AS subtitle,
                cr.status COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(ruc.unread_count, 0) AS unread_count,
                COALESCE(lrm.preview, COALESCE(NULLIF(cr.admin_assignment_note, ''), cr.request_summary)) COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/requests/', cr.id) COLLATE utf8mb4_unicode_ci AS href,
                NULL AS participant_id,
                COALESCE(lrm.created_at, cr.updated_at) AS activity_at
              FROM client_request cr
              INNER JOIN service_type st ON st.id = cr.service_type_id
              LEFT JOIN latest_request_messages lrm ON lrm.thread_id = cr.id AND lrm.row_num = 1
              LEFT JOIN request_unread_counts ruc ON ruc.thread_id = cr.id
              WHERE cr.client_id = :userId

              UNION ALL

              SELECT
                CONCAT('booking:', b.id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'booking' COLLATE utf8mb4_unicode_ci AS kind,
                b.id AS id,
                COALESCE(NULLIF(b.service_title_snapshot, ''), CONCAT('Booking #', b.id)) COLLATE utf8mb4_unicode_ci AS title,
                'WOLFIX booking coordination' COLLATE utf8mb4_unicode_ci AS subtitle,
                b.status COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(buc.unread_count, 0) AS unread_count,
                COALESCE(lbm.preview, b.request_summary) COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/bookings/', b.id) COLLATE utf8mb4_unicode_ci AS href,
                NULL AS participant_id,
                COALESCE(lbm.created_at, b.updated_at) AS activity_at
              FROM booking b
              LEFT JOIN latest_booking_messages lbm ON lbm.thread_id = b.id AND lbm.row_num = 1
              LEFT JOIN booking_unread_counts buc ON buc.thread_id = b.id
              WHERE b.client_id = :userId
            ) thread_rows
            {$unreadSql}
            ORDER BY activity_at DESC, thread_key DESC
            LIMIT :limit OFFSET :offset
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @return array<int, array{
     *   thread_key:string,
     *   kind:string,
     *   id:int,
     *   title:string,
     *   subtitle:string,
     *   status:string,
     *   unread_count:int,
     *   preview:string,
     *   href:string,
     *   participant_id:?int,
     *   activity_at:string
     * }>
     */
    public function findVendorThreadSummaryPageRows(User $user, int $limit, int $offset, bool $unreadOnly = false): array
    {
        $vendorProfile = $user->getVendorProfile();
        if ($vendorProfile === null) {
            return [];
        }

        $connection = $this->getEntityManager()->getConnection();
        $params = [
            'userId' => (int) $user->getId(),
            'vendorId' => (int) $vendorProfile->getId(),
            'limit' => $limit,
            'offset' => $offset,
        ];
        $types = [
            'userId' => ParameterType::INTEGER,
            'vendorId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];
        $unreadSql = $unreadOnly ? 'WHERE unread_count > 0' : '';

        $sql = <<<SQL
            WITH latest_request_messages AS (
              SELECT
                m.client_request_id AS thread_id,
                SUBSTRING(m.content, 1, 180) AS preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.client_request_id
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND (m.sender_id = :userId OR m.receiver_id = :userId)
            ),
            request_unread_counts AS (
              SELECT
                m.client_request_id AS thread_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND m.receiver_id = :userId
                AND m.read_at IS NULL
              GROUP BY m.client_request_id
            ),
            latest_booking_messages AS (
              SELECT
                m.booking_id AS thread_id,
                SUBSTRING(m.content, 1, 180) AS preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.booking_id
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND (m.sender_id = :userId OR m.receiver_id = :userId)
            ),
            booking_unread_counts AS (
              SELECT
                m.booking_id AS thread_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND m.receiver_id = :userId
                AND m.read_at IS NULL
              GROUP BY m.booking_id
            )
            SELECT *
            FROM (
              SELECT
                CONCAT('request:', cr.id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'request' COLLATE utf8mb4_unicode_ci AS kind,
                cr.id AS id,
                st.name COLLATE utf8mb4_unicode_ci AS title,
                'Admin request coordination' COLLATE utf8mb4_unicode_ci AS subtitle,
                COALESCE(NULLIF(vri.status, ''), cr.status) COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(ruc.unread_count, 0) AS unread_count,
                COALESCE(lrm.preview, cr.request_summary) COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/vendor-requests/', cr.id) COLLATE utf8mb4_unicode_ci AS href,
                NULL AS participant_id,
                COALESCE(lrm.created_at, cr.updated_at) AS activity_at
              FROM vendor_request_interest vri
              INNER JOIN client_request cr ON cr.id = vri.client_request_id
              INNER JOIN service_type st ON st.id = cr.service_type_id
              LEFT JOIN latest_request_messages lrm ON lrm.thread_id = cr.id AND lrm.row_num = 1
              LEFT JOIN request_unread_counts ruc ON ruc.thread_id = cr.id
              WHERE vri.vendor_id = :vendorId

              UNION ALL

              SELECT
                CONCAT('booking:', b.id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'booking' COLLATE utf8mb4_unicode_ci AS kind,
                b.id AS id,
                COALESCE(NULLIF(b.service_title_snapshot, ''), CONCAT('Booking #', b.id)) COLLATE utf8mb4_unicode_ci AS title,
                'Admin booking coordination' COLLATE utf8mb4_unicode_ci AS subtitle,
                b.status COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(buc.unread_count, 0) AS unread_count,
                COALESCE(lbm.preview, b.request_summary) COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/bookings/', b.id) COLLATE utf8mb4_unicode_ci AS href,
                NULL AS participant_id,
                COALESCE(lbm.created_at, b.updated_at) AS activity_at
              FROM booking b
              LEFT JOIN client_request cr ON cr.id = b.client_request_id
              LEFT JOIN vendor_profile sv ON sv.id = cr.selected_vendor_id
              LEFT JOIN `user` svu ON svu.id = sv.user_id
              LEFT JOIN latest_booking_messages lbm ON lbm.thread_id = b.id AND lbm.row_num = 1
              LEFT JOIN booking_unread_counts buc ON buc.thread_id = b.id
              WHERE svu.id = :userId OR b.assigned_vendor_id = :userId
            ) thread_rows
            {$unreadSql}
            ORDER BY activity_at DESC, thread_key DESC
            LIMIT :limit OFFSET :offset
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @param array<int, int> $bookingIds
     * @return array<int, array{preview:string,created_at:string}>
     */
    public function findLatestVisibleBookingMessageMetaByThreadIds(User $user, array $bookingIds): array
    {
        if ($bookingIds === []) {
            return [];
        }

        $connection = $this->getEntityManager()->getConnection();
        $rows = $connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                  latest.booking_id,
                  latest.content_preview,
                  latest.created_at
                FROM (
                  SELECT
                    m.booking_id,
                    SUBSTRING(m.content, 1, 180) AS content_preview,
                    m.created_at,
                    ROW_NUMBER() OVER (
                      PARTITION BY m.booking_id
                      ORDER BY m.created_at DESC, m.id DESC
                    ) AS row_num
                  FROM message m
                  WHERE m.booking_id IN (:bookingIds)
                    AND (m.sender_id = :userId OR m.receiver_id = :userId)
                ) latest
                WHERE latest.row_num = 1
            SQL,
            [
                'bookingIds' => array_values(array_unique($bookingIds)),
                'userId' => (int) $user->getId(),
            ],
            [
                'bookingIds' => ArrayParameterType::INTEGER,
                'userId' => ParameterType::INTEGER,
            ]
        );

        $map = [];
        foreach ($rows as $row) {
            $threadId = (int) ($row['booking_id'] ?? 0);
            if ($threadId <= 0 || isset($map[$threadId])) {
                continue;
            }

            $map[$threadId] = [
                'preview' => (string) ($row['content_preview'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
            ];
        }

        return $map;
    }

    /**
     * @return array<int, array{
     *   request_id:int,
     *   participant_id:int,
     *   participant_email:string,
     *   participant_company_name:?string,
     *   request_status:string,
     *   service_type_name:string,
     *   service_type_slug:string,
     *   request_summary:string,
     *   content_preview:string,
     *   created_at:string
     * }>
     */
    public function findAdminRequestThreadSummaryRows(User $admin, int $limit = 400, string $search = ''): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $normalizedSearch = trim(mb_strtolower($search));
        $params = [
            'adminId' => (int) $admin->getId(),
            'limit' => $limit,
        ];
        $types = [
            'adminId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
        ];

        $searchSql = '';
        if ($normalizedSearch !== '') {
            $params['search'] = '%' . $normalizedSearch . '%';
            $types['search'] = ParameterType::STRING;
            $searchSql = <<<SQL
              AND (
                LOWER(m.content) LIKE :search
                OR LOWER(cr.request_summary) LIKE :search
                OR LOWER(COALESCE(cr.scope_details, '')) LIKE :search
                OR LOWER(cr.status) LIKE :search
                OR LOWER(st.name) LIKE :search
                OR LOWER(st.slug) LIKE :search
                OR LOWER(COALESCE(st.category, '')) LIKE :search
                OR LOWER(sender.email) LIKE :search
                OR LOWER(receiver.email) LIKE :search
                OR LOWER(COALESCE(svp.company_name, '')) LIKE :search
                OR LOWER(COALESCE(rvp.company_name, '')) LIKE :search
              )
            SQL;
        }

        $sql = <<<SQL
            SELECT
              latest.request_id,
              latest.participant_id,
              participant.email AS participant_email,
              pvp.company_name AS participant_company_name,
              cr.status AS request_status,
              st.name AS service_type_name,
              st.slug AS service_type_slug,
              cr.request_summary,
              latest.content_preview,
              latest.created_at
            FROM (
              SELECT
                m.client_request_id AS request_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.client_request_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              INNER JOIN client_request cr ON cr.id = m.client_request_id
              INNER JOIN service_type st ON st.id = cr.service_type_id
              INNER JOIN `user` sender ON sender.id = m.sender_id
              INNER JOIN `user` receiver ON receiver.id = m.receiver_id
              LEFT JOIN vendor_profile svp ON svp.user_id = sender.id
              LEFT JOIN vendor_profile rvp ON rvp.user_id = receiver.id
              WHERE m.client_request_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
                {$searchSql}
            ) latest
            INNER JOIN client_request cr ON cr.id = latest.request_id
            INNER JOIN service_type st ON st.id = cr.service_type_id
            INNER JOIN `user` participant ON participant.id = latest.participant_id
            LEFT JOIN vendor_profile pvp ON pvp.user_id = participant.id
            WHERE latest.row_num = 1
            ORDER BY latest.created_at DESC, latest.request_id DESC
            LIMIT :limit
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @return array<int, array{
     *   booking_id:int,
     *   participant_id:int,
     *   participant_email:string,
     *   participant_company_name:?string,
     *   booking_status:string,
     *   request_summary:string,
     *   client_request_id:?int,
     *   content_preview:string,
     *   created_at:string
     * }>
     */
    public function findAdminBookingThreadSummaryRows(User $admin, int $limit = 400, string $search = ''): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $normalizedSearch = trim(mb_strtolower($search));
        $params = [
            'adminId' => (int) $admin->getId(),
            'limit' => $limit,
        ];
        $types = [
            'adminId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
        ];

        $searchSql = '';
        if ($normalizedSearch !== '') {
            $params['search'] = '%' . $normalizedSearch . '%';
            $types['search'] = ParameterType::STRING;
            $searchSql = <<<SQL
              AND (
                LOWER(m.content) LIKE :search
                OR LOWER(COALESCE(b.request_summary, '')) LIKE :search
                OR LOWER(COALESCE(b.status, '')) LIKE :search
                OR LOWER(COALESCE(b.service_title_snapshot, '')) LIKE :search
                OR LOWER(COALESCE(b.service_category_snapshot, '')) LIKE :search
                OR LOWER(sender.email) LIKE :search
                OR LOWER(receiver.email) LIKE :search
                OR LOWER(COALESCE(svp.company_name, '')) LIKE :search
                OR LOWER(COALESCE(rvp.company_name, '')) LIKE :search
              )
            SQL;
        }

        $sql = <<<SQL
            SELECT
              latest.booking_id,
              latest.participant_id,
              participant.email AS participant_email,
              pvp.company_name AS participant_company_name,
              b.status AS booking_status,
              b.request_summary,
              b.client_request_id,
              latest.content_preview,
              latest.created_at
            FROM (
              SELECT
                m.booking_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.booking_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              INNER JOIN booking b ON b.id = m.booking_id
              INNER JOIN `user` sender ON sender.id = m.sender_id
              INNER JOIN `user` receiver ON receiver.id = m.receiver_id
              LEFT JOIN vendor_profile svp ON svp.user_id = sender.id
              LEFT JOIN vendor_profile rvp ON rvp.user_id = receiver.id
              WHERE m.booking_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
                {$searchSql}
            ) latest
            INNER JOIN booking b ON b.id = latest.booking_id
            INNER JOIN `user` participant ON participant.id = latest.participant_id
            LEFT JOIN vendor_profile pvp ON pvp.user_id = participant.id
            WHERE latest.row_num = 1
            ORDER BY latest.created_at DESC, latest.booking_id DESC
            LIMIT :limit
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @return array<string, int>
     */
    public function countUnreadRequestThreadsForAdmin(User $admin): array
    {
        $rows = $this->createQueryBuilder('m')
            ->select('IDENTITY(m.clientRequest) AS request_id, IDENTITY(m.sender) AS sender_id, COUNT(m.id) AS unread_count')
            ->where('m.clientRequest IS NOT NULL')
            ->andWhere('m.receiver = :admin')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('admin', $admin)
            ->groupBy('request_id, sender_id')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[sprintf('%s:%s', $row['request_id'], $row['sender_id'])] = (int) $row['unread_count'];
        }

        return $map;
    }

    /**
     * @return array<string, int>
     */
    public function countUnreadBookingThreadsForAdmin(User $admin): array
    {
        $rows = $this->createQueryBuilder('m')
            ->select('IDENTITY(m.booking) AS booking_id, IDENTITY(m.sender) AS sender_id, COUNT(m.id) AS unread_count')
            ->where('m.booking IS NOT NULL')
            ->andWhere('m.receiver = :admin')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('admin', $admin)
            ->groupBy('booking_id, sender_id')
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[sprintf('%s:%s', $row['booking_id'], $row['sender_id'])] = (int) $row['unread_count'];
        }

        return $map;
    }

    public function countAdminRequestThreads(User $admin): int
    {
        $connection = $this->getEntityManager()->getConnection();

        return (int) $connection->fetchOne(
            <<<'SQL'
                SELECT COUNT(*)
                FROM (
                  SELECT
                    m.client_request_id,
                    CASE
                      WHEN m.sender_id = :adminId THEN m.receiver_id
                      ELSE m.sender_id
                    END AS participant_id
                  FROM message m
                  WHERE m.client_request_id IS NOT NULL
                    AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
                  GROUP BY
                    m.client_request_id,
                    CASE
                      WHEN m.sender_id = :adminId THEN m.receiver_id
                      ELSE m.sender_id
                    END
                ) thread_rows
            SQL,
            ['adminId' => (int) $admin->getId()],
            ['adminId' => ParameterType::INTEGER]
        );
    }

    public function countAdminBookingThreads(User $admin): int
    {
        $connection = $this->getEntityManager()->getConnection();

        return (int) $connection->fetchOne(
            <<<'SQL'
                SELECT COUNT(*)
                FROM (
                  SELECT
                    m.booking_id,
                    CASE
                      WHEN m.sender_id = :adminId THEN m.receiver_id
                      ELSE m.sender_id
                    END AS participant_id
                  FROM message m
                  WHERE m.booking_id IS NOT NULL
                    AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
                  GROUP BY
                    m.booking_id,
                    CASE
                      WHEN m.sender_id = :adminId THEN m.receiver_id
                      ELSE m.sender_id
                    END
                ) thread_rows
            SQL,
            ['adminId' => (int) $admin->getId()],
            ['adminId' => ParameterType::INTEGER]
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAdminRequestThreadSummaryPageRows(User $admin, int $limit, int $offset, bool $unreadOnly = false): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $params = [
            'adminId' => (int) $admin->getId(),
            'limit' => $limit,
            'offset' => $offset,
        ];
        $types = [
            'adminId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];
        $unreadSql = $unreadOnly ? 'AND COALESCE(uc.unread_count, 0) > 0' : '';

        $sql = <<<SQL
            WITH latest_request_threads AS (
              SELECT
                m.client_request_id AS request_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.client_request_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
            ),
            request_unread_counts AS (
              SELECT
                m.client_request_id AS request_id,
                m.sender_id AS participant_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND m.receiver_id = :adminId
                AND m.read_at IS NULL
              GROUP BY m.client_request_id, m.sender_id
            )
            SELECT
              CONCAT('request:', latest.request_id) AS thread_key,
              'request' AS kind,
              latest.request_id AS id,
              st.name AS title,
              COALESCE(pvp.company_name, participant.email) AS subtitle,
              cr.status AS status,
              COALESCE(uc.unread_count, 0) AS unread_count,
              latest.content_preview AS preview,
              CONCAT('/dashboard/admin-requests/', latest.request_id) AS href,
              latest.participant_id AS participant_id,
              latest.created_at AS activity_at
            FROM latest_request_threads latest
            INNER JOIN client_request cr ON cr.id = latest.request_id
            INNER JOIN service_type st ON st.id = cr.service_type_id
            INNER JOIN `user` participant ON participant.id = latest.participant_id
            LEFT JOIN vendor_profile pvp ON pvp.user_id = latest.participant_id
            LEFT JOIN request_unread_counts uc ON uc.request_id = latest.request_id AND uc.participant_id = latest.participant_id
            WHERE latest.row_num = 1
              {$unreadSql}
            ORDER BY latest.created_at DESC, latest.request_id DESC, latest.participant_id DESC
            LIMIT :limit OFFSET :offset
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAdminBookingThreadSummaryPageRows(User $admin, int $limit, int $offset, bool $unreadOnly = false): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $params = [
            'adminId' => (int) $admin->getId(),
            'limit' => $limit,
            'offset' => $offset,
        ];
        $types = [
            'adminId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];
        $unreadSql = $unreadOnly ? 'AND COALESCE(uc.unread_count, 0) > 0' : '';

        $sql = <<<SQL
            WITH latest_booking_threads AS (
              SELECT
                m.booking_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.booking_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
            ),
            booking_unread_counts AS (
              SELECT
                m.booking_id,
                m.sender_id AS participant_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND m.receiver_id = :adminId
                AND m.read_at IS NULL
              GROUP BY m.booking_id, m.sender_id
            )
            SELECT
              CONCAT('booking:', latest.booking_id) AS thread_key,
              'booking' AS kind,
              latest.booking_id AS id,
              CONCAT('Booking #', latest.booking_id) AS title,
              COALESCE(pvp.company_name, participant.email) AS subtitle,
              b.status AS status,
              COALESCE(uc.unread_count, 0) AS unread_count,
              latest.content_preview AS preview,
              CONCAT('/dashboard/bookings/', latest.booking_id) AS href,
              latest.participant_id AS participant_id,
              latest.created_at AS activity_at
            FROM latest_booking_threads latest
            INNER JOIN booking b ON b.id = latest.booking_id
            INNER JOIN `user` participant ON participant.id = latest.participant_id
            LEFT JOIN vendor_profile pvp ON pvp.user_id = latest.participant_id
            LEFT JOIN booking_unread_counts uc ON uc.booking_id = latest.booking_id AND uc.participant_id = latest.participant_id
            WHERE latest.row_num = 1
              {$unreadSql}
            ORDER BY latest.created_at DESC, latest.booking_id DESC, latest.participant_id DESC
            LIMIT :limit OFFSET :offset
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findAdminThreadSummaryPageRows(User $admin, int $limit, int $offset, bool $unreadOnly = false): array
    {
        $connection = $this->getEntityManager()->getConnection();
        $params = [
            'adminId' => (int) $admin->getId(),
            'limit' => $limit,
            'offset' => $offset,
        ];
        $types = [
            'adminId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ];
        $unreadSql = $unreadOnly ? 'WHERE unread_count > 0' : '';

        $sql = <<<SQL
            WITH latest_request_threads AS (
              SELECT
                m.client_request_id AS request_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.client_request_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
            ),
            request_unread_counts AS (
              SELECT
                m.client_request_id AS request_id,
                m.sender_id AS participant_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.client_request_id IS NOT NULL
                AND m.receiver_id = :adminId
                AND m.read_at IS NULL
              GROUP BY m.client_request_id, m.sender_id
            ),
            latest_booking_threads AS (
              SELECT
                m.booking_id,
                CASE
                  WHEN m.sender_id = :adminId THEN m.receiver_id
                  ELSE m.sender_id
                END AS participant_id,
                SUBSTRING(m.content, 1, 180) AS content_preview,
                m.created_at,
                ROW_NUMBER() OVER (
                  PARTITION BY m.booking_id,
                  CASE
                    WHEN m.sender_id = :adminId THEN m.receiver_id
                    ELSE m.sender_id
                  END
                  ORDER BY m.created_at DESC, m.id DESC
                ) AS row_num
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND (m.sender_id = :adminId OR m.receiver_id = :adminId)
            ),
            booking_unread_counts AS (
              SELECT
                m.booking_id,
                m.sender_id AS participant_id,
                COUNT(m.id) AS unread_count
              FROM message m
              WHERE m.booking_id IS NOT NULL
                AND m.receiver_id = :adminId
                AND m.read_at IS NULL
              GROUP BY m.booking_id, m.sender_id
            )
            SELECT *
            FROM (
              SELECT
                CONCAT('request:', latest.request_id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'request' COLLATE utf8mb4_unicode_ci AS kind,
                latest.request_id AS id,
                st.name COLLATE utf8mb4_unicode_ci AS title,
                COALESCE(pvp.company_name, participant.email) COLLATE utf8mb4_unicode_ci AS subtitle,
                cr.status COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(uc.unread_count, 0) AS unread_count,
                latest.content_preview COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/admin-requests/', latest.request_id) COLLATE utf8mb4_unicode_ci AS href,
                latest.participant_id AS participant_id,
                latest.created_at AS activity_at
              FROM latest_request_threads latest
              INNER JOIN client_request cr ON cr.id = latest.request_id
              INNER JOIN service_type st ON st.id = cr.service_type_id
              INNER JOIN `user` participant ON participant.id = latest.participant_id
              LEFT JOIN vendor_profile pvp ON pvp.user_id = latest.participant_id
              LEFT JOIN request_unread_counts uc ON uc.request_id = latest.request_id AND uc.participant_id = latest.participant_id
              WHERE latest.row_num = 1

              UNION ALL

              SELECT
                CONCAT('booking:', latest.booking_id) COLLATE utf8mb4_unicode_ci AS thread_key,
                'booking' COLLATE utf8mb4_unicode_ci AS kind,
                latest.booking_id AS id,
                CONCAT('Booking #', latest.booking_id) COLLATE utf8mb4_unicode_ci AS title,
                COALESCE(pvp.company_name, participant.email) COLLATE utf8mb4_unicode_ci AS subtitle,
                b.status COLLATE utf8mb4_unicode_ci AS status,
                COALESCE(uc.unread_count, 0) AS unread_count,
                latest.content_preview COLLATE utf8mb4_unicode_ci AS preview,
                CONCAT('/dashboard/bookings/', latest.booking_id) COLLATE utf8mb4_unicode_ci AS href,
                latest.participant_id AS participant_id,
                latest.created_at AS activity_at
              FROM latest_booking_threads latest
              INNER JOIN booking b ON b.id = latest.booking_id
              INNER JOIN `user` participant ON participant.id = latest.participant_id
              LEFT JOIN vendor_profile pvp ON pvp.user_id = latest.participant_id
              LEFT JOIN booking_unread_counts uc ON uc.booking_id = latest.booking_id AND uc.participant_id = latest.participant_id
              WHERE latest.row_num = 1
            ) thread_rows
            {$unreadSql}
            ORDER BY activity_at DESC, thread_key DESC, participant_id DESC
            LIMIT :limit OFFSET :offset
        SQL;

        return $connection->fetchAllAssociative($sql, $params, $types);
    }
}
