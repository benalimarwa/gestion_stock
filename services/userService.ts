import prisma from "@/lib/db";
import { Role } from "@prisma/client";

export const addUserToDatabase = async (
  clerkUserId: string,
  name: string,
  email: string,
  role: Role = "ADMIN"
) => {
  try {
    const user = await prisma.user.upsert({
      where: { email }, // Use email as the unique identifier
      update: { clerkUserId, name, role },
      create: { clerkUserId, name, email, role },
    });
    return user;
  } catch (error) {
    console.error("Error adding user to database:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, clerkUserId: true },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const deleteUser = async (clerkUserId: string) => {
  if (!clerkUserId) {
    throw new Error("clerkUserId cannot be null or undefined");
  }
  try {
    const user = await prisma.user.delete({
      where: { clerkUserId },
    });
    return user;
  } catch (error) {
    console.error("Error deleting user from database:", error);
    throw error;
  }
};