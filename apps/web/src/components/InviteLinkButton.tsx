import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { Button } from '@mui/material';
import { useState } from 'react';

export function joinUrlFor(code: string): string {
  return `${window.location.origin}/join/${code.toUpperCase()}`;
}

/**
 * Shares the room's join link: the share sheet on phones, otherwise copies it.
 * The link opens Join with the code filled in, so friends only need a name.
 */
export function InviteLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    const url = joinUrlFor(code);
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: 'Join my wemsic game', url });
        return;
      } catch (e) {
        // Closing the share sheet isn't an error worth falling back on.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable outside secure context.
    }
  }

  return (
    <Button
      onClick={() => void handleInvite()}
      startIcon={copied ? <CheckCircleRoundedIcon /> : <IosShareRoundedIcon />}
      sx={{
        color: '#fff',
        bgcolor: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(4px)',
        borderRadius: 999,
        py: 0.75,
        px: 2,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
      }}
    >
      {copied ? 'Link copied' : 'Invite'}
    </Button>
  );
}
