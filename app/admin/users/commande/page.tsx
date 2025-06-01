import { DataCommand } from "@/components/admin/DataCommand";
import Wrapper from "@/components/admin/Wrapper";

export default function Commandes() {
  return (
    <Wrapper>
      <div className=" bg-gradient-to-br from-blue-50 via-white to-blue-100 min-h-screen flex flex-col items-center">
        {/* Titre stylisé */}
        <h1 className="text-5xl font-extrabold text-blue-700 mb-8 uppercase tracking-wide text-center transition-all duration-300 ease-in-out transform hover:text-blue-600 hover:scale-105 hover:shadow-xl">
          📦 Commandes
        </h1>

        {/* Cadre avec bleu intense + animation */}
        <div className="bg-white border-4 border-blue-600 shadow-xl rounded-xl p-8 w-full max-w-6xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
          <DataCommand />
        </div>
      </div>
    </Wrapper>
  );
}
