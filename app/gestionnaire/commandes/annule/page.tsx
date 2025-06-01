// app/commandes-annulees/page.tsx
import { ValidatedOrdersTable } from "@/components/gestionnaire/commandes/validees/ValidatedOrdersTable";
import Wrapper from "@/components/gestionnaire/Wrapper";

export const metadata = {
  title: 'Commandes Annulées',
  description: 'Gestion des commandes annulées',
};

const CommandesAnnuleesPage = () => {
  return (
    <Wrapper>
      <div className="space-y-4">
    
        <ValidatedOrdersTable/>
      </div>
    </Wrapper>
  );
};

export default CommandesAnnuleesPage;