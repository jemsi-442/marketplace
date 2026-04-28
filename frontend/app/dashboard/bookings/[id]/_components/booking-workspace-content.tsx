'use client';

import type { BookingWorkspaceModel } from '../use-booking-workspace';

import { BookingDeliveryPanel } from './booking-delivery-panel';
import { BookingMessagesPanel } from './booking-messages-panel';
import { BookingOverviewSection } from './booking-overview-section';
import { BookingPaymentPanel } from './booking-payment-panel';

interface BookingWorkspaceContentProps {
  workspace: BookingWorkspaceModel;
}

export function BookingWorkspaceContent({
  workspace,
}: BookingWorkspaceContentProps) {
  if (!workspace.booking.data) {
    return null;
  }

  return (
    <>
      <BookingOverviewSection
        booking={workspace.booking.data}
        nextStep={workspace.nextStep}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <BookingPaymentPanel
          bookingEscrow={workspace.booking.data.escrow}
          canManagePayment={workspace.canManagePayment}
          isClient={workspace.canManagePayment}
          isVendor={workspace.isVendor}
          paymentPanelTitle={workspace.paymentPanelTitle}
          paymentEmptyStatus={workspace.paymentEmptyStatus}
          showEscrowReviewContext={workspace.showEscrowReviewContext}
          showCollectionForm={workspace.showCollectionForm}
          showDisputeForm={workspace.showDisputeForm}
          watchedCollectionMsisdn={workspace.watchedCollectionMsisdn}
          watchedCollectionProvider={workspace.watchedCollectionProvider}
          collectionReady={workspace.collectionReady}
          disputeReady={workspace.disputeReady}
          collectionErrors={workspace.collectionErrors}
          disputeErrors={workspace.disputeErrors}
          inlineSuccess={workspace.inlineSuccess}
          collectionForm={workspace.collectionForm}
          disputeForm={workspace.disputeForm}
          createEscrowPending={workspace.mutationState.createEscrowPending}
          collectPaymentPending={workspace.mutationState.collectPaymentPending}
          releaseEscrowPending={workspace.mutationState.releaseEscrowPending}
          disputeEscrowPending={workspace.mutationState.disputeEscrowPending}
          onCreateEscrow={workspace.actions.createEscrow}
          onReleaseEscrow={workspace.actions.releaseEscrow}
          onToggleCollectionForm={workspace.actions.toggleCollectionForm}
          onToggleDisputeForm={workspace.actions.toggleDisputeForm}
          onCloseCollectionForm={workspace.actions.closeCollectionForm}
          onCloseDisputeForm={workspace.actions.closeDisputeForm}
          onCollectionSubmit={workspace.formHandlers.handleCollectionSubmit}
          onDisputeSubmit={workspace.formHandlers.handleDisputeSubmit}
        />

        <BookingDeliveryPanel
          isVendor={workspace.isVendor}
          isAdmin={workspace.isAdmin}
          deliveriesLoading={workspace.deliveries.isLoading}
          deliveries={workspace.deliveries.data ?? []}
          deliveryFiles={workspace.deliveryFiles}
          deliveryReady={workspace.deliveryReady}
          deliveryErrors={workspace.deliveryErrors}
          inlineSuccess={workspace.inlineSuccess}
          pendingDeliveryDeleteId={workspace.pendingDeliveryDeleteId}
          pendingAttachmentDeleteId={workspace.pendingAttachmentDeleteId}
          deliveryForm={workspace.deliveryForm}
          submitDeliveryPending={workspace.mutationState.submitDeliveryPending}
          onDeliverySubmit={workspace.formHandlers.handleDeliverySubmit}
          onSetDeliveryFiles={workspace.actions.setDeliveryFiles}
          onClearDraft={workspace.actions.clearDeliveryDraft}
          onDeleteDelivery={workspace.actions.deleteDelivery}
          onDeleteAttachment={workspace.actions.deleteAttachment}
          onAttachmentDownload={workspace.actions.downloadAttachment}
        />
      </div>

      <BookingMessagesPanel
        isAdmin={workspace.isAdmin}
        isVendor={workspace.isVendor}
        currentUser={workspace.user}
        messagesLoading={workspace.bookingThread.isLoading}
        messages={workspace.bookingThread.data ?? []}
        messageErrors={workspace.messageErrors}
        messageReady={workspace.messageReady}
        threadReceiverId={workspace.threadReceiverId}
        inlineSuccess={workspace.inlineSuccess}
        messageForm={workspace.messageForm}
        sendMessagePending={workspace.mutationState.sendMessagePending}
        onMessageSubmit={workspace.formHandlers.handleMessageSubmit}
      />
    </>
  );
}
