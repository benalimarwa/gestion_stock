
import { OngoingOrdersTable } from "@/components/magasinier/commandes/Encours";
import Wrapper from "@/components/magasinier/Wrapper3";
import { Toaster } from "sonner";


const commandesEncoursPage = () => {
  return (
    <Wrapper>
    <div>
      <OngoingOrdersTable/>
      <Toaster position="top-right" />
    </div></Wrapper>
  );
}
export default commandesEncoursPage;