'use client';

import { NotificationsPageScreen } from './_components/notifications-page-screen';
import { useNotifications } from './use-notifications';

export default function NotificationsPage() {
  const workspace = useNotifications();

  return <NotificationsPageScreen workspace={workspace} />;
}
