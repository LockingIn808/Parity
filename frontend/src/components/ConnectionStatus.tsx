interface Props {
  link?: string;
}

export default function ConnectionStatus({ link }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-300 px-5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400" />
      <span className="truncate font-medium">
        Connected to {link || "No project linked"}
      </span>
    </div>
  );
}