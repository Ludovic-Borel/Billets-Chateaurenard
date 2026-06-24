// Script d'import XLSM vers Supabase (CommonJS)
// Usage: node scripts/import-cjs.cjs

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

const XLSM_PATH = "H:/.shortcut-targets-by-id/17sZnuv-Xb2lUkKcOgmEmyGQCxssa-67A/Transports Occasionnels Chateaurenard 26/facturation des transports occasionnels Chateaurenard 26.xlsm";

const MONTH_NAMES = {
  janvier: { mois: 1, annee: 2026 }, fevrier: { mois: 2, annee: 2026 }, février: { mois: 2, annee: 2026 },
  mars: { mois: 3, annee: 2026 }, avril: { mois: 4, annee: 2026 }, mai: { mois: 5, annee: 2026 },
  juin: { mois: 6, annee: 2026 }, juillet: { mois: 7, annee: 2026 }, aout: { mois: 8, annee: 2026 },
  août: { mois: 8, annee: 2026 }, septembre: { mois: 9, annee: 2026 }, octobre: { mois: 10, annee: 2026 },
  novembre: { mois: 11, annee: 2026 }, decembre: { mois: 12, annee: 2026 }, décembre: { mois: 12, annee: 2026 },
};

function detectMoisEtType(sheetName) {
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

function excelDateToString(excelDate) {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + excelDate * 86400000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildColMap(headers, defs) {
  const clean = headers.map((h) => {
    if (!h) return "";
    return h.toString().replace(/n[°º\.]\s*/gi, "").replace(/\s+/g, " ").trim().toLowerCase();
  });
  const result = {};
  const used = new Array(headers.length).fill(false);
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

async function main() {
  console.log("=== Import XLSM to Supabase ===");

  if (!supabaseUrl || !supabaseKey) {
    console.error("ERROR: Supabase not configured.");
    process.exit(1);
  }

  const { error: testErr } = await supabase.from("clients").select("id").limit(1);
  if (testErr) { console.error("ERROR Supabase:", testErr.message); process.exit(1); }
  console.log("OK Connected to Supabase");

  let wb;
  try { wb = XLSX.readFile(XLSM_PATH); }
  catch (e) { console.error("ERROR reading file:", e.message); process.exit(1); }
  console.log("OK Loaded:", wb.SheetNames.length, "sheets\n");

  console.log("WARNING: This will DELETE all existing data!\nPress Ctrl+C to cancel...");
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Clearing...");
  await supabase.from("billets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("OK\n");

  let totalClients = 0, totalBillets = 0, totalErreurs = 0;

  // ===== CLIENTS =====
  console.log("--- CLIENTS ---");
  const cs = wb.Sheets["Listing Client Billets Co"];
  if (cs) {
    const d = XLSX.utils.sheet_to_json(cs, { header: 1 });
    if (d.length > 0) {
      const cl = buildColMap(d[0], [
        { key: "nom", terms: ["nom"] }, { key: "mail", terms: ["mail"] },
        { key: "adresse", terms: ["adresse"] }, { key: "siret", terms: ["siret"] },
        { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
      ]);
      for (let i = 1; i < d.length; i++) {
        const r = d[i]; const nom = r[cl.nom]?.toString().trim();
        if (!nom) continue;
        const { error } = await supabase.from("clients").insert({
          nom, mail: r[cl.mail]?.toString().trim() || "", adresse: r[cl.adresse]?.toString().trim() || "",
          siret: r[cl.siret]?.toString().trim() || "", siren: r[cl.siren]?.toString().trim() || "",
          nic: r[cl.nic]?.toString().trim() || "",
        });
        if (error) { console.error("ERROR", nom, ":", error.message); totalErreurs++; }
        else { totalClients++; process.stdout.write("+"); }
      }
      console.log("\nOK", totalClients, "clients");
    }
  }

  // ===== BILLETS =====
  console.log("\n--- BILLETS ---");
  for (const sn of wb.SheetNames) {
    if (sn === "Listing Client Billets Co") continue;
    const si = detectMoisEtType(sn);
    if (!si) { console.log("SKIP:", sn); continue; }

    const sh = wb.Sheets[sn];
    const d = XLSX.utils.sheet_to_json(sh, { header: 1 });
    let hr = d.findIndex(r => r?.some(c => c?.toString().includes("N° de devis")));
    if (hr === -1) { console.log("  WARN: no headers in", sn); continue; }

    const cm = buildColMap(d[hr], [
      { key: "num_devis", terms: ["devis"] }, { key: "date", terms: ["date"] },
      { key: "destination", terms: ["destination"] }, { key: "client", terms: ["client"] },
      { key: "contact", terms: ["contact client", "contact"] },
      { key: "adresse", terms: ["adresse de facturation", "adresse"] },
      { key: "siret", terms: ["siret"] }, { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
      { key: "commande", terms: ["commande"] }, { key: "multiplicateur", terms: ["mult"] },
      { key: "prix_unitaire", terms: ["prix unit"] }, { key: "prix_ttc", terms: ["prix ttc", "ttc"] },
      { key: "prix_ht", terms: ["ht"] }, { key: "acompte", terms: ["acompte"] },
      { key: "reglement", terms: ["reglement"] }, { key: "facture", terms: ["facture"] },
    ]);

    let cnt = 0, emp = 0;
    for (let i = hr + 1; i < d.length; i++) {
      const r = d[i]; if (!r || !Array.isArray(r)) continue;
      const nd = r[cm.num_devis]?.toString().trim();
      const cn = r[cm.client]?.toString().trim() || "";
      if (nd && (nd.startsWith("TOTAUX") || nd.startsWith("Total"))) continue;

      const hasData = r.some(c => c !== null && c !== undefined && String(c).trim() !== "");
      if (!hasData && !cn) { emp++; if (emp > 3) break; continue; }
      emp = 0;

      let cid = null;
      if (cn) { const { data: cl } = await supabase.from("clients").select("id").ilike("nom", `%${cn}%`).limit(1); if (cl?.length) cid = cl[0].id; }

      let ds = "";
      const dv = r[cm.date];
      if (typeof dv === "number") ds = excelDateToString(dv);
      else if (typeof dv === "string") { const m = dv.match(/(\d{2})\/(\d{2})\/(\d{4})/); ds = m ? `${m[3]}-${m[2]}-${m[1]}` : dv; }

      const pn = (v) => { if (v === null || v === undefined || v === "") return null; const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : Math.round(n * 100) / 100; };

      let mult = "1X";
      if (cm.multiplicateur >= 0) { const n = parseInt(String(r[cm.multiplicateur] ?? "1")); if (!isNaN(n) && n > 0) mult = `${n}X`; }

      let pu = null;
      if (cm.prix_unitaire >= 0) pu = pn(r[cm.prix_unitaire]); else pu = pn(r[cm.prix_ttc]);

      const { error } = await supabase.from("billets").insert({
        type: si.type, mois: si.mois, annee: si.annee,
        num_devis: nd ? nd.toUpperCase() : "", date_sortie: ds,
        destination: r[cm.destination]?.toString().trim() || "",
        client_id: cid, contact_client: r[cm.contact]?.toString().trim() || "",
        adresse_facturation: r[cm.adresse]?.toString().trim() || "",
        num_siret: cm.siret >= 0 ? (r[cm.siret]?.toString().trim() || "") : "",
        num_siren: cm.siren >= 0 ? (r[cm.siren]?.toString().trim() || "") : "",
        num_nic: cm.nic >= 0 ? (r[cm.nic]?.toString().trim() || "") : "",
        num_commande: r[cm.commande]?.toString().trim() || "",
        multiplicateur: mult, prix_unitaire: pu,
        prix_ttc: pn(r[cm.prix_ttc]), prix_ht: pn(r[cm.prix_ht]),
        montant_acompte: pn(r[cm.acompte]),
        mode_reglement: r[cm.reglement]?.toString().trim() || "",
        num_facture: r[cm.facture]?.toString().trim() || "",
      });
      if (error) { console.error("\nERROR:", error.message, "devis:", nd || "(vide)", "client:", cn); totalErreurs++; }
      else { cnt++; totalBillets++; process.stdout.write("+"); }
    }
    console.log(" ->", cnt, "rows");
  }

  console.log(`\n\n=== RESULT ===\nOK Clients: ${totalClients}\nOK Billets: ${totalBillets}\nErreurs: ${totalErreurs}\n=== Done ===`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });