import DataEmp from "@/components/admin/DataEmp";
import Wrapper from "@/components/admin/Wrapper";

export default function Employers() {
    return (
        <Wrapper>
            <div className="p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100 min-h-screen flex flex-col items-center">
                {/* Titre stylisé */}
                <h1 className="text-5xl font-extrabold text-blue-700 mb-8 uppercase tracking-wide text-center transition-all duration-300 ease-in-out transform hover:text-blue-600 hover:scale-105 hover:shadow-xl">
                    👥 Demandeurs
                </h1>

                {/* Cadre avec bleu intense + animation */}
                <div className="bg-white border-4 border-blue-600 shadow-xl rounded-xl h-full w-full max-h-4xl max-w-4xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50">
                    <DataEmp />
                </div>
            </div>
        </Wrapper>
    );
}
