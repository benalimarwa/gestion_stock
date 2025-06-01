import { DeliveredOrdersTable } from "@/components/magasinier/commandes/livre";
import Wrapper from "@/components/magasinier/Wrapper3";

const commandesLivrePage = () => {
  return (
    <Wrapper>
    <div>
      <DeliveredOrdersTable/>
    </div></Wrapper>
  );
}
export default commandesLivrePage;