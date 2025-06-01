"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface User {
  name: string;
  email: string;
  age: number;
  address: string;
  avatarUrl: string;
}

interface UserProfileProps {
  user: User | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    // Placeholder for edit modal logic
  };

  const handleCloseModal = () => {
    setIsEditing(false);
  };

  if (!isClient || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center py-6">
        <div className="max-w-3xl w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
            <div className="relative space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Skeleton className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-blue-800/50" />
                <div className="space-y-2 w-full sm:w-auto">
                  <Skeleton className="h-6 w-3/4 bg-blue-800/50" />
                  <Skeleton className="h-4 w-1/2 bg-blue-800/50" />
                </div>
              </div>
              <Skeleton className="h-24 w-full bg-blue-800/50 rounded-lg" />
              <Skeleton className="h-9 w-full sm:w-40 bg-blue-800/50 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 py-6">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative font-[Inter,sans-serif] transition-all duration-200 hover:bg-blue-800/70 hover:shadow-xl"
      >
        <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <motion.img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 sm:w-20 h-16 sm:h-20 rounded-full object-cover border-2 border-blue-700/60 shadow-md transition-transform duration-300"
              whileHover={{ scale: 1.05 }}
            />
            <div className="space-y-1 text-center sm:text-left">
              <motion.h1
                className="text-2xl font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent transition-transform duration-300"
                whileHover={{ scale: 1.05 }}
              >
                {user.name}
              </motion.h1>
              <p className="text-sm text-blue-300 sm:text-sm text-xs">{user.email}</p>
            </div>
          </div>
          <div className="mt-4 bg-blue-900/80 backdrop-blur-md rounded-lg p-4 border border-blue-800/60 shadow-md">
            <p className="text-sm text-blue-200 sm:text-sm text-xs">
              <strong className="text-blue-100">Âge :</strong> {user.age}
            </p>
            <p className="text-sm text-blue-200 mt-2 sm:text-sm text-xs">
              <strong className="text-blue-100">Adresse :</strong> {user.address}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-4">
                  <Button
                    onClick={handleEdit}
                    className="w-full sm:w-auto h-9 px-4 bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 text-sm rounded-md transition-all duration-200 shadow-md"
                  >
                    Modifier le profil
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="bg-blue-900/80 text-blue-100 border-blue-800/60 text-xs">
                Modifier les informations du profil
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Placeholder Edit Modal */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="bg-blue-900/80 backdrop-blur-md rounded-lg p-6 border border-blue-800/60 shadow-xl max-w-md w-full mx-4 relative">
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
            <div className="relative">
              <h2 className="text-xl font-semibold text-blue-100">Modifier le profil</h2>
              <p className="text-sm text-blue-200 mt-2">Fonctionnalité en cours de développement.</p>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleCloseModal}
                  className="h-9 px-4 bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 text-sm rounded-md"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UserProfile;