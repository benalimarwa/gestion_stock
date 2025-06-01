import { ApprovedDemandesTable } from "@/components/magasinier/demandes/demandesaccepte";
import Wrapper from "@/components/magasinier/Wrapper3";


export default function DemandesPage() {
  return (
    <Wrapper>
    <div className="container mx-auto py-6">
      
      <ApprovedDemandesTable/>
    </div></Wrapper>
  );
}