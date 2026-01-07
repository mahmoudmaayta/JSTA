import { useEffect } from "react";

export function useAdminTheme(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (storedTheme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        }
      }
    }
  }, [enabled]);
}
