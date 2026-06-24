import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ClientsPage } from "@/pages/ClientsPage";
import { BilletsPage } from "@/pages/BilletsPage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, FileText, Upload } from "lucide-react";
import { importFromXLSM } from "@/lib/importFromXLSM";

export default function Index() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeView, setActiveView] = useState<"clients" | "billets">("billets");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setImporting(true);
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      // Write buffer to a temp path or use directly
      // Since importFromXLSM needs a file path, we need to adapt it
      const result = await importFromXLSM(buffer);
      toast.success(`Import terminé : ${result.clientsImportes} clients, ${result.billetsImportes.standard + result.billetsImportes.tarascon + result.billetsImportes.avignon} billets`);
      if (result.erreurs.length > 0) {
        toast.error(`${result.erreurs.length} erreur(s) : ${result.erreurs.slice(0, 3).join(", ")}`);
      }
    } catch (e: any) {
      toast.error(`Erreur d'import : ${e.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="w-full px-6 py-2 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
            <Button
              variant={activeView === "clients" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveView("clients")}
            >
              <Users className="h-3.5 w-3.5 mr-1" /> Clients
            </Button>
            <Button
              variant={activeView === "billets" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveView("billets")}
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> Saisie
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsm,.xlsx"
            className="hidden"
            onChange={(e) => handleImport(e.target.files)}
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            {importing ? "Import en cours..." : "Importer"}
          </Button>
        </div>
      </div>

      <main className="w-full px-4 py-4 overflow-hidden">
        {activeView === "clients" ? (
          <ClientsPage />
        ) : (
          <BilletsPage year={year} month={month} />
        )}
      </main>
    </div>
  );
}