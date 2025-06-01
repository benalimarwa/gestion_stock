
import Wrapper from "@/components/demandeur/Wrapper2";
import { UserProfile } from "@clerk/nextjs";
const parametre =()=> {
    return (
       <Wrapper>
            <h1>parametre du profil </h1>
            <UserProfile/>
        </Wrapper>
    )
};
export default parametre