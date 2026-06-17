import { useState } from "react";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { ClientsPage } from "@/pages/ClientsPage";
import { BilletsPage } from "@/pages/BilletsPage";
import { Button } from "@/components/ui/button";
import { Users, FileText } from "lucide-react";

export default function Index() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeView, setActiveView] = useState<"clients" | "billets">("billets");

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
              onClick={() => setActiveView("clients")}
            >
              <Users className="h-4 w-4 mr-2" /> Clients
            </Button>
            <Button
              variant={activeView === "billets" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("billets")}
            >
              <FileText className="h-4 w-4 mr-2" /> Saisie
            </Button>
          </div>
        </div>
      </div>

      <main className="w-full px-4 py-4">
        {activeView === "clients" ? (
          <ClientsPage />
        ) : (
          <BilletsPage year={year} month={month} />
        )}
      </main>
    </div>
  );
}