"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";

const roles = ["ADMIN", "GESTIONNAIRE", "MAGASINNIER", "DEMANDEUR"] as const;
type Role = typeof roles[number];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      console.log("User not signed in, redirecting to /sign-in");
      router.push("/sign-in");
    } else if (user) {
      const fetchRoleWithRetry = async (retries = 3, delay = 1000): Promise<void> => {
        try {
          const email = user.primaryEmailAddress?.emailAddress;
          if (!email) {
            console.error("No primary email found for user:", user.id);
            setError("No email address found for user.");
            setRole(null);
            return;
          }

          console.log("Fetching role for email:", email);
          const response = await fetch(`/api/auth/get-role?email=${encodeURIComponent(email)}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("API request failed:", response.status, errorData);
            throw new Error(errorData.error || `API request failed: ${response.status}`);
          }

          const data = await response.json();
          console.log("API Response from /api/auth/get-role:", data);
          const roleFromApi = data.role ? data.role.toUpperCase() : null;
          if (roleFromApi && roles.includes(roleFromApi as Role)) {
            console.log("Valid role received:", roleFromApi);
            setRole(roleFromApi as Role);
            setError(null);
          } else {
            console.error("Invalid or undefined role from API:", roleFromApi);
            throw new Error("Invalid or undefined role from API");
          }
        } catch (error) {
          console.error("Error fetching role (attempt):", error);
          if (retries > 0) {
            console.log(`Retrying role fetch... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchRoleWithRetry(retries - 1, delay * 2);
          }
          setError(error instanceof Error ? error.message : "Failed to fetch role after retries");
          setRole(null);
        }
      };
      fetchRoleWithRetry();
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (role && isLoaded && isSignedIn) {
      const redirectMap: Record<string, string> = {
        ADMIN: "/admin",
        MAGASINNIER: "/magasinier",
        GESTIONNAIRE: "/gestionnaire",
        DEMANDEUR: "/demandeur",
        UNDEFINED:"/compte-desactive"
      };
      const redirectPath = redirectMap[role.toUpperCase()] || "/";
      console.log("Redirecting based on role:", role, "to:", redirectPath);

      // Check if the current path is allowed for the user's role
      const roleRouteMap: Record<string, RegExp> = {
        ADMIN: /^\/admin(\/.*)?$/,
        MAGASINNIER: /^\/magasinier(\/.*)?$/,
        GESTIONNAIRE: /^\/gestionnaire(\/.*)?$/,
        DEMANDEUR: /^\/demandeur(\/.*)?$/,
      };
      const currentPath = window.location.pathname;
      const isAllowedPath = roleRouteMap[role]?.test(currentPath);

      if (!isAllowedPath && currentPath !== "/") {
        console.log(`Unauthorized access attempt by ${role} to ${currentPath}`);
        router.push("/error/unauthorized");
      } else if (currentPath === "/") {
        router.push(redirectPath);
      }
    }
  }, [role, isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-900 to-black p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50"
            style={{ top: "30%", left: "40%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50 animation-delay-1000"
            style={{ top: "60%", left: "70%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50 animation-delay-2000"
            style={{ top: "80%", left: "20%" }}
          />
        </div>
        <div
          className="relative z-10 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950/70 to-indigo-950/70 px-6 py-4 text-center shadow-2xl backdrop-blur-md border border-blue-500/30"
          role="status"
          aria-live="polite"
        >
          <span className="text-2xl sm:text-3xl font-bold font-orbitron tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 animate-pulse-text">
            Chargement...
          </span>
        </div>
      </div>
    );
  }


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-screen">
        <div className="flex flex-1">
          <div className="w-1/100 min-h-full bg-gray-200 dark:bg-gray-700"></div>
          <main className="w-99/100 flex">{children}</main>
        </div>
      </div>
      <Toaster richColors />
    </SidebarProvider>
  );
}
