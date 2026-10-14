interface Props {
  label: string;
  variant?: "ghost" | "primary";
  onClick?: () => void;
}

export default function PillButton({ label, variant = "ghost", onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "cursor-pointer rounded-full px-3 py-1 text-sm font-medium " +
        (variant === "primary"
          ? "bg-[#8A8CF2] text-white hover:bg-[#7F82E8]"
          : "bg-gray-100 text-gray-900 hover:bg-gray-200")
      }
    >
      {label}
    </button>
  );
}