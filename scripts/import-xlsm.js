/**
 * Script d'import du fichier XLSM source vers Supabase
 * 
 * Usage:
 *   node scripts/import-xlsm.js
 * 
 * Les credentials Supabase sont lus depuis le fichier .env
 */

const path = require("path");
const fs = require("fs");

// Load .env file
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) {
      process.env[key.trim()] = vals.join("=").trim();
    }
  });
}

const XLSX_PATH = "H:/.shortcut-targets-by-id/17sZnuv-Xb2lUkKcOgmEmyGQCxssa-67A/Transports Occasionnels Chateaurenard 26/facturation des transports occasionnels Chateaurenard 26.xlsm";

async function main() {
  console.log("=== Import XLSM → Supabase ===");
  console.log("Fichier source:", XLSX_PATH);
  console.log("");

  // Dynamic import of the TS module (compiled)
  try {
    const { importFromXLSM } = require("../src/lib/importFromXLSM.ts");
    console.log("ERREUR: Le script doit être compilé d'abord. Utilisez plutôt:");
    console.log("npx tsx scripts/import-xlsm.ts");
  } catch (e) {
    console.log("Utilisez plutôt:");
    console.log("npx tsx scripts/import-xlsm.ts");
  }
}

main().catch(console.error);