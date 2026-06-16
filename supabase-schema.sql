-- SQL à exécuter dans l'éditeur SQL de Supabase (https://supabase.com/dashboard)
-- Créer les tables pour l'application Billets Chateaurenard

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  mail TEXT DEFAULT '',
  adresse TEXT DEFAULT '',
  siret TEXT DEFAULT '',
  siren TEXT DEFAULT '',
  nic TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des billets
CREATE TABLE IF NOT EXISTS billets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('standard', 'tarascon', 'avignon')),
  mois INTEGER NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee INTEGER NOT NULL,
  num_devis TEXT NOT NULL,
  date_sortie TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_client TEXT DEFAULT '',
  adresse_facturation TEXT DEFAULT '',
  num_siret TEXT DEFAULT '',
  num_siren TEXT DEFAULT '',
  num_nic TEXT DEFAULT '',
  num_commande TEXT DEFAULT '',
  multiplicateur TEXT DEFAULT '1X',
  prix_unitaire DECIMAL(10,2) DEFAULT NULL,
  prix_ttc DECIMAL(10,2) DEFAULT NULL,
  prix_ht DECIMAL(10,2) DEFAULT NULL,
  montant_acompte DECIMAL(10,2) DEFAULT NULL,
  mode_reglement TEXT DEFAULT '',
  num_facture TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_billets_type_mois_annee ON billets(type, mois, annee);
CREATE INDEX IF NOT EXISTS idx_billets_client_id ON billets(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);

-- Activer Row Level Security (optionnel - désactive si tu veux un accès simple)
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE billets ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour accès public (si tu veux une API sans authentification)
-- CREATE POLICY "Allow public read" ON clients FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert" ON clients FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update" ON clients FOR UPDATE USING (true);
-- CREATE POLICY "Allow public delete" ON clients FOR DELETE USING (true);
-- CREATE POLICY "Allow public read" ON billets FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert" ON billets FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update" ON billets FOR UPDATE USING (true);
-- CREATE POLICY "Allow public delete" ON billets FOR DELETE USING (true);