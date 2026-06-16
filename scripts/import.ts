/**
 * Script d'import du fichier XLSM source vers Supabase
 * 
 * Usage:
 *   npx tsx scripts/import.ts
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) envVars[key.trim()] = vals.join("=").trim();
});

const supabaseUrl = envVars["VITE_SUPABASE_URL"] || "";
const supabaseKey = envVars["VITE_SUPABASE_ANON_KEY"] || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const XLSM_PATH =
  "H:/.shortcut-targets-by-id/17sZnuv-Xb2lUkKcOgmEmyGQCxssa-67A/Transports Occasionnels Chateaurenard 26/facturation des transports occasionnels Chateaurenard 26.xlsm";

const MONTH_NAMES: Record<string, { mois: number; annee: number }> = {
  janvier: { mois: 1, annee: 2026 },
  fevrier: { mois: 2, annee: 2026 },
  février: { mois: 2, annee: 2026 },
  mars: { mois: 3, annee: 2026 },
  avril: { mois: 4, annee: 2026 },
  mai: { mois: 5, annee: 2026 },
  juin: { mois: 6, annee: 2026 },
  juillet: { mois: 7, annee: 2026 },
  aout: { mois: 8, annee: 2026 },
  août: { mois: 8, annee: 2026 },
  septembre: { mois: 9, annee: 2026 },
  octobre: { mois: 10, annee: 2026 },
  novembre: { mois: 11, annee: 2026 },
  decembre: { mois: 12, annee: 2026 },
  décembre: { mois: 12, annee: 2026 },
};

function detectMoisEtType(sheetName: string) {
  const lower = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let match = lower.match(/marche[s]?\s*tarascon\s+(\w+)\s*(\d{4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "tarascon" as const, ...p }; }
  match = lower.match(/marche[s]?\s*avignon\s+(\w+)\s*(\d{4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "avignon" as const, ...p }; }
  match = lower.match(/^(\w+)\s*(\d{4})?$/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "standard" as const, ...p }; }
  return null;
}

function excelDateToString(excelDate: number): string {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function findColIndex(headers: any[], terms: string[]): number {
  return headers.findIndex((h: any) => h && terms.some((t) => h.toString().toLowerCase().includes(t)));
}

async function main() {
  console.log("=== Import XLSM → Supabase ===");
  console.log("Supabase URL:", supabaseUrl ? "OK" : "MANQUANT");
  console.log("Supabase Key:", supabaseKey ? "OK" : "MANQUANT");
  console.log("Fichier:", XLSM_PATH);
  console.log("");

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase non configuré. Vérifie le fichier .env");
    process.exit(1);
  }

  // Test connection
  const { error: testErr } = await supabase.from("clients").select("id").limit(1);
  if (testErr) {
    console.error("❌ Erreur de connexion Supabase:", testErr.message);
    process.exit(1);
  }
  console.log("✅ Connexion Supabase OK");

  // Read workbook
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.readFile(XLSM_PATH);
  } catch (e: any) {
    console.error("❌ Impossible de lire le fichier:", e.message);
    process.exit(1);
  }
  console.log(`✅ Fichier chargé: ${wb.SheetNames.length} feuilles`);
  console.log("Feuilles:", wb.SheetNames.join(", "));
  console.log("");

  // Clear existing data for re-import
  console.log("Nettoyage des données existantes...");
  await supabase.from("billets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Données nettoyées");
  console.log("");

  let totalClients = 0;
  let totalBillets = 0;
  let totalErreurs = 0;

  // ============================================================
  // CLIENTS
  // ============================================================
  console.log("--- CLIENTS ---");
  const clientSheet = wb.Sheets["Listing Client Billets Co"];
  if (!clientSheet) {
    console.log("❌ Feuille 'Listing Client Billets Co' non trouvée");
  } else {
    const data = XLSX.utils.sheet_to_json(clientSheet, { header: 1 }) as any[][];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nom = row[1]?.toString().trim();
      if (!nom) continue;
      const siren = row[5]?.toString().trim() || "";
      const { data: existing } = await supabase.from("clients").select("id").eq("siren", siren).maybeSingle();
      if (existing) { process.stdout.write("."); continue; }
      const { error } = await supabase.from("clients").insert({
        nom, mail: row[2]?.toString().trim() || "", adresse: row[3]?.toString().trim() || "",
        siret: row[4]?.toString().trim() || "", siren, nic: row[6]?.toString().trim() || "",
      });
      if (error) { console.error(`\n❌ Erreur ${nom}: ${error.message}`); totalErreurs++; }
      else { totalClients++; process.stdout.write("+"); }
    }
    console.log(`\n✅ ${totalClients} clients importés`);
  }
  console.log("");

  // ============================================================
  // BILLETS
  // ============================================================
  console.log("--- BILLETS ---");
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Listing Client Billets Co") continue;
    const sheetInfo = detectMoisEtType(sheetName);
    if (!sheetInfo) { console.log(`⏭️  Feuille ignorée: ${sheetName}`); continue; }

    console.log(`\n📋 ${sheetName} → ${sheetInfo.type} (mois ${sheetInfo.mois}/${sheetInfo.annee})`);

    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.some((c: any) => c?.toString().includes("N° de devis"))) { headerRow = i; break; }
    }
    if (headerRow === -1) { console.log("  ⚠️  En-têtes non trouvés"); continue; }

    const headers = data[headerRow];
    const ci = (terms: string[]) => findColIndex(headers, terms);

    const colMap = {
      num_devis: ci(["n° de devis", "n.devis"]), date: ci(["date"]),
      destination: ci(["destination"]), client: ci(["client"]),
      contact: ci(["contact", "mail"]), adresse: ci(["adresse de facturation"]),
      siret: ci(["siret"]), siren: ci(["siren"]), nic: ci(["nic"]),
      commande: ci(["n° de commande", "n.commande"]),
      multiplicateur: ci(["mult"]), prix_unitaire: ci(["prix unit", "prix unitaire"]),
      prix_ttc: ci(["prix ttc"]), prix_ht: ci(["ht"]),
      acompte: ci(["acompte"]), reglement: ci(["reglement"]), facture: ci(["facture"]),
    };

    let count = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;
      const num_devis = row[colMap.num_devis]?.toString().trim();
      if (!num_devis || num_devis.startsWith("TOTAUX") || num_devis.startsWith("Total")) continue;

      const { data: existing } = await supabase.from("billets").select("id")
        .eq("num_devis", num_devis.toUpperCase()).eq("type", sheetInfo.type)
        .eq("mois", sheetInfo.mois).eq("annee", sheetInfo.annee).maybeSingle();
      if (existing) { process.stdout.write("."); continue; }

      const clientName = row[colMap.client]?.toString().trim() || "";
      let clientId: string | null = null;
      if (clientName) {
        const { data: clients } = await supabase.from("clients").select("id").ilike("nom", `%${clientName}%`).limit(1);
        if (clients?.length) clientId = clients[0].id;
      }

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

      let multiplicateur = "1X";
      if (colMap.multiplicateur >= 0) {
        const raw = row[colMap.multiplicateur];
        const n = parseInt(String(raw ?? "1"));
        if (!isNaN(n) && n > 0) multiplicateur = `${n}X`;
      }

      let prixUnitaire = null;
      if (colMap.prix_unitaire >= 0) prixUnitaire = parseNum(row[colMap.prix_unitaire]);
      else prixUnitaire = parseNum(row[colMap.prix_ttc]);

      const billetData = {
        type: sheetInfo.type, mois: sheetInfo.mois, annee: sheetInfo.annee,
        num_devis: num_devis.toUpperCase(), date_sortie: dateSortie,
        destination: row[colMap.destination]?.toString().trim() || "",
        client_id: clientId,
        contact_client: row[colMap.contact]?.toString().trim() || "",
        adresse_facturation: row[colMap.adresse]?.toString().trim() || "",
        num_siret: colMap.siret >= 0 ? (row[colMap.siret]?.toString().trim() || "") : "",
        num_siren: colMap.siren >= 0 ? (row[colMap.siren]?.toString().trim() || "") : "",
        num_nic: colMap.nic >= 0 ? (row[colMap.nic]?.toString().trim() || "") : "",
        num_commande: row[colMap.commande]?.toString().trim() || "",
        multiplicateur, prix_unitaire: prixUnitaire,
        prix_ttc: parseNum(row[colMap.prix_ttc]), prix_ht: parseNum(row[colMap.prix_ht]),
        montant_acompte: parseNum(row[colMap.acompte]),
        mode_reglement: row[colMap.reglement]?.toString().trim() || "",
        num_facture: row[colMap.facture]?.toString().trim() || "",
      };

      const { error } = await supabase.from("billets").insert(billetData);
      if (error) { console.error(`\n❌ Erreur ${num_devis}: ${error.message}`); totalErreurs++; }
      else { count++; totalBillets++; process.stdout.write("+"); }
    }
    console.log(` → ${count} billets`);
  }

  console.log("\n\n=== RÉSULTAT ===");
  console.log(`✅ Clients importés: ${totalClients}`);
  console.log(`✅ Billets importés: ${totalBillets}`);
  if (totalErreurs > 0) console.log(`⚠️  Erreurs: ${totalErreurs}`);
  console.log("=== Terminé ===");
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});