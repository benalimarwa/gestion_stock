import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params:Promise< { id: string }> }) {
  try {
    const {id:demandId }= await params;

    if (!demandId) {
      return NextResponse.json({ error: "Demand ID is required" }, { status: 400 });
    }

    // Fetch the demand with the admin relation
    const demand = await prisma.demande.findUnique({
      where: { id: demandId },
      include: {
        admin: true, // Include the admin who approved the demand
      },
    });

    if (!demand) {
      return NextResponse.json({ error: "Demand not found" }, { status: 404 });
    }

    if (demand.statut !== "APPROUVEE" && demand.statut !== "PRISE") {
      return NextResponse.json({ error: "Demand is not approved" }, { status: 400 });
    }

    // If no adminId or admin is found, return a default name
    if (!demand.adminId || !demand.admin) {
      return NextResponse.json({ adminName: "Non attribué" }, { status: 200 });
    }

    // Construct the admin's name using firstName and lastName if available, otherwise use name
    const admin = demand.admin;
    let adminName: string;
    if (admin.firstName && admin.lastName) {
      adminName = `${admin.firstName} ${admin.lastName}`;
    } else if (admin.name) {
      adminName = admin.name;
    } else {
      adminName = "Admin inconnu";
    }

    return NextResponse.json({ adminName }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin for demand:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}