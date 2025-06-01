"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SidebarProvider } from "@/components/ui/sidebar";

// Dynamically import SidebarWrapper to ensure it runs on the client side
// const SidebarWrapper = dynamic(() => import("./SidebarWrapper"), {
//   ssr: false,
//   loading: () => <div className=" text-muted-foreground">Chargement du sidebar...</div>,
// });

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setHasError(true);
    };

    window.addEventListener("error", errorHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  if (hasError) {
    
        console.error("Une erreur est survenue lors du chargement de l'application. Veuillez rafraîchir la page ou contacter l'administrateur");
      
    
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <div className="w-1/6 min-h-screen">
          {/* <SidebarWrapper /> */}
        </div>
        <main className="w-5/6">{children}</main>
      </div>
    </SidebarProvider>
  );
}