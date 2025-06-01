// app/api/update-user/route.ts
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, firstName, lastName } = await request.json();

  try {
    // Await clerkClient() to get the ClerkClient instance
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      firstName,
      lastName,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}