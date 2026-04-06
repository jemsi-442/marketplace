<?php

namespace App\Controller;

use App\Entity\AiInteraction;
use App\Entity\User;
use App\Repository\AiInteractionRepository;
use App\Service\AiRecommendationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/ai')]
#[IsGranted('ROLE_ADMIN')]
class AiController extends AbstractController
{
    private const MAX_QUESTION_LENGTH = 600;
    private const MAX_CONTEXT_TAG_LENGTH = 80;
    private const MAX_CONTEXT_FILTER_KEY_LENGTH = 80;
    private const MAX_CONTEXT_ITEMS = 12;
    private const MAX_CONTEXT_DEPTH = 3;
    private const MAX_CONTEXT_STRING_LENGTH = 160;

    public function __construct(
        private readonly AiInteractionRepository $aiInteractionRepository,
        private readonly EntityManagerInterface $em,
        #[Autowire(service: 'limiter.ai_question')]
        private readonly RateLimiterFactory $aiQuestionLimiter,
    ) {
    }

    #[Route('/question', name: 'ai_question', methods: ['POST'])]
    public function question(
        Request $request,
        AiRecommendationService $aiService
    ): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $questionRaw = $data['question'] ?? '';
        $question = is_string($questionRaw) ? trim($questionRaw) : '';
        if (!$question) {
            return $this->json(['error' => 'Question is required'], 400);
        }
        if (mb_strlen($question) > self::MAX_QUESTION_LENGTH) {
            return $this->json([
                'error' => sprintf('Question must not exceed %d characters', self::MAX_QUESTION_LENGTH),
            ], 400);
        }

        $contextTagRaw = $data['context_tag'] ?? null;
        $contextTag = is_string($contextTagRaw) ? mb_substr(trim($contextTagRaw), 0, self::MAX_CONTEXT_TAG_LENGTH) : null;
        $contextDataRaw = $data['context'] ?? [];
        $contextData = is_array($contextDataRaw) ? $this->normalizeContextData($contextDataRaw) : [];
        $limiter = $this->aiQuestionLimiter->create(sprintf('%d|%s', $user->getId() ?? 0, $request->getClientIp() ?? 'unknown'));
        if (!$limiter->consume()->isAccepted()) {
            return $this->json([
                'error' => 'Too many AI requests. Slow down and try again shortly.',
            ], 429);
        }

        $interaction = $aiService->handleQuestion($user, $question, $contextTag, $contextData);

