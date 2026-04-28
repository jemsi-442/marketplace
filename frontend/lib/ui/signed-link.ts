export function readSignedLinkExpiry(url: string): number | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const expires = Number(parsed.searchParams.get('expires'));
    if (Number.isFinite(expires) && expires > 0) {
      return expires;
    }

    const amzDate = parsed.searchParams.get('X-Amz-Date');
    const amzTtl = Number(parsed.searchParams.get('X-Amz-Expires'));
    if (!amzDate || !Number.isFinite(amzTtl) || amzTtl <= 0) {
      return null;
    }

    const match = amzDate.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    );
    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute, second] = match;
    const issuedAt = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    if (!Number.isFinite(issuedAt)) {
      return null;
    }

    return Math.floor(issuedAt / 1000) + amzTtl;
  } catch {
    return null;
  }
}

export function isSignedLinkExpiringSoon(url: string, bufferSeconds = 45): boolean {
  const expires = readSignedLinkExpiry(url);
  if (expires === null) {
    return false;
  }

  return expires <= Math.floor(Date.now() / 1000) + Math.max(5, bufferSeconds);
}
