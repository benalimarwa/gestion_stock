import { CategoriesTable } from "@/components/gestionnaire/categorie";
import Wrapper from "@/components/gestionnaire/Wrapper";

export default function CategoriesPage() {
  return ( <Wrapper>
    <div className="container mx-auto p-6">
      
      <CategoriesTable />
    </div></Wrapper>
  );
}
