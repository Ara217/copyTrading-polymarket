import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  label: string;
  description: string;
}

export function InfoTooltip({ label, description }: InfoTooltipProps) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-500 hover:bg-panel hover:text-ink focus:bg-panel focus:text-ink focus:outline-none"
      >
        <HelpCircle size={13} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-6 z-20 hidden w-56 rounded-md border border-line bg-white p-2 text-left text-[11px] font-normal leading-4 text-slate-700 shadow-lg group-hover:block group-focus-within:block"
      >
        {description}
      </span>
    </span>
  );
}

interface SectionHeaderProps {
  title: string;
  description: string;
  aside?: string;
}

export function SectionHeader({ title, description, aside }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <InfoTooltip label={`${title} explanation`} description={description} />
      </div>
      {aside ? <span className="shrink-0 text-xs text-slate-500">{aside}</span> : null}
    </div>
  );
}
