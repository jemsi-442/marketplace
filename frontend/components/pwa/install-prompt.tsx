'use client';

import { Download, Share2, Smartphone, X } from 'lucide-react';
import { useEffect } from 'react';

import { useInstallStore, type BeforeInstallPromptEvent } from '@/lib/pwa/install-store';

export function InstallPrompt() {
  const mode = useInstallStore((state) => state.mode);
  const isVisible = useInstallStore((state) => state.isVisible);
  const isInstalling = useInstallStore((state) => state.isInstalling);
  const syncEnvironment = useInstallStore((state) => state.syncEnvironment);
  const setDeferredPrompt = useInstallStore((state) => state.setDeferredPrompt);
  const dismiss = useInstallStore((state) => state.dismiss);
  const completeInstall = useInstallStore((state) => state.completeInstall);
  const promptInstall = useInstallStore((state) => state.promptInstall);

  useEffect(() => {
    syncEnvironment();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      completeInstall();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('focus', syncEnvironment);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('focus', syncEnvironment);
    };
  }, [completeInstall, setDeferredPrompt, syncEnvironment]);

  if (!isVisible || (mode !== 'browser' && mode !== 'ios')) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] md:inset-x-auto md:bottom-6 md:left-6 md:w-[24rem]">
      <section className="pointer-events-auto overflow-hidden rounded-[28px] border border-[rgba(245,158,11,0.22)] bg-[rgba(255,248,235,0.97)] shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex items-start gap-3 px-4 py-4 md:px-5">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(245,158,11,0.14)] text-[var(--accent-amber)]">
            {mode === 'browser' ? <Download className="size-5" /> : <Smartphone className="size-5" />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
              Install WOLFIX
            </p>
            <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)] md:text-[0.95rem]">
              {mode === 'browser'
                ? 'Turn this link into an app on your device'
                : 'Add WOLFIX to your home screen on iPhone or iPad'}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {mode === 'browser'
                ? 'Open projects faster, keep the workspace one tap away, and make it feel like a native app.'
                : 'Tap the Share button in Safari, then choose Add to Home Screen to install it on this device.'}
            </p>

            {mode === 'ios' ? (
              <div className="mt-3 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/80 px-3 py-3 text-sm text-[var(--text-secondary)]">
                <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Share2 className="size-4 text-[var(--accent-amber)]" />
                  Share then Add to Home Screen
                </p>
                <p className="mt-1 leading-6">
                  Safari on iPhone does not show the install popup automatically, so this is the clean install path there.
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {mode === 'browser' ? (
                <button
                  type="button"
                  onClick={() => void promptInstall()}
                  disabled={isInstalling}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent-amber)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInstalling ? 'Opening install prompt...' : 'Install app'}
                </button>
              ) : null}

              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[rgba(15,23,42,0.18)] hover:text-[var(--text-primary)]"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white/85 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Dismiss install prompt"
          >
            <X className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
