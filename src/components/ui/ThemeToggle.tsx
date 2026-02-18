import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { resolvedTheme, setMode } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setMode(isDark ? "light" : "dark");
  };

  const Icon = isDark ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={handleToggle}
      className={cn(
        "glass-subtle rounded-full transition-colors duration-200",
        "hover:bg-primary/10 hover:text-primary-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};

