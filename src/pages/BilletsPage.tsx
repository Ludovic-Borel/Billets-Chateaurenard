import { useState, useEffect, useCallback, useRef } from "react";
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
import { ClientSearch } from "@/components/ClientSearch";

interface BilletsPageProps {
  year: number;
  month: number;
  selectedType: "standard" | "tarascon" | "avignon";
  onTypeChange: (type: "standard" | "tarascon" | "avignon") => void;

  showForm: boolean;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
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

export function BilletsPage({
  year,
  month,
  selectedType,
  onTypeChange,
  showForm,
  setShowForm,
}: BilletsPageProps) {
  const [billets, setBillets] = useState<Billet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<BilletFormData>(emptyBillet());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  
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

    setTimeout(() => {
      tableRef.current?.scrollTo({
      top: tableRef.current.scrollHeight,
      behavior: "auto",
  });
}, 50);
  }, [selectedType, month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const getClientField = (clientId: string, field: keyof Client) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? String(client[field] || "") : "";
  };

  const filteredBillets = billets.filter((b) => {
  if (!search) return true;

  const s = search.toLowerCase();

  const clientNom = (getClientField(b.client_id, "nom") || "").toLowerCase();

  return (
    (b.num_devis || "").toLowerCase().includes(s) ||
    (b.destination || "").toLowerCase().includes(s) ||
    (b.contact_client || "").toLowerCase().includes(s) ||
    (b.adresse_facturation || "").toLowerCase().includes(s) ||
    (b.num_siret || "").toLowerCase().includes(s) ||
    (b.num_siren || "").toLowerCase().includes(s) ||
    (b.num_nic || "").toLowerCase().includes(s) ||
    (b.num_commande || "").toLowerCase().includes(s) ||
    (b.mode_reglement || "").toLowerCase().includes(s) ||
    (b.num_facture || "").toLowerCase().includes(s) ||
    (b.chorus || "").toLowerCase().includes(s) ||
    clientNom.includes(s) ||
    String(b.prix_unitaire || "").includes(search) ||
    String(b.prix_ttc || "").includes(search) ||
    String(b.prix_ht || "").includes(search) ||
    String(b.montant_acompte || "").includes(search)
  );
});

const sortedBillets = [...filteredBillets].sort((a, b) => {
  // 1 - Date
  const dateCompare = (a.date_sortie || "").localeCompare(b.date_sortie || "");
  if (dateCompare !== 0) return dateCompare;

  // 2 - Sans numéro de devis en premier
  if (!a.num_devis && b.num_devis) return -1;
  if (a.num_devis && !b.num_devis) return 1;

  // 3 - Extraction du type et du numéro
  const parse = (num: string) => {
    const m = num.match(/^CHA(\d+)-(\d+)(.*)$/i);

    if (!m) {
      return {
        serie: 999,
        numero: Number.MAX_SAFE_INTEGER,
        suffixe: "",
      };
    }

    return {
      serie: parseInt(m[1], 10),
      numero: parseInt(m[2], 10),
      suffixe: (m[3] || "").trim().toLowerCase(),
    };
  };

  const pa = parse(a.num_devis || "");
  const pb = parse(b.num_devis || "");

  // CHA25 avant CHA26
  if (pa.serie !== pb.serie)
    return pa.serie - pb.serie;

  // Numéro numérique
  if (pa.numero !== pb.numero)
    return pa.numero - pb.numero;

  // bis / ter / etc.
  return pa.suffixe.localeCompare(pb.suffixe);
});

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
    window.scrollTo({
  top: 0,
  behavior: "smooth",
});
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
  <div className="space-y-3 pt-2 animate-fade-in">

      {(showForm || editingId) && (
  <div className="bg-card border border-border rounded-lg p-3 space-y-3">

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">

      <div className="space-y-0.5">
        <Label className="text-[10px]">N° Devis *</Label>
        <Input
          className="h-7 text-xs"
          value={form.num_devis}
          onChange={(e) => setForm({ ...form, num_devis: e.target.value })}
          placeholder="126 ou CHA25-126"
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">Date sortie</Label>
        <Input
          className="h-7 text-xs"
          type="date"
          value={form.date_sortie}
          onChange={(e) => setForm({ ...form, date_sortie: e.target.value })}
        />
      </div>

      <div className="space-y-0.5">
  <Label className="text-[10px]">
    Client
  </Label>

  <ClientSearch
    clients={clients}
    value={form.client_id}
    onChange={handleClientSelect}
    onNewClient={() => {
      console.log("Nouveau client");
    }}
  />
</div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">Contact client</Label>
        <Input
          className="h-7 text-xs"
          value={form.contact_client}
          onChange={(e) =>
            setForm({ ...form, contact_client: e.target.value })
          }
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">Adresse fact.</Label>
        <Input
          className="h-7 text-xs"
          value={form.adresse_facturation}
          onChange={(e) =>
            setForm({ ...form, adresse_facturation: e.target.value })
          }
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">N° Siret</Label>
        <Input
          className="h-7 text-xs"
          value={form.num_siret}
          onChange={(e) => setForm({ ...form, num_siret: e.target.value })}
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">N° Siren</Label>
        <Input
          className="h-7 text-xs"
          value={form.num_siren}
          onChange={(e) => setForm({ ...form, num_siren: e.target.value })}
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">N° Nic</Label>
        <Input
          className="h-7 text-xs"
          value={form.num_nic}
          onChange={(e) => setForm({ ...form, num_nic: e.target.value })}
        />
      </div>

      <div className="space-y-0.5">
        <Label className="text-[10px]">N° Commande</Label>
        <Input
          className="h-7 text-xs"
          value={form.num_commande}
          onChange={(e) => setForm({ ...form, num_commande: e.target.value })}
        />
      </div>

       
    </div>

    <div className="flex gap-2">
      <Button onClick={handleSave} className="h-7 text-xs">
        <Pencil className="h-3.5 w-3.5 mr-1" />
        {editingId ? "Modifier" : "Ajouter"}
      </Button>

      <Button
        variant="outline"
        className="h-7 text-xs"
        onClick={resetForm}
      >
        Annuler
      </Button>
    </div>

  </div>
)}
      
      <div className="mt-2">

    <div className="flex items-center gap-4">

    <div className="text-xs font-medium text-muted-foreground whitespace-nowrap px-2">
  Synthèse du mois
</div>  

    <div className="flex items-center gap-2">

      <div className="bg-card border rounded-lg px-3 py-1 min-w-[100px]">
        <div className="text-[10px] text-muted-foreground text-center">
          Billets
        </div>
        <div className="font-bold text-base text-center">
          {sortedBillets.length}
        </div>
      </div>

      <div className="bg-card border rounded-lg px-3 py-1 min-w-[140px]">
        <div className="text-[10px] text-muted-foreground text-center">
          Total TTC
        </div>
        <div className="font-bold text-base text-center">
          {totalTTC.toFixed(2)} €
        </div>
      </div>

      <div className="bg-card border rounded-lg px-3 py-1 min-w-[140px]">
        <div className="text-[10px] text-muted-foreground text-center">
          Total HT
        </div>
        <div className="font-bold text-base text-center">
          {totalHT.toFixed(2)} €
        </div>
      </div>

    </div>

    <div className="relative ml-5 w-[900px]">

      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />

      <Input
        className="pl-8 h-8 text-sm"
        placeholder="Rechercher (N° devis, destination, commande...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

    </div>

  </div>

</div>

<div
  ref={tableRef}
  className="bg-card border border-border rounded-lg overflow-auto print-content"
  style={{ height: "calc(100vh - 300px)" }}
>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-primary text-primary-foreground sticky top-0 z-10">
              <th className="p-1 text-center whitespace-nowrap">N° Devis</th>
              <th className="p-1 text-center whitespace-nowrap">Date</th>
              <th className="p-1 text-center whitespace-nowrap">Destination</th>
              <th className="p-1 text-center whitespace-nowrap">Client</th>
              <th className="p-1 text-center whitespace-nowrap">Contact</th>
              <th className="p-1 text-center whitespace-nowrap">Adresse fact.</th>
              <th className="p-1 text-center whitespace-nowrap">Siret</th>
              <th className="p-1 text-center whitespace-nowrap">Siren</th>
              <th className="p-1 text-center whitespace-nowrap">Nic</th>
              <th className="p-1 text-center whitespace-nowrap">N° Cde</th>
              <th className="p-1 text-center whitespace-nowrap">Mult</th>
              <th className="p-1 text-center whitespace-nowrap">Prix U.</th>
              <th className="p-1 text-center whitespace-nowrap">TTC</th>
              <th className="p-1 text-center whitespace-nowrap">HT</th>
              <th className="p-1 text-center whitespace-nowrap">Acompte</th>
              <th className="p-1 text-center whitespace-nowrap">Règlement</th>
              <th className="p-1 text-center whitespace-nowrap">Chorus</th>
              <th className="p-1 text-center whitespace-nowrap">N° Facture</th>
              <th className="p-1 text-center no-print w-14 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBillets.length === 0 ? (
              <tr>
                <td colSpan={19} className="p-3 text-center text-muted-foreground text-xs">Aucun billet pour cette période</td>
              </tr>
            ) : (
              sortedBillets.map((b) => (
                <tr
  key={b.id}
  className="cursor-pointer hover:bg-muted/50 select-none"
  onDoubleClick={() => handleEdit(b)}
>
                  <td className="p-0.5 px-1 whitespace-nowrap font-medium">{b.num_devis}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.date_sortie ? new Date(b.date_sortie.split("T")[0]).toLocaleDateString("fr-FR") : "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.destination || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{getClientField(b.client_id, "nom") || "(Client inconnu)"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.contact_client || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.adresse_facturation || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.num_siret || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.num_siren || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.num_nic || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.num_commande || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.multiplicateur || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.prix_unitaire?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right font-medium">{b.prix_ttc?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.prix_ht?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-right">{b.montant_acompte?.toFixed(2) || "-"} €</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.mode_reglement || "-"}</td>
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
                  <td className="p-0.5 px-1 whitespace-nowrap text-center">{b.num_facture || "-"}</td>
                  <td className="p-0.5 px-1 whitespace-nowrap text-center no-print">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleEdit(b)} title="Modifier"><Pencil className="h-2.5 w-2.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleDelete(b.id)} title="Supprimer"><Trash2 className="h-2.5 w-2.5" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>          
        </table>
      </div>
    </div>
  );
}