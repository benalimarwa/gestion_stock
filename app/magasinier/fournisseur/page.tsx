import DataFour from "@/components/magasinier/fournisseur/DataFour";
import Wrapper from "@/components/magasinier/Wrapper3"

export default function Fournisseurs() {
    return (
        <Wrapper>
        <div className="p-8 min-h-screen flex flex-col items-center">
            {/* Titre stylisé */}
            <h1 className="text-4xl font-extrabold text-blue-700 mb-8 uppercase tracking-wide text-center transition-all duration-300 ease-in-out transform hover:text-blue-600 hover:scale-105 hover:shadow-xl">
                🚚 Fournisseurs
            </h1>

            {/* Cadre avec bleu intense + animation */}
            <div className="border-4 border-blue-600 shadow-xl rounded-xl  w-full max-w-5xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
                <DataFour/>
            </div>
        </div>
    </Wrapper>
      );
    }
