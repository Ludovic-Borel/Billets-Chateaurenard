import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const BILLET_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "tarascon", label: "Marchés Tarascon" },
  { value: "avignon", label: "Marchés Avignon" },
] as const;

interface BilletsToolbarProps {
  selectedType: "standard" | "tarascon" | "avignon";
  onTypeChange: (type: "standard" | "tarascon" | "avignon") => void;
  onNewBillet: () => void;
}

export function BilletsToolbar({
  selectedType,
  onTypeChange,
  onNewBillet,
}: BilletsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {BILLET_TYPES.map((t) => (
        <Button
          key={t.value}
          variant={selectedType === t.value ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onTypeChange(
              t.value as "standard" | "tarascon" | "avignon"
            )
          }
        >
          {t.label.replace("Marchés ", "")}
        </Button>
      ))}

      <Button
        size="sm"
        className="h-7 text-xs ml-3"
        onClick={onNewBillet}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Billet
      </Button>
    </div>
  );
}