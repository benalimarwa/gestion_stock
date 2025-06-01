import { DataProdProduitsTable } from "@/components/gestionnaire/produit";
import Wrapper from "@/components/gestionnaire/Wrapper";

export default function ProduitsPage() {
  return ( <Wrapper>
    <div className="container mx-auto p-6">
      
      <DataProdProduitsTable />
    </div></Wrapper>
  );
}
