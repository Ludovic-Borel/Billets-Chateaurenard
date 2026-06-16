import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "./supabase";

const MONTH_NAMES: Record<string, { mois: number; annee: number }> = {
  "janvier": { mois: 1, annee: 2026 },
  "fevrier": { mois: 2, annee: 2026 },
  "février": { mois: 2, annee: 2026 },
  "mars": { mois: 3, annee: 2026 },
  "avril": { mois: 4, annee: 2026 },
  "mai": { mois: 5, annee: 2026 },
  "juin": { mois: 6, annee: 2026 },
  "juillet": { mois: 7, annee: 2026 },
  "aout": { mois: 8, annee: 2026 },
  "août": { mois: 8, annee: 2026 },
  "septembre": { mois: 9, annee: 2026 },
  "octobre": { mois: 10, annee: 2026 },
  "novembre": { mois: 11, annee: 2026 },
  "decembre": { mois: 12, annee: 2026 },
  "décembre": { mois: 12, annee: 2026 },
};

function detectMoisEtType(sheetName: string): { type: "standard" | "tarascon" | "avignon"; mois: number; annee: number } | null {
  const lower = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // "Marchés Tarascon Mois Année" ou "Marché Tarascon Mois Année"
  let match = lower.match(/marche[s]?\s*tarascon\s+(\w+)\s*(\d{4})?/);
  if (match) {
    const monthKey = match[1].toLowerCase();
    const period = MONTH_NAMES[monthKey];
    if (period) return { type: "tarascon", mois: period.mois, annee: period.annee };
  }

  // "Marchés Avignon Mois Année"
  match = lower.match(/marche[s]?\s*avignon\s+(\w+)\s*(\d{4})?/);
  if (match) {
    const monthKey = match[1].toLowerCase();
    const period = MONTH_NAMES[monthKey];
    if (period) return { type: "avignon", mois: period.mois, annee: period.annee };
  }

  // "Mois Année" (feuille standard) - doit être le nom principal de la feuille
  match = lower.match(/^(\w+)\s*(\d{4})?$/);
  if (match) {
    const monthKey = match[1].toLowerCase();
    const period = MONTH_NAMES[monthKey];
    if (period) return { type: "standard", mois: period.mois, annee: period.annee };
  }

  return null;
}

