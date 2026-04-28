export type VendorRequestMatchInsight = {
  laneLabel: string;
  fitSummary: string;
  priceHint: string;
  timelineHint: string;
  adminNoteHint: string;
};

export function getVendorRequestMatchInsight(groupSlug?: string | null, groupTitle?: string | null): VendorRequestMatchInsight {
  switch (groupSlug ?? '') {
    case 'business-finance-support':
      return {
        laneLabel: groupTitle || 'Finance support lane',
        fitSummary: 'This lane is usually judged on control, reporting clarity, and whether your finance handling feels believable for recurring operational work.',
        priceHint: 'Price should reflect record volume, reporting depth, and process discipline, not generic admin support.',
        timelineHint: 'Timeline should be realistic for reporting cycles, payroll handling, or finance cleanup work.',
        adminNoteHint: 'Use the admin note to explain record complexity, reporting scope, internal controls, or recurring workload assumptions.',
      };
    case 'content-media-communications':
      return {
        laneLabel: groupTitle || 'Content and communications lane',
        fitSummary: 'This lane is usually judged on communication quality, publishing fit, and whether your output discipline matches the client-facing work requested.',
        priceHint: 'Price should reflect production effort, editing depth, or publishing workload, not a vague “content support” claim.',
        timelineHint: 'Timeline should match drafting, editing, approval, and media-production rhythm where relevant.',
        adminNoteHint: 'Use the admin note to explain quality standards, publishing workload, revision logic, or communication deliverables.',
      };
    case 'training-research-documentation':
      return {
        laneLabel: groupTitle || 'Research and documentation lane',
        fitSummary: 'This lane is usually judged on rigor, structure, and whether your note proves you can handle formal written work with discipline.',
        priceHint: 'Price should reflect proposal depth, reporting structure, or documentation rigor, not generic writing support.',
        timelineHint: 'Timeline should allow for structured drafting, review, and document cleanup where detail matters.',
        adminNoteHint: 'Use the admin note to explain document depth, research effort, review rounds, or how you handle formal written outputs.',
      };
    default:
      return {
        laneLabel: groupTitle || 'Matched lane',
        fitSummary: `This request sits inside ${groupTitle || 'the matched lane'}, so explain your fit in that business context before you price it.`,
        priceHint: 'Price should match the actual delivery workload and the proof your lane already gives admin.',
        timelineHint: 'Timeline should be realistic for the work described, not just optimistic.',
        adminNoteHint: 'Use the admin note to explain the delivery logic that makes your proposal easier to compare fairly.',
      };
  }
}
