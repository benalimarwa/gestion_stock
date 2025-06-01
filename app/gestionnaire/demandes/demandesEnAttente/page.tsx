import { PendingRequestsTable } from "@/components/gestionnaire/demandes/demandeE"; 
import Wrapper from "@/components/gestionnaire/Wrapper";

const DemandeEnAttentePage = () => {
  return (
    <Wrapper>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Demandes en attente</h1>
        <PendingRequestsTable />
      </div>
    </Wrapper>
  );
}

export default DemandeEnAttentePage;