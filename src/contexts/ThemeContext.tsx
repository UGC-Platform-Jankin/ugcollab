import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Public routes that should always be light
const PUBLIC_PREFIXES = ["/", "/get-started", "/auth", "/brand/auth", "/reviews", "/about", "/privacy", "/terms"];

function isPublicRoute(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(p => p !== "/" && pathname.startsWith(p));
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preferredTheme, setPreferredTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("ugc-theme");
    return (stored === "light" || stored === "dark") ? stored : "light";
  });

  return (
    <ThemeContext.Provider value={{ theme: preferredTheme, toggleTheme: () => setPreferredTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Place inside <BrowserRouter> to apply theme class based on route */
export const ThemeApplier = () => {
  const { theme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    const isPublic = isPublicRoute(location.pathname);
    root.classList.add(isPublic ? "light" : theme);
    localStorage.setItem("ugc-theme", theme);
  }, [theme, location.pathname]);

  return null;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
