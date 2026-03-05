import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

export default function ThemeModePicker() {
  const { theme, setTheme, switchable } = useTheme();

  if (!switchable || !setTheme) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-1 rounded-full border border-border/80 bg-card/85 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-md">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setTheme("light")}
        aria-label="Switch to light mode"
        className={
          theme === "light"
            ? "rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            : "rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }
      >
        <Sun className="h-4 w-4" />
        Light
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setTheme("dark")}
        aria-label="Switch to dark mode"
        className={
          theme === "dark"
            ? "rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            : "rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }
      >
        <Moon className="h-4 w-4" />
        Dark
      </Button>
    </div>
  );
}
