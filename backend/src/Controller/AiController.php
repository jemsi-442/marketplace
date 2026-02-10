<?php

namespace App\Controller;

use App\Service\AiRecommendationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/ai')]
class AiController extends AbstractController
{
    #[Route('/question', name: 'ai_question', methods: ['POST'])]
    public function question(Request $request, AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $question = trim($data['question'] ?? '');
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
    public function recommendations(AiRecommendationService $aiService): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $services = $aiService->recommendServices($user);

        return $this->json(['recommendations' => $services]);
    }
}
