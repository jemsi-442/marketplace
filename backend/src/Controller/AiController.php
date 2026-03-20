<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\AiRecommendationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/ai')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class AiController extends AbstractController
{
    #[Route('/question', name: 'ai_question', methods: ['POST'])]
    public function question(Request $request, AiRecommendationService $aiService): JsonResponse
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

        $answer = $aiService->handleQuestion($question);

        return $this->json([
            'question' => $question,
            'answer' => $answer
        ]);
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

        return $this->json(['recommendations' => $services]);
    }
}
