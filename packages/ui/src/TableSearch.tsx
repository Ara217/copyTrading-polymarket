interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TableSearch({ value, onChange, placeholder = "Search by market title…" }: TableSearchProps) {
  return (
    <div className="border-b border-line px-3 py-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-line bg-white px-2.5 text-[13px] outline-none placeholder:text-muted focus:border-signal"
      />
    </div>
  );
}

/** Case-insensitive substring match on market title + outcome. */
export function matchesTitleFilter(
  row: { marketTitle?: string | null; outcome?: string },
  filter: string
): boolean {
  const query = filter.trim().toLowerCase();
  if (!query) return true;
  return `${row.marketTitle ?? ""} ${row.outcome ?? ""}`.toLowerCase().includes(query);
}
