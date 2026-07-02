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

export interface ImportProgress {
  step: string;
  current: number;
  total: number;
  message?: string;
}

export interface ImportResult {
  clientsCreés: number;
  clientsReutilisés: number;
  billetsImportés: number;
  billetsExistants: number;
  erreurs: string[];
}

function cellString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  return String(val).trim();
}

function cellStringRaw(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  return String(val);
}

function buildColMap(headers: any[], defs: { key: string; terms: string[] }[]): Record<string, number> {
  // Array.from produit un tableau dense (contrairement à .map() qui préserve les trous des tableaux sparse)
  const clean: string[] = Array.from(headers, (h: any) => {
    const s = cellStringRaw(h);
    if (!s) return "";
    return s.replace(/n[°º\.]\s*/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
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

async function findOrCreateClient(
  data: { nom: string; mail: string; adresse: string; siret: string; siren: string; nic: string; chorus: boolean }
): Promise<{ id: string; created: boolean }> {
  const nom = data.nom.trim();

  const { data: existing } = await supabase
    .from("clients")
    .select("id, siret, created_at")
    .eq("nom", nom);

  if (!existing || existing.length === 0) {
    const { data: inserted, error } = await supabase
      .from("clients")
      .insert({
        nom, mail: data.mail, adresse: data.adresse,
        siret: data.siret, siren: data.siren, nic: data.nic,
        chorus: data.chorus,
      })
      .select("id")
      .single();

    if (error || !inserted) throw new Error(`Erreur création client ${nom}: ${error?.message}`);
    return { id: inserted.id, created: true };
  }

  if (existing.length === 1) {
    return { id: existing[0].id, created: false };
  }

  if (data.siret) {
    const match = existing.find(c => c.siret === data.siret);
    if (match) return { id: match.id, created: false };
  }

  existing.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { id: existing[0].id, created: false };
}

export async function importFromXLSM(
  source: string | ArrayBuffer,
  mois: number,
  annee: number,
  type: "standard" | "tarascon" | "avignon",
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    clientsCreés: 0,
    clientsReutilisés: 0,
    billetsImportés: 0,
    billetsExistants: 0,
    erreurs: [],
  };

  if (!isSupabaseConfigured()) {
    result.erreurs.push("Supabase n'est pas configuré");
    return result;
  }

  onProgress?.({ step: "Lecture du fichier", current: 0, total: 0, message: "Ouverture du fichier XLSM..." });

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
    const data = XLSX.utils.sheet_to_json(clientSheet, { header: 1 }) as unknown[][];
    if (data.length > 0) {
      const headers = data[0];
      const cl = buildColMap(headers, [
        { key: "nom", terms: ["nom"] }, { key: "mail", terms: ["mail"] },
        { key: "adresse", terms: ["adresse"] }, { key: "siret", terms: ["siret"] },
        { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
        { key: "chorus", terms: ["chorus"] },
      ]);

      const lignesClient = data.slice(1).filter((row: unknown[]) => {
        const nom = cellString(cl.nom >= 0 ? row[cl.nom] : undefined);
        return nom !== "";
      });
      const total = lignesClient.length;

      for (let i = 0; i < lignesClient.length; i++) {
        const row = lignesClient[i];
        const nom = cellString(cl.nom >= 0 ? row[cl.nom] : undefined);

        onProgress?.({ step: "Clients", current: i + 1, total, message: nom });

        try {
          const { created } = await findOrCreateClient({
            nom,
            mail: cellString(cl.mail >= 0 ? row[cl.mail] : undefined),
            adresse: cellString(cl.adresse >= 0 ? row[cl.adresse] : undefined),
            siret: cellString(cl.siret >= 0 ? row[cl.siret] : undefined),
            siren: cellString(cl.siren >= 0 ? row[cl.siren] : undefined),
            nic: cellString(cl.nic >= 0 ? row[cl.nic] : undefined),
            chorus: cellString(cl.chorus >= 0 ? row[cl.chorus] : undefined).toLowerCase() === "oui",
          });
          if (created) result.clientsCreés++;
          else result.clientsReutilisés++;
        } catch (e: any) {
          result.erreurs.push(`Erreur client ${nom}: ${e.message}`);
        }
      }
    }
  }

  // Suppression des billets existants du mois/type
  onProgress?.({ step: "Billets - Nettoyage", current: 0, total: 0, message: "Suppression des billets existants..." });
  await supabase
    .from("billets")
    .delete()
    .eq("mois", mois)
    .eq("annee", annee)
    .eq("type", type);

  // 2. BILLETS
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Listing Client Billets Co") continue;
    const sheetInfo = detectMoisEtType(sheetName);
    if (!sheetInfo) { result.erreurs.push(`Feuille ignorée: ${sheetName}`); continue; }
    if (
      sheetInfo.mois !== mois ||
      sheetInfo.annee !== annee ||
      sheetInfo.type !== type
    ) {
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (!r) continue;
      const hasHeader = r.some((c: unknown) => {
        const s = cellString(c);
        return s.includes("N° de devis");
      });
      if (hasHeader) { headerRow = i; break; }
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

    // Compter le nombre de lignes de données pour la barre de progression
    let lignesBillets: { row: unknown[]; num_devis: string; clientName: string }[] = [];
    let consecutiveEmpty = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;
      const num_devis = cellString(cm.num_devis >= 0 ? row[cm.num_devis] : undefined);
      const clientName = cellString(cm.client >= 0 ? row[cm.client] : undefined);
      if (num_devis && (num_devis.startsWith("TOTAUX") || num_devis.startsWith("Total"))) continue;
      const hasData = row.some((c: unknown) => cellString(c) !== "");
      if (!hasData && !clientName) {
        consecutiveEmpty++;
        if (consecutiveEmpty > 3) break;
        continue;
      }
      consecutiveEmpty = 0;
      lignesBillets.push({ row, num_devis, clientName });
    }

    const totalBillets = lignesBillets.length;

    for (let i = 0; i < lignesBillets.length; i++) {
      const { row, num_devis, clientName } = lignesBillets[i];

      onProgress?.({
        step: `Billets - ${sheetName}`,
        current: i + 1,
        total: totalBillets,
        message: num_devis || "(sans numéro)",
      });

      let clientId: string | null = null;
      if (clientName) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, siret, created_at")
          .eq("nom", clientName.trim());

        if (clients && clients.length > 0) {
          if (clients.length === 1) {
            clientId = clients[0].id;
          } else {
            const siret = cm.siret >= 0 ? cellString(row[cm.siret]) : "";
            if (siret) {
              const match = clients.find(c => c.siret === siret);
              if (match) clientId = match.id;
            }
            if (!clientId) {
              clients.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              clientId = clients[0].id;
            }
          }
        }
      }

      let dateSortie = "";
      const dateVal = cm.date >= 0 ? row[cm.date] : undefined;
      if (typeof dateVal === "number") dateSortie = excelDateToString(dateVal);
      else if (typeof dateVal === "string") {
        const m = dateVal.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        dateSortie = m ? `${m[3]}-${m[2]}-${m[1]}` : dateVal;
      }

      const parseNum = (val: unknown): number | null => {
        if (val === null || val === undefined) return null;
        const s = String(val).replace(",", ".");
        const n = parseFloat(s);
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
      else prixUnitaire = parseNum(cm.prix_ttc >= 0 ? row[cm.prix_ttc] : undefined);

      const billetData = {
        type: sheetInfo.type, mois: sheetInfo.mois, annee: sheetInfo.annee,
        num_devis: num_devis.toUpperCase(),
        date_sortie: dateSortie,
        destination: cellString(cm.destination >= 0 ? row[cm.destination] : undefined),
        client_id: clientId,
        contact_client: cellString(cm.contact >= 0 ? row[cm.contact] : undefined),
        adresse_facturation: cellString(cm.adresse >= 0 ? row[cm.adresse] : undefined),
        num_siret: cm.siret >= 0 ? cellString(row[cm.siret]) : "",
        num_siren: cm.siren >= 0 ? cellString(row[cm.siren]) : "",
        num_nic: cm.nic >= 0 ? cellString(row[cm.nic]) : "",
        num_commande: cellString(cm.commande >= 0 ? row[cm.commande] : undefined),
        multiplicateur, prix_unitaire: prixUnitaire,
        prix_ttc: parseNum(cm.prix_ttc >= 0 ? row[cm.prix_ttc] : undefined),
        prix_ht: parseNum(cm.prix_ht >= 0 ? row[cm.prix_ht] : undefined),
        montant_acompte: parseNum(cm.acompte >= 0 ? row[cm.acompte] : undefined),
        mode_reglement: cellString(cm.reglement >= 0 ? row[cm.reglement] : undefined),
        chorus: cellString(cm.chorus >= 0 ? row[cm.chorus] : undefined),
        num_facture: cellString(cm.facture >= 0 ? row[cm.facture] : undefined),
      };

      const { error } = await supabase.from("billets").insert(billetData);
      if (error) result.erreurs.push(`Erreur: ${error.message} (devis:${num_devis || "vide"} client:${clientName})`);
      else result.billetsImportés++;
    }
  }

  onProgress?.({ step: "Terminé", current: 0, total: 0, message: "Import terminé" });
  return result;
}
