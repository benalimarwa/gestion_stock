import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/compte-desactive",
]);
const isGetRoleRoute = createRouteMatcher(["/api/auth/get-role"]);

export default clerkMiddleware(async (auth, request) => {
  console.log("Middleware running for:", request.url);

  if (isGetRoleRoute(request)) {
    console.log("Skipping middleware for get-role route:", request.url);
    return NextResponse.next();
  }

  if (isPublicRoute(request)) {
    console.log("Public route detected:", request.url);
    return NextResponse.next();
  }

  const { userId } = await auth();
  console.log("User ID from auth:", userId);

  if (!userId) {
    console.log("Utilisateur non authentifié, redirection vers /sign-in");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  let userStatus: string | undefined;
  let userRole: string | undefined;
  try {
    const user = await clerk.users.getUser(userId);
    userStatus = user.publicMetadata?.status as string | undefined;
    userRole = user.publicMetadata?.role as string | undefined;
    console.log("User status from Clerk publicMetadata:", userStatus);
    console.log("User role from Clerk publicMetadata:", userRole);
  } catch (error) {
    console.error("Error fetching user metadata from Clerk:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (userStatus === "DEACTIVATED" || userRole === "UNDEFINED") {
    console.log(`User ${userId} is DEACTIVATED or has UNDEFINED role, redirecting to /compte-desactive`);
    return NextResponse.redirect(new URL("/compte-desactive", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/api")) {
    console.log("API route detected:", request.url, "Method:", request.method);
    if (request.method === "GET") {
      return NextResponse.next();
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié", details: "Authentication required for API" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (userRole) {
    response.headers.set("x-user-role", userRole);
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/admin(.*)",
    "/demandeur(.*)",
    "/magasinier(.*)",
    "/gestionnaire(.*)",
  ],
};