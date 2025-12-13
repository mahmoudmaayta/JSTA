import { useEffect } from "react";

export function useAdminTheme(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [enabled]);
}