function excelDateToString(excelDate: number): string {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export interface ImportResult {
  clientsImportes: number;
  clientsIgnores: number;
  billetsImportes: { standard: number; tarascon: number; avignon: number };
  erreurs: string[];
}

function findColIndex(headers: any[], searchTerms: string[]): number {
  return headers.findIndex((h: any) => {
    if (!h) return false;
    const hs = h.toString().trim();
    return searchTerms.some(t => hs.toLowerCase().includes(t.toLowerCase()));
  });
}

export async function importFromXLSM(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    clientsImportes: 0, clientsIgnores: 0,
    billetsImportes: { standard: 0, tarascon: 0, avignon: 0 },
    erreurs: [],
  };

  if (!isSupabaseConfigured()) {
    result.erreurs.push("Supabase n'est pas configuré");
    return result;
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(filePath);
  } catch (e: any) {
    result.erreurs.push(`Impossible de lire le fichier: ${e.message}`);
    return result;
  }

  // ============================================================
  // 1. IMPORTER LES CLIENTS
  // ============================================================
  const clientSheet = wb.Sheets["Listing Client Billets Co"];
  if (clientSheet) {
    const data = XLSX.utils.sheet_to_json(clientSheet, { header: 1 }) as any[][];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nom = row[1]?.toString().trim();
      if (!nom) continue;
      const siren = row[5]?.toString().trim() || "";
      const { data: existing } = await supabase.from("clients").select("id").eq("siren", siren).maybeSingle();
      if (existing) { result.clientsIgnores++; continue; }
      const { error } = await supabase.from("clients").insert({
        nom, mail: row[2]?.toString().trim() || "", adresse: row[3]?.toString().trim() || "",
        siret: row[4]?.toString().trim() || "", siren, nic: row[6]?.toString().trim() || "",
      });
      if (error) result.erreurs.push(`Erreur client ${nom}: ${error.message}`);
      else result.clientsImportes++;
    }
  } else {
    result.erreurs.push("Feuille 'Listing Client Billets Co' non trouvée");
  }

  // ============================================================
  // 2. IMPORTER LES BILLETS
  // ============================================================
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Listing Client Billets Co") continue;

    const sheetInfo = detectMoisEtType(sheetName);
    if (!sheetInfo) {
      result.erreurs.push(`Feuille ignorée: ${sheetName}`);
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Find header row
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (r && r.some((c: any) => c?.toString().includes("N° de devis"))) {
        headerRow = i;
        break;
      }
    }
    if (headerRow === -1) { result.erreurs.push(`En-têtes non trouvés dans ${sheetName}`); continue; }

    const headers = data[headerRow];

    // Build column map by searching header names
    const colIndex = (terms: string[]) => findColIndex(headers, terms);

    const colMap = {
      num_devis: colIndex(["n° de devis", "n.devis"]),
      date: colIndex(["date"]),
      destination: colIndex(["destination"]),
      client: colIndex(["client"]),
      contact: colIndex(["contact", "mail"]),
      adresse: colIndex(["adresse de facturation"]),
      siret: colIndex(["siret"]),
      siren: colIndex(["siren"]),
      nic: colIndex(["nic"]),
      commande: colIndex(["n° de commande", "n.commande"]),
      multiplicateur: colIndex(["mult"]),
      prix_unitaire: colIndex(["prix unit", "prix unitaire"]),
      prix_ttc: colIndex(["prix ttc"]),
      prix_ht: colIndex(["ht"]),
      acompte: colIndex(["acompte"]),
      reglement: colIndex(["reglement"]),
      facture: colIndex(["facture"]),
    };

    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;

      const num_devis = row[colMap.num_devis]?.toString().trim();
      if (!num_devis || num_devis.startsWith("TOTAUX") || num_devis.startsWith("Total")) continue;

      // Skip duplicate
      const { data: existing } = await supabase.from("billets").select("id")
        .eq("num_devis", num_devis).eq("type", sheetInfo.type)
        .eq("mois", sheetInfo.mois).eq("annee", sheetInfo.annee).maybeSingle();
      if (existing) continue;

      // Lookup client
      const clientName = row[colMap.client]?.toString().trim() || "";
      let clientId: string | null = null;
      if (clientName) {
        const { data: clients } = await supabase.from("clients").select("id").ilike("nom", `%${clientName}%`).limit(1);
        if (clients && clients.length > 0) clientId = clients[0].id;
      }

      // Parse date
      let dateSortie = "";
      const dateVal = row[colMap.date];
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

      // Get multiplicateur (default "1X")
      let multiplicateur = "1X";
      if (colMap.multiplicateur >= 0) {
        const rawMult = row[colMap.multiplicateur];
        if (rawMult !== null && rawMult !== undefined) {
          const multNum = parseInt(String(rawMult));
          if (!isNaN(multNum) && multNum > 0) multiplicateur = `${multNum}X`;
        }
      }

      // Get prix_unitaire (may be in different columns depending on type)
      let prixUnitaire = null;
      if (colMap.prix_unitaire >= 0) {
        prixUnitaire = parseNum(row[colMap.prix_unitaire]);
      } else {
        // Fallback: use prix_ttc as unit price if no multiplicateur
        prixUnitaire = parseNum(row[colMap.prix_ttc]);
      }

      const billetData = {
        type: sheetInfo.type,
        mois: sheetInfo.mois,
        annee: sheetInfo.annee,
        num_devis: num_devis.toUpperCase(),
        date_sortie: dateSortie,
        destination: row[colMap.destination]?.toString().trim() || "",
        client_id: clientId,
        contact_client: row[colMap.contact]?.toString().trim() || "",
        adresse_facturation: row[colMap.adresse]?.toString().trim() || "",
        num_siret: colMap.siret >= 0 ? (row[colMap.siret]?.toString().trim() || "") : "",
        num_siren: colMap.siren >= 0 ? (row[colMap.siren]?.toString().trim() || "") : "",
        num_nic: colMap.nic >= 0 ? (row[colMap.nic]?.toString().trim() || "") : "",
        num_commande: row[colMap.commande]?.toString().trim() || "",
        multiplicateur,
        prix_unitaire: prixUnitaire,
        prix_ttc: parseNum(row[colMap.prix_ttc]),
        prix_ht: parseNum(row[colMap.prix_ht]),
        montant_acompte: parseNum(row[colMap.acompte]),
        mode_reglement: row[colMap.reglement]?.toString().trim() || "",
        num_facture: row[colMap.facture]?.toString().trim() || "",
      };

      const { error } = await supabase.from("billets").insert(billetData);
      if (error) result.erreurs.push(`Erreur ${num_devis} (${sheetName}): ${error.message}`);
      else result.billetsImportes[sheetInfo.type]++;
    }
  }

  return result;
}