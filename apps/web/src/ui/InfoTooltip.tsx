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
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-panel hover:text-ink focus:bg-panel focus:text-ink focus:outline-none"
      >
        <HelpCircle size={15} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-7 z-20 hidden w-72 rounded-md border border-line bg-white p-3 text-left text-xs font-normal leading-5 text-slate-700 shadow-lg group-hover:block group-focus-within:block"
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
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <InfoTooltip label={`${title} explanation`} description={description} />
      </div>
      {aside ? <span className="shrink-0 text-xs text-slate-500">{aside}</span> : null}
    </div>
  );
}
