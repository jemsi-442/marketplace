namespace App\Service;

use App\Entity\Escrow;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class EscrowLifecycleService
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    public function transition(Escrow $escrow, string $targetState): void
    {
        $current = $escrow->getStatus();

        if (!$this->isValidTransition($current, $targetState)) {
            throw new BadRequestHttpException("Invalid escrow transition: $current → $targetState");
        }

        $escrow->setStatus($targetState);

        if ($targetState === 'RELEASED') {
            $escrow->setReleasedAt(new \DateTimeImmutable());
        }

        if ($targetState === 'RESOLVED') {
            $escrow->setResolvedAt(new \DateTimeImmutable());
        }

        $this->em->flush();
    }

    private function isValidTransition(string $from, string $to): bool
    {
        $map = [
            'CREATED' => ['FUNDED', 'CANCELLED'],
            'FUNDED' => ['ACTIVE', 'CANCELLED'],
            'ACTIVE' => ['PARTIALLY_RELEASED', 'RELEASED', 'DISPUTED'],
            'PARTIALLY_RELEASED' => ['RELEASED', 'DISPUTED'],
            'DISPUTED' => ['RESOLVED'],
            'RESOLVED' => ['RELEASED'],
        ];

        return isset($map[$from]) && in_array($to, $map[$from], true);
    }
}
