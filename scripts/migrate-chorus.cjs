// Script pour ajouter la colonne chorus à la table clients
// Usage: node scripts/migrate-chorus.cjs

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

async function main() {
  console.log("=== Migration: Ajout colonne chorus ===");
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection
  const { error: testErr } = await supabase.from("clients").select("id").limit(1);
  if (testErr) {
    console.error("Erreur connexion:", testErr.message);
    process.exit(1);
  }
  console.log("✅ Connecté à Supabase");

  // Try to add column via direct API
  // Supabase allows ALTER TABLE via SQL
  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE clients ADD COLUMN IF NOT EXISTS chorus TEXT DEFAULT ''",
    });
    if (error) {
      // If rpc not available, use the simpler approach - just test if column exists
      const { data } = await supabase.from("clients").select("chorus").limit(1);
      if (data !== undefined) {
        console.log("✅ Colonne 'chorus' existe déjà");
      } else {
        console.log("ℹ️  La colonne n'existe pas encore. Ajoute-la manuellement avec:");
        console.log("   ALTER TABLE clients ADD COLUMN chorus TEXT DEFAULT '';");
        console.log("   (via l'éditeur SQL Supabase)");
      }
    } else {
      console.log("✅ Colonne 'chorus' ajoutée avec succès");
    }
  } catch (e) {
    console.log("ℹ️  Ajoute manuellement avec l'éditeur SQL Supabase:");
    console.log("   ALTER TABLE clients ADD COLUMN chorus TEXT DEFAULT '';");
  }
  
  console.log("=== Terminé ===");
}

main().catch(console.error);