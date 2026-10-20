interface Props {
  initials: string;
  onOpen: () => void;
}

/** The avatar opens the Account page (settings and sign out live there). */
export default function ProfileMenu({ initials, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Account"
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#7A52E8] to-[#4B2BB0] text-xs font-bold text-white"
    >
      {initials || "?"}
    </button>
  );
}