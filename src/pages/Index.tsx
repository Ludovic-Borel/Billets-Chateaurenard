import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ClientsPage } from "@/pages/ClientsPage";
import { BilletsPage } from "@/pages/BilletsPage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Upload,
  RefreshCw,
} from "lucide-react";
import { importFromXLSM } from "@/lib/importFromXLSM";

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

  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;

      const file = files[0];

      setImporting(true);

      try {
        const buffer = await file.arrayBuffer();

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
        toast.error(e.message);
      } finally {
        setImporting(false);

        if (fileInputRef.current)
          fileInputRef.current.value = "";
      }
    },
    [month, year, selectedType]
  );

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">

        <div className="w-full px-6 py-2 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <MonthSelector
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />

            <Button
              variant={
                activeView === "clients"
                  ? "default"
                  : "outline"
              }
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveView("clients")}
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              Clients
            </Button>

            <Button
              variant={
                activeView === "billets"
                  ? "default"
                  : "outline"
              }
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveView("billets")}
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Saisie
            </Button>

          </div>

          <div className="flex items-center gap-2">

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsm,.xlsx"
              className="hidden"
              onChange={(e) =>
                handleImport(e.target.files)
              }
            />

            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={importing}
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {importing ? "Import..." : "Import"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                toast.info(
                  "Synchronisation bientôt disponible"
                )
              }
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Sync
            </Button>

          </div>

        </div>

      </div>

      <main className="w-full px-4 py-4 overflow-hidden">
        {activeView === "clients" ? (
          <ClientsPage />
        ) : (
          <BilletsPage
            year={year}
            month={month}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />
        )}
      </main>

    </div>
  );
}