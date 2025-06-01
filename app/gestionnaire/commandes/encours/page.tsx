
import { OngoingOrdersTable } from "@/components/gestionnaire/commandes/commandeen-attente";
import Wrapper from "@/components/gestionnaire/Wrapper"
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