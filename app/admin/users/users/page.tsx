import DataUsers from "@/components/admin/DataUsers";
import Wrapper from "@/components/admin/Wrapper";

export default function UsersPage() {
  return (
    <Wrapper>
    <div className="container mx-auto py-8">
      <DataUsers />
    </div></Wrapper>
  );
}