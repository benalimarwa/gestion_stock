import { ApprovedRequestsTable } from "@/components/gestionnaire/demandes/demandeA";
import Wrapper from "@/components/gestionnaire/Wrapper";

const DemandeA = () => {
  return (
    <div className="container mx-auto py-6">
      <Wrapper>
        <h1 className="text-2xl font-bold mb-6">Demandes Approuvées</h1>
        <ApprovedRequestsTable />
      </Wrapper>
    </div>
  );
};

export default DemandeA;