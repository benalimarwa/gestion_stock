
import ExceptionalRequestsList from "@/components/demandeur/demande/ExceptionalRequestsList";
import { RefusedOrdersTable } from "@/components/demandeur/demande/userDemandeR";
import Wrapper from "@/components/demandeur/Wrapper2";


const demanderefuseuser = () => {
  return (
    <Wrapper>
    <div>
      
      <ExceptionalRequestsList/>
    </div></Wrapper>
  );
}
export default demanderefuseuser;