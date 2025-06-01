import Wrapper from "@/components/admin/Wrapper";
import { AppSidebar } from "@/components/admin/app-sidebar"; // Assuming correct path
import Image from "next/image";

export default function AdminDefaultPage() {
  return (
    <Wrapper>
      <div className=" ">
        <div className="relative w-3/10 dark:bg-gray-900 shadow-2xl rounded-r-3xl">
          <AppSidebar />
        </div>
<div className="flex-1 flex items-center justify-center p-8 ">
          <div className="w-full max-w-3xl p-8 sm:p-12 bg-gradient-to-tr from-indigo-300 via-indigo-200 to-indigo-100 dark:bg-gray-800/60 rounded-3xl shadow-2xl backdrop-blur-md border border-blue-300/30 dark:border-blue-500/20 transition-all"
          style={{ boxShadow: '0 0 20px 5px rgba(99, 102, 241, 0.5)' }}

          >
            <Image
              src="/essths.png"
              width={100}
              height={100}
              alt="ESSTHS Logo"
              className="mx-auto mb-6 animate-float hover:scale-110 transition-transform duration-500"
            />
            <h1 className="text-4xl font-serif font-medium italic tracking-wide mb-4 text-indigo-500 dark:text-indigo-300 animate-bounce">
            Bienvenue, Admin!
          </h1>

            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 animate-fade-in font-serif font-medium italic tracking-wide text-justify hover:text-indigo-500 transition-colors duration-300">
               Utilisez le menu à gauche pour naviguer dans l’espace de gestion.  
                  Un design coloré et doux pour une meilleure expérience.
            </p>


          </div>
        </div>
      </div>
    </Wrapper>
  );
}
