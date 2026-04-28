export type RequestReviewInsight = {
  laneLabel: string;
  clientSummary: string;
  adminSummary: string;
  nextStepHint: string;
  timelinePlaceholder: string;
  adminAssignmentPlaceholder: string;
};

export function getRequestReviewInsight(groupSlug?: string | null, groupTitle?: string | null): RequestReviewInsight {
  switch (groupSlug ?? '') {
    case 'business-finance-support':
      return {
        laneLabel: groupTitle || 'Finance support lane',
        clientSummary:
          'This request is moving through finance review first, so the platform is checking reporting clarity, process control, and whether the selected lane can handle recurring business records carefully.',
        adminSummary:
          'Review this like finance work first: compare control, reporting depth, and whether the selected lane can handle sensitive operational records cleanly.',
        nextStepHint: 'Price and timing are ready. Open the protected booking when you are ready to move this finance path forward.',
        timelinePlaceholder: 'Example: 3 working days for the first reporting pack',
        adminAssignmentPlaceholder: 'Add a short finance-focused update for the client before payment opens.',
      };
    case 'content-media-communications':
      return {
        laneLabel: groupTitle || 'Content and communications lane',
        clientSummary:
          'This request is moving through communication review first, so the platform is checking message quality, production fit, and whether the selected lane can deliver the outputs clearly.',
        adminSummary:
          'Review this like communication work first: compare message quality, production fit, and whether the selected lane can carry the publishing workload well.',
        nextStepHint: 'Price and timing are ready. Open the protected booking when you are ready to move this communication path forward.',
        timelinePlaceholder: 'Example: 2 working days for draft delivery and review',
        adminAssignmentPlaceholder: 'Add a short communication-focused update for the client before payment opens.',
      };
    case 'training-research-documentation':
      return {
        laneLabel: groupTitle || 'Research and documentation lane',
        clientSummary:
          'This request is moving through documentation review first, so the platform is checking rigor, structure, and whether the selected lane can handle formal written work with discipline.',
        adminSummary:
          'Review this like documentation work first: compare proposal depth, structured writing quality, and whether the selected lane can handle formal outputs convincingly.',
        nextStepHint: 'Price and timing are ready. Open the protected booking when you are ready to move this documentation path forward.',
        timelinePlaceholder: 'Example: 5 working days for a structured first draft',
        adminAssignmentPlaceholder: 'Add a short documentation-focused update for the client before payment opens.',
      };
    default:
      return {
        laneLabel: groupTitle || 'Request lane',
        clientSummary:
          `This request is being handled inside ${groupTitle || 'its business lane'}, so the platform is checking fit, timing, and price in that lane context first.`,
        adminSummary:
          `Review this request inside ${groupTitle || 'its business lane'} first, then compare proposal fit, timing, and price before opening payment.`,
        nextStepHint: 'Price and timeline are ready. Open the protected booking when you are ready.',
        timelinePlaceholder: 'Example: 5 working days',
        adminAssignmentPlaceholder: 'Add a short platform update for the client before payment opens.',
      };
  }
}
