import { supabase, isSupabaseConfigured } from "./supabase";
import type { Client, Billet } from "./types";

// ============================================================
// CLIENTS
// ============================================================

export async function getClients(): Promise<Client[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("nom", { ascending: true });
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  return data || [];
}

export async function addClient(client: Omit<Client, "id" | "created_at">): Promise<Client | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("clients")
    .insert([client])
    .select()
    .single();
  if (error) {
    console.error("Error adding client:", error);
    return null;
  }
  return data;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id);
  if (error) {
    console.error("Error updating client:", error);
    return false;
  }
  return true;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting client:", error);
    return false;
  }
  return true;
}

// ============================================================
// BILLETS
// ============================================================

export async function getBillets(type: string, mois: number, annee: number): Promise<Billet[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("billets")
    .select("*")
    .eq("type", type)
    .eq("mois", mois)
    .eq("annee", annee)
    .order("date_sortie", { ascending: true });
    
  if (error) {
    console.error("Error fetching billets:", error);
    return [];
  }
  return data || [];
}

export async function addBillet(billet: Omit<Billet, "id" | "created_at" | "updated_at">): Promise<Billet | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("billets")
    .insert([billet])
    .select()
    .single();
  if (error) {
    console.error("Error adding billet:", error);
    return null;
  }
  return data;
}

export async function updateBillet(id: string, updates: Partial<Billet>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from("billets")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error updating billet:", error);
    return false;
  }
  return true;
}

export async function deleteBillet(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from("billets")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("Error deleting billet:", error);
    return false;
  }
  return true;
}