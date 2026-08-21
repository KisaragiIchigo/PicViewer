import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";

import { useViewer } from "@/store/viewer";

import { IconButton } from "../ui/IconButton";
import { SHORTCUT_GROUPS } from "./shortcuts";

export function HelpOverlay() {
  const open = useViewer((s) => s.help);
  const toggleHelp = useViewer((s) => s.toggleHelp);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={toggleHelp}
          className="pointer-events-auto absolute inset-0 z-modal grid place-items-center bg-black/60 backdrop-blur-sm p-6"
        >
          <m.section
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="acrylic max-h-full w-full max-w-4xl overflow-y-auto rounded-xl border p-6"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-xl text-slate-100">操作方法</h1>
                <p className="mt-1 font-jp text-xs text-slate-400">
                  マウスを止めると上下のバーは自動的に隠れます。動かせばまた現れます。
                </p>
              </div>
              <IconButton icon={X} label="閉じる" shortcut="Esc" onClick={toggleHelp} />
            </header>

            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {SHORTCUT_GROUPS.map((group) => (
                <section key={group.title}>
                  <h2 className="label mb-3 border-b border-white/[0.06] pb-2">
                    {group.title}
                  </h2>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li
                        key={item.description}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5"
                      >
                        <span className="flex shrink-0 items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="numeric rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-xs text-teal-300"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                        <span className="min-w-[320px] flex-1 font-jp text-xs leading-relaxed text-slate-300">
                          {item.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </m.section>
        </m.div>
      )}
    </AnimatePresence>
  );
}
