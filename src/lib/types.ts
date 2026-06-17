export interface Client {
  id: string;
  nom: string;
  mail: string;
  adresse: string;
  siret: string;
  siren: string;
  nic: string;
  created_at: string;
}

export interface Billet {
  id: string;
  type: "standard" | "tarascon" | "avignon";
  mois: number;
  annee: number;
  num_devis: string;
  date_sortie: string;
  destination: string;
  client_id: string;
  contact_client: string;
  adresse_facturation: string;
  num_siret: string;
  num_siren: string;
  num_nic: string;
  num_commande: string;
  multiplicateur: string;
  prix_unitaire: number | null;
  prix_ttc: number | null;
  prix_ht: number | null;
  montant_acompte: number | null;
  mode_reglement: string;
  num_facture: string;
  created_at: string;
  updated_at: string;
}

export interface BilletFormData {
  num_devis: string;
  date_sortie: string;
  destination: string;
  client_id: string;
  contact_client: string;
  adresse_facturation: string;
  num_siret: string;
  num_siren: string;
  num_nic: string;
  num_commande: string;
  multiplicateur: string;
  prix_unitaire: number | null;
  prix_ttc: number | null;
  prix_ht: number | null;
  montant_acompte: number | null;
  mode_reglement: string;
  num_facture: string;
}

export interface ClientFormData {
  nom: string;
  mail: string;
  adresse: string;
  siret: string;
  siren: string;
  nic: string;
}

export const BILLET_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "tarascon", label: "Marchés Tarascon" },
  { value: "avignon", label: "Marchés Avignon" },
] as const;

export const MULTIPLICATEURS = [
  "1X", "2X", "3X", "4X", "5X", "6X", "7X", "8X", "9X", "10X",
];

export const MODES_REGLEMENT = [
  "Chèque", "Espèces", "Virement", "CB", "Prélèvement", "Autre",
];

export function parseMultiplicateur(val: string): number {
  const m = parseInt(val.replace("X", ""));
  return isNaN(m) ? 1 : m;
}

export function formatNumDevis(input: string, annee: number): string {
  const trimmed = input.trim();
  if (trimmed === "") return "";

  // If it already starts with CHA25- or CHA26- (or any CHA##-), keep as-is
  if (/^CHA\d{2}-/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Otherwise, prefix with CHA{annee_short}-
  const shortYear = String(annee).slice(-2);
  return `CHA${shortYear}-${trimmed}`;
}