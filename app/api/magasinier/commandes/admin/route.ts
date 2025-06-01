import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Extract order ID from query parameters
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Fetch the order with the admin relation (ValidatedByAdmin)
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        admin: true, // Include the admin who validated the command (ValidatedByAdmin relation)
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.statut !== "VALIDE") {
      return NextResponse.json({ error: "Order is not validated" }, { status: 400 });
    }

    if (!order.admin) {
      return NextResponse.json({ error: "No admin associated with this order" }, { status: 404 });
    }

    // Construct the admin's name using firstName and lastName if available, otherwise use name
    const admin = order.admin;
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
    console.error("Error fetching admin for order:", error);
    return NextResponse.json({ error: "Internal server error"}, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}