"use client";

import { Role } from "@prisma/client";

interface UserRowProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    clerkUserId: string | null;
  };
  onDelete: (clerkUserId: string) => Promise<void>;
}

export default function UserRow({ user, onDelete }: UserRowProps) {
  return (
    <tr>
      <td className="border p-2">{user.name || "N/A"}</td>
      <td className="border p-2">{user.email}</td>
      <td className="border p-2">{user.role}</td>
      <td className="border p-2">
        <button
          onClick={() => user.clerkUserId && onDelete(user.clerkUserId)}
          className="bg-red-500 text-white p-1 rounded"
          disabled={!user.clerkUserId}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}