        return $this->json($this->serializeInteraction($interaction, $aiService));
    }

    #[Route('/history', name: 'ai_history', methods: ['GET'])]
    public function history(Request $request, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $limit = max(1, min((int) $request->query->get('limit', 6), 20));
        $contextTagRaw = $request->query->get('context_tag');
        $contextTag = is_string($contextTagRaw) ? trim($contextTagRaw) : null;
        $history = $this->aiInteractionRepository->findRecentForUser(
            $user,
            $limit,
            $contextTag,
            $this->readContextFilter($request)
        );

        return $this->json([
            'history' => array_map(
                fn ($interaction): array => $this->serializeInteraction($interaction, $aiService),
                $history
            ),
        ]);
    }

    #[Route('/history', name: 'ai_history_clear', methods: ['DELETE'])]
    public function clearHistory(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $contextTagRaw = $request->query->get('context_tag');
        $contextTag = is_string($contextTagRaw) ? trim($contextTagRaw) : null;
        $interactions = $this->aiInteractionRepository->findAllForUser(
            $user,
            $contextTag,
            $this->readContextFilter($request)
        );
        foreach ($interactions as $interaction) {
            $this->em->remove($interaction);
        }

        $this->em->flush();

        return $this->json(['message' => 'AI history cleared']);
    }

    #[Route('/saved-notes', name: 'ai_saved_notes', methods: ['GET'])]
    public function savedNotes(Request $request, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $contextTagRaw = $request->query->get('context_tag');
        $contextTag = is_string($contextTagRaw) ? trim($contextTagRaw) : null;
        $notes = $this->aiInteractionRepository->findSavedNotesForUser(
            $user,
            $contextTag,
            $this->readContextFilter($request)
        );

        return $this->json([
            'notes' => array_map(
                fn (AiInteraction $interaction): array => $this->serializeInteraction($interaction, $aiService),
                $notes
            ),
        ]);
    }

    #[Route('/saved-notes', name: 'ai_saved_notes_clear', methods: ['DELETE'])]
    public function clearSavedNotes(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $contextTagRaw = $request->query->get('context_tag');
        $contextTag = is_string($contextTagRaw) ? trim($contextTagRaw) : null;
        $notes = $this->aiInteractionRepository->findSavedNotesForUser(
            $user,
            $contextTag,
            $this->readContextFilter($request)
        );

        foreach ($notes as $note) {
            $note
                ->setIsSavedNote(false)
                ->setSavedAt(null)
                ->setSavedNoteUpdatedAt(null)
                ->setSavedNoteTitle(null)
                ->setSavedNoteTags(null)
                ->setSavedNoteState(null)
                ->setSavedNoteFollowUpAt(null)
                ->setSavedNoteClosureNote(null);
        }

        $this->em->flush();

        return $this->json(['message' => 'Saved AI notes cleared']);
    }

    #[Route('/history/{id}/save-note', name: 'ai_history_save_note', methods: ['POST', 'PATCH'])]
    public function saveNote(int $id, Request $request, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $interaction = $this->aiInteractionRepository->find($id);
        if (!$interaction instanceof AiInteraction || $interaction->getUser()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'AI interaction not found'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if ($payload !== null && !is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $payload = is_array($payload) ? $payload : [];

        $titleProvided = array_key_exists('title', $payload);
        $titleRaw = is_array($payload) ? ($payload['title'] ?? null) : null;
        $title = is_string($titleRaw) ? trim($titleRaw) : '';
        $tagsProvided = array_key_exists('tags', $payload);
        $tagsRaw = is_array($payload) ? ($payload['tags'] ?? null) : null;
        $tags = is_array($tagsRaw)
            ? array_values(array_slice(array_unique(array_filter(array_map(
                static fn ($tag): string => is_string($tag) ? trim($tag) : '',
                $tagsRaw
            ))), 0, 6))
            : null;
        $stateProvided = array_key_exists('state', $payload);
        $state = $this->normalizeSavedNoteState($payload['state'] ?? null);
        if ($stateProvided && $state === null) {
            return $this->json(['error' => 'Saved note state must be active, completed, or archived'], 400);
        }

        $followUpProvided = array_key_exists('follow_up_at', $payload);
        $followUpAt = $this->parseFollowUpAt($payload['follow_up_at'] ?? null);
        if ($followUpProvided && ($payload['follow_up_at'] ?? null) !== null && ($payload['follow_up_at'] ?? null) !== '' && $followUpAt === null) {
            return $this->json(['error' => 'Follow-up date must be a valid date'], 400);
        }
        $closureNoteProvided = array_key_exists('closure_note', $payload);
        $closureNoteRaw = $payload['closure_note'] ?? null;
        $closureNote = is_string($closureNoteRaw) ? trim($closureNoteRaw) : null;

        $interaction
            ->setIsSavedNote(true)
            ->setSavedAt($interaction->getSavedAt() ?? new \DateTimeImmutable())
            ->setSavedNoteUpdatedAt(new \DateTimeImmutable());

        if ($titleProvided) {
            $interaction->setSavedNoteTitle($title !== '' ? mb_substr($title, 0, 160) : null);
        }

        if ($tagsProvided) {
            $interaction->setSavedNoteTags($tags);
        }

        $nextState = $stateProvided ? $state : ($interaction->getSavedNoteState() ?? 'active');
        $interaction->setSavedNoteState($nextState);

        if ($followUpProvided) {
            $interaction->setSavedNoteFollowUpAt($followUpAt);
        } elseif (in_array($nextState, ['completed', 'archived'], true)) {
            $interaction->setSavedNoteFollowUpAt(null);
        }

        if ($closureNoteProvided) {
            $interaction->setSavedNoteClosureNote($closureNote !== '' ? mb_substr($closureNote ?? '', 0, 1000) : null);
        } elseif ($nextState === 'active') {
            $interaction->setSavedNoteClosureNote(null);
        }

        $effectiveTags = $tagsProvided
            ? ($tags ?? [])
            : ($interaction->getSavedNoteTags() ?? []);
        $effectiveClosureNote = $closureNoteProvided
            ? ($closureNote !== '' ? $closureNote : null)
            : $interaction->getSavedNoteClosureNote();

        if ($nextState === 'completed' && in_array('urgent', $effectiveTags, true) && $effectiveClosureNote === null) {
            return $this->json(['error' => 'Urgent notes need a closure note before they can be completed'], 400);
        }

        $this->em->flush();

        return $this->json($this->serializeInteraction($interaction, $aiService));
    }

    #[Route('/history/{id}/save-note', name: 'ai_history_remove_note', methods: ['DELETE'])]
    public function removeSavedNote(int $id, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $interaction = $this->aiInteractionRepository->find($id);
        if (!$interaction instanceof AiInteraction || $interaction->getUser()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'AI interaction not found'], 404);
        }

        $interaction
            ->setIsSavedNote(false)
            ->setSavedAt(null)
            ->setSavedNoteUpdatedAt(null)
            ->setSavedNoteTitle(null)
            ->setSavedNoteTags(null)
            ->setSavedNoteState(null)
            ->setSavedNoteFollowUpAt(null)
            ->setSavedNoteClosureNote(null);

        $this->em->flush();

        return $this->json($this->serializeInteraction($interaction, $aiService));
    }

    #[Route('/recommendations', name: 'ai_recommendations', methods: ['GET'])]
    public function recommendations(Request $request, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $services = $aiService->recommendServices(
            $user,
            [
                'query' => (string) $request->query->get('q', ''),
                'budget_minor' => (int) $request->query->get('budget_minor', 0),
                'timeline_days' => $request->query->has('timeline_days') ? (int) $request->query->get('timeline_days') : null,
                'risk_tolerance' => (string) $request->query->get('risk_tolerance', 'MEDIUM'),
            ],
            (int) $request->query->get('limit', 5)
        );

        return $this->json([
            'recommendations' => $services,
            'advisory_only' => true,
            'decision_owner' => 'admin',
            'message' => 'Internal AI guidance only. Admin review is still required before any platform action.',
        ]);
    }

    private function serializeInteraction(AiInteraction $interaction, AiRecommendationService $aiService): array
    {
        return [
            'id' => $interaction->getId(),
            'question' => $interaction->getQuestion(),
            'answer' => $interaction->getAnswer(),
            'created_at' => $interaction->getCreatedAt()->format('Y-m-d H:i:s'),
            'context_tag' => $interaction->getContextTag(),
            'context' => $interaction->getContextData(),
            'focus_area' => $aiService->determineFocusArea(
                $interaction->getContextTag(),
                $interaction->getContextData()
            ),
            'recommended_action' => $aiService->buildStructuredRecommendation(
                $interaction->getContextTag(),
                $interaction->getContextData()
            ),
            'is_saved_note' => $interaction->isSavedNote(),
            'saved_note_title' => $interaction->getSavedNoteTitle(),
            'saved_at' => $interaction->getSavedAt()?->format('Y-m-d H:i:s'),
            'saved_note_updated_at' => $interaction->getSavedNoteUpdatedAt()?->format('Y-m-d H:i:s'),
            'saved_note_tags' => $interaction->getSavedNoteTags(),
            'saved_note_state' => $interaction->getSavedNoteState(),
            'saved_note_follow_up_at' => $interaction->getSavedNoteFollowUpAt()?->format('Y-m-d'),
            'saved_note_closure_note' => $interaction->getSavedNoteClosureNote(),
            'advisory_only' => true,
            'decision_owner' => 'admin',
        ];
    }

    private function normalizeSavedNoteState(mixed $state): ?string
    {
        if (!is_string($state)) {
            return null;
        }

        $normalized = strtolower(trim($state));

        return in_array($normalized, ['active', 'completed', 'archived'], true) ? $normalized : null;
    }

    private function parseFollowUpAt(mixed $value): ?\DateTimeImmutable
    {
        if ($value === null) {
            return null;
        }

        if (!is_string($value)) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        try {
            return new \DateTimeImmutable($normalized);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array{key?: string, value?: mixed}|null
     */
    private function readContextFilter(Request $request): ?array
    {
        $keyRaw = $request->query->get('context_key');
        $key = is_string($keyRaw) ? trim($keyRaw) : '';
        if ($key === '') {
            return null;
        }
        $key = mb_substr($key, 0, self::MAX_CONTEXT_FILTER_KEY_LENGTH);

        $value = $this->normalizeContextScalar($request->query->get('context_value'));

        return [
            'key' => $key,
            'value' => $value,
        ];
    }

    /**
     * @param array<string|int, mixed> $contextData
     * @return array<string, mixed>
     */
    private function normalizeContextData(array $contextData, int $depth = 0): array
    {
        if ($depth >= self::MAX_CONTEXT_DEPTH) {
            return [];
        }

        $normalized = [];
        $count = 0;

        foreach ($contextData as $key => $value) {
            if ($count >= self::MAX_CONTEXT_ITEMS) {
                break;
            }

            $normalizedKey = trim((string) $key);
            if ($normalizedKey === '') {
                continue;
            }

            $normalizedKey = mb_substr($normalizedKey, 0, self::MAX_CONTEXT_FILTER_KEY_LENGTH);
            $normalizedValue = is_array($value)
                ? $this->normalizeContextData($value, $depth + 1)
                : $this->normalizeContextScalar($value);

            if ($normalizedValue === null || $normalizedValue === []) {
                continue;
            }

            $normalized[$normalizedKey] = $normalizedValue;
            ++$count;
        }

        return $normalized;
    }

    private function normalizeContextScalar(mixed $value): string|int|float|bool|null
    {
        if (is_string($value)) {
            $normalized = trim($value);

            return $normalized === ''
                ? null
                : mb_substr($normalized, 0, self::MAX_CONTEXT_STRING_LENGTH);
        }

        if (is_int($value) || is_float($value) || is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return str_contains((string) $value, '.') ? (float) $value : (int) $value;
        }

        return null;
    }
}
