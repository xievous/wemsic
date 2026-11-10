export function joinUrlFor(code: string): string {
  return `${window.location.origin}/join/${code.toUpperCase()}`;
}

/**
 * Shares the room's join link: the share sheet on phones, otherwise copies it.
 * The link opens Join with the code filled in, so friends only need a name.
 * Resolves to what happened, so the button can say "Link copied".
 */
export async function shareJoinLink(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = joinUrlFor(code);
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && navigator.share) {
    try {
      await navigator.share({ title: 'Join my wemsic game', url });
      return 'shared';
    } catch (e) {
      // Closing the share sheet isn't an error worth falling back on.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  return copyText(url);
}

export async function copyText(text: string): Promise<'copied' | 'failed'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Clipboard may be unavailable outside a secure context.
    return 'failed';
  }
}
