interface Props {
  link?: string;
}

export default function ConnectionStatus({ link }: Props) {
  return (
    <div className="flex h-[45px] w-full items-center gap-3 rounded-full border border-gray-300 bg-white px-5 text-gray-900">
      <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400" />
      <span className="truncate font-medium">
        Connected to {link || "No project linked"}
      </span>
    </div>
  );
}