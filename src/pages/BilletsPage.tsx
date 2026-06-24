import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getBillets, addBillet, updateBillet, deleteBillet, getClients } from "@/lib/storage";
import type { Client, Billet, BilletFormData } from "@/lib/types";
import { BILLET_TYPES, MULTIPLICATEURS, MODES_REGLEMENT, formatNumDevis, parseMultiplicateur } from "@/lib/types";
import { MONTH_NAMES_FR } from "@/lib/utils";
import { Plus, Trash2, Pencil, Printer, Lock, LockOpen, Search } from "lucide-react";

interface BilletsPageProps {
  year: number;
  month: number;
}

const emptyBillet = (): BilletFormData => ({
  num_devis: "",
  date_sortie: "",
  destination: "",
  client_id: "",
  contact_client: "",
  adresse_facturation: "",
  num_siret: "",
  num_siren: "",
  num_nic: "",
  num_commande: "",
  multiplicateur: "1X",
  prix_unitaire: null,
  prix_ttc: null,
  prix_ht: null,
  montant_acompte: null,
  mode_reglement: "",
  num_facture: "",
});

export function BilletsPage({ year, month }: BilletsPageProps) {
  const [billets, setBillets] = useState<Billet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedType, setSelectedType] = useState<string>("standard");
  const [form, setForm] = useState<BilletFormData>(emptyBillet());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [comptaMode, setComptaMode] = useState(false);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [billetsData, clientsData] = await Promise.all([
      getBillets(selectedType, month + 1, year),
      getClients(),
    ]);
    setBillets(billetsData);
    setClients(clientsData);
    setLoading(false);
  }, [selectedType, month, year]);

  useEffect(() => { loadData(); }, [loadData]);
  

  const typeLabel = BILLET_TYPES.find((t) => t.value === selectedType)?.label || selectedType;

  const filteredBillets = billets.filter((b) =>
    !search ||
    b.num_devis.toLowerCase().includes(search.toLowerCase()) ||
    (b.destination && b.destination.toLowerCase().includes(search.toLowerCase())) ||
    (b.num_commande && b.num_commande.toLowerCase().includes(search.toLowerCase()))
  );
useEffect(() => {
  const el = document.getElementById("billets-scroll");

  if (el) {
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 100);
  }
}, [selectedType]);
  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setForm((prev) => ({
        ...prev,
        client_id: client.id,
        contact_client: client.mail || "",
        adresse_facturation: client.adresse || "",
        num_siret: client.siret || "",
        num_siren: client.siren || "",
        num_nic: client.nic || "",
      }));
    }
  };

  const handlePrixUnitaireChange = (value: string) => {
    const p = parseFloat(value);
    const prix_unitaire = isNaN(p) ? null : p;
    const multiplicateur = parseMultiplicateur(form.multiplicateur);
    const prix_ttc = prix_unitaire !== null ? parseFloat((prix_unitaire * multiplicateur).toFixed(2)) : null;
    setForm((prev) => ({ ...prev, prix_unitaire, prix_ttc }));
  };

  const handleMultiplicateurChange = (val: string) => {
    const multiplicateur = parseMultiplicateur(val);
    const prix_ttc = form.prix_unitaire !== null ? parseFloat((form.prix_unitaire * multiplicateur).toFixed(2)) : null;
    setForm((prev) => ({ ...prev, multiplicateur: val, prix_ttc }));
  };

  const handleSave = async () => {
    if (!form.num_devis.trim()) {
  const continuer = window.confirm(
    "Aucun numéro de devis n'a été saisi.\n\nCréer le billet sans numéro de devis ?"
  );

  if (!continuer) return;
}

    const formatedNumDevis = form.num_devis.trim()
  ? formatNumDevis(form.num_devis, year)
  : "";

    const billetData = {
      type: selectedType as "standard" | "tarascon" | "avignon",
      mois: month + 1,
      annee: year,
      num_devis: formatedNumDevis,
      date_sortie: form.date_sortie,
      destination: form.destination,
      client_id: form.client_id,
      contact_client: form.contact_client,
      adresse_facturation: form.adresse_facturation,
      num_siret: form.num_siret,
      num_siren: form.num_siren,
      num_nic: form.num_nic,
      num_commande: form.num_commande,
      multiplicateur: form.multiplicateur,
      prix_unitaire: form.prix_unitaire,
      prix_ttc: form.prix_ttc,
      prix_ht: form.prix_ttc,
      montant_acompte: form.montant_acompte,
      mode_reglement: form.mode_reglement,
      num_facture: form.num_facture,
    };

    if (editingId) {
      const ok = await updateBillet(editingId, billetData);
      if (ok) {
        toast.success("Billet modifié");
        loadData();
        resetForm();
      } else {
        toast.error("Erreur lors de la modification");
      }
    } else {
      const result = await addBillet(billetData);
      if (result) {
        toast.success("Billet ajouté");
        loadData();
        resetForm();
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    }
  };

  const handleEdit = (billet: Billet) => {
    setForm({
      num_devis: billet.num_devis,
      date_sortie: billet.date_sortie?.split("T")[0] || "",
      destination: billet.destination || "",
      client_id: billet.client_id || "",
      contact_client: billet.contact_client || "",
      adresse_facturation: billet.adresse_facturation || "",
      num_siret: billet.num_siret || "",
      num_siren: billet.num_siren || "",
      num_nic: billet.num_nic || "",
      num_commande: billet.num_commande || "",
      multiplicateur: billet.multiplicateur || "1X",
      prix_unitaire: billet.prix_unitaire,
      prix_ttc: billet.prix_ttc,
      prix_ht: billet.prix_ht,
      montant_acompte: billet.montant_acompte,
      mode_reglement: billet.mode_reglement || "",
      num_facture: billet.num_facture || "",
    });
    setEditingId(billet.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce billet ?")) return;
    const ok = await deleteBillet(id);
    if (ok) {
      toast.success("Billet supprimé");
      loadData();
      if (editingId === id) resetForm();
    }
  };

  const resetForm = () => {
    setForm(emptyBillet());
    setEditingId(null);
    setShowForm(false);
  };

  const totalTTC = billets.reduce((sum, b) => sum + (b.prix_ttc || 0), 0);
  const totalHT = billets.reduce((sum, b) => sum + (b.prix_ht || 0), 0);

  const getClientField = (clientId: string, field: keyof Client) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? String(client[field] || "") : "";
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{typeLabel} — {MONTH_NAMES_FR[month]} {year}</h2>
          <div className="flex gap-1">
            {BILLET_TYPES.map((t) => (
              <Button key={t.value} variant={selectedType === t.value ? "default" : "outline"} size="sm" className="h-7 text-xs"
                onClick={() => { setSelectedType(t.value); resetForm(); }}>{t.label}</Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={comptaMode ? "default" : "outline"} size="sm" className="h-7 text-xs"
            onClick={() => setComptaMode(!comptaMode)} title="Mode Compta (accès N° Facture)">
            {comptaMode ? <LockOpen className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />} Compta
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
          </Button>
        </div>
      </div>

      {showForm || editingId ? (
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            <div className="space-y-0.5"><Label className="text-[10px]">N° Devis *</Label>
              <Input className="h-7 text-xs" value={form.num_devis} onChange={(e) => setForm({ ...form, num_devis: e.target.value })} placeholder="126 ou CHA25-126" /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Date sortie</Label>
              <Input className="h-7 text-xs" type="date" value={form.date_sortie} onChange={(e) => setForm({ ...form, date_sortie: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Destination</Label>
              <Input className="h-7 text-xs" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Destination" /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Client</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>))}</SelectContent>
              </Select></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Contact client</Label>
              <Input className="h-7 text-xs" value={form.contact_client} onChange={(e) => setForm({ ...form, contact_client: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Adresse fact.</Label>
              <Input className="h-7 text-xs" value={form.adresse_facturation} onChange={(e) => setForm({ ...form, adresse_facturation: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">N° Siret</Label>
              <Input className="h-7 text-xs" value={form.num_siret} onChange={(e) => setForm({ ...form, num_siret: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">N° Siren</Label>
              <Input className="h-7 text-xs" value={form.num_siren} onChange={(e) => setForm({ ...form, num_siren: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">N° Nic</Label>
              <Input className="h-7 text-xs" value={form.num_nic} onChange={(e) => setForm({ ...form, num_nic: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">N° Commande</Label>
              <Input className="h-7 text-xs" value={form.num_commande} onChange={(e) => setForm({ ...form, num_commande: e.target.value })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Multiplicateur</Label>
              <Select value={form.multiplicateur} onValueChange={handleMultiplicateurChange}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MULTIPLICATEURS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
              </Select></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Prix Unitaire (€)</Label>
              <Input className="h-7 text-xs" type="number" step="0.01" value={form.prix_unitaire ?? ""} onChange={(e) => handlePrixUnitaireChange(e.target.value)} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Prix TTC (€)</Label>
              <Input className="h-7 text-xs bg-muted" type="number" step="0.01" value={form.prix_ttc ?? ""} readOnly /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Acompte (€)</Label>
              <Input className="h-7 text-xs" type="number" step="0.01" value={form.montant_acompte ?? ""} onChange={(e) => setForm({ ...form, montant_acompte: e.target.value ? parseFloat(e.target.value) : null })} /></div>
            <div className="space-y-0.5"><Label className="text-[10px]">Mode règlement</Label>
              <Select value={form.mode_reglement} onValueChange={(val) => setForm({ ...form, mode_reglement: val })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{MODES_REGLEMENT.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
              </Select></div>
            <div className="space-y-0.5"><Label className="text-[10px]">N° Facture</Label>
              <Input className="h-7 text-xs" value={form.num_facture} onChange={(e) => setForm({ ...form, num_facture: e.target.value })} disabled={!comptaMode} placeholder={!comptaMode ? "Réservé compta" : ""} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="h-7 text-xs"><Pencil className="h-3.5 w-3.5 mr-1" /> {editingId ? "Modifier" : "Ajouter"}</Button>
            <Button variant="outline" className="h-7 text-xs" onClick={resetForm}>Annuler</Button>
          </div>
        </div>
      ) : (
        <Button className="h-7 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau billet
        </Button>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input className="pl-8 h-7 text-xs" placeholder="Rechercher (N° devis, destination, commande...)" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div
  id="billets-scroll"
  className="bg-card border border-border rounded-lg overflow-auto print-content"
  style={{ height: "calc(100vh - 250px)" }}
>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-primary text-primary-foreground sticky top-0 z-10">
              <th className="p-1 text-left whitespace-nowrap">N° Devis</th>
              <th className="p-1 text-left whitespace-nowrap">Date</th>
              <th className="p-1 text-left whitespace-nowrap">Destination</th>
              <th className="p-1 text-left whitespace-nowrap">Client</th>
              <th className="p-1 text-left whitespace-nowrap">Contact</th>
              <th className="p-1 text-left whitespace-nowrap">Adresse fact.</th>
              <th className="p-1 text-left whitespace-nowrap">Siret</th>
              <th className="p-1 text-left whitespace-nowrap">Siren</th>
              <th className="p-1 text-left whitespace-nowrap">Nic</th>
              <th className="p-1 text-left whitespace-nowrap">N° Cde</th>
              <th className="p-1 text-center whitespace-nowrap">Mult</th>
              <th className="p-1 text-right whitespace-nowrap">Prix U.</th>
              <th className="p-1 text-right whitespace-nowrap">TTC</th>
              <th className="p-1 text-right whitespace-nowrap">HT</th>
              <th className="p-1 text-right whitespace-nowrap">Acompte</th>
              <th className="p-1 text-left whitespace-nowrap">Règlement</th>
              <th className="p-1 text-center whitespace-nowrap">Chorus</th>
              <th className="p-1 text-left whitespace-nowrap">N° Facture</th>
              <th className="p-1 text-center no-print w-14 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBillets.length === 0 ? (
              <tr>
                <td colSpan={19} className="p-3 text-center text-muted-foreground text-xs">Aucun billet pour cette période</td>
              </tr>
            ) : (
              filteredBillets.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/40">
                  <td className="p-0.5 px-1 whitespace-nowrap font-medium">{b.num_devis}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.date_sortie ? new Date(b.date_sortie.split("T")[0]).toLocaleDateString("fr-FR") : "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.destination || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{getClientField(b.client_id, "nom") || "(Client inconnu)"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.contact_client || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.adresse_facturation || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.num_siret || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.num_siren || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.num_nic || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.num_commande || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.multiplicateur || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.prix_unitaire?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right font-medium">{b.prix_ttc?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.prix_ht?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.montant_acompte?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.mode_reglement || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">
  <span
    className={`px-1 py-0.5 rounded text-[10px] font-medium ${
      b.chorus === "Oui"
        ? "bg-green-100 text-green-800"
        : b.chorus === "Non"
        ? "bg-red-100 text-red-800"
        : ""
    }`}
  >
    {b.chorus || "-"}
  </span>
</td>
                  <td className="p-0.5 px-1 whitespace-nowrap">{b.num_facture || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center no-print">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleEdit(b)} title="Modifier"><Pencil className="h-2.5 w-2.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleDelete(b.id)} title="Supprimer"><Trash2 className="h-2.5 w-2.5" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-grid-total font-bold border-t-2 border-border">
              <td colSpan={11} className="p-1 text-right whitespace-nowrap">TOTAUX :</td>
              <td className="p-1 text-right whitespace-nowrap">{totalTTC.toFixed(2)} €</td>
              <td className="p-1 text-right whitespace-nowrap">{totalHT.toFixed(2)} €</td>
              <td colSpan={6}></td>
              <td className="p-1 no-print"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}