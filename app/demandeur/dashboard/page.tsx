"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import UserDashboard from "@/components/demandeur/dashboard";
import Wrapper from "@/components/demandeur/Wrapper2";

export default function DashboardPage() {
  return ( <Wrapper>
    
        <UserDashboard/>
     
  </Wrapper>
  );
}