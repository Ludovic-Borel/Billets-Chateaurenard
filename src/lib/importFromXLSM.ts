import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "./supabase";

const MONTH_NAMES: Record<string, { mois: number; annee: number }> = {
  "janvier": { mois: 1, annee: 2026 }, "fevrier": { mois: 2, annee: 2026 }, "février": { mois: 2, annee: 2026 },
  "mars": { mois: 3, annee: 2026 }, "avril": { mois: 4, annee: 2026 }, "mai": { mois: 5, annee: 2026 },
  "juin": { mois: 6, annee: 2026 }, "juillet": { mois: 7, annee: 2026 }, "aout": { mois: 8, annee: 2026 },
  "août": { mois: 8, annee: 2026 }, "septembre": { mois: 9, annee: 2026 }, "octobre": { mois: 10, annee: 2026 },
  "novembre": { mois: 11, annee: 2026 }, "decembre": { mois: 12, annee: 2026 }, "décembre": { mois: 12, annee: 2026 },
};

function detectMoisEtType(sheetName: string): { type: "standard" | "tarascon" | "avignon"; mois: number; annee: number } | null {
  const lower = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let match = lower.match(/marche[s]?\s*tarascon\s+(\w+)\s*(\d{2,4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "tarascon", ...p }; }
  match = lower.match(/marche[s]?\s*avignon\s+(\w+)\s*(\d{2,4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "avignon", ...p }; }
  match = lower.match(/^(\w+)\s*(\d{2,4})?$/);
  if (match) {
    const p = MONTH_NAMES[match[1].toLowerCase()];
    if (p) {
      let year = 2026;
      if (match[2]) year = match[2].length === 2 ? 2000 + parseInt(match[2]) : parseInt(match[2]);
      return { type: "standard", mois: p.mois, annee: year };
    }
  }
  return null;
}

function excelDateToString(excelDate: number): string {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface ImportResult {
  clientsImportes: number;
  clientsIgnores: number;
  billetsIgnores: number;
  billetsImportes: {
    standard: number;
    tarascon: number;
    avignon: number;
  };
  erreurs: string[];
}

function buildColMap(headers: any[], defs: { key: string; terms: string[] }[]): Record<string, number> {
  const clean = headers.map((h: any) => {
    if (!h) return "";
    return h.toString().replace(/n[°º\.]\s*/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
  });
  const result: Record<string, number> = {};
  const used: boolean[] = new Array(headers.length).fill(false);
  const sorted = [...defs].sort((a, b) => Math.max(...b.terms.map(t => t.length)) - Math.max(...a.terms.map(t => t.length)));
  for (const def of sorted) {
    let found = -1;
    for (const term of def.terms) {
      const t = term.toLowerCase();
      for (let i = 0; i < clean.length; i++) {
        if (used[i]) continue;
        if (clean[i].includes(t)) { found = i; break; }
      }
      if (found >= 0) break;
    }
    result[def.key] = found;
    if (found >= 0) used[found] = true;
  }
  return result;
}

export async function importFromXLSM(source: string | ArrayBuffer): Promise<ImportResult> {
  const result: ImportResult = {
    clientsImportes: 0,
    clientsIgnores: 0,
    billetsIgnores: 0, // <-- AJOUTER
    billetsImportes: {
      standard: 0,
      tarascon: 0,
      avignon: 0
    },
    erreurs: [],
  };

  if (!isSupabaseConfigured()) {
    result.erreurs.push("Supabase n'est pas configuré");
    return result;
  }

  let wb: XLSX.WorkBook;
  try {
    if (typeof source === "string") {
      wb = XLSX.readFile(source);
    } else {
      const data = new Uint8Array(source);
      wb = XLSX.read(data, { type: "array" });
    }
  } catch (e: any) {
    result.erreurs.push(`Impossible de lire le fichier: ${e.message}`);
    return result;
  }

  // 1. CLIENTS
  const clientSheet = wb.Sheets["Listing Client Billets Co"];
  if (clientSheet) {
    const data = XLSX.utils.sheet_to_json(clientSheet, { header: 1 }) as any[][];
    if (data.length > 0) {
      const headers = data[0];
      const cl = buildColMap(headers, [
        { key: "nom", terms: ["nom"] }, { key: "mail", terms: ["mail"] },
        { key: "adresse", terms: ["adresse"] }, { key: "siret", terms: ["siret"] },
        { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
        { key: "chorus", terms: ["chorus"] },
      ]);
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const nom = row[cl.nom]?.toString().trim();
        if (!nom) continue;
        const { error } = await supabase.from("clients").insert({
          nom, mail: row[cl.mail]?.toString().trim() || "",
          adresse: row[cl.adresse]?.toString().trim() || "",
          siret: row[cl.siret]?.toString().trim() || "",
          siren: row[cl.siren]?.toString().trim() || "",
          nic: row[cl.nic]?.toString().trim() || "",
          chorus: row[cl.chorus]?.toString().trim().toLowerCase() === "oui",
        });
        if (error) result.erreurs.push(`Erreur client ${nom}: ${error.message}`);
        else result.clientsImportes++;
      }
    }
  }

  // 2. BILLETS
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Listing Client Billets Co") continue;
    const sheetInfo = detectMoisEtType(sheetName);
    if (!sheetInfo) { result.erreurs.push(`Feuille ignorée: ${sheetName}`); continue; }

    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (r && r.some((c: any) => c?.toString().includes("N° de devis"))) { headerRow = i; break; }
    }
    if (headerRow === -1) { result.erreurs.push(`En-têtes non trouvés dans ${sheetName}`); continue; }

    const headers = data[headerRow];
    const cm = buildColMap(headers, [
      { key: "num_devis", terms: ["devis"] }, { key: "date", terms: ["date"] },
      { key: "destination", terms: ["destination"] }, { key: "client", terms: ["client"] },
      { key: "contact", terms: ["contact client", "contact"] },
      { key: "adresse", terms: ["adresse de facturation", "adresse"] },
      { key: "siret", terms: ["siret"] }, { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
      { key: "commande", terms: ["commande"] }, { key: "multiplicateur", terms: ["mult"] },
      { key: "prix_unitaire", terms: ["prix unit"] }, { key: "prix_ttc", terms: ["prix ttc", "ttc"] },
      { key: "prix_ht", terms: ["ht"] }, { key: "acompte", terms: ["acompte"] },
      { key: "reglement", terms: ["reglement"] },
      { key: "chorus", terms: ["chorus"] }, 
      { key: "facture", terms: ["facture"] },
    ]);

    let consecutiveEmpty = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;

      const num_devis = row[cm.num_devis]?.toString().trim();
      const clientName = row[cm.client]?.toString().trim() || "";

      if (num_devis && (num_devis.startsWith("TOTAUX") || num_devis.startsWith("Total"))) continue;

      const hasData = row.some((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
      if (!hasData && !clientName) {
        consecutiveEmpty++;
        if (consecutiveEmpty > 3) break;
        continue;
      }
      consecutiveEmpty = 0;

      let clientId: string | null = null;
      if (clientName) {
        const { data: clients } = await supabase.from("clients").select("id").ilike("nom", `%${clientName}%`).limit(1);
        if (clients && clients.length > 0) clientId = clients[0].id;
      }

      let dateSortie = "";
      const dateVal = row[cm.date];
      if (typeof dateVal === "number") dateSortie = excelDateToString(dateVal);
      else if (typeof dateVal === "string") {
        const m = dateVal.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        dateSortie = m ? `${m[3]}-${m[2]}-${m[1]}` : dateVal;
      }

      const parseNum = (val: any): number | null => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseFloat(String(val).replace(",", "."));
        return isNaN(n) ? null : Math.round(n * 100) / 100;
      };

      let multiplicateur = "1X";
      if (cm.multiplicateur >= 0) {
        const rawMult = row[cm.multiplicateur];
        if (rawMult !== null && rawMult !== undefined) {
          const multNum = parseInt(String(rawMult));
          if (!isNaN(multNum) && multNum > 0) multiplicateur = `${multNum}X`;
        }
      }

      let prixUnitaire = null;
      if (cm.prix_unitaire >= 0) prixUnitaire = parseNum(row[cm.prix_unitaire]);
      else prixUnitaire = parseNum(row[cm.prix_ttc]);

      const billetData = {
        type: sheetInfo.type, mois: sheetInfo.mois, annee: sheetInfo.annee,
        num_devis: num_devis ? num_devis.toUpperCase() : "",
        date_sortie: dateSortie, destination: row[cm.destination]?.toString().trim() || "",
        client_id: clientId, contact_client: row[cm.contact]?.toString().trim() || "",
        adresse_facturation: row[cm.adresse]?.toString().trim() || "",
        num_siret: cm.siret >= 0 ? (row[cm.siret]?.toString().trim() || "") : "",
        num_siren: cm.siren >= 0 ? (row[cm.siren]?.toString().trim() || "") : "",
        num_nic: cm.nic >= 0 ? (row[cm.nic]?.toString().trim() || "") : "",
        num_commande: row[cm.commande]?.toString().trim() || "",
        multiplicateur, prix_unitaire: prixUnitaire,
        prix_ttc: parseNum(row[cm.prix_ttc]), prix_ht: parseNum(row[cm.prix_ht]),
        montant_acompte: parseNum(row[cm.acompte]),
        mode_reglement: row[cm.reglement]?.toString().trim() || "",
        chorus: row[cm.chorus]?.toString().trim() || "",
        num_facture: row[cm.facture]?.toString().trim() || "",
      };


      const { error } = await supabase.from("billets").insert(billetData);
      if (error) result.erreurs.push(`Erreur: ${error.message} (devis:${num_devis || "vide"} client:${clientName})`);
      else result.billetsImportes[sheetInfo.type]++;
    }
  }

  return result;
}