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
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E3E0FF] bg-white p-5">
        <h1 className="text-2xl font-semibold text-[#1E1B4B]">
          Connect your Figma Design Here:
        </h1>

        <p className="mt-2 text-sm text-slate-500">Paste your Figma File URL</p>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="figma.com/file/..."
          aria-label="Figma file URL"
          className="mt-4 w-full rounded-lg border border-[#DAD6FF] p-3 text-sm text-[#1E1B4B] outline-none focus:border-[#5748CC]"
        />

        <p className="mt-3 text-xs text-slate-500">
          Make sure the Figma URL is public
        </p>

        <button
          type="button"
          onClick={connect}
          disabled={!url.trim()}
          className="mt-3 w-full cursor-pointer rounded-lg bg-[#5748CC] py-3 text-sm font-semibold text-white hover:bg-[#4A3DB8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Connect Design
        </button>
      </section>

      <section className="rounded-2xl border border-[#E3E0FF] bg-white p-5">
        <h2 className="text-2xl font-semibold text-[#1E1B4B]">Figma History</h2>

        <div className="mt-5 max-h-52 overflow-y-auto">
          {FIGMA_HISTORY.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-t border-[#E3E0FF] py-3 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1E1B4B]">
                  {item.label}
                </p>
                <p className="truncate text-xs text-slate-500">{item.url}</p>
              </div>

              <button
                type="button"
                onClick={() => onConnected(item.url)}
                className="ml-3 shrink-0 cursor-pointer rounded-full border border-[#5748CC] px-4 py-1 text-sm font-semibold text-[#5748CC] hover:bg-[#F1EFFF]"
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