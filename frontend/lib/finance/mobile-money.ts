import providerCatalog from './mobile-money-providers.json';

type MobileMoneyProviderRecord = {
  code: string;
  label: string;
  subtitle: string;
  logoPath: string;
  logoShellClassName: string;
  aliases: string[];
};

export const MOBILE_MONEY_PROVIDERS: MobileMoneyProviderRecord[] = providerCatalog;

function normalizeProviderToken(input: string): string {
  return input.replace(/[^A-Za-z0-9]+/g, '').trim().toUpperCase();
}

export function normalizeMobileMoneyProviderCode(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeProviderToken(input);
  if (!normalized) {
    return null;
  }

  const match = MOBILE_MONEY_PROVIDERS.find((provider) =>
    provider.aliases.some((alias) => normalizeProviderToken(alias) === normalized),
  );

  return match ? match.code : null;
}

export function normalizeTanzanianMsisdn(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+') ? digits.slice(1) : digits;

  if (/^255[67]\d{8}$/.test(normalized)) {
    return normalized;
  }

  if (/^0[67]\d{8}$/.test(normalized)) {
    return `255${normalized.slice(1)}`;
  }

  if (/^[67]\d{8}$/.test(normalized)) {
    return `255${normalized}`;
  }

  return normalized;
}

export function formatMsisdnPreview(input: string): string {
  const normalized = normalizeTanzanianMsisdn(input);
  return /^255[67]\d{8}$/.test(normalized) ? normalized : input.trim();
}

export function getMobileMoneyProviderLabel(code?: string | null): string {
  const normalized = normalizeMobileMoneyProviderCode(code);
  if (!normalized) {
    return code ? normalizeProviderToken(code) : 'Choose a network';
  }

  const match = MOBILE_MONEY_PROVIDERS.find((provider) => provider.code === normalized);
  return match ? match.label : normalized;
}
