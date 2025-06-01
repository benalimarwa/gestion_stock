import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Home page component with full-screen sci-fi styling
export default async function Home() {
  try {
    // Check for authenticated user
    const user = await currentUser();

    if (!user) {
      return (
        <div className="absolute inset-0 flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-black p-4 sm:p-6 overflow-hidden">
          {/* Particle background effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50"
              style={{ top: "20%", left: "30%" }}
            />
            <div
              className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50 animation-delay-1000"
              style={{ top: "50%", left: "70%" }}
            />
            <div
              className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50 animation-delay-1500"
              style={{ top: "80%", left: "10%" }}
            />
            <div
              className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/50 animation-delay-2000"
              style={{ top: "30%", left: "90%" }}
            />
          </div>
          <div className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-2xl bg-gradient-to-br from-blue-950/70 to-indigo-950/70 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-md border border-blue-500/30">
            <h1 className="mb-6 text-4xl sm:text-5xl font-bold font-orbitron tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
              Access Denied
            </h1>
            <p className="mb-8 text-lg text-blue-200 sm:text-xl max-w-md">
              Log in to unlock the interstellar features of the application.
            </p>
            <a
              href="/sign-in"
              className="inline-block rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.7)] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-900 animate-pulse-slow"
              aria-label="Navigate to login page"
            >
              Enter the Grid
            </a>
          </div>
        </div>
      );
    }

    // Sync user with database
    const email = user.emailAddresses[0].emailAddress;
    const existingUser = await prisma.user.findFirst({ where: { email } });

    if (existingUser && existingUser.clerkUserId !== user.id) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { clerkUserId: user.id },
      });
    }

    // Render home page for authenticated users
    return (
      <div className="absolute inset-0 flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-black p-4 sm:p-6 overflow-hidden">
        {/* Starry background effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/30"
            style={{ top: "10%", left: "20%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/30 animation-delay-1000"
            style={{ top: "60%", left: "80%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/30 animation-delay-1500"
            style={{ top: "90%", left: "40%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-white/30 animation-delay-2000"
            style={{ top: "40%", left: "95%" }}
          />
        </div>
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center rounded-3xl bg-gradient-to-br from-blue-950/70 to-indigo-950/70 p-10 sm:p-12 text-center shadow-2xl backdrop-blur-lg border border-blue-500/30">
          <h1 className="mb-6 text-5xl sm:text-6xl md:text-7xl font-extrabold font-orbitron tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            Bienvenue dans notre site de Gestion de Stock
          </h1>
          
         
        </div>
      </div>
    );
  } catch (error) {
    // Log and display error state
    console.error("Erreur dans Home:", error);
    return (
      <div className="absolute inset-0 flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-red-900 via-red-700 to-black p-4 sm:p-6 overflow-hidden">
        {/* Glitch effect background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-red-500/50"
            style={{ top: "30%", left: "40%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-red-500/50 animation-delay-1000"
            style={{ top: "70%", left: "60%" }}
          />
          <div
            className="animate-twinkle absolute h-1 w-1 rounded-full bg-red-500/50 animation-delay-1500"
            style={{ top: "50%", left: "90%" }}
          />
        </div>
        <div
          className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-2xl bg-gradient-to-br from-red-950/80 to-black/80 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-md border border-red-500/50"
          role="alert"
        >
          <h1 className="mb-6 text-4xl sm:text-5xl font-bold font-orbitron tracking-wide text-red-300 animate-glitch-text">
            System Failure
          </h1>
          <p className="mb-8 text-lg text-red-200 sm:text-xl max-w-md">
            Unable to connect to the database. Retry to restore the connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block rounded-full bg-gradient-to-r from-red-600 to-red-800 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.7)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-red-900"
            aria-label="Retry connection"
          >
            Reboot System
          </button>
        </div>
      </div>
    );
  }
}