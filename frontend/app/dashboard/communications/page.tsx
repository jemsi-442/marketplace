'use client';

import { CommunicationsPageScreen } from './_components/communications-page-screen';
import { useCommunications } from './use-communications';

export default function CommunicationsPage() {
  const workspace = useCommunications();

  return <CommunicationsPageScreen workspace={workspace} />;
}
