# Billets Chateaurenard

Application de gestion des billets, devis et clients.

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + Shadcn/ui
- **Base de données** : Supabase (PostgreSQL)
- **Hébergement** : Vercel
- **Versionnement** : GitHub

## Fonctionnalités

- **Gestion des Clients** : CRUD complet (Ajouter, Modifier, Supprimer, Rechercher)
- **Saisie mensuelle** : 3 types de feuilles (Standard, Marchés Tarascon, Marchés Avignon)
- **Auto-complétion** : Sélection d'un client → remplissage automatique des infos (Siret, Siren, Nic, etc.)
- **Calcul automatique** : Prix TTC = Prix Unitaire × Multiplicateur
- **Formatage des devis** : CHA{année}-{numéro} (ex: CHA26-126)
- **Mode Compta** : Accès protégé à la colonne N° Facture
- **Recherche** : Filtrage en temps réel
- **Export** : Impression PDF, export CSV
- **Thème** : Mode clair/sombre

## Installation

1. Cloner le dépôt
2. `npm install`
3. Créer un fichier `.env` avec les identifiants Supabase :
   ```
   VITE_SUPABASE_URL=votre-url
   VITE_SUPABASE_ANON_KEY=votre-cle
   ```
4. Exécuter le script `supabase-schema.sql` dans l'éditeur SQL Supabase
5. `npm run dev`

## Déploiement

1. Pousser le code sur GitHub
2. Connecter le dépôt à Vercel
3. Ajouter les variables d'environnement dans Vercel
4. Déployer

## Licence

Projet privé - Pastouret Rubans-Bleus