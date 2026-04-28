'use client';

import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { inferFeedbackTone } from '@/lib/ui/feedback-tone';

import type { BookingWorkspaceModel } from '../use-booking-workspace';
import { BookingWorkspaceContent } from './booking-workspace-content';
import { BookingWorkspaceState } from './booking-workspace-state';

interface BookingWorkspaceBodyProps {
  workspace: BookingWorkspaceModel;
}

export function BookingWorkspaceBody({
  workspace,
}: BookingWorkspaceBodyProps) {
  return (
    <div className="space-y-6">
      {workspace.feedback ? (
        <FeedbackBanner
          message={workspace.feedback}
          tone={inferFeedbackTone(workspace.feedback)}
          onDismiss={workspace.actions.dismissFeedback}
        />
      ) : null}

      {workspace.booking.isLoading ||
      workspace.booking.isError ||
      !workspace.booking.data ? (
        <BookingWorkspaceState
          hasBooking={Boolean(workspace.booking.data)}
          isError={workspace.booking.isError}
          isLoading={workspace.booking.isLoading}
        />
      ) : (
        <BookingWorkspaceContent workspace={workspace} />
      )}
    </div>
  );
}
