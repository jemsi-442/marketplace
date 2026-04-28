import Image from 'next/image';
import { BadgeCheck, BriefcaseBusiness, ShieldCheck, Wallet } from 'lucide-react';

const heroSignals = [
  { label: 'Protected flow', icon: ShieldCheck },
  { label: 'Team aligned', icon: BriefcaseBusiness },
  { label: 'Verified vendors', icon: BadgeCheck },
];

const processChips = ['Book', 'Coordinate', 'Deliver'] as const;

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <div className="absolute inset-0 rounded-[42px] bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_58%)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[36px] border border-[rgba(15,23,42,0.1)] bg-[#071933] shadow-[0_30px_80px_rgba(7,24,84,0.28)]">
        <div className="relative h-[540px] sm:h-[620px]">
          <Image
            src="/hero/home-hero-diverse-tech-project.jpg"
            alt="A diverse team collaborating on a digital project with laptops in a modern office"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 500px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,25,51,0.08)_0%,rgba(7,25,51,0.16)_28%,rgba(7,25,51,0.72)_100%)]" />

          <div className="absolute left-5 top-5 rounded-full border border-white/16 bg-[rgba(7,25,51,0.68)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/88 backdrop-blur-xl">
            WOLFIX workspace
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/12 bg-[rgba(7,25,51,0.74)] p-5 text-white shadow-[0_18px_40px_rgba(7,24,84,0.28)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/64">Team workspace</p>
                  <p className="mt-2 font-display text-2xl text-white">Work clearly with the right people</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/86">
                  <Wallet className="size-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {processChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/82"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {heroSignals.map(({ label, icon: Icon }) => (
                  <div key={label} className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                    <div className="flex items-center gap-2 text-white/72">
                      <Icon className="size-4" />
                      <p className="text-[10px] uppercase tracking-[0.16em]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
