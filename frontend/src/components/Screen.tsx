import type { ReactNode } from "react";

export default function Screen({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="parity-screen parity-bg mx-auto flex w-full max-w-[560px] flex-col gap-3 rounded-2xl">
      {children}
    </div>
  );
}