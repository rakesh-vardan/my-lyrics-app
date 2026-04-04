"use client";

import { useState } from "react";

interface CopyButtonProps {
  lyrics: string;
}

export default function CopyButton({ lyrics }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers that don't support the Clipboard API.
      // document.execCommand('copy') is deprecated but intentionally used here
      // as a last-resort fallback when navigator.clipboard is unavailable.
      const el = document.createElement("textarea");
      el.value = lyrics;
      document.body.appendChild(el);
      el.select();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      {copied ? (
        <>✅ Copied!</>
      ) : (
        <>📋 Copy Lyrics</>
      )}
    </button>
  );
}
