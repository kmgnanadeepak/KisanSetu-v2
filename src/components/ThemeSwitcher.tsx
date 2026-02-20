import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ThemeMode } from "@/hooks/useTheme";

interface ThemeSwitcherProps {
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

const icons = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
};

export const ThemeSwitcher = ({ mode, onModeChange }: ThemeSwitcherProps) => {
  const Icon = icons[mode] || Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="glass-subtle rounded-full">
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card">
        <DropdownMenuItem onClick={() => onModeChange("light")} className="gap-2">
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("dark")} className="gap-2">
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("auto")} className="gap-2">
          <Monitor className="h-4 w-4" /> Auto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
