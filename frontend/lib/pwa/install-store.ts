import { create } from 'zustand';

const DISMISS_KEY = 'wolfix_install_prompt_dismissed_at';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 3;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type InstallMode = 'hidden' | 'browser' | 'ios' | 'standalone';

interface InstallStore {
  mode: InstallMode;
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalling: boolean;
  isVisible: boolean;
  syncEnvironment: () => void;
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  reveal: () => void;
  dismiss: () => void;
  completeInstall: () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);

  return isAppleMobile && isSafari;
}

function wasRecentlyDismissed() {
  if (typeof window === 'undefined') {
    return false;
  }

  const value = window.localStorage.getItem(DISMISS_KEY);
  if (!value) {
    return false;
  }

  const dismissedAt = Number(value);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_WINDOW_MS;
}

function resolveMode(deferredPrompt: BeforeInstallPromptEvent | null): InstallMode {
  if (typeof window === 'undefined') {
    return 'hidden';
  }

  if (isStandaloneMode()) {
    return 'standalone';
  }

  if (deferredPrompt) {
    return 'browser';
  }

  if (isIosSafari()) {
    return 'ios';
  }

  return 'hidden';
}

export const useInstallStore = create<InstallStore>((set, get) => ({
  mode: 'hidden',
  deferredPrompt: null,
  isInstalling: false,
  isVisible: false,
  syncEnvironment: () => {
    const nextMode = resolveMode(get().deferredPrompt);
    const dismissed = wasRecentlyDismissed();
    set({
      mode: nextMode,
      isVisible: nextMode !== 'hidden' && nextMode !== 'standalone' && !dismissed,
    });
  },
  setDeferredPrompt: (event) => {
    const nextMode = resolveMode(event);
    const dismissed = wasRecentlyDismissed();
    set({
      deferredPrompt: event,
      mode: nextMode,
      isVisible: nextMode !== 'hidden' && nextMode !== 'standalone' && !dismissed,
    });
  },
  reveal: () => {
    const state = get();
    if (state.mode === 'hidden' || state.mode === 'standalone') {
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DISMISS_KEY);
    }

    set({ isVisible: true });
  },
  dismiss: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }

    set({ isVisible: false });
  },
  completeInstall: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DISMISS_KEY);
    }

    set({
      deferredPrompt: null,
      mode: 'standalone',
      isVisible: false,
      isInstalling: false,
    });
  },
  promptInstall: async () => {
    const { deferredPrompt, mode } = get();

    if (mode !== 'browser' || !deferredPrompt) {
      return 'unavailable';
    }

    set({ isInstalling: true });

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        set({
          deferredPrompt: null,
          mode: 'hidden',
          isVisible: false,
          isInstalling: false,
        });

        return 'accepted';
      }

      get().dismiss();
      set({ isInstalling: false });
      return 'dismissed';
    } catch {
      set({ isInstalling: false });
      return 'dismissed';
    }
  },
}));
