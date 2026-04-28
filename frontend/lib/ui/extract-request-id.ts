export function extractRequestId(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  const match = message.match(/Request ID:\s*([A-Za-z0-9-]+)/i);

  return match?.[1] ?? null;
}
