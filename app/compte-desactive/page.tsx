
"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function DeactivatedAccountPage() {
  const router = useRouter();
  const { signOut } = useClerk();

  useEffect(() => {
    // Automatically sign out after 3 seconds
    const timer = setTimeout(async () => {
      try {
        await signOut();
        console.log("User signed out automatically");
        router.push("/sign-in");
      } catch (error) {
        console.error("Error during sign-out:", error);
        router.push("/sign-in"); // Redirect even if sign-out fails
      }
    }, 3000);

    return () => clearTimeout(timer); // Cleanup on unmount
  }, [router, signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-900 to-black p-4 sm:p-6">
      <div className="w-full max-w-md p-8 sm:p-12 bg-gradient-to-tr from-indigo-300 via-indigo-200 to-indigo-100 dark:bg-gray-800/60 rounded-3xl shadow-2xl backdrop-blur-md border border-blue-300/30 dark:border-blue-500/20 transition-all"
        style={{ boxShadow: '0 0 20px 5px rgba(99, 102, 241, 0.5)' }}
      >
        <Image
          src="/essths.png"
          width={100}
          height={100}
          alt="ESSTHS Logo"
          className="mx-auto mb-6 animate-float hover:scale-110 transition-transform duration-500"
        />
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mr-2" />
          <h1 className="text-3xl font-serif font-medium italic tracking-wide text-indigo-500 dark:text-indigo-300 animate-bounce">
            Votre compte est désactivé
          </h1>
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 animate-fade-in font-serif font-medium italic tracking-wide text-center">
          Votre compte a été désactivé. Vous serez déconnecté dans quelques secondes. Veuillez contacter l'administrateur à{" "}
          <a
            href="mailto:admin@example.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            admin@example.com
          </a>{" "}
          pour plus d'informations.
        </p>
        <Button
          asChild
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-serif font-medium italic tracking-wide transition-all duration-300 hover:scale-105"
        >
          <Link href="/sign-in">Retour à la connexion</Link>
        </Button>
      </div>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-in;
        }
      `}</style>
    </div>
  );
}
