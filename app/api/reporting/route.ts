import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { type, userId } = await req.json();

    if (!type || !userId) {
      return NextResponse.json(
        { error: "Type and userId are required" },
        { status: 400 }
      );
    }

    console.log("Received userId:", userId); // Log for debugging

    // Find user by clerkUserId
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    console.log("User query result:", user); // Log for debugging

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create a new Reporting entry with the user relation
    const report = await prisma.reporting.create({
      data: {
        type,
        date: new Date(),
       
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}