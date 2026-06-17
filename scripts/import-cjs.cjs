// Script d'import XLSM vers Supabase (CommonJS)
// Usage: node scripts/import-cjs.cjs

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) envVars[key.trim()] = vals.join("=").trim();
});

const supabaseUrl = envVars["VITE_SUPABASE_URL"] || "";
const supabaseKey = envVars["VITE_SUPABASE_ANON_KEY"] || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const XLSM_PATH =
  "H:/.shortcut-targets-by-id/17sZnuv-Xb2lUkKcOgmEmyGQCxssa-67A/Transports Occasionnels Chateaurenard 26/facturation des transports occasionnels Chateaurenard 26.xlsm";

const MONTH_NAMES = {
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

function detectMoisEtType(sheetName) {
  const lower = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let match = lower.match(/marche[s]?\s*tarascon\s+(\w+)\s*(\d{4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "tarascon", ...p }; }
  match = lower.match(/marche[s]?\s*avignon\s+(\w+)\s*(\d{4})?/);
  if (match) { const p = MONTH_NAMES[match[1].toLowerCase()]; if (p) return { type: "avignon", ...p }; }
  match = lower.match(/^(\w+)\s*(\d{2,4})?$/);
  if (match) {
    const p = MONTH_NAMES[match[1].toLowerCase()];
    if (p) {
      // Use 4-digit year, default to 2026 if 2-digit
      let year = 2026;
      if (match[2]) {
        year = match[2].length === 2 ? 2000 + parseInt(match[2]) : parseInt(match[2]);
      }
      return { type: "standard", mois: p.mois, annee: year };
    }
  }
  return null;
}

function excelDateToString(excelDate) {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function findColIndex(headers, terms) {
  return headers.findIndex((h) => h && terms.some((t) => h.toString().toLowerCase().includes(t)));
}

async function main() {
  console.log("=== Import XLSM to Supabase ===");

  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Supabase not configured. Check .env file");
    process.exit(1);
  }

  // Test connection
  const { error: testErr } = await supabase.from("clients").select("id").limit(1);
  if (testErr) {
    console.error("ERROR Supabase connection:", testErr.message);
    process.exit(1);
  }
  console.log("OK Connected to Supabase");

  // Read file
  let wb;
  try {
    wb = XLSX.readFile(XLSM_PATH);
  } catch (e) {
    console.error("ERROR reading file:", e.message);
    process.exit(1);
  }
  console.log("OK Loaded:", wb.SheetNames.length, "sheets");
  console.log("Sheets:", wb.SheetNames.join(", "));
  console.log("");

  // Confirm before clearing
  console.log("WARNING: This will DELETE all existing data and re-import!");
  console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...");
  await new Promise((r) => setTimeout(r, 3000));
  console.log("Starting import...\n");

  // Clear
  console.log("Clearing existing data...");
  await supabase.from("billets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("OK Data cleared\n");

  let totalClients = 0, totalBillets = 0, totalErreurs = 0;

  // ========== CLIENTS ==========
  console.log("--- CLIENTS ---");
  const clientSheet = wb.Sheets["Listing Client Billets Co"];
  if (clientSheet) {
    const data = XLSX.utils.sheet_to_json(clientSheet, { header: 1 });
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nom = row[1]?.toString().trim();
      if (!nom) continue;
      const { error } = await supabase.from("clients").insert({
        nom, mail: row[2]?.toString().trim() || "", adresse: row[3]?.toString().trim() || "",
        siret: row[4]?.toString().trim() || "", siren: row[5]?.toString().trim() || "",
        nic: row[6]?.toString().trim() || "",
      });
      if (error) { console.error("ERROR", nom, ":", error.message); totalErreurs++; }
      else { totalClients++; process.stdout.write("+"); }
    }
    console.log("\nOK", totalClients, "clients imported");
  }

  // ========== BILLETS ==========
  console.log("\n--- BILLETS ---");
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Listing Client Billets Co") continue;
    const sheetInfo = detectMoisEtType(sheetName);
    if (!sheetInfo) { console.log("SKIP:", sheetName); continue; }

    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.some((c) => c?.toString().includes("N° de devis"))) { headerRow = i; break; }
    }
    if (headerRow === -1) { console.log("  WARN: no headers in", sheetName); continue; }

    const headers = data[headerRow];
    const ci = (terms) => findColIndex(headers, terms);
    const cm = {
      num_devis: ci(["n° de devis"]), date: ci(["date"]),
      destination: ci(["destination"]), client: ci(["client"]),
      contact: ci(["contact", "mail"]), adresse: ci(["adresse de facturation"]),
      siret: ci(["siret"]), siren: ci(["siren"]), nic: ci(["nic"]),
      commande: ci(["n° de commande"]), multiplicateur: ci(["mult"]),
      prix_unitaire: ci(["prix unit", "prix unitaire"]), prix_ttc: ci(["prix ttc"]),
      prix_ht: ci(["ht"]), acompte: ci(["acompte"]),
      reglement: ci(["reglement"]), facture: ci(["facture"]),
    };

    let count = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;
      const num_devis = row[cm.num_devis]?.toString().trim();
      if (!num_devis || num_devis.startsWith("TOTAUX") || num_devis.startsWith("Total")) continue;

      const clientName = row[cm.client]?.toString().trim() || "";
      // Skip if no client name and no devis number (empty row)
      if (!num_devis && !clientName) continue;
      let clientId = null;
      if (clientName) {
        const { data: clients } = await supabase.from("clients").select("id").ilike("nom", `%${clientName}%`).limit(1);
        if (clients?.length) clientId = clients[0].id;
      }

      let dateSortie = "";
      const dateVal = row[cm.date];
      if (typeof dateVal === "number") dateSortie = excelDateToString(dateVal);
      else if (typeof dateVal === "string") {
        const m = dateVal.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        dateSortie = m ? `${m[3]}-${m[2]}-${m[1]}` : dateVal;
      }

      const parseNum = (val) => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseFloat(String(val).replace(",", "."));
        return isNaN(n) ? null : Math.round(n * 100) / 100;
      };

      let multiplicateur = "1X";
      if (cm.multiplicateur >= 0) {
        const n = parseInt(String(row[cm.multiplicateur] ?? "1"));
        if (!isNaN(n) && n > 0) multiplicateur = `${n}X`;
      }

      let prixUnitaire = null;
      if (cm.prix_unitaire >= 0) prixUnitaire = parseNum(row[cm.prix_unitaire]);
      else prixUnitaire = parseNum(row[cm.prix_ttc]);

      const { error } = await supabase.from("billets").insert({
        type: sheetInfo.type, mois: sheetInfo.mois, annee: sheetInfo.annee,
        num_devis: num_devis.toUpperCase(), date_sortie: dateSortie,
        destination: row[cm.destination]?.toString().trim() || "",
        client_id: clientId,
        contact_client: row[cm.contact]?.toString().trim() || "",
        adresse_facturation: row[cm.adresse]?.toString().trim() || "",
        num_siret: cm.siret >= 0 ? (row[cm.siret]?.toString().trim() || "") : "",
        num_siren: cm.siren >= 0 ? (row[cm.siren]?.toString().trim() || "") : "",
        num_nic: cm.nic >= 0 ? (row[cm.nic]?.toString().trim() || "") : "",
        num_commande: row[cm.commande]?.toString().trim() || "",
        multiplicateur, prix_unitaire: prixUnitaire,
        prix_ttc: parseNum(row[cm.prix_ttc]), prix_ht: parseNum(row[cm.prix_ht]),
        montant_acompte: parseNum(row[cm.acompte]),
        mode_reglement: row[cm.reglement]?.toString().trim() || "",
        num_facture: row[cm.facture]?.toString().trim() || "",
      });

      if (error) { console.error("\nERROR", num_devis, ":", error.message); totalErreurs++; }
      else { count++; totalBillets++; process.stdout.write("+"); }
    }
    console.log(" ->", count, "rows");
  }

  console.log("\n\n=== RESULT ===");
  console.log("OK Clients:", totalClients);
  console.log("OK Billets:", totalBillets);
  if (totalErreurs > 0) console.log("WARN Errors:", totalErreurs);
  console.log("=== Done ===");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });