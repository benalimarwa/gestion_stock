
import { DeliveredOrdersTable } from "@/components/gestionnaire/commandes/commandeL";
import Wrapper from "@/components/gestionnaire/Wrapper";


const commandesLivrePage = () => {
  return (
    <Wrapper>
    <div>
    <DeliveredOrdersTable/>
    </div></Wrapper>
  );
}
export default commandesLivrePage;