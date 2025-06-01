"use client";

import { useState } from "react";

interface UserDialogProps {
  onAdd?: (formData: FormData) => Promise<void>;
}

export default function UserDialog({ onAdd }: UserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      if (onAdd) await onAdd(formData);
      setIsOpen(false);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        setIsOpen(false); // Close dialog on successful redirect
        return;
      }
      setError("Failed to add user. Please try again.");
      console.error("Dialog error:", err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-white bg-blue-500 rounded-md"
      >
        Add User
      </button>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-semibold mb-4 text-center">Add User</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  className="border p-2 w-full rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  className="border p-2 w-full rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">Role</label>
                <select
                  name="role"
                  className="border p-2 w-full"
                  defaultValue="USER"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                  <option value="MAGASINNAIRE">Magasinnaire</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-700 w-full text-white p-2 rounded-xl"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-red-600 text-white p-2 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}