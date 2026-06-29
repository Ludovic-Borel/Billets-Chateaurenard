import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Client {
  id: string;
  nom: string;
}

interface ClientSearchProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
}

export function ClientSearch({
  clients,
  value,
  onChange,
}: ClientSearchProps) {

  const [search, setSearch] = useState("");
const [open, setOpen] = useState(false);

const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClick = (e: MouseEvent) => {
    if (!ref.current?.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClick);

  return () =>
    document.removeEventListener("mousedown", handleClick);
}, []);

  const filteredClients = useMemo(() => {

    if (!search.trim()) {
      return clients;
    }

    const s = search.toLowerCase();

    return clients.filter((client) =>
      client.nom.toLowerCase().includes(s)
    );

  }, [clients, search]);

  return (

    <div className="relative space-y-2" ref={ref}>

      <div className="relative">

        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input
          className="pl-8 h-7 text-xs"
          placeholder="Rechercher un client..."
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => setSearch(e.target.value)}
        />

      </div>

      {open && (

  <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-56 overflow-auto z-50">

    {filteredClients.length === 0 ? (

      <div className="px-3 py-2 text-xs text-muted-foreground">
        Aucun client trouvé
      </div>

    ) : (

      filteredClients.map((client) => (

        <button
          key={client.id}
          type="button"
          onClick={() => {
            onChange(client.id);
            setSearch(client.nom);
            setOpen(false);
          }}
          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted ${
            value === client.id ? "bg-muted font-semibold" : ""
          }`}
        >
          {client.nom}
        </button>

      ))

    )}

  </div>

)}

    </div>

  );

}