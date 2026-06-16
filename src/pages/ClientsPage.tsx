import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getClients, addClient, updateClient, deleteClient } from "@/lib/storage";
import type { Client, ClientFormData } from "@/lib/types";
import { Search, Plus, Pencil, Trash2, X, Save } from "lucide-react";

const emptyForm: ClientFormData = { nom: "", mail: "", adresse: "", siret: "", siren: "", nic: "" };

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
      const ok = await updateClient(editingId, form);
      if (ok) {
        toast.success("Client modifié");
        loadClients();
        setEditingId(null);
        setForm(emptyForm);
      } else {
        toast.error("Erreur lors de la modification");
      }
    } else {
      const result = await addClient(form);
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
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-bold">Gestion des Clients</h2>

      {/* Formulaire */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du client" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mail">Email</Label>
            <Input id="mail" value={form.mail} onChange={(e) => setForm({ ...form, mail: e.target.value })} placeholder="email@exemple.fr" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="siret">Siret</Label>
            <Input id="siret" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="N° Siret" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="siren">Siren</Label>
            <Input id="siren" value={form.siren} onChange={(e) => setForm({ ...form, siren: e.target.value })} placeholder="N° Siren" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nic">Nic</Label>
            <Input id="nic" value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })} placeholder="N° Nic" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> {editingId ? "Modifier" : "Ajouter"}</Button>
          {editingId && (
            <Button variant="outline" onClick={handleNew}><X className="h-4 w-4 mr-1" /> Annuler</Button>
          )}
        </div>
      </div>

      {/* Recherche + Liste */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un client (nom, email, siren...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleNew}><Plus className="h-4 w-4 mr-1" /> Nouveau</Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto border border-border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Nom</th>
                <th className="text-left p-2 font-medium">Mail</th>
                <th className="text-left p-2 font-medium">Adresse</th>
                <th className="text-left p-2 font-medium">Siren</th>
                <th className="text-right p-2 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Aucun client trouvé</td></tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(client)}
                  >
                    <td className="p-2 font-medium">{client.nom}</td>
                    <td className="p-2 text-muted-foreground">{client.mail}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[200px]">{client.adresse}</td>
                    <td className="p-2 text-muted-foreground">{client.siren}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSelect(client); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
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