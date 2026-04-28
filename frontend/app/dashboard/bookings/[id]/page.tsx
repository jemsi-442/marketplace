'use client';

import { BookingWorkspacePageScreen } from './_components/booking-workspace-page-screen';
import { useBookingWorkspace } from './use-booking-workspace';

export default function BookingWorkspacePage() {
  const workspace = useBookingWorkspace();

  return <BookingWorkspacePageScreen workspace={workspace} />;
}
