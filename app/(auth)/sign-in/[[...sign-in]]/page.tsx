import { SignIn } from "@clerk/nextjs";
import type { NextPage } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Interface for searchParams
interface SignInPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SignInPage: NextPage<SignInPageProps> = async ({ searchParams }) => {
  const resolvedSearchParams = await searchParams;
  const ticket = resolvedSearchParams["__clerk_ticket"] as string | undefined;
  const error = resolvedSearchParams["error"] as string | undefined;
  let email: string | undefined;

  if (ticket) {
    try {
      const response = await fetch(`http://localhost:3000/api/invitations?__clerk_ticket=${ticket}`);
      const data = await response.json();
      if (response.ok && data.email) {
        email = data.email;
        console.log("Pre-filled email from invitation:", email);
      } else {
        console.log("No invitation found for ticket:", ticket);
      }
    } catch (error) {
      console.error("Error fetching invitation:", error);
    }
  }

  const signInProps = {
    routing: "path" as const,
    path: "/sign-in",
    signUpUrl: "/sign-up",
    afterSignInUrl: "/",
    initialValues: email ? { emailAddress: email } : undefined,
    appearance: {
      elements: {
        formButtonPrimary:
          "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg",
        card: "bg-transparent shadow-none",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        socialButtonsBlockButton:
          "border border-gray-200/50 bg-white/10 hover:bg-white/20 text-gray-800 font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-300",
        formFieldInput:
          "border border-gray-200/50 bg-white/10 text-gray-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200",
      },
    },
  };

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* Background Decorative Elements with Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[700px] h-[700px] top-[-350px] left-[-350px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute w-[700px] h-[700px] bottom-[-350px] right-[-350px] bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute w-[500px] h-[500px] top-[20%] right-[10%] bg-blue-500/10 rounded-full blur-2xl animate-float"></div>
      </div>

      {/* Sign-In Card with Glassmorphism Effect */}
      <div className="relative z-10 w-full max-w-md p-6 bg-gradient-to-br from-blue-800 via-purple-700 to-gray-900 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl transform transition-all hover:scale-105 duration-500">
        {/* Logo with Animation */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <svg
            className="w-14 h-14 text-indigo-400 drop-shadow-lg"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 11c0-2.76-2.24-5-5-5S2 8.24 2 11s2.24 5 5 5 5-2.24 5-5zm0 0c0 2.76 2.24 5 5 5s5-2.24 5-5-2.24-5-5-5-5 2.24-5 5z"
            ></path>
          </svg>
        </div>

        {/* Title with Gradient Text */}
        <h2 className="text-4xl font-extrabold text-center mb-2 bg-gradient-to-r from-indigo-400 to-blue-500 text-transparent bg-clip-text animate-fade-in">
          GESTION DU STOCK
        </h2>
       

        {/* Error Message for Deactivated Account */}
        {error === "account_deactivated" && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/20 animate-fade-in delay-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Votre compte est désactivé. Veuillez contacter l'administrateur à{" "}
              <a
                href="mailto:admin@example.com"
                className="text-blue-400 hover:underline"
              >
                admin@example.com
              </a>{" "}
              pour plus d'informations.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message for Invalid Ticket */}
        {ticket && !email && (
          <p className="text-red-400 text-sm mb-4 text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-fade-in delay-300">
            No invitation found for this ticket. Please sign in manually.
          </p>
        )}

        {/* Sign-In Form */}
        <div className="space-y-4 animate-fade-in delay-400">
          <SignIn {...signInProps} />
        </div>

        {/* Footer Link with Hover Effect */}
        
      </div>
    </div>
  );
};

export default SignInPage;