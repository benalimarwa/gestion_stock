"use client"; 

import Wrapper from "@/components/admin/Wrapper";
import DataProd from "@/components/admin/DataProd";
import Datacate from "@/components/admin/Datacate";
import { CategoriesTable } from "@/components/admin/categorie";

export default function Categories() {
    return (
        <Wrapper>
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative">
                
                {/* Conteneur principal avec effet de carte */}
                

                    

                    {/* Composant DataProd avec effet de survol */}
                    <div className="w-full h-full  bg-gray-50 rounded-lg shadow-md border border-gray-300 transition-transform duration-300 hover:scale-105 hover:shadow-blue-500/50">
                        <CategoriesTable />
                 
                </div>
            </div>
        </Wrapper>
    );
}
