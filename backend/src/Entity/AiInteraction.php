<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AiInteractionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AiInteractionRepository::class)]
#[ORM\Table(name: 'ai_interaction')]
class AiInteraction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'text')]
    private string $question = '';

    #[ORM\Column(type: 'text')]
    private string $answer = '';

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(type: 'string', length: 80, nullable: true)]
    private ?string $contextTag = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $contextData = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $isSavedNote = false;

    #[ORM\Column(type: 'string', length: 160, nullable: true)]
    private ?string $savedNoteTitle = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $savedAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $savedNoteUpdatedAt = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $savedNoteTags = null;

    #[ORM\Column(type: 'string', length: 24, nullable: true)]
    private ?string $savedNoteState = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $savedNoteFollowUpAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $savedNoteClosureNote = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getQuestion(): string { return $this->question; }
    public function setQuestion(string $question): self { $this->question = $question; return $this; }

    public function getAnswer(): string { return $this->answer; }
    public function setAnswer(string $answer): self { $this->answer = $answer; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self { $this->user = $user; return $this; }

    public function getContextTag(): ?string { return $this->contextTag; }
    public function setContextTag(?string $contextTag): self { $this->contextTag = $contextTag; return $this; }

    public function getContextData(): ?array { return $this->contextData; }
    public function setContextData(?array $contextData): self { $this->contextData = $contextData; return $this; }

    public function isSavedNote(): bool { return $this->isSavedNote; }
    public function setIsSavedNote(bool $isSavedNote): self { $this->isSavedNote = $isSavedNote; return $this; }

    public function getSavedNoteTitle(): ?string { return $this->savedNoteTitle; }
    public function setSavedNoteTitle(?string $savedNoteTitle): self { $this->savedNoteTitle = $savedNoteTitle; return $this; }

    public function getSavedAt(): ?\DateTimeImmutable { return $this->savedAt; }
    public function setSavedAt(?\DateTimeImmutable $savedAt): self { $this->savedAt = $savedAt; return $this; }

    public function getSavedNoteUpdatedAt(): ?\DateTimeImmutable { return $this->savedNoteUpdatedAt; }
    public function setSavedNoteUpdatedAt(?\DateTimeImmutable $savedNoteUpdatedAt): self { $this->savedNoteUpdatedAt = $savedNoteUpdatedAt; return $this; }

    public function getSavedNoteTags(): ?array { return $this->savedNoteTags; }
    public function setSavedNoteTags(?array $savedNoteTags): self { $this->savedNoteTags = $savedNoteTags; return $this; }

    public function getSavedNoteState(): ?string { return $this->savedNoteState; }
    public function setSavedNoteState(?string $savedNoteState): self { $this->savedNoteState = $savedNoteState; return $this; }

    public function getSavedNoteFollowUpAt(): ?\DateTimeImmutable { return $this->savedNoteFollowUpAt; }
    public function setSavedNoteFollowUpAt(?\DateTimeImmutable $savedNoteFollowUpAt): self { $this->savedNoteFollowUpAt = $savedNoteFollowUpAt; return $this; }

    public function getSavedNoteClosureNote(): ?string { return $this->savedNoteClosureNote; }
    public function setSavedNoteClosureNote(?string $savedNoteClosureNote): self { $this->savedNoteClosureNote = $savedNoteClosureNote; return $this; }
}
