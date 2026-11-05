import { useState } from "react";
import { copyText } from "../lib/clipboard";
import type { LiveActions } from "../types/design";

/** One side of a Preview, in the original tile style: a swatch for every #hex, then the value. */
export function ValueTile({ label, text, site }: { label: string; text: string; site?: boolean }) {
  const hexes = text.match(/#[0-9a-fA-F]{6}/g) ?? [];
  return (
    <div className="force-light min-w-0 flex-1 rounded-xl px-3 py-2" style={{ background: site ? "#FFF8EE" : "#F6F3FF" }}>
      <div className="text-[11px] font-bold tracking-wide" style={{ color: site ? "#8A5200" : "#5A32C6" }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {hexes.map((h, i) => (
          <i key={i} className="h-3.5 w-3.5 flex-none rounded border border-black/10" style={{ background: h }} />
        ))}
        <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--ink2)]">{text || "—"}</span>
      </div>
    </div>
  );
}

/** Small links under an open Preview: Why? (AI), Copy CSS, Copy Tailwind. */
export function ActionLinks({ live }: { live: LiveActions }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, text: string) => {
    setCopied((await copyText(text)) ? `${label} copied ✓` : "Copy failed");
    setTimeout(() => setCopied(null), 1500);
  };
  if (!live.why && !live.css && !live.tailwind) return null;
  const link = "cursor-pointer text-[10px] font-bold text-[var(--p1)] hover:underline disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-3 pb-2">
      {live.why && (
        <button type="button" className={link} disabled={live.busy} onClick={live.why}>
          ✦ Why?
        </button>
      )}
      {live.css && (
        <button type="button" className={link} onClick={() => void copy("CSS", live.css as string)}>
          Copy CSS
        </button>
      )}
      {live.tailwind && (
        <button type="button" className={link} onClick={() => void copy("Tailwind", live.tailwind as string)}>
          Copy Tailwind
        </button>
      )}
      {copied && <span className="text-[10px] text-[var(--muted)]">{copied}</span>}
    </div>
  );
}
