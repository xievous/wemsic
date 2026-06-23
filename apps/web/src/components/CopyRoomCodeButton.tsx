import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { IconButton, Tooltip } from '@mui/material';
import { useState } from 'react';

export function CopyRoomCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code.toUpperCase());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable outside secure context.
    }
  }

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy room code'}>
      <IconButton
        onClick={() => void handleCopy()}
        size="small"
        aria-label="Copy room code"
        sx={{
          color: 'inherit',
          opacity: 0.8,
          '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        {copied ? (
          <CheckCircleRoundedIcon sx={{ fontSize: '1.1rem' }} />
        ) : (
          <ContentCopyRoundedIcon sx={{ fontSize: '1.1rem' }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
