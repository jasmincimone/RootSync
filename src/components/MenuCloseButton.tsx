"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { leaveMenu } from "@/lib/menuReturn";

const btnClass =
  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading";

type Props = {
  /** Extra classes for the header Close control */
  className?: string;
};

/** Closes /menu and returns to the page you were on (see rememberPathBeforeMenu on the Menu link). */
export function MenuCloseButton({ className = "" }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${btnClass} ${className}`.trim()}
      onClick={() => leaveMenu(router)}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Close
    </button>
  );
}

/** Full-bleed backdrop that closes the menu (same behavior as MenuCloseButton). */
export function MenuBackdropClose({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`min-h-0 min-w-0 flex-1 cursor-pointer bg-espresso/50 ${className}`.trim()}
      aria-label="Close menu"
      onClick={() => leaveMenu(router)}
    />
  );
}
