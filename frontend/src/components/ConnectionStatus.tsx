interface Props {
  link?: string;
}

export default function ConnectionStatus({ link }: Props) {
  return (
    <div className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-[#DAD6FF] bg-white/80 px-4 text-sm font-medium text-[#1E1B4B] shadow-sm backdrop-blur">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5BAE87]" />
      <span className="truncate">
        Connected to {link || "No project linked"}
      </span>
    </div>
  );
}