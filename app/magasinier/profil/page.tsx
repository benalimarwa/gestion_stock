"use client";

import Wrapper from "@/components/magasinier/Wrapper3";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type UserData = {
  fullName: string;
  email: string;
  bio: string;
  profilePicture: string | File;
};

const Profil = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    fullName: "Loading...",
    email: "Loading...",
    bio: "A passionate developer.",
    profilePicture: "https://via.placeholder.com/150",
  });
  const [formData, setFormData] = useState<UserData>(userData);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setIsClient(true);
    if (isLoaded && user) {
      const newUserData = {
        fullName: user.fullName || "Unnamed User",
        email: user.emailAddresses[0]?.emailAddress || "No email",
        bio: "A passionate developer.",
        profilePicture: user.imageUrl || "https://via.placeholder.com/150",
      };
      setUserData(newUserData);
      setFormData(newUserData);
    }
  }, [isLoaded, user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePictureChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profilePicture: file }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.warning("Utilisateur non chargé. Veuillez réessayer.", {
        className:
          "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
      return;
    }
    try {
      const firstName = formData.fullName.split(" ")[0];
      const lastName = formData.fullName.split(" ").slice(1).join(" ") || "";

      const updateResponse = await fetch("/api/magasinier/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, firstName, lastName }),
      });

      if (!updateResponse.ok) {
        throw new Error("Échec de la mise à jour via l'API");
      }

      if (formData.profilePicture !== userData.profilePicture) {
        await user.setProfileImage({
          file: formData.profilePicture instanceof File ? formData.profilePicture : null,
        });
      }

      setUserData({ ...formData });
      setIsEditing(false);
      toast.success("Profil mis à jour avec succès !", {
        className:
          "bg-green-900/60 text-green-300 border border-green-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error(`Échec de la mise à jour du profil: ${error instanceof Error ? error.message : "Erreur inconnue"}`, {
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    }
  };

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.warning("Utilisateur non chargé. Veuillez réessayer.", {
        className:
          "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
      return;
    }
    if (!currentPassword) {
      toast.warning("Veuillez entrer votre mot de passe actuel.", {
        className:
          "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast.warning("Le nouveau mot de passe doit contenir au moins 8 caractères.", {
        className:
          "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
      return;
    }
    setIsPasswordLoading(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Mot de passe mis à jour avec succès !", {
        className:
          "bg-green-900/60 text-green-300 border border-green-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      let errorMessage = "Erreur inconnue";
      if (error.message.includes("Password")) {
        errorMessage = "Mot de passe actuel incorrect ou nouveau mot de passe invalide.";
      } else if (error.message.includes("validation")) {
        errorMessage = "Échec de la validation des mots de passe. Veuillez réessayer.";
      } else {
        errorMessage = error.message || "Échec de la mise à jour du mot de passe.";
      }
      toast.error(`Échec de la mise à jour du mot de passe: ${errorMessage}`, {
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.warning("Utilisateur non chargé. Veuillez réessayer.", {
        className:
          "bg-yellow-900/60 text-yellow-300 border border-yellow-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
      return;
    }
    setIsDeactivateModalOpen(true);
  };

  const confirmDeactivation = async () => {
    try {
      const response = await fetch("/api/user/desactivate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = "Échec de la mise à jour dans la base de données";
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          const text = await response.text();
          console.error(`Non-JSON response (status: ${response.status}):`, text.substring(0, 500));
          errorMessage = response.status === 404
            ? "API endpoint not found (/api/user/desactivate). Please check if the route exists at app/api/user/deactivate/route.ts."
            : `Réponse inattendue du serveur (status: ${response.status}, HTML au lieu de JSON)`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Deactivation response:", data);

      toast.success("Compte désactivé avec succès. Vous serez déconnecté.", {
        className:
          "bg-green-900/60 text-green-300 border border-green-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });

      await signOut();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Erreur lors de la désactivation du compte:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Échec de la désactivation du compte: ${errorMessage}`, {
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } finally {
      setIsDeactivateModalOpen(false);
    }
  };

  if (!isClient || !isLoaded) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-850 to-purple-950 py-6 flex items-center justify-center">
          <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
            <div className="bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative">
              <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
              <div className="relative space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="w-20 h-20 rounded-full bg-blue-800/50" />
                  <Skeleton className="h-6 w-3/4 bg-blue-800/50" />
                </div>
                <Skeleton className="h-4 w-full bg-blue-700/50" />
                <Skeleton className="h-16 w-full bg-blue-800/50 rounded-lg" />
                <Skeleton className="h-9 w-full bg-blue-800/50 rounded-md" />
                <Skeleton className="h-24 w-full bg-blue-800/50 rounded-lg" />
                <Skeleton className="h-9 w-full bg-blue-800/50 rounded-md" />
                <Skeleton className="h-9 w-full bg-blue-800/50 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-250 to-gray-350 py-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 mt-6 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative font-[Inter,sans-serif] transition-all duration-200 hover:bg-blue-800/70 hover:shadow-xl"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
          <div className="relative space-y-6">
            <div className="flex flex-col items-center gap-4">
              <motion.img
                src={
                  typeof formData.profilePicture === "string"
                    ? formData.profilePicture
                    : URL.createObjectURL(formData.profilePicture)
                }
                alt="Profile"
                className="w-16 sm:w-20 h-16 sm:h-20 rounded-full object-cover border-2 border-blue-700/60 shadow-md transition-transform duration-300"
                whileHover={{ scale: 1.05 }}
              />
              <motion.h2
                className="text-2xl font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent transition-transform duration-300"
                whileHover={{ scale: 1.05 }}
              >
                {userData.fullName}
              </motion.h2>
              {isEditing && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  className="text-sm text-blue-200"
                />
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-900/80 backdrop-blur-md rounded-lg p-4 border border-blue-800/60">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-100">Nom complet</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full h-9 px-3 mt-1 bg-blue-900/60 border border-blue-800/60 text-blue-100 rounded-md text-sm focus:ring-2 focus:ring-blue-700/60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-100">Email (lecture seule)</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full h-9 px-3 mt-1 bg-blue-900/60 border border-blue-800/60 text-blue-100 rounded-md text-sm opacity-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-100">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className="w-full p-3 mt-1 bg-blue-900/60 border border-blue-800/60 text-blue-100 rounded-md text-sm focus:ring-2 focus:ring-blue-700/60"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="h-9 px-4 bg-transparent text-blue-200 hover:text-blue-100 text-sm rounded-md"
                          >
                            Annuler
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-blue-900/80 text-blue-100 border-blue-800/60 text-xs">
                        Annuler les modifications
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            type="submit"
                            className="h-9 px-4 bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 text-sm rounded-md"
                          >
                            Enregistrer
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-blue-900/80 text-blue-100 border-blue-800/60 text-xs">
                        Enregistrer les modifications
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-900/80 backdrop-blur-md rounded-lg p-4 border border-blue-800/60">
                  <p className="text-sm text-blue-200 sm:text-sm text-xs">
                    <span className="font-medium text-blue-100">Email :</span> {userData.email}
                  </p>
                  <p className="text-sm text-blue-200 mt-2 sm:text-sm text-xs">
                    <span className="font-medium text-blue-100">Bio :</span> {userData.bio}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={() => setIsEditing(true)}
                          className="w-full h-9 px-4 bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 text-sm rounded-md"
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
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-blue-100 mb-2">Changer le mot de passe</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="bg-blue-900/80 backdrop-blur-md rounded-lg p-4 border border-blue-800/60">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-100">Mot de passe actuel</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-9 px-3 mt-1 bg-blue-900/60 border border-blue-800/60 text-blue-100 rounded-md text-sm focus:ring-2 focus:ring-blue-700/60"
                        disabled={isPasswordLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-100">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-9 px-3 mt-1 bg-blue-900/60 border border-blue-800/60 text-blue-100 rounded-md text-sm focus:ring-2 focus:ring-blue-700/60"
                        disabled={isPasswordLoading}
                      />
                    </div>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          type="submit"
                          className="w-full h-9 px-4 bg-purple-800/80 text-green-300 hover:bg-blue-700/80 text-sm rounded-md"
                          disabled={isPasswordLoading}
                        >
                          {isPasswordLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-pink-900/80 text-blue-100 border-blue-800/60 text-xs">
                      Mettre à jour le mot de passe
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-blue-100 mb-2">Désactiver le compte</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleDeleteAccount}
                        className="w-full h-9 px-4 bg-pink-900/60 text-red-300 hover:bg-red-800/60 text-sm rounded-md"
                      >
                        Désactiver mon compte
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-purple-900/80 text-blue-100 border-blue-800/60 text-xs">
                    Désactiver le compte (réversible par l'administrateur)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>

        {/* Deactivation Confirmation Modal */}
        <AnimatePresence>
          {isDeactivateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setIsDeactivateModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-blue-900/60 backdrop-blur-md rounded-lg shadow-xl p-6 border border-blue-800/60 max-w-md w-full mx-4 relative"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="modal-title"
                aria-modal="true"
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
                <div className="relative">
                  <h2
                    id="modal-title"
                    className="text-xl font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent mb-4"
                  >
                    Confirmer la désactivation
                  </h2>
                  <p className="text-blue-200 text-sm mb-6">
                    Êtes-vous sûr de vouloir désactiver votre compte ? Cette action est irréversible sans intervention de l'administrateur.
                  </p>
                  <div className="flex justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsDeactivateModalOpen(false)}
                      className="h-9 px-4 bg-transparent text-blue-200 hover:text-blue-100 text-sm rounded-md border border-blue-800/60"
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={confirmDeactivation}
                      className="h-9 px-4 bg-red-900/60 text-red-300 hover:bg-red-800/60 text-sm rounded-md"
                    >
                      Confirmer
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Wrapper>
  );
};

export default Profil;