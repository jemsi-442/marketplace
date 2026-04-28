'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUp } from 'lucide-react';
import type { VendorProfile } from '@/lib/types';

interface VendorVerificationProofSectionProps {
  headline: string;
  resumeHighlights: string;
  resumeFile: File | null;
  profile: VendorProfile;
  isSavingProfile: boolean;
  isUploadingResume: boolean;
  onHeadlineChange: (value: string) => void;
  onResumeHighlightsChange: (value: string) => void;
  onResumeFileChange: (file: File | null) => void;
  onSaveProfile: () => void;
  onUploadResume: () => void;
}

export function VendorVerificationProofSection({
  headline,
  resumeHighlights,
  resumeFile,
  profile,
  isSavingProfile,
  isUploadingResume,
  onHeadlineChange,
  onResumeHighlightsChange,
  onResumeFileChange,
  onSaveProfile,
  onUploadResume,
}: VendorVerificationProofSectionProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Profile proof
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Tell WOLFIX what this studio does
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Keep this short and real. We use it to generate the interview.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Professional headline
              </span>
              <input
                value={headline}
                onChange={(event) => onHeadlineChange(event.target.value)}
                placeholder="Example: Finance operations specialist for SMEs and NGO reporting"
                className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Resume highlights
              </span>
              <textarea
                value={resumeHighlights}
                onChange={(event) =>
                  onResumeHighlightsChange(event.target.value)
                }
                placeholder="Write 3 to 6 lines from your CV: clients, tools, deliverables, and the work you finish."
                rows={6}
                className="w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button onClick={onSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save verification profile'}
              </Button>
              <Link href="/dashboard/vendor-capabilities">
                <Button variant="ghost" className="border border-[var(--line)]">
                  Open capability lanes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[30px] border border-[rgba(15,23,42,0.08)] p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
              Resume upload
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              Upload your CV or resume
            </h3>
          </div>

          <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--panel-muted)] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex size-10 items-center justify-center rounded-2xl bg-[rgba(59,130,246,0.10)] text-[var(--brand-primary)]">
                <FileUp className="size-4" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Accepted files
                </p>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  PDF, DOC, DOCX, or TXT up to 8 MB. Replacing the file resets
                  the interview.
                </p>
                <p className="text-xs leading-5 text-[var(--text-tertiary)]">
                  Remote storage can use direct upload automatically. Local
                  storage keeps the standard app upload.
                </p>
              </div>
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Choose resume file
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(event) =>
                onResumeFileChange(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--text-primary)]"
            />
          </label>

          <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Current file
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              {profile.resume_file_name || 'No resume uploaded yet'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {profile.resume_uploaded_at
                ? `Uploaded ${profile.resume_uploaded_at}`
                : 'Upload the file, then generate the interview.'}
            </p>
          </div>

          <Button
            onClick={onUploadResume}
            disabled={!resumeFile || isUploadingResume}
          >
            {isUploadingResume ? 'Uploading...' : 'Upload resume'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
