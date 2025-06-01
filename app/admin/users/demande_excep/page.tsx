import DemandeAcceptee from "@/components/admin/DemandeAcceptee";
import { PendingExceptionalRequestsTable } from "@/components/admin/DemandeExceptionelle";
import Wrapper from "@/components/admin/Wrapper";

export default function DemandeExcept() {
  return (
    <Wrapper>
    <div className="container mx-auto py-8">
      <PendingExceptionalRequestsTable />
    </div></Wrapper>
  );
}