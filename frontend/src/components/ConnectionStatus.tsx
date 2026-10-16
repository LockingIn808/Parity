interface Props {
  link?: string;
}

export default function ConnectionStatus({ link }: Props) {
  return (
    <div className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-[#DAD6FF] bg-white/80 px-3 text-xs font-medium text-[#1E1B4B]">
      <span
        className={
          "h-2 w-2 shrink-0 rounded-full " +
          (link ? "bg-[#5BAE87]" : "bg-slate-300")
        }
      />
      <span className="truncate">
        {link ? `Connected to ${link}` : "Not connected"}
      </span>
    </div>
  );
}