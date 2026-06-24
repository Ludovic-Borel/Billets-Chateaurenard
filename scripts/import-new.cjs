/**
 * Script d'import du fichier "Import Billets.xlsx" vers Supabase
 * Usage: node scripts/import-new.js
 */
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

const XLSX_PATH = "H:/.shortcut-targets-by-id/17sZnuv-Xb2lUkKcOgmEmyGQCxssa-67A/Transports Occasionnels Chateaurenard 26/Import Billets.xlsx";

const MONTH_NAMES = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
};

function detectSheet(sheetName) {
  const lower = sheetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let m = lower.match(/marche[s]?\s*tarascon\s+(\w+)\s*(\d{2,4})?/);
  if (m) { const p = MONTH_NAMES[m[1]]; if (p) return { type: "tarascon", mois: p, annee: m[2] ? (m[2].length===2?2000+parseInt(m[2]):parseInt(m[2])) : 2026 }; }
  m = lower.match(/marche[s]?\s*avignon\s+(\w+)\s*(\d{2,4})?/);
  if (m) { const p = MONTH_NAMES[m[1]]; if (p) return { type: "avignon", mois: p, annee: m[2] ? (m[2].length===2?2000+parseInt(m[2]):parseInt(m[2])) : 2026 }; }
  m = lower.match(/^(\w+)\s*(\d{2,4})?$/);
  if (m) { const p = MONTH_NAMES[m[1]]; if (p) return { type: "standard", mois: p, annee: m[2] ? (m[2].length===2?2000+parseInt(m[2]):parseInt(m[2])) : 2026 }; }
  return null;
}

function excelDateToString(excelDate) {
  if (typeof excelDate === "number") {
    const d = new Date(1899, 11, 30);
    d.setDate(d.getDate() + excelDate);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  if (typeof excelDate === "string") {
    const m = excelDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : excelDate;
  }
  return "";
}

function buildColMap(headers, defs) {
  const clean = headers.map(h => (h ? h.toString().replace(/n[°º\.]\s*/gi,"").replace(/\s+/g," ").trim().toLowerCase() : ""));
  const result = {}, used = new Array(headers.length).fill(false);
  const sorted = [...defs].sort((a,b) => Math.max(...b.terms.map(t=>t.length)) - Math.max(...a.terms.map(t=>t.length)));
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
  console.log("=== Import Billets.xlsx → Supabase ===\n");

  if (!supabaseUrl || !supabaseKey) { console.error("Supabase non configuré"); process.exit(1); }
  const { error: te } = await supabase.from("clients").select("id").limit(1);
  if (te) { console.error("Erreur connexion:", te.message); process.exit(1); }
  console.log("✅ Connecté à Supabase\n");

  let wb;
  try { wb = XLSX.readFile(XLSX_PATH); }
  catch (e) { console.error("Erreur lecture fichier:", e.message); process.exit(1); }
  console.log("✅ Fichier chargé:", wb.SheetNames.join(", "), "\n");

  console.log("⚠️  Ce script va VIDER les tables et réimporter !");
  console.log("Appuyez sur Ctrl+C pour annuler...");
  await new Promise(r => setTimeout(r, 3000));

  console.log("\nNettoyage...");
  await supabase.from("billets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Tables vidées\n");

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
        { key: "chorus", terms: ["chorus"] },
      ]);
      for (let i = 1; i < d.length; i++) {
        const r = d[i]; const nom = r[cl.nom]?.toString().trim();
        if (!nom) continue;
        const { error } = await supabase.from("clients").insert({
          nom, mail: r[cl.mail]?.toString().trim() || "",
          adresse: r[cl.adresse]?.toString().trim() || "",
          siret: r[cl.siret]?.toString().trim() || "",
          siren: r[cl.siren]?.toString().trim() || "",
          nic: r[cl.nic]?.toString().trim() || "",
          chorus: r[cl.chorus]?.toString().trim() || "",
        });
        if (error) { console.error("❌", nom, ":", error.message); totalErreurs++; }
        else { totalClients++; process.stdout.write("+"); }
      }
      console.log(`\n✅ ${totalClients} clients`);
    }
  }

  // ===== BILLETS =====
  console.log("\n--- BILLETS ---");
  for (const sn of wb.SheetNames) {
    if (sn === "Listing Client Billets Co") continue;
    const si = detectSheet(sn);
    if (!si) { console.log("⏭️  Ignoré:", sn); continue; }

    const sh = wb.Sheets[sn];
    const d = XLSX.utils.sheet_to_json(sh, { header: 1 });
    const hr = d.findIndex(r => r?.some(c => c?.toString().includes("N° de devis")));
    if (hr === -1) { console.log("⚠️  Pas d'en-têtes dans", sn); continue; }

    const cm = buildColMap(d[hr], [
      { key: "num_devis", terms: ["devis"] }, { key: "date", terms: ["date"] },
      { key: "destination", terms: ["destination"] }, { key: "client", terms: ["client"] },
      { key: "contact", terms: ["contact client", "contact"] },
      { key: "adresse", terms: ["adresse de facturation", "adresse"] },
      { key: "siret", terms: ["siret"] }, { key: "siren", terms: ["siren"] }, { key: "nic", terms: ["nic"] },
      { key: "commande", terms: ["commande"] }, { key: "multiplicateur", terms: ["mult"] },
      { key: "prix_unitaire", terms: ["prix unit"] }, { key: "prix_ttc", terms: ["prix ttc", "ttc"] },
      { key: "prix_ht", terms: ["ht"] }, { key: "acompte", terms: ["acompte"] },
      { key: "reglement", terms: ["reglement", "rglt"] }, { key: "chorus", terms: ["chorus"] },
      { key: "facture", terms: ["facture"] },
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

      const pn = (v) => { if (v === null || v === undefined || v === "") return null; const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? null : Math.round(n*100)/100; };
      let mult = "1X";
      if (cm.multiplicateur >= 0) { const n = parseInt(String(r[cm.multiplicateur] ?? "1")); if (!isNaN(n) && n > 0) mult = `${n}X`; }
      let pu = null;
      if (cm.prix_unitaire >= 0) pu = pn(r[cm.prix_unitaire]); else pu = pn(r[cm.prix_ttc]);

      const { error } = await supabase.from("billets").insert({
        type: si.type, mois: si.mois, annee: si.annee,
        num_devis: nd ? nd.toUpperCase() : "", date_sortie: excelDateToString(r[cm.date]),
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
      if (error) { console.error("\n❌", error.message, "| devis:", nd || "(vide)", "client:", cn); totalErreurs++; }
      else { cnt++; totalBillets++; process.stdout.write("+"); }
    }
    console.log(` → ${cnt} lignes`);
  }

  console.log(`\n\n=== RÉSULTAT ===\n✅ Clients: ${totalClients}\n✅ Billets: ${totalBillets}\n❌ Erreurs: ${totalErreurs}\n=== Terminé ===`);
}

main().catch(e => { console.error("Erreur fatale:", e); process.exit(1); });