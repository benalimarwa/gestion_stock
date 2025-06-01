"use client";

import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-900 to-black p-4">
      <div className="rounded-2xl bg-gradient-to-br from-blue-950/70 to-indigo-950/70 px-8 py-6 text-center shadow-2xl backdrop-blur-md border border-blue-500/30">
        <h1 className="text-3xl font-bold text-red-400 mb-4">Accès non autorisé</h1>
        <p className="text-lg text-gray-200 mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
       
      </div>
    </div>
  );
}