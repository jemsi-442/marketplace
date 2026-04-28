export type AdminLaneReviewGuidance = {
  laneSummary: string;
  pressureHint: string;
  cards: Array<{
    title: string;
    detail: string;
  }>;
  decisionCopy: string;
  notePlaceholder: string;
};

export function getAdminLaneReviewGuidance(groupSlug?: string | null, groupTitle?: string | null): AdminLaneReviewGuidance {
  switch (groupSlug ?? '') {
    case 'business-finance-support':
      return {
        laneSummary: 'Read finance lanes for control, reporting clarity, and whether the vendor can handle sensitive operational records with discipline.',
        pressureHint: 'Finance lanes usually fail on vague proof, unrealistic turnaround, or pricing that does not match the level of reporting work promised.',
        cards: [
          {
            title: 'Lane context',
            detail: 'Judge whether the vendor can handle bookkeeping, payroll, reporting, or finance coordination with believable process discipline.',
          },
          {
            title: 'Proof and scope',
            detail: 'Price, turnaround, and portfolio note should show careful handling of finance-sensitive work, not generic admin support.',
          },
          {
            title: 'Review outcome',
            detail: 'Approve when the lane feels controlled and trustworthy enough for finance requests. Return when clarity or proof is still weak.',
          },
        ],
        decisionCopy: 'Approve when the finance lane is ready for reporting, payroll, or bookkeeping requests. Return it when the control story still feels weak.',
        notePlaceholder: 'Use this note when finance proof, reporting depth, control language, or turnaround needs to be tightened before approval.',
      };
    case 'content-media-communications':
      return {
        laneSummary: 'Read communication lanes for message quality, production fit, and whether the vendor can shape client-facing outputs with consistency.',
        pressureHint: 'Content lanes usually fail on thin proof, unclear publishing scope, or notes that sound generic across writing, audio, and media work.',
        cards: [
          {
            title: 'Lane context',
            detail: 'Judge whether the vendor can handle writing, editing, transcription, audio, or media-pack work with communication quality in mind.',
          },
          {
            title: 'Proof and scope',
            detail: 'Price, turnaround, and note should support the same communication story, not a generic “we do content” claim.',
          },
          {
            title: 'Review outcome',
            detail: 'Approve when the lane feels production-ready for publishing work. Return it when the message quality or output fit is still vague.',
          },
        ],
        decisionCopy: 'Approve when this communication lane is ready for writing, media, or publishing requests. Return it when the quality story still feels thin.',
        notePlaceholder: 'Use this note when message quality, proof of work, content scope, or media handling needs stronger clarity before approval.',
      };
    case 'training-research-documentation':
      return {
        laneSummary: 'Read documentation lanes for rigor, structure, and whether the vendor can handle proposals, SOPs, research packs, or reporting with discipline.',
        pressureHint: 'Documentation lanes usually fail on shallow portfolio notes, soft turnaround promises, or proof that does not match formal written work.',
        cards: [
          {
            title: 'Lane context',
            detail: 'Judge whether the vendor can structure proposals, manuals, research, and reporting with the rigor these requests usually need.',
          },
          {
            title: 'Proof and scope',
            detail: 'Price, turnaround, and note should reflect document-heavy work with real structure, not generic “writing support” language.',
          },
          {
            title: 'Review outcome',
            detail: 'Approve when the lane feels credible for formal documentation requests. Return it when the structure or depth is still not convincing.',
          },
        ],
        decisionCopy: 'Approve when this documentation lane is ready for proposal, research, or reporting requests. Return it when rigor and structure are still too weak.',
        notePlaceholder: 'Use this note when proposal depth, documentation rigor, reporting clarity, or proof of structured work needs improvement before approval.',
      };
    default:
      return {
        laneSummary: `Review ${groupTitle || 'this capability lane'} in business context first, then decide whether price, proof, and turnaround are coherent enough to feed matched work.`,
        pressureHint: 'Most lanes fail when price, portfolio note, and turnaround do not support the same delivery story.',
        cards: [
          {
            title: 'Lane context',
            detail: 'Judge the capability inside its business lane first, not as an isolated card.',
          },
          {
            title: 'Proof and scope',
            detail: 'Portfolio note, price, and turnaround should support the same delivery story.',
          },
          {
            title: 'Review outcome',
            detail: 'Approve when the lane is ready for matching, or return it with a note that leads to better clarity.',
          },
        ],
        decisionCopy: 'Approve when the vendor lane is ready for request matching. Return it when the price, scope, or proof needs changes first.',
        notePlaceholder: 'Use this note when you need the vendor to change price, proof, or delivery context.',
      };
  }
}
