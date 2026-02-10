<?php

namespace App\EventSubscriber;

use App\Entity\User;
use App\Entity\VendorProfile;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;

class VendorProfileSubscriber implements EventSubscriberInterface
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * Symfony EventSubscriberInterface requires this to be static
     */
    public static function getSubscribedEvents(): array
    {
        // We listen to the login event to create VendorProfile if needed
        return [
            InteractiveLoginEvent::class => 'onLogin',
        ];
    }

    public function onLogin(InteractiveLoginEvent $event): void
    {
        $user = $event->getAuthenticationToken()->getUser();

        if (!$user instanceof User) {
            return;
        }

        // Only create VendorProfile if role is ROLE_VENDOR and profile does not exist
        if (in_array('ROLE_VENDOR', $user->getRoles()) &&
            !$this->em->getRepository(VendorProfile::class)->findOneBy(['user' => $user])
        ) {
            $vendorProfile = new VendorProfile();
            $vendorProfile->setUser($user);
            $vendorProfile->setDisplayName($user->getEmail());
            $vendorProfile->setVerified(false);
            $vendorProfile->setCreatedAt(new \DateTimeImmutable());

            $this->em->persist($vendorProfile);
            $this->em->flush();
        }
    }
}
