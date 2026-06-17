import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/logo.png";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Billets Chateaurenard" }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-primary text-primary-foreground px-6 py-2 shadow-lg">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <p className="text-primary-foreground/70 text-sm">Gestion des Billets et Clients</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
