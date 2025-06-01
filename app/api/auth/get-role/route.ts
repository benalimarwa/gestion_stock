import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  // Validate email parameter
  if (!email) {
    console.error("No email provided in query parameters");
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Log the email being queried
    console.log("Querying user with email:", email);

    // Fetch user from the database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error("User not found in database for email:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log the user found
    console.log("User found in database:", user);

    // Ensure the role is one of the expected values
    const validRoles = ["ADMIN", "GESTIONNAIRE", "MAGASINNIER", "DEMANDEUR"];
    if (!user.role || !validRoles.includes(user.role.toUpperCase())) {
      console.error("Invalid role for user:", user.role);
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    return NextResponse.json({ role: user.role });
  } catch (error) {
    console.error("Error fetching user role for email:", email, "Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}