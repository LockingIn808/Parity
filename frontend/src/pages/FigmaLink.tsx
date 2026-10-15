interface Props {
  onConnected: () => void;
}

const FIGMA_HISTORY = [
  {
    id: 1,
    label: "Homepage redesign",
    url: "figma.com/file/abc123",
  },
  {
    id: 2,
    label: "Dashboard v2",
    url: "figma.com/file/def456",
  },
  {
    id: 3,
    label: "Accessibility pass",
    url: "figma.com/file/ghi789",
  },
];

export default function FigmaLink({onConnected }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-300 bg-white p-5">
        <h1 className="text-2xl font-semibold">
          Connect your Figma Design Here:
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Paste your Figma File URL
        </p>

        <input
          type="text"
          className="mt-4 w-full rounded-lg border border-gray-300 p-3"
        />

        <p className="mt-3 text-xs text-gray-500">
          Make sure the Figma URL is public
        </p>

        <button
            type="button"
            onClick={onConnected}
            className="mt-3 w-full rounded-lg bg-[#7165F3] py-3 text-white"
        >
            Connect Design
        </button>
      </section>

      <section className="rounded-2xl border border-gray-300 bg-white p-5">
        <h2 className="text-2xl font-semibold">
          Figma History
        </h2>

        <div className="mt-5 max-h-52 overflow-y-auto">
          {FIGMA_HISTORY.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-t border-gray-300 py-3 first:border-t-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {item.label}
                </p>

                <p className="text-xs text-gray-500">
                  {item.url}
                </p>
              </div>

              <button className="rounded-full border border-gray-300 px-4 py-1 text-sm">
                Open
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}