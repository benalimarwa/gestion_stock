import { ApprovedExceptionalRequestsTable } from "@/components/gestionnaire/commandes/validees/exceptionnelleDemande";

import Wrapper from "@/components/gestionnaire/Wrapper";

const DemandeExceptionnellePage = () => {
  return (
    <Wrapper>
      <div className="container mx-auto py-6">
       
        <ApprovedExceptionalRequestsTable />
      </div>
    </Wrapper>
  );
}

export default  DemandeExceptionnellePage;