import * as Tooltip from "@radix-ui/react-tooltip";
import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cx } from "@/lib/cx";

type Props = {
  icon: LucideIcon;
  /** ツールチップに出す説明。です・ます調ではなく短い名詞句で揃える。 */
  label: string;
  shortcut?: string;
  onClick: () => void;
  active?: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function IconButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
  active = false,
  tone = "default",
  disabled = false,
}: Props) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <m.button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
          className={cx(
            "grid h-6 w-6 shrink-0 place-items-center rounded border transition-colors duration-150",
            active
              ? "border-teal-500/40 bg-teal-500/10 text-teal-300 shadow-glow"
              : tone === "danger"
                ? "border-white/[0.04] text-slate-400 hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-300"
                : "border-white/[0.04] text-slate-400 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-slate-200",
            disabled && "pointer-events-none opacity-30",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </m.button>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={10}
          collisionPadding={12}
          className="acrylic z-tooltip flex items-center gap-2 rounded-md border px-2.5 py-1.5"
        >
          <span className="font-jp text-xs text-slate-300">{label}</span>
          {shortcut && (
            <kbd className="numeric rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-xs text-teal-300">
              {shortcut}
            </kbd>
          )}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
