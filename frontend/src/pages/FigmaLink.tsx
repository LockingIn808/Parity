import { useState } from "react";

interface Props {
  onConnected: (url: string) => void;
}

const FIGMA_HISTORY = [
  { id: 1, label: "Homepage redesign", url: "figma.com/file/abc123" },
  { id: 2, label: "Dashboard v2", url: "figma.com/file/def456" },
  { id: 3, label: "Accessibility pass", url: "figma.com/file/ghi789" },
];

export default function FigmaLink({ onConnected }: Props) {
  const [url, setUrl] = useState("");

  const connect = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onConnected(trimmed);
  };

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-[#E3E0FF] bg-white p-4">
        <h1 className="text-base font-semibold text-[#1E1B4B]">
          Connect your Figma Design Here:
        </h1>
        <p className="mt-1 text-xs text-slate-500">Paste your Figma File URL</p>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="figma.com/file/..."
          aria-label="Figma file URL"
          className="mt-2 w-full rounded-lg border border-[#DAD6FF] px-3 py-2 text-xs text-[#1E1B4B] outline-none focus:border-[#5748CC]"
        />

        <p className="mt-2 text-[11px] text-slate-500">
          Make sure the Figma URL is public
        </p>

        <button
          type="button"
          onClick={connect}
          disabled={!url.trim()}
          className="mt-2 w-full cursor-pointer rounded-lg bg-[#5748CC] py-2 text-xs font-semibold text-white hover:bg-[#4A3DB8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Connect Design
        </button>
      </section>

      <section className="rounded-2xl border border-[#E3E0FF] bg-white p-4">
        <h2 className="text-base font-semibold text-[#1E1B4B]">Figma History</h2>

        <div className="mt-2 max-h-28 overflow-y-auto">
          {FIGMA_HISTORY.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-t border-[#E3E0FF] py-2 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#1E1B4B]">
                  {item.label}
                </p>
                <p className="truncate text-[11px] text-slate-500">{item.url}</p>
              </div>
              <button
                type="button"
                onClick={() => onConnected(item.url)}
                className="ml-3 shrink-0 cursor-pointer rounded-full border border-[#5748CC] px-3 py-0.5 text-xs font-semibold text-[#5748CC] hover:bg-[#F1EFFF]"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}