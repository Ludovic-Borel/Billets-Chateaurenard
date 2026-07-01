import { useState, useRef, useCallback } from "react";
import { MainToolbar } from "@/components/MainToolbar";
import { BilletsToolbar } from "@/components/BilletsToolbar";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ClientsPage } from "@/pages/ClientsPage";
import { BilletsPage } from "@/pages/BilletsPage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {Users, FileText, Upload, RefreshCw } from "lucide-react";
import { importFromXLSM } from "@/lib/importFromXLSM";
import { ClientDialog } from "@/components/client/ClientDialog";

export default function Index() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [selectedType, setSelectedType] = useState<
    "standard" | "tarascon" | "avignon"
  >("standard");

  const [activeView, setActiveView] = useState<
    "clients" | "billets"
  >("billets");
  const [showForm, setShowForm] = useState(false);

  const [importing, setImporting] = useState(false);

  const [showClientDialog, setShowClientDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      setImporting(true);

      try {
        const buffer = await files[0].arrayBuffer();

        const result = await importFromXLSM(
          buffer,
          month + 1,
          year,
          selectedType
        );

        toast.success(
          `Import terminé : ${result.clientsImportes} clients - ${
            result.billetsImportes.standard +
            result.billetsImportes.tarascon +
            result.billetsImportes.avignon
          } billets`
        );

        if (result.erreurs.length) {
          toast.error(
            `${result.erreurs.length} erreur(s)`
          );
        }
      } catch (e: any) {
        toast.error(`Erreur d'import : ${e.message}`);
      } finally {
        setImporting(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [month, year, selectedType]
  );

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <MainToolbar
  left={
    <>
      <MonthSelector
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />

      <Button
        variant={activeView === "clients" ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => setActiveView("clients")}
      >
        <Users className="h-3.5 w-3.5 mr-1" />
        Clients
      </Button>

      <Button
        variant={activeView === "billets" ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => setActiveView("billets")}
      >
        <FileText className="h-3.5 w-3.5 mr-1" />
        Saisie
      </Button>
    </>
  }

  center={
  activeView === "billets" ? (
    <BilletsToolbar
      selectedType={selectedType}
      onTypeChange={setSelectedType}
      onNewBillet={() => setShowForm(true)}
    />
  ) : null
}

  right={
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsm,.xlsx"
        className="hidden"
        onChange={(e) => handleImport(e.target.files)}
      />

      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() =>
          toast.info("Synchronisation bientôt disponible")
        }
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Sync
      </Button>

      <Button
        size="sm"
        className="h-7 text-xs"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 mr-1" />
        {importing ? "Import..." : "Import"}
      </Button>
    </>
  }
/>

        <main className="w-full px-6 pt-2 pb-4 overflow-hidden">

        {activeView === "clients" ? (
          <ClientsPage />
        ) : (
          <BilletsPage
  year={year}
  month={month}
  selectedType={selectedType}
  onTypeChange={setSelectedType}
  showForm={showForm}
  setShowForm={setShowForm}
  onNewClient={() => setShowClientDialog(true)}
/>
        )}

            </main>

      <ClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
      />

    </div>
  );
}