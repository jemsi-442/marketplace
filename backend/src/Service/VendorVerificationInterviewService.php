<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\VendorProfile;
use App\Entity\VendorServiceCapability;

final class VendorVerificationInterviewService
{
    private const PASS_THRESHOLD = 62;
    private const GENERIC_AI_PHRASES = [
        'ensure high quality',
        'ensure quality',
        'best practices',
        'seamless',
        'leverage',
        'utilize',
        'in order to',
        'as needed',
        'based on the requirements',
        'align with client expectations',
        'industry standards',
        'optimize workflow',
        'holistic approach',
        'comprehensive solution',
        'robust process',
        'efficiently and effectively',
        'i would begin by',
        'i would start by',
        'i would first',
        'the key is to',
    ];

    private const PRACTICAL_SIGNALS = [
        'excel', 'sheet', 'invoice', 'bank', 'reconcile', 'draft', 'outline', 'brief', 'calendar', 'caption',
        'wireframe', 'figma', 'api', 'server', 'backup', 'checklist', 'minutes', 'sop', 'proposal', 'report',
        'review round', 'whatsapp', 'meta ads', 'google drive', 'deliverable', 'handoff', 'approval', 'records',
        'timesheet', 'payroll', 'ledger', 'email update', 'milestone', 'screenshot', 'sandbox', 'deployment',
    ];

    private const TIMELINE_SIGNALS = [
        'day', 'days', 'week', 'weeks', 'hour', 'hours', 'working day', 'same day', 'first draft', 'round 1',
    ];

    /**
     * @var array<string, list<string>>
     */
    private const LANE_PRACTICAL_SIGNALS = [
        'business-finance-support' => [
            'ledger', 'reconcile', 'bank statement', 'cash flow', 'payroll', 'invoice', 'receivable', 'payable',
            'expense', 'closing balance', 'spreadsheet', 'reporting pack', 'variance', 'supporting documents',
        ],
        'content-media-communications' => [
            'draft', 'edit', 'approval', 'script', 'caption', 'transcript', 'recording', 'episode', 'publish',
            'headline', 'press release', 'source asset', 'repurpose', 'cutdown', 'review round',
        ],
        'training-research-documentation' => [
            'outline', 'evidence', 'source notes', 'first draft', 'manual', 'policy', 'proposal', 'concept note',
            'donor report', 'review comments', 'citations', 'session deck', 'agenda', 'version 1',
        ],
        'software-development' => [
            'repo', 'branch', 'api', 'database', 'staging', 'deploy', 'testing', 'rollback', 'requirements',
            'endpoint', 'schema', 'bug', 'release', 'commit', 'logs',
        ],
        'design-creative' => [
            'brief', 'moodboard', 'concept', 'wireframe', 'figma', 'brand guide', 'revision', 'export',
            'layout', 'asset pack', 'feedback round', 'mockup', 'color palette', 'typography',
        ],
        'social-media-marketing' => [
            'calendar', 'caption', 'approval', 'posting', 'engagement', 'weekly report', 'creative',
            'campaign', 'audience', 'boost', 'ad set', 'reach', 'content batch', 'reporting',
        ],
        'cybersecurity-infrastructure' => [
            'backup', 'logs', 'access', 'patch', 'firewall', 'incident', 'restore', 'audit', 'permissions',
            'monitoring', 'scan', 'hardening', 'rollback', 'server', 'vulnerability',
        ],
        'government-consultancy' => [
            'checklist', 'requirements', 'supporting documents', 'submission', 'deadline', 'compliance',
            'follow up', 'receipt', 'application form', 'reference number', 'clearance', 'missing document',
        ],
        'automation-operations' => [
            'workflow', 'trigger', 'mapping', 'handoff', 'approval', 'test run', 'crm', 'automation',
            'exception', 'fallback', 'data cleanup', 'routing', 'form', 'notification',
        ],
    ];

    /**
     * @var array<string, array{title: string, prompt: string, keywords: list<string>, practical_signals: list<string>}>
     */
    private const CAPABILITY_OVERRIDES = [
        'management accounts preparation' => [
            'title' => 'Build management accounts with control',
            'prompt' => 'A client opens %s and the month-end records are incomplete. How do you pull together the ledger, trial balance, reporting pack, and review path before you confirm the final delivery date?',
            'keywords' => ['ledger', 'trial balance', 'reporting pack', 'review', 'delivery'],
            'practical_signals' => ['ledger', 'trial balance', 'variance', 'reporting pack', 'closing balance', 'working day'],
        ],
        'payroll administration support' => [
            'title' => 'Run payroll without avoidable errors',
            'prompt' => 'A client opens %s and sends staff updates late. What practical checks do you do before you lock the payroll sheet, deductions, and payment handoff?',
            'keywords' => ['payroll', 'deductions', 'review', 'handoff', 'timeline'],
            'practical_signals' => ['payroll sheet', 'deductions', 'timesheet', 'staff updates', 'approval', 'payment handoff'],
        ],
        'payment gateway integration' => [
            'title' => 'Ship payment flows safely',
            'prompt' => 'A client opens %s and wants a fast launch. What do you confirm first around callbacks, sandbox tests, settlement flow, and rollback before you promise a go-live date?',
            'keywords' => ['callback', 'sandbox', 'settlement', 'rollback', 'go-live'],
            'practical_signals' => ['callback', 'webhook', 'sandbox', 'settlement', 'mobile money', 'rollback'],
        ],
        'api development and integrations' => [
            'title' => 'Map integrations before building',
            'prompt' => 'A client opens %s and needs two systems to exchange data. How do you check endpoints, auth, payload mapping, and test flow before delivery starts?',
            'keywords' => ['endpoint', 'auth', 'mapping', 'test', 'delivery'],
            'practical_signals' => ['endpoint', 'payload', 'mapping', 'auth token', 'sandbox', 'logs'],
        ],
        'website development' => [
            'title' => 'Turn website scope into a delivery plan',
            'prompt' => 'A client opens %s with a loose brief. How do you turn that into page scope, content dependencies, staging steps, and a clear handoff plan?',
            'keywords' => ['pages', 'content', 'staging', 'handoff', 'scope'],
            'practical_signals' => ['pages', 'staging', 'content', 'feedback round', 'domain', 'handoff'],
        ],
        'press release writing' => [
            'title' => 'Shape media-ready updates',
            'prompt' => 'A client opens %s for an announcement next week. How do you gather facts, draft the angle, secure approval, and prepare the final release for sending?',
            'keywords' => ['facts', 'draft', 'approval', 'release', 'sending'],
            'practical_signals' => ['headline', 'quote', 'fact sheet', 'approval', 'draft', 'release'],
        ],
        'business proposal writing' => [
            'title' => 'Build a proposal that can be reviewed',
            'prompt' => 'A client opens %s with rough notes and a deadline. How do you structure the scope, budget logic, first draft, and review pass so the proposal is usable quickly?',
            'keywords' => ['scope', 'budget', 'draft', 'review', 'deadline'],
            'practical_signals' => ['proposal', 'scope', 'budget', 'draft', 'review comments', 'submission'],
        ],
        'donor reporting support' => [
            'title' => 'Turn program evidence into donor-ready reporting',
            'prompt' => 'A client opens %s and the reporting inputs are incomplete. How do you collect source notes, align indicators, prepare the first draft, and close review comments before submission?',
            'keywords' => ['source notes', 'indicators', 'draft', 'review', 'submission'],
            'practical_signals' => ['indicator', 'source notes', 'donor report', 'review comments', 'submission', 'evidence'],
        ],
        'vulnerability assessment' => [
            'title' => 'Assess risk before changing systems',
            'prompt' => 'A client opens %s on a live environment. What do you confirm first around scope, access, evidence capture, risk ranking, and safe reporting?',
            'keywords' => ['scope', 'access', 'evidence', 'risk', 'reporting'],
            'practical_signals' => ['scope', 'access', 'evidence', 'risk ranking', 'logs', 'report'],
        ],
        'workflow automation design' => [
            'title' => 'Design automation from the real workflow',
            'prompt' => 'A client opens %s but the current process is still manual. How do you map the handoffs, approval points, edge cases, and test run before you automate anything?',
            'keywords' => ['handoff', 'approval', 'edge case', 'test', 'automate'],
            'practical_signals' => ['workflow map', 'handoff', 'approval', 'edge case', 'test run', 'fallback'],
        ],
    ];

    /**
     * @param list<VendorServiceCapability> $capabilities
     * @return list<array<string, mixed>>
     */
    public function generateQuestions(VendorProfile $profile, array $capabilities): array
    {
        $activeCapabilities = array_values(array_filter(
            $capabilities,
            static fn (mixed $capability): bool => $capability instanceof VendorServiceCapability && $capability->isActive()
        ));

        $topCapabilities = array_slice($activeCapabilities, 0, 2);
        $questions = [];

        foreach ($topCapabilities as $index => $capability) {
            $serviceType = $capability->getServiceType();
            $questions[] = $this->buildLaneQuestion(
                'lane-' . ($index + 1),
                $serviceType->getName(),
                $serviceType->getCategory(),
                $serviceType->getGroupSlug(),
                $serviceType->getGroupTitle()
            );
        }

        while (count($questions) < 2) {
            $questions[] = [
                'id' => 'lane-extra-' . count($questions),
                'title' => 'Explain your delivery workflow',
                'prompt' => 'Walk through one recent kind of client task from first clarification to final handoff. Focus on what you do in practice, not theory.',
                'keywords' => ['scope', 'plan', 'delivery', 'client', 'handoff'],
                'practical_signals' => ['brief', 'checklist', 'draft', 'handoff', 'approval', 'working day'],
            ];
        }

        $questions[] = [
            'id' => 'client-scope',
            'title' => 'Clarify the work before you commit',
            'prompt' => 'A client brief is incomplete and the budget note is vague. What practical questions do you ask before you confirm scope, price, and turnaround?',
            'keywords' => ['scope', 'deliverable', 'timeline', 'budget', 'clarify'],
            'practical_signals' => ['deliverable', 'working day', 'budget', 'approval', 'timeline', 'checklist'],
        ];

        $questions[] = [
            'id' => 'delivery-rhythm',
            'title' => 'Protect quality during busy weeks',
            'prompt' => 'Two client jobs land in the same week inside your active lanes. How do you protect quality, communication, and deadlines without overpromising?',
            'keywords' => ['plan', 'priority', 'deadline', 'update', 'quality'],
            'practical_signals' => ['priority', 'working day', 'email update', 'checklist', 'deadline', 'handoff'],
        ];

        $resumeSnippet = $this->resumeSnippet($profile->getResumeHighlights());
        $questions[] = [
            'id' => 'resume-proof',
            'title' => 'Turn resume evidence into client delivery',
            'prompt' => sprintf(
                'Your resume highlights mention: "%s". Pick one similar client task and explain how you would scope it, deliver it, and keep the client updated.',
                $resumeSnippet
            ),
            'keywords' => ['scope', 'deliver', 'client', 'update', 'result'],
            'practical_signals' => ['scope', 'first draft', 'deliverable', 'email update', 'review round', 'result'],
        ];

        return $questions;
    }

    /**
     * @param list<array<string, mixed>> $questions
     * @param list<array<string, mixed>> $answers
     * @return array{score: int, passed: bool, note: string, results: list<array<string, mixed>>}
     */
    public function evaluateAnswers(array $questions, array $answers): array
    {
        $answerMap = [];
        foreach ($answers as $answer) {
            if (!is_array($answer)) {
                continue;
            }

            $questionId = isset($answer['question_id']) && is_string($answer['question_id']) ? trim($answer['question_id']) : '';
            $value = isset($answer['answer']) && is_string($answer['answer']) ? trim($answer['answer']) : '';

            if ($questionId === '') {
                continue;
            }

            $answerMap[$questionId] = $value;
        }

        $results = [];
        $totalScore = 0;

        foreach ($questions as $question) {
            $questionId = isset($question['id']) && is_string($question['id']) ? $question['id'] : '';
            $keywords = isset($question['keywords']) && is_array($question['keywords']) ? $question['keywords'] : [];
            $questionPracticalSignals = isset($question['practical_signals']) && is_array($question['practical_signals'])
                ? array_values(array_filter($question['practical_signals'], static fn (mixed $value): bool => is_string($value) && $value !== ''))
                : [];
            $answer = $questionId !== '' ? ($answerMap[$questionId] ?? '') : '';
            $normalizedAnswer = mb_strtolower($answer);
            $wordCount = str_word_count($normalizedAnswer);
            $keywordHits = 0;

            foreach ($keywords as $keyword) {
                if (!is_string($keyword) || $keyword === '') {
                    continue;
                }

                if (str_contains($normalizedAnswer, mb_strtolower($keyword))) {
                    ++$keywordHits;
                }
            }

            $score = 0;
            if ($wordCount >= 30) {
                $score += 20;
            } elseif ($wordCount >= 16) {
                $score += 10;
            } elseif ($wordCount >= 10) {
                $score += 5;
            }

            $score += min(25, $keywordHits * 5);

            $globalPracticalSignalHits = $this->countSignalHits($normalizedAnswer, self::PRACTICAL_SIGNALS);
            $lanePracticalSignalHits = $this->countSignalHits($normalizedAnswer, $questionPracticalSignals);
            $timelineSignalHits = $this->countSignalHits($normalizedAnswer, self::TIMELINE_SIGNALS);
            $numberSignals = preg_match_all('/\b\d+\b/', $normalizedAnswer) ?: 0;
            $sequenceSignals = preg_match_all('/\b(first|then|after|before|next|finally)\b/', $normalizedAnswer) ?: 0;
            $genericPhraseHits = $this->countSignalHits($normalizedAnswer, self::GENERIC_AI_PHRASES);

            $score += min(20, $globalPracticalSignalHits * 4);
            $score += min(30, $lanePracticalSignalHits * 7);
            $score += min(10, $timelineSignalHits * 5);
            $score += min(10, $numberSignals * 5);
            $score += min(10, $sequenceSignals * 3);

            if ($wordCount < 14) {
                $score -= 15;
            }

            if (($globalPracticalSignalHits + $lanePracticalSignalHits) === 0 && $timelineSignalHits === 0 && $numberSignals === 0) {
                $score -= 18;
            }

            if ($questionPracticalSignals !== [] && $lanePracticalSignalHits === 0) {
                $score -= 10;
            }

            if ($genericPhraseHits > 0) {
                $score -= min(30, $genericPhraseHits * 8);
            }

            if ($keywordHits >= 2 && ($globalPracticalSignalHits + $lanePracticalSignalHits + $timelineSignalHits + $numberSignals) >= 3) {
                $score += 10;
            }

            $score = max(0, min(100, $score));
            $totalScore += $score;

            $results[] = [
                'question_id' => $questionId,
                'answer' => $answer,
                'word_count' => $wordCount,
                'keyword_hits' => $keywordHits,
                'practical_signal_hits' => $globalPracticalSignalHits,
                'lane_practical_signal_hits' => $lanePracticalSignalHits,
                'timeline_signal_hits' => $timelineSignalHits,
                'number_signals' => $numberSignals,
                'generic_phrase_hits' => $genericPhraseHits,
                'score' => $score,
            ];
        }

        $averageScore = $questions === [] ? 0 : (int) round($totalScore / count($questions));
        $passed = $averageScore >= self::PASS_THRESHOLD;

        return [
            'score' => $averageScore,
            'passed' => $passed,
            'note' => $passed
                ? 'Vendor verification passed. The profile now shows a blue tick for practical readiness.'
                : 'Interview answers need more concrete delivery detail. Generic AI-style answers without practical proof do not score well enough for a blue tick.',
            'results' => $results,
        ];
    }

    /**
     * @param list<string> $signals
     */
    private function countSignalHits(string $text, array $signals): int
    {
        $hits = 0;

        foreach ($signals as $signal) {
            if ($signal !== '' && str_contains($text, $signal)) {
                ++$hits;
            }
        }

        return $hits;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildLaneQuestion(string $id, string $serviceName, string $serviceCategory, string $groupSlug, string $groupTitle): array
    {
        $override = $this->capabilityOverrideFor($serviceName, $serviceCategory);
        if ($override !== null) {
            return [
                'id' => $id,
                'title' => $override['title'],
                'prompt' => sprintf($override['prompt'], $serviceName),
                'keywords' => $override['keywords'],
                'practical_signals' => $this->mergeSignals(
                    $this->laneSignalsForGroup($groupSlug),
                    $override['practical_signals']
                ),
            ];
        }

        $signals = $this->laneSignalsForGroup($groupSlug);

        return match ($groupSlug) {
            'business-finance-support' => [
                'id' => $id,
                'title' => 'Run finance work carefully',
                'prompt' => sprintf('A client opens %s and sends messy records for the last three months. What are the first working steps you take before you touch reporting or pricing?', $serviceName),
                'keywords' => ['records', 'review', 'reconcile', 'errors', 'timeline'],
                'practical_signals' => $signals,
            ],
            'content-media-communications' => [
                'id' => $id,
                'title' => 'Turn briefs into publishable outputs',
                'prompt' => sprintf('A client opens %s but the brief is still rough. How do you turn that into a clear draft plan, approval rhythm, and final delivery path?', $serviceName),
                'keywords' => ['brief', 'draft', 'review', 'approval', 'delivery'],
                'practical_signals' => $signals,
            ],
            'training-research-documentation' => [
                'id' => $id,
                'title' => 'Handle structured written work',
                'prompt' => sprintf('A client opens %s and needs a formal document quickly. How do you structure the work so the first draft is useful, accurate, and easy to review?', $serviceName),
                'keywords' => ['outline', 'structure', 'draft', 'review', 'evidence'],
                'practical_signals' => $signals,
            ],
            'software-development' => [
                'id' => $id,
                'title' => 'Ship software work safely',
                'prompt' => sprintf('A client opens %s and wants a result fast. What do you check first before you confirm scope, stack, timeline, and delivery order?', $serviceName),
                'keywords' => ['scope', 'requirements', 'timeline', 'stack', 'deliverable'],
                'practical_signals' => $signals,
            ],
            'design-creative' => [
                'id' => $id,
                'title' => 'Move from concept to design approval',
                'prompt' => sprintf('A client opens %s with only rough ideas. How do you move from concept to approval without wasting rounds or missing the brand direction?', $serviceName),
                'keywords' => ['brief', 'references', 'concept', 'revision', 'brand'],
                'practical_signals' => $signals,
            ],
            'social-media-marketing' => [
                'id' => $id,
                'title' => 'Operate a social lane with discipline',
                'prompt' => sprintf('A client opens %s and expects fast momentum. How do you set content rhythm, approval checkpoints, and reporting expectations from week one?', $serviceName),
                'keywords' => ['calendar', 'approval', 'reporting', 'content', 'weekly'],
                'practical_signals' => $signals,
            ],
            'cybersecurity-infrastructure' => [
                'id' => $id,
                'title' => 'Handle sensitive infrastructure work',
                'prompt' => sprintf('A client opens %s and the issue may affect live systems. What practical checks and safety steps do you take before making changes?', $serviceName),
                'keywords' => ['access', 'backup', 'risk', 'change', 'review'],
                'practical_signals' => $signals,
            ],
            'government-consultancy' => [
                'id' => $id,
                'title' => 'Manage formal compliance work',
                'prompt' => sprintf('A client opens %s with missing documents and a deadline. How do you organize the checklist, dependencies, and client updates so the process stays clean?', $serviceName),
                'keywords' => ['checklist', 'documents', 'deadline', 'update', 'requirements'],
                'practical_signals' => $signals,
            ],
            'automation-operations' => [
                'id' => $id,
                'title' => 'Map operations before automating',
                'prompt' => sprintf('A client opens %s and wants quick automation. How do you map the current workflow before you promise the new process?', $serviceName),
                'keywords' => ['workflow', 'steps', 'approval', 'handoff', 'testing'],
                'practical_signals' => $signals,
            ],
            default => [
                'id' => $id,
                'title' => 'Run the lane like delivery work',
                'prompt' => sprintf('A client opens %s in %s. What do you check first before you confirm scope, delivery steps, and price?', $serviceName, $groupTitle),
                'keywords' => ['scope', 'delivery', 'timeline', 'price', 'review'],
                'practical_signals' => ['scope', 'deliverable', 'checklist', 'working day', 'handoff', 'approval'],
            ],
        };
    }

    /**
     * @return list<string>
     */
    private function laneSignalsForGroup(string $groupSlug): array
    {
        return self::LANE_PRACTICAL_SIGNALS[$groupSlug] ?? ['scope', 'deliverable', 'checklist', 'working day', 'handoff', 'approval'];
    }

    /**
     * @return array{title: string, prompt: string, keywords: list<string>, practical_signals: list<string>}|null
     */
    private function capabilityOverrideFor(string $serviceName, string $serviceCategory): ?array
    {
        $normalizedServiceName = mb_strtolower(trim($serviceName));
        if (isset(self::CAPABILITY_OVERRIDES[$normalizedServiceName])) {
            return self::CAPABILITY_OVERRIDES[$normalizedServiceName];
        }

        $haystack = $normalizedServiceName . ' ' . mb_strtolower(trim($serviceCategory));

        if (str_contains($haystack, 'integration')) {
            return [
                'title' => 'Check systems before connecting them',
                'prompt' => 'A client opens %s and expects tools to talk to each other quickly. What do you confirm first around auth, data mapping, test flow, and rollback before you commit the timeline?',
                'keywords' => ['auth', 'mapping', 'test', 'rollback', 'timeline'],
                'practical_signals' => ['endpoint', 'mapping', 'payload', 'sandbox', 'rollback', 'logs'],
            ];
        }

        if (str_contains($haystack, 'writing')) {
            return [
                'title' => 'Turn rough notes into a reviewable draft',
                'prompt' => 'A client opens %s with incomplete notes. How do you build the outline, draft rhythm, approval checkpoints, and final delivery path without wasting time?',
                'keywords' => ['outline', 'draft', 'approval', 'delivery', 'review'],
                'practical_signals' => ['outline', 'first draft', 'review comments', 'approval', 'source notes', 'final version'],
            ];
        }

        if (str_contains($haystack, 'design')) {
            return [
                'title' => 'Translate rough ideas into usable design rounds',
                'prompt' => 'A client opens %s with only partial direction. How do you turn that into a concept path, review rounds, and final asset delivery?',
                'keywords' => ['concept', 'review', 'asset', 'delivery', 'direction'],
                'practical_signals' => ['brief', 'references', 'concept', 'revision', 'asset pack', 'export'],
            ];
        }

        if (str_contains($haystack, 'development')) {
            return [
                'title' => 'Break development work into safe delivery steps',
                'prompt' => 'A client opens %s and wants a fast result. How do you confirm scope, dependencies, testing order, and release steps before you promise a delivery date?',
                'keywords' => ['scope', 'dependencies', 'testing', 'release', 'delivery'],
                'practical_signals' => ['requirements', 'staging', 'testing', 'deploy', 'rollback', 'handoff'],
            ];
        }

        if (str_contains($haystack, 'support')) {
            return [
                'title' => 'Run support work with control',
                'prompt' => 'A client opens %s and the inputs are incomplete. How do you collect what is missing, track the checklist, and keep the client updated before final handoff?',
                'keywords' => ['inputs', 'checklist', 'update', 'handoff', 'timeline'],
                'practical_signals' => ['checklist', 'follow up', 'working day', 'email update', 'supporting documents', 'handoff'],
            ];
        }

        return null;
    }

    /**
     * @param list<string> $baseSignals
     * @param list<string> $overrideSignals
     * @return list<string>
     */
    private function mergeSignals(array $baseSignals, array $overrideSignals): array
    {
        /** @var list<string> $signals */
        $signals = array_values(array_unique(array_merge($baseSignals, $overrideSignals)));

        return $signals;
    }

    private function resumeSnippet(?string $resumeHighlights): string
    {
        $text = trim((string) $resumeHighlights);
        if ($text === '') {
            return 'recent hands-on client work and capability experience';
        }

        $snippet = preg_replace('/\s+/', ' ', $text) ?: $text;

        return mb_strlen($snippet) > 120 ? mb_substr($snippet, 0, 117) . '...' : $snippet;
    }
}
