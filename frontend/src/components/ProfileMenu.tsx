import { useEffect, useRef, useState } from "react";
import type { User } from "../global";

interface Props {
  user: User;
  onSignOut?: () => void;
  onToggleTheme?: (dark: boolean) => void; // hook up when dark mode exists
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const SunIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg {...iconProps}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const RefreshIcon = () => (
  <svg {...iconProps}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const SignOutIcon = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export default function ProfileMenu({ user, onSignOut, onToggleTheme }: Props) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false); // visual only for now
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    onToggleTheme?.(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#9381FF] to-[#5748CC] text-sm font-bold text-white shadow-[0_4px_12px_rgba(87,72,204,0.25)] hover:opacity-90"
      >
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-[#E3E0FF] bg-white p-2 shadow-[0_12px_32px_rgba(87,72,204,0.18)]"
        >
          <p className="truncate px-3 pb-2 pt-1 text-xs font-semibold text-slate-500">
            {user.name}
          </p>

          <button
            type="button"
            role="menuitem"
            onClick={() => window.location.reload()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#1E1B4B] hover:bg-[#F1EFFF]"
          >
            <RefreshIcon />
            Refresh page
          </button>

          {/* light / dark toggle (not functional yet) */}
          <div className="flex items-center justify-between rounded-xl px-3 py-2 text-[#1E1B4B]">
            <span className={dark ? "text-slate-400" : "text-[#5748CC]"}>
              <SunIcon />
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
              className={
                "relative h-6 w-11 cursor-pointer rounded-full transition-colors " +
                (dark ? "bg-[#5748CC]" : "bg-[#D9D6FF]")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
                  (dark ? "left-[22px]" : "left-0.5")
                }
              />
            </button>
            <span className={dark ? "text-[#5748CC]" : "text-slate-400"}>
              <MoonIcon />
            </span>
          </div>

          <div className="my-1 border-t border-[#E3E0FF]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#1E1B4B] hover:bg-red-50 hover:text-red-600"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}