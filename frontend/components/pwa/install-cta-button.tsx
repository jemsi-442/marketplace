'use client';

import { Download, Share2 } from 'lucide-react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useInstallStore } from '@/lib/pwa/install-store';

type InstallCtaButtonProps = {
  compactLabel?: boolean;
  className?: string;
} & Pick<ButtonProps, 'variant' | 'size'>;

export function InstallCtaButton({
  compactLabel = false,
  className,
  size = 'default',
  variant = 'ghost',
}: InstallCtaButtonProps) {
  const mode = useInstallStore((state) => state.mode);
  const isVisible = useInstallStore((state) => state.isVisible);
  const isInstalling = useInstallStore((state) => state.isInstalling);
  const promptInstall = useInstallStore((state) => state.promptInstall);
  const reveal = useInstallStore((state) => state.reveal);

  if (mode === 'hidden' || mode === 'standalone') {
    return null;
  }

  const buttonLabel =
    mode === 'browser'
      ? compactLabel
        ? 'Install'
        : isInstalling
          ? 'Opening install...'
          : 'Install app'
      : compactLabel
        ? 'Install'
        : 'Add to home screen';

  const Icon = mode === 'browser' ? Download : Share2;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        if (mode === 'browser') {
          void promptInstall();
          return;
        }

        reveal();
      }}
      aria-expanded={isVisible}
    >
      <Icon className="mr-2 size-4" />
      {buttonLabel}
    </Button>
  );
}
