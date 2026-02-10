<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\AiInteraction;
use App\Repository\AiInteractionRepository;
use App\Repository\ServiceRepository;
use Doctrine\ORM\EntityManagerInterface;

class AiRecommendationService
{
    private ServiceRepository $serviceRepo;
    private AiInteractionRepository $aiRepo;
    private EntityManagerInterface $em;

    public function __construct(ServiceRepository $serviceRepo, AiInteractionRepository $aiRepo, EntityManagerInterface $em)
    {
        $this->serviceRepo = $serviceRepo;
        $this->aiRepo = $aiRepo;
        $this->em = $em;
    }

    /**
     * Recommend services based on user history, categories, ratings
     */
    public function recommendServices(User $user, int $limit = 5): array
    {
        // Simplified algorithm: top-rated services in user's preferred categories
        $preferredCategories = []; // fetch from user profile / previous bookings
        $query = $this->serviceRepo->createQueryBuilder('s')
            ->where('s.category IN (:cats)')
            ->setParameter('cats', $preferredCategories ?: [])
            ->orderBy('s.rating', 'DESC')
            ->setMaxResults($limit)
            ->getQuery();

        $services = $query->getResult();
        $result = [];
        foreach ($services as $s) {
            $result[] = [
                'id' => $s->getId(),
                'title' => $s->getTitle(),
                'vendorId' => $s->getVendor()->getId(),
                'price' => $s->getPrice(),
                'rating' => $s->getRating(),
            ];
        }

        return $result;
    }

    /**
     * Handle AI questions, ensure context is project-related
     * Returns consistent answer if same question was asked before
     */
    public function handleQuestion(string $question): string
    {
        $questionKey = strtolower(trim($question));

        // Check if question already exists
        $existing = $this->aiRepo->findOneBy(['question' => $questionKey]);
        if ($existing) {
            return $existing->getAnswer();
        }

        // If outside project scope, redirect answer
        $allowedKeywords = ['service', 'vendor', 'booking', 'payment', 'marketplace', 'review', 'notification'];
        $isRelevant = false;
        foreach ($allowedKeywords as $kw) {
            if (stripos($questionKey, $kw) !== false) {
                $isRelevant = true;
                break;
            }
        }

        if (!$isRelevant) {
            $answer = "Samahani, tafadhali uliza kuhusu marketplace yetu ya tech services (services, vendors, bookings, payments, reviews, notifications).";
        } else {
            // Generate simple AI answer (mock, replace with real AI later)
            $answer = "Hapa ni jibu la AI kwa swali lako: '{$question}' juu ya marketplace yetu.";
        }

        // Save for consistent future answers
        $interaction = new AiInteraction();
        $interaction->setQuestion($questionKey);
        $interaction->setAnswer($answer);
        $this->em->persist($interaction);
        $this->em->flush();

        return $answer;
    }
}
