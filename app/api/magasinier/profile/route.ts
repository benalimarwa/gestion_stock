import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      console.log("No userId found in request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching user data for userId:", userId);
    // Fetch user details from Clerk
    const user = await clerkClient.users.getUser(userId);
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.emailAddresses[0]?.emailAddress || "Magasinier inconnu";

    if (!name) {
      console.log("No name found for user:", userId);
      return NextResponse.json({ error: "User name not found" }, { status: 404 });
    }

    console.log("User name retrieved:", name);
    return NextResponse.json({ name }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}