<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'snippe_api_log')]
#[ORM\Index(name: 'idx_snippe_api_ref', columns: ['reference'])]
class SnippeApiLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 12)]
    private string $direction;

    #[ORM\Column(type: 'string', length: 40)]
    private string $operation;

    #[ORM\Column(type: 'string', length: 120)]
    private string $reference;

    #[ORM\Column(type: 'string', length: 255)]
    private string $endpoint;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $httpStatus = null;

    #[ORM\Column(type: 'json')]
    private array $payload;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $responsePayload = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $direction, string $operation, string $reference, string $endpoint, array $payload, ?int $httpStatus = null, ?array $responsePayload = null)
    {
        $this->direction = strtoupper($direction);
        $this->operation = strtoupper($operation);
        $this->reference = $reference;
        $this->endpoint = $endpoint;
        $this->payload = $payload;
        $this->httpStatus = $httpStatus;
        $this->responsePayload = $responsePayload;
        $this->createdAt = new \DateTimeImmutable();
    }
}
