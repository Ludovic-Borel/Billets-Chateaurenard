import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getClients, addClient, updateClient, deleteClient } from "@/lib/storage";
import type { Client, ClientFormData } from "@/lib/types";
import { CHORUS_OPTIONS } from "@/lib/types";
import { Search, Pencil, Trash2, X, Save } from "lucide-react";

const emptyForm: ClientFormData = { nom: "", mail: "", adresse: "", siret: "", siren: "", nic: "", chorus: "" };

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = clients.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.mail.toLowerCase().includes(search.toLowerCase()) ||
    c.siret.includes(search) ||
    c.siren.includes(search)
  );

  const handleSelect = (client: Client) => {
    setForm({
      nom: client.nom,
      mail: client.mail || "",
      adresse: client.adresse || "",
      siret: client.siret || "",
      siren: client.siren || "",
      nic: client.nic || "",
      chorus: client.chorus ?? "",
    });
    setEditingId(client.id);
  };

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      toast.error("Le nom du client est obligatoire");
      return;
    }
    if (editingId) {
  const ok = await updateClient(
    editingId,
    {
      ...form,
      chorus: form.chorus === "Oui",
    } as any
  );
      if (ok) {
        toast.success("Client modifié");
        loadClients();
        setEditingId(null);
        setForm(emptyForm);
      } else {
        toast.error("Erreur lors de la modification");
      }
    } else {
      const result = await addClient({
  ...form,
  chorus:
    form.chorus === "Oui"
      ? true
      : form.chorus === "Non"
      ? false
      : false,
} as any);
      if (result) {
        toast.success("Client ajouté");
        loadClients();
        setForm(emptyForm);
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce client ?")) return;
    const ok = await deleteClient(id);
    if (ok) {
      toast.success("Client supprimé");
      loadClients();
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-bold">Gestion des Clients</h2>

      {/* Formulaire */}
      <div className="bg-card border border-border rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="nom">Nom *</Label>
            <Input className="h-7 text-xs" id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du client" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="mail">Email</Label>
            <Input className="h-7 text-xs" id="mail" value={form.mail} onChange={(e) => setForm({ ...form, mail: e.target.value })} placeholder="email@exemple.fr" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="adresse">Adresse</Label>
            <Input className="h-7 text-xs" id="adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="siret">Siret</Label>
            <Input
  className="h-7 text-xs"
  id="siret"
  value={form.siret}
  onChange={(e) => {
    const siret = e.target.value.replace(/\D/g, "");

    setForm({
      ...form,
      siret,
      siren: siret.length >= 9 ? siret.slice(0, 9) : "",
      nic: siret.length >= 14 ? siret.slice(9, 14) : "",
    });
  }}
  placeholder="N° Siret"
/>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="siren">Siren</Label>
            <Input className="h-7 text-xs" id="siren" value={form.siren} onChange={(e) => setForm({ ...form, siren: e.target.value })} placeholder="N° Siren" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="nic">Nic</Label>
            <Input className="h-7 text-xs" id="nic" value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} placeholder="N° Nic" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]" htmlFor="chorus">Chorus</Label>
            <Select value={form.chorus} onValueChange={(val) => setForm({ ...form, chorus: val })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Non défini" /></SelectTrigger>
              <SelectContent>
                {CHORUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt || "Non défini"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="h-7 text-xs" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" /> {editingId ? "Modifier" : "Ajouter"}</Button>
          {editingId && (
            <Button variant="outline" className="h-7 text-xs" onClick={handleNew}><X className="h-3.5 w-3.5 mr-1" /> Annuler</Button>
          )}
        </div>
      </div>

      {/* Recherche + Liste */}
      <div className="bg-card border border-border rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-7 text-xs"
              placeholder="Rechercher un client (nom, email, siret, siren...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-7 text-xs" onClick={handleNew}>+ Nouveau</Button>
        </div>

        <div className="max-h-[450px] overflow-y-auto border border-border rounded-md">
          <table className="w-full text-[11px]">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-1 text-left whitespace-nowrap font-medium">Nom</th>
                <th className="p-1 text-left whitespace-nowrap font-medium">Mail</th>
                <th className="p-1 text-left whitespace-nowrap font-medium">Adresse</th>
                <th className="p-1 text-left whitespace-nowrap font-medium">Siret</th>
                <th className="p-1 text-left whitespace-nowrap font-medium">Siren</th>
                <th className="p-1 text-left whitespace-nowrap font-medium">Nic</th>
                <th className="p-1 text-center whitespace-nowrap font-medium">Chorus</th>
                <th className="p-1 text-center whitespace-nowrap font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-3 text-center text-muted-foreground text-xs">Aucun client trouvé</td></tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(client)}
                  >
                    <td className="p-0.5 px-1 whitespace-nowrap font-medium">{client.nom}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-muted-foreground">{client.mail}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-muted-foreground">{client.adresse}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-muted-foreground">{client.siret}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-muted-foreground">{client.siren}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-muted-foreground">{client.nic}</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-center">
  <span
  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
    client.chorus === "Oui"
      ? "bg-green-100 text-green-800"
      : client.chorus === "Non"
      ? "bg-red-100 text-red-800"
      : ""
  }`}
>
  {client.chorus || "-"}
</span>
</td>
                    <td className="p-0.5 px-1 whitespace-nowrap text-center">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); handleSelect(client); }} title="Modifier">
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} title="Supprimer">
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}