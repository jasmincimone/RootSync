import type { AccountNavItem } from "@/config/accountNav";
import { accountNavItemToTile } from "@/config/accountNav";
import { NavTile } from "@/components/ui/NavTile";

type Props = {
  item: AccountNavItem;
  active?: boolean;
  onNavigate?: () => void;
};

/** @deprecated Use NavTile directly */
export function AccountNavTile({ item, active, onNavigate }: Props) {
  return <NavTile item={accountNavItemToTile(item)} active={active} onNavigate={onNavigate} />;
}
