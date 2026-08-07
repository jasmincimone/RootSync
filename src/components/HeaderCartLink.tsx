"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import {
  CART_CHANGED_EVENT,
  cartLineCount,
  readCart,
} from "@/lib/cart";
import { cn } from "@/lib/cn";

export function HeaderCartLink({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function sync() {
      setCount(cartLineCount(readCart()));
    }
    sync();
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className={cn(
        "relative inline-flex h-11 min-w-[44px] items-center justify-center rounded-full px-2 text-fix-heading hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        className,
      )}
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {count > 0 ? (
        <span className="absolute right-0.5 top-0.5 inline-flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-forest px-1 text-[10px] font-semibold leading-none text-fix-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
