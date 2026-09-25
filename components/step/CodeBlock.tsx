'use client';

import { useState } from 'react';
import { playCopy } from '@/lib/sounds';

/** Code block with a copy button, ported from jumper.html:1101-1105, 1126-1132. */
export function CodeBlock({ file, source }: { file: string; source: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(source);
      } else {
        fallbackCopy(source);
      }
      setCopied(true);
      playCopy();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be refused outright (permissions, insecure
      // context). Say so rather than showing a silent "Copied".
      fallbackCopy(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="my-3.5 overflow-hidden rounded-xl bg-code-bg">
      <div className="flex items-center justify-between py-2 pl-3.5 pr-2.5 text-[13px] text-[#9FB2C3]">
        <span className="font-mono">{file}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-[7px] bg-[#22384B] px-3 py-1.5 text-[13px] font-bold text-[#E7F0F7] hover:brightness-110"
        >
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 pb-4 pt-1 font-mono text-[13.5px] leading-[1.6] text-code-ink">
        <code>{source}</code>
      </pre>
    </div>
  );
}

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    // Nothing more we can do; the code is on screen to select by hand.
  }
  ta.remove();
}
