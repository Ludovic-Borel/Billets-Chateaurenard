import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Plus } from "lucide-react";

interface Client {
  id: string;
  nom: string;
}

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  onNewClient: () => void;
}

export function ClientCombobox({
  clients,
  value,
  onChange,
  onNewClient,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === value),
    [clients, value]
  );

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;

    const s = search.toLowerCase();

    return clients.filter((c) =>
      c.nom.toLowerCase().includes(s)
    );
  }, [clients, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [search]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) =>
        Math.min(h + 1, filteredClients.length - 1)
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const client = filteredClients[highlighted];

      if (!client) return;

      onChange(client.id);
      setSearch("");
      setOpen(false);
    }

    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>

      <button
  type="button"
  onClick={() => {
    console.log("Ouverture du dialog");
    setOpen(false);
    setSearch("");
    onNewClient();
        }}
        className="flex h-7 w-full items-center justify-between rounded-md border px-2 text-xs hover:bg-muted"
      >
        <span className="truncate">
          {selectedClient
            ? selectedClient.nom
            : "Sélectionner un client"}
        </span>

        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>

      {open && (

        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-background shadow-lg">

          <div className="relative p-2">

            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              ref={inputRef}
              value={search}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Rechercher..."
              className="h-8 w-full rounded border pl-8 pr-2 text-xs outline-none"
            />

          </div>

          <div className="max-h-56 overflow-auto">

                      {filteredClients.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Aucun client trouvé
              </div>
            ) : (
              filteredClients.map((client, index) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
  onChange(client.id);
  setSearch(client.nom);
  setOpen(false);
}}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors ${
  highlighted === index
    ? "bg-muted"
    : "hover:bg-muted/50"
} ${
  value === client.id
    ? "font-semibold"
    : ""
}`}
                >
                  {client.nom}
                </button>
              ))
            )}
          </div>

          <div className="border-t p-1">

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearch("");
                onNewClient();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs font-medium text-primary hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Nouveau client
            </button>

          </div>

        </div>

      )}

    </div>
  );
}