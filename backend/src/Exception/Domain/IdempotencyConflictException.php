<?php

declare(strict_types=1);

namespace App\Exception\Domain;

final class IdempotencyConflictException extends FinancialDomainException
{
}
