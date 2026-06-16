import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_NAMES_FR } from "@/lib/utils";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={year}
        onChange={(e) => onChange(parseInt(e.target.value), month)}
      >
        {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        value={month}
        onChange={(e) => onChange(year, parseInt(e.target.value))}
      >
        {MONTH_NAMES_FR.map((name, i) => (
          <option key={i} value={i}>{name}</option>
        ))}
      </select>
    </div>
  );
}