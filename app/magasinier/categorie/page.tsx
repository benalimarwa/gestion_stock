
import { CategoriesTable } from "@/components/magasinier/categorie/categorie";
import Wrapper from "@/components/magasinier/Wrapper3"

export default function Fournisseurs() {
    return (
        <Wrapper>
        <div className="p-8 min-h-screen flex flex-col items-center">
            

            {/* Cadre avec bleu intense + animation */}
            <div className="border-4 border-blue-600 shadow-xl rounded-xl p-8 w-full max-w-5xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
                <CategoriesTable/>
            </div>
        </div>
    </Wrapper>
      );
    }