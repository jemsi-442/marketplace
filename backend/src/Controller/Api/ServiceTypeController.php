<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ServiceType;
use App\Entity\User;
use App\Repository\ServiceTypeRepository;
use App\Support\ServiceGroupCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/service-types')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class ServiceTypeController extends AbstractController
{
    /**
     * @return array<string, mixed>
     */
    private function serializeServiceType(ServiceType $serviceType): array
    {
        $groupSlug = ServiceGroupCatalog::resolveSlugForCategory($serviceType->getCategory());
        $group = ServiceGroupCatalog::findBySlug($groupSlug);

        return [
            'id' => $serviceType->getId(),
            'name' => $serviceType->getName(),
            'slug' => $serviceType->getSlug(),
            'description' => $serviceType->getDescription(),
            'category' => $serviceType->getCategory(),
            'group_slug' => $groupSlug,
            'group_title' => is_array($group) ? $group['title'] : null,
            'is_active' => $serviceType->isActive(),
            'requires_admin_assignment' => $serviceType->requiresAdminAssignment(),
            'default_brief_template' => $serviceType->getDefaultBriefTemplate(),
        ];
    }

    private function isAdmin(User $user): bool
    {
        $roles = $user->getRoles();

        return in_array('ROLE_ADMIN', $roles, true) || in_array('ROLE_SUPER_ADMIN', $roles, true);
    }

    #[Route('/groups', name: 'service_group_list', methods: ['GET'])]
    public function groups(ServiceTypeRepository $repository): JsonResponse
    {
        $serviceTypes = $repository->findBy(['isActive' => true], ['name' => 'ASC']);
        $counts = [];

        foreach ($serviceTypes as $serviceType) {
            $slug = ServiceGroupCatalog::resolveSlugForCategory($serviceType->getCategory());
            $counts[$slug] = ($counts[$slug] ?? 0) + 1;
        }

        $result = [];
        foreach (ServiceGroupCatalog::all() as $group) {
            $slug = $group['slug'];
            $result[] = [
                'slug' => $slug,
                'title' => $group['title'],
                'eyebrow' => $group['eyebrow'],
                'description' => $group['description'],
                'hero_title' => $group['hero_title'],
                'hero_description' => $group['hero_description'],
                'search_placeholder' => $group['search_placeholder'],
                'category_labels' => $group['category_labels'],
                'featured_services' => $group['featured_services'],
                'service_count' => $counts[$slug] ?? 0,
            ];
        }

        return $this->json($result);
    }

    #[Route('', name: 'service_type_list', methods: ['GET'])]
    public function list(Request $request, ServiceTypeRepository $repository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        $includeInactive = filter_var((string) $request->query->get('include_inactive', '0'), FILTER_VALIDATE_BOOL);
        $search = trim((string) $request->query->get('search', ''));
        $group = trim((string) $request->query->get('group', ''));
        $category = trim((string) $request->query->get('category', ''));

        if ($includeInactive && !$this->isAdmin($user)) {
            return $this->json(['error' => 'Only admin workspaces can view inactive service types'], 403);
        }

        $qb = $repository->createQueryBuilder('st')
            ->orderBy('st.name', 'ASC');

        if (!$includeInactive) {
            $qb
                ->andWhere('st.isActive = :isActive')
                ->setParameter('isActive', true);
        }

        if ($category !== '') {
            $qb
                ->andWhere('st.category = :category')
                ->setParameter('category', $category);
        }

        if ($group !== '') {
            $groupCategories = ServiceGroupCatalog::categoriesForSlug($group);
            if ($groupCategories === []) {
                return $this->json([]);
            }

            $qb
                ->andWhere('st.category IN (:groupCategories)')
                ->setParameter('groupCategories', $groupCategories);
        }

        if ($search !== '') {
            $qb
                ->andWhere('LOWER(CONCAT(st.name, \' \', COALESCE(st.description, \'\'), \' \', COALESCE(st.category, \'\'))) LIKE :search')
                ->setParameter('search', '%' . mb_strtolower($search) . '%');
        }

        $serviceTypes = $qb->getQuery()->getResult();

        $result = [];
        foreach ($serviceTypes as $serviceType) {
            $result[] = $this->serializeServiceType($serviceType);
        }

        return $this->json($result);
    }

    #[Route('/{id}', name: 'service_type_show', methods: ['GET'])]
    public function show(ServiceType $serviceType): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 403);
        }

        if (!$serviceType->isActive() && !$this->isAdmin($user)) {
            return $this->json(['error' => 'Service type not available'], 404);
        }

        return $this->json($this->serializeServiceType($serviceType));
    }
}
