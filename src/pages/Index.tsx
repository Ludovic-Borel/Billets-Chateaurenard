import { useState, useRef, useCallback } from "react";
import { MainToolbar } from "@/components/MainToolbar";
import { BilletsToolbar } from "@/components/BilletsToolbar";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ClientsPage } from "@/pages/ClientsPage";
import { BilletsPage } from "@/pages/BilletsPage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, FileText, Upload, RefreshCw } from "lucide-react";
import { importFromXLSM, type ImportProgress } from "@/lib/importFromXLSM";
import { ClientDialog } from "@/components/client/ClientDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImportDialogState {
  open: boolean;
  statut: string;
  progression: number;
  etapeCourante: string;
  clientsCreés: number;
  clientsReutilisés: number;
  billetsImportés: number;
  erreurs: string[];
  termine: boolean;
}

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

  const [importDialog, setImportDialog] = useState<ImportDialogState>({
    open: false,
    statut: "",
    progression: 0,
    etapeCourante: "",
    clientsCreés: 0,
    clientsReutilisés: 0,
    billetsImportés: 0,
    erreurs: [],
    termine: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      setImporting(true);
      setImportDialog({
        open: true,
        statut: "Lecture du fichier...",
        progression: 0,
        etapeCourante: "Ouverture du fichier XLSM...",
        clientsCreés: 0,
        clientsReutilisés: 0,
        billetsImportés: 0,
        erreurs: [],
        termine: false,
      });

      try {
        const buffer = await files[0].arrayBuffer();

        // Calcul de progression : clients = 20%, billets = 80%
        const result = await importFromXLSM(
          buffer,
          month + 1,
          year,
          selectedType,
          (progress: ImportProgress) => {
            setImportDialog((prev) => {
              let progression = prev.progression;

              if (progress.step === "Lecture du fichier") {
                progression = 2;
              } else if (progress.step === "Clients") {
                progression = 2 + (progress.total > 0 ? (progress.current / progress.total) * 18 : 0);
              } else if (progress.step === "Billets - Nettoyage") {
                progression = 20;
              } else if (progress.step?.startsWith("Billets -")) {
                progression = 20 + (progress.total > 0 ? (progress.current / progress.total) * 78 : 0);
              } else if (progress.step === "Terminé") {
                progression = 100;
              }

              return {
                ...prev,
                statut: progress.step === "Clients"
                  ? `Clients : ${progress.message || ""} (${progress.current}/${progress.total})`
                  : progress.step?.startsWith("Billets -")
                  ? `Billets : ${progress.message || ""} (${progress.current}/${progress.total})`
                  : progress.message || progress.step,
                progression: Math.round(progression),
                etapeCourante: progress.message || progress.step,
              };
            });
          }
        );

        setImportDialog((prev) => ({
          ...prev,
          clientsCreés: result.clientsCreés,
          clientsReutilisés: result.clientsReutilisés,
          billetsImportés: result.billetsImportés,
          erreurs: result.erreurs,
          progression: 100,
          termine: true,
          statut: "Import terminé",
        }));

        if (result.erreurs.length) {
          toast.error(`${result.erreurs.length} erreur(s) lors de l'import`);
        }
      } catch (e: any) {
        toast.error(`Erreur d'import : ${e.message}`);
        setImportDialog((prev) => ({
          ...prev,
          termine: true,
          erreurs: [...prev.erreurs, e.message],
        }));
      } finally {
        setImporting(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [month, year, selectedType]
  );

  const handleCloseImportDialog = () => {
    setImportDialog((prev) => ({ ...prev, open: false }));
  };

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

      {/* Dialogue d'import XLSM */}
      <Dialog open={importDialog.open} onOpenChange={(open) => {
        if (!open && importDialog.termine) {
          handleCloseImportDialog();
        }
      }}>
        <DialogContent className="sm:max-w-md" showCloseButton={importDialog.termine}>
          <DialogHeader>
            <DialogTitle>Import XLSM</DialogTitle>
            <DialogDescription>
              {importDialog.termine
                ? "Import terminé"
                : "Import en cours, veuillez patienter..."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Barre de progression */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  importDialog.progression === 100
                    ? "bg-green-500"
                    : "bg-primary"
                }`}
                style={{ width: `${importDialog.progression}%` }}
              />
            </div>

            {/* Statut en cours */}
            <div className="text-xs text-muted-foreground">
              {importDialog.statut || importDialog.etapeCourante}
            </div>

            {/* Résumé (visible uniquement quand terminé) */}
            {importDialog.termine && (
              <div className="space-y-2 text-sm border rounded-lg p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span className="text-muted-foreground">Nouveaux clients créés</span>
                  <span className="font-medium text-right">{importDialog.clientsCreés}</span>

                  <span className="text-muted-foreground">Clients réutilisés</span>
                  <span className="font-medium text-right">{importDialog.clientsReutilisés}</span>

                  <span className="text-muted-foreground">Billets importés</span>
                  <span className="font-medium text-right">{importDialog.billetsImportés}</span>
                </div>

                {importDialog.erreurs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-destructive font-medium text-xs mb-1">
                      {importDialog.erreurs.length} erreur(s)
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5">
                      {importDialog.erreurs.map((err, idx) => (
                        <div key={idx} className="text-xs text-destructive/80">
                          • {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {importDialog.termine && (
            <DialogFooter showCloseButton={false}>
              <Button onClick={handleCloseImportDialog} className="h-8 text-xs">
                Fermer
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}