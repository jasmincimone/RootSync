import { MenuBackdropClose, MenuCloseButton } from "@/components/MenuCloseButton";
import { MenuPanelContent } from "@/components/MenuPanelContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu",
  description: "Navigation menu for RootSync",
};

export default function MenuPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <aside className="flex h-full min-h-0 w-[min(100%,400px)] min-w-[260px] shrink-0 flex-col overflow-y-auto border-r border-fix-border/15 bg-fix-surface sm:min-w-[280px]">
        <div className="flex min-h-0 flex-1 flex-col py-6 pl-6 pr-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-fix-heading">Menu</h1>
            <MenuCloseButton />
          </div>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <MenuPanelContent />
          </div>
        </div>
      </aside>

      <MenuBackdropClose />
    </div>
  );
}
