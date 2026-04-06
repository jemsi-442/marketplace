import type { ServiceTypeRecord } from '@/lib/types';

export type InsightItem = {
  title: string;
  detail: string;
};

export type RequestServiceInsights = {
  laneLabel: string;
  outcome: string;
  readiness: InsightItem[];
  process: InsightItem[];
  summaryPlaceholder: string;
  detailsPlaceholder: string;
  timingHint: string;
  budgetHint: string;
};

export type ServiceGroupSignals = {
  bestFor: string;
  requestAngle: string;
  commercialPath: string;
};

export function getServiceCardCue(serviceType: ServiceTypeRecord): string {
  switch (serviceType.group_slug ?? '') {
    case 'software-development':
      return 'Best when you already know the system, app, portal, integration, or engineering workflow you want reviewed first.';
    case 'design-creative':
      return 'Best when the visual deliverable is already clear and you want the request to enter the right creative review lane immediately.';
    case 'social-media-marketing':
      return 'Best when you already know the channel, campaign, or growth activity that should move into managed review next.';
    case 'cybersecurity-infrastructure':
      return 'Best when the security, audit, server, cloud, or stability issue is clear enough to route into technical triage right away.';
    case 'government-consultancy':
      return 'Best when you already know the filing, license, registration, or compliance process that needs structured follow-up.';
    default:
      return 'Best when the workflow, automation, CRM, messaging, or operations need is clear enough to enter the right implementation path immediately.';
  }
}

export function getServiceGroupSignals(groupSlug: string, groupTitle: string): ServiceGroupSignals {
  switch (groupSlug) {
    case 'software-development':
      return {
        bestFor: 'Businesses that need systems, apps, portals, or technical workflows tied to a real operational outcome.',
        requestAngle: 'State the business problem, the users involved, and the features or integrations that matter most.',
        commercialPath: 'The lane usually moves from scope review to technical proposal comparison before one clean admin update.',
      };
    case 'design-creative':
      return {
        bestFor: 'Teams that need brand clarity, campaign visuals, polished presentation, or strong creative direction.',
        requestAngle: 'Describe the brand style, usage channel, and exact assets or deliverables you expect first.',
        commercialPath: 'Creative requests are reviewed for style fit, asset scope, and delivery workload before the next commercial step opens.',
      };
    case 'social-media-marketing':
      return {
        bestFor: 'Brands focused on audience growth, campaign reach, content rhythm, or measurable digital visibility.',
        requestAngle: 'Mention channels, target audience, campaign objective, and whether the priority is content, ads, or both.',
        commercialPath: 'The lane compares operational workload and channel mix first so pricing and timing stay realistic.',
      };
    case 'cybersecurity-infrastructure':
      return {
        bestFor: 'Teams that need protection, stability, audit readiness, infrastructure control, or urgent technical hardening.',
        requestAngle: 'Lead with the risk area, environment context, and whether the need is preventive, compliance-driven, or urgent.',
        commercialPath: 'Security and infrastructure work is triaged first, then matched to the right technical capability before money moves.',
      };
    case 'government-consultancy':
      return {
        bestFor: 'Businesses and institutions dealing with filings, licensing, registrations, compliance documents, or formal follow-up.',
        requestAngle: 'Say which process stage you are in, what documents exist already, and what deadline is creating pressure.',
        commercialPath: 'This lane usually moves through document and process review before the platform returns one controlled next step.',
      };
    default:
      return {
        bestFor: `Teams using ${groupTitle} to reduce manual work, improve messaging flow, or make business operations more reliable.`,
        requestAngle: 'Describe the current manual workflow, the tools involved, and what a smoother operation should look like.',
        commercialPath: 'Operational requests are mapped first so the platform can compare the right setup and implementation path.',
      };
  }
}

export function getRequestServiceInsights(serviceType: ServiceTypeRecord): RequestServiceInsights {
  const group = serviceType.group_slug ?? '';

  switch (group) {
    case 'software-development':
      return {
        laneLabel: 'Software delivery lane',
        outcome: 'Use this when you need a system, portal, app, or technical workflow built around a real business outcome.',
        readiness: [
          { title: 'Core outcome', detail: 'Explain the system, feature, or workflow you want the software to solve.' },
          { title: 'Key screens or flows', detail: 'Mention dashboards, user roles, pages, or customer journeys that matter most.' },
          { title: 'Constraints', detail: 'Call out timing, integrations, devices, or operational limits early.' },
        ],
        process: [
          { title: 'Scope review', detail: 'WOLFIX reviews the request and checks which technical path best fits the outcome.' },
          { title: 'Vendor alignment', detail: 'Qualified vendors propose pricing and approach through the managed review flow.' },
          { title: 'Clear next step', detail: 'You receive one clean admin update before payment or booking continues.' },
        ],
        summaryPlaceholder: 'Example: I need a client portal with sign-in, reports, and payment tracking.',
        detailsPlaceholder: 'Example: Client accounts, admin dashboard, billing history, downloadable reports, mobile-friendly layout, and API connection to our existing system.',
        timingHint: 'Example: We need the first usable version ready this month.',
        budgetHint: 'Example: Budget depends on whether this can start as an MVP first.',
      };
    case 'design-creative':
      return {
        laneLabel: 'Creative delivery lane',
        outcome: 'Use this when visual quality, brand clarity, or polished presentation is the main business need.',
        readiness: [
          { title: 'Brand direction', detail: 'Share any references, brand colors, samples, or style expectations you already have.' },
          { title: 'Usage context', detail: 'Say where the design will be used, such as social posts, print, websites, or presentations.' },
          { title: 'Deliverables', detail: 'Mention exact assets if you know them: logo, slides, posters, creatives, or prototypes.' },
        ],
        process: [
          { title: 'Creative fit check', detail: 'WOLFIX reviews the request to match the right design capability and delivery path.' },
          { title: 'Proposal review', detail: 'Vendors submit timing and pricing with the visual workload in mind.' },
          { title: 'Approval step', detail: 'You receive one decision-ready update before the next commercial step opens.' },
        ],
        summaryPlaceholder: 'Example: I need a clean brand identity for a new logistics company.',
        detailsPlaceholder: 'Example: Logo, color direction, fonts, social templates, and a simple brand guide for print and digital use.',
        timingHint: 'Example: The first concept should be ready before our launch event next week.',
        budgetHint: 'Example: We want a professional starter package before expanding into more assets.',
      };
    case 'social-media-marketing':
      return {
        laneLabel: 'Growth and campaign lane',
        outcome: 'Use this when the goal is audience growth, visibility, campaign performance, or managed content operations.',
        readiness: [
          { title: 'Channels', detail: 'State the platforms involved such as Instagram, Facebook, TikTok, YouTube, email, or search.' },
          { title: 'Audience', detail: 'Describe who you want to reach and what result matters most.' },
          { title: 'Campaign goal', detail: 'Say whether the priority is awareness, leads, engagement, content rhythm, or ad performance.' },
        ],
        process: [
          { title: 'Channel review', detail: 'WOLFIX checks the lane, platform mix, and likely delivery scope.' },
          { title: 'Campaign proposals', detail: 'Vendors respond with pricing and timing based on the operational workload.' },
          { title: 'Managed handoff', detail: 'You receive one clean next step instead of juggling multiple outreach threads.' },
        ],
        summaryPlaceholder: 'Example: I need Instagram and Facebook management for a retail business campaign.',
        detailsPlaceholder: 'Example: We need monthly content planning, ad support, posting cadence, inbox moderation, and clearer growth reporting.',
        timingHint: 'Example: Campaign should start before the next promotion window opens.',
        budgetHint: 'Example: Budget should cover both content handling and paid promotion support.',
      };
    case 'cybersecurity-infrastructure':
      return {
        laneLabel: 'Security and infrastructure lane',
        outcome: 'Use this when stability, protection, audit readiness, or technical environment control is the main need.',
        readiness: [
          { title: 'Risk area', detail: 'Explain the system issue, environment concern, or protection gap you want addressed.' },
          { title: 'Environment context', detail: 'Mention servers, cloud setup, apps, databases, or user access concerns if relevant.' },
          { title: 'Urgency', detail: 'Say whether this is preventive hardening, audit prep, or an active incident or instability issue.' },
        ],
        process: [
          { title: 'Technical triage', detail: 'WOLFIX reviews the infrastructure or security context first.' },
          { title: 'Capability matching', detail: 'Specialist vendors propose work through the managed review path.' },
          { title: 'Controlled next move', detail: 'You receive one structured update before booking or payment continues.' },
        ],
        summaryPlaceholder: 'Example: I need a security review for our public-facing booking platform.',
        detailsPlaceholder: 'Example: Cloud server, admin access, payment flow, and application hardening need review before launch.',
        timingHint: 'Example: This should be reviewed before we move the system into production.',
        budgetHint: 'Example: Budget depends on whether this is a quick audit or a full hardening engagement.',
      };
    case 'government-consultancy':
      return {
        laneLabel: 'Compliance and filing lane',
        outcome: 'Use this when regulated process support, documentation, or institutional follow-through matters most.',
        readiness: [
          { title: 'Process stage', detail: 'Say whether you are starting fresh, correcting a step, or following up an existing application.' },
          { title: 'Available documents', detail: 'Mention what you already have ready so the review starts from real context.' },
          { title: 'Deadline or dependency', detail: 'Call out any legal, tender, licensing, or business deadline driving the request.' },
        ],
        process: [
          { title: 'Process review', detail: 'WOLFIX checks the regulatory path and document needs first.' },
          { title: 'Consultancy match', detail: 'Relevant support vendors propose timing and handling approach through admin review.' },
          { title: 'Formal next step', detail: 'You receive one clear instruction before money or paperwork moves further.' },
        ],
        summaryPlaceholder: 'Example: I need support preparing and following up a BRELA company registration.',
        detailsPlaceholder: 'Example: We have some documents ready, need missing requirements clarified, and want support through the filing steps.',
        timingHint: 'Example: This must be completed before a tender or licensing deadline.',
        budgetHint: 'Example: Budget should fit guided filing support, not full legal representation.',
      };
    default:
      return {
        laneLabel: 'Operations and automation lane',
        outcome: 'Use this when the main goal is smoother workflow, messaging, CRM setup, or process efficiency across the business.',
        readiness: [
          { title: 'Current workflow', detail: 'Explain the manual process or repetitive work you want improved.' },
          { title: 'Tools involved', detail: 'Mention platforms like CRM, ERP, SMS, WhatsApp, forms, or internal spreadsheets if they matter.' },
          { title: 'Desired result', detail: 'State what better operation should look like after the automation or setup is complete.' },
        ],
        process: [
          { title: 'Workflow mapping', detail: 'WOLFIX reviews the operational path before matching service capability.' },
          { title: 'Execution proposals', detail: 'Vendors respond with implementation scope, effort, and timeline.' },
          { title: 'Controlled activation', detail: 'You receive a clean next step before the work moves into booking and payment.' },
        ],
        summaryPlaceholder: 'Example: I need WhatsApp and CRM automation for lead follow-up.',
        detailsPlaceholder: 'Example: Leads come from forms and WhatsApp, then need routing, reminders, status updates, and clean CRM handoff.',
        timingHint: 'Example: We need this workflow active before the next campaign starts.',
        budgetHint: 'Example: Budget depends on whether we start with setup only or include monthly optimization support.',
      };
  }
}
