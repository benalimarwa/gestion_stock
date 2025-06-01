import DataUsers from "@/components/gestionnaire/DataUsers";
import Wrapper from "@/components/gestionnaire/Wrapper";

export default function UsersPage() {
  return (
    <Wrapper>
    <div className="container mx-auto py-8">
      <DataUsers/>
    </div></Wrapper>
  );
}