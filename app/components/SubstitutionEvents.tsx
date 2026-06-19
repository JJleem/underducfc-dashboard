import { ArrowRight, LogIn, LogOut } from "lucide-react";
import type { SubstitutionEvent } from "../lib/lineup";

export default function SubstitutionEvents({
  events,
  compact = false,
}: {
  events: SubstitutionEvent[];
  compact?: boolean;
}) {
  if (!events.length) return null;

  if (compact) {
    return (
      <div className="space-y-1">
        {events.map((event, index) => (
          <div
            key={`${event.out}-${event.in}-${index}`}
            className="flex items-center gap-1.5 text-[10px] font-bold"
          >
            {event.time && <span className="w-7 shrink-0 text-gray-400">{event.time}</span>}
            <span className="truncate text-red-400">{event.out || "미정"}</span>
            <ArrowRight className="w-3 h-3 shrink-0 text-gray-300 dark:text-gray-600" />
            <span className="truncate text-emerald-500">{event.in || "미정"}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={`${event.out}-${event.in}-${index}`}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
        >
          <div className="min-w-0">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-red-400">
              <LogOut className="h-3 w-3" /> OUT
            </span>
            <p className="mt-0.5 truncate text-[12px] font-black text-gray-700 dark:text-gray-200">
              {event.out || "미정"}
            </p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            {event.time && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-black text-gray-500 dark:bg-white/10 dark:text-gray-400">
                {event.time}
              </span>
            )}
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
          </div>
          <div className="min-w-0 text-right">
            <span className="flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500">
              IN <LogIn className="h-3 w-3" />
            </span>
            <p className="mt-0.5 truncate text-[12px] font-black text-gray-700 dark:text-gray-200">
              {event.in || "미정"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
