"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Eye, Power, PlusCircle, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@clerk/nextjs";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER" | "UNDEFINED";
  status: "ACTIVE" | "DEACTIVATED";
  createdAt: string;
  demandeur?: { type: "ENSEIGNANT" | "EMPLOYE" } | null;
};

type Commande = {
  id: string;
  statut: string;
  date: string;
  createdAt: string;
  produits: { produit: { nom: string }; quantite: number }[];
};

type Demande = {
  id: string;
  statut: string;
  createdAt: string;
  produits: { produit: { nom: string }; quantite: number }[];
};

type UserDetails = {
  commandes?: Commande[];
  demandes?: Demande[];
  acceptedDemandes?: Demande[];
};

export function DataUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "ADMIN" as "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<User | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const statusDialogRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (selectedRole) {
      result = result.filter((user) => user.role === selectedRole);
    }
    if (searchEmail.trim()) {
      result = result.filter((user) =>
        user.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }
    setFilteredUsers(result);
    setLiveRegionMessage(`Affichage de ${result.length} utilisateurs filtrés.`);
  }, [users, selectedRole, searchEmail]);

  useEffect(() => {
    if (detailsDialogOpen && detailsDialogRef.current) {
      const firstFocusable = detailsDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
    if (statusDialogOpen && statusDialogRef.current) {
      const firstFocusable = statusDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
    if (showAddForm && addDialogRef.current) {
      const firstFocusable = addDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [detailsDialogOpen, statusDialogOpen, showAddForm]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      setLiveRegionMessage("Chargement des utilisateurs...");
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const response = await fetch("/api/admin/users", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          throw new Error("Accès interdit : vous devez être administrateur.");
        }
        throw new Error(
          data.error || "Erreur lors de la récupération des utilisateurs"
        );
      }
      const data = await response.json();
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error(
          "Format de réponse invalide : 'users' doit être un tableau."
        );
      }
      setUsers(data.users);
      setFilteredUsers(data.users);
      setLiveRegionMessage("Utilisateurs chargés avec succès.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue s'est produite";
      setError(errorMessage);
      setUsers([]);
      setFilteredUsers([]);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserDetails(userId: string) {
    setDetailsLoading(true);
    setDetailsError(null);
    setLiveRegionMessage("Chargement des détails de l'utilisateur...");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const response = await fetch(`/api/admin/users/${userId}/details`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Erreur lors de la récupération des détails"
        );
      }
      const data: UserDetails = await response.json();
      setUserDetails(data);
      setLiveRegionMessage("Détails de l'utilisateur chargés avec succès.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setDetailsError(errorMessage);
      setSelectedUser(null);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setDetailsLoading(false);
    }
  }

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value);
  };

  const handleEmailSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    name?: string
  ) => {
    const targetName = name || e.target.name;
    const targetValue = e.target.value;
    setFormData((prev) => ({ ...prev, [targetName]: targetValue }));
    setFormError(null);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      setFormError("Veuillez entrer une adresse email");
      setLiveRegionMessage("Erreur : adresse email manquante.");
      return;
    }
    if (!validateEmail(formData.email)) {
      setFormError("Veuillez entrer une adresse email valide");
      setLiveRegionMessage("Erreur : adresse email invalide.");
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères");
      setLiveRegionMessage("Erreur : mot de passe trop court.");
      return;
    }
    if (
      !["ADMIN", "DEMANDEUR", "GESTIONNAIRE", "MAGASINNIER"].includes(
        formData.role
      )
    ) {
      setFormError("Rôle invalide");
      setLiveRegionMessage("Erreur : rôle invalide.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setLiveRegionMessage("Création de l'utilisateur...");

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          throw new Error(
            "Vous n'êtes pas authentifié. Veuillez vous reconnecter."
          );
        } else if (response.status === 403) {
          throw new Error(
            "Accès interdit. Vérifiez votre session ou contactez l'administrateur."
          );
        } else {
          throw new Error(
            data.error || "Erreur lors de la création de l'utilisateur"
          );
        }
      }

      setFormData({ email: "", name: "", role: "ADMIN", password: "" });
      setShowAddForm(false);
      setSelectedRole("");
      setSearchEmail("");
      await fetchUsers();
      toast.success("Utilisateur ajouté avec succès");
      setLiveRegionMessage("Utilisateur ajouté avec succès.");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setFormError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: "ACTIVE" | "DEACTIVATED") => {
    try {
      setLiveRegionMessage(
        currentStatus === "ACTIVE" ? "Désactivation de l'utilisateur..." : "Réactivation de l'utilisateur..."
      );
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const newStatus = currentStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Erreur lors de la ${newStatus === "DEACTIVATED" ? "désactivation" : "réactivation"} de l'utilisateur`
        );
      }

      // Parse the response to get the updated user data
      const updatedUser = await response.json();
      const newRole = newStatus === "DEACTIVATED" ? "UNDEFINED" : updatedUser.user?.role || "UNDEFINED";

      // Update local state to reflect new status and role
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, status: newStatus, role: newRole }
            : user
        )
      );
      setFilteredUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, status: newStatus, role: newRole }
            : user
        )
      );
      toast.success(
        newStatus === "DEACTIVATED" ? "Utilisateur désactivé avec succès" : "Utilisateur réactivé avec succès"
      );
      setLiveRegionMessage(
        newStatus === "DEACTIVATED" ? "Utilisateur désactivé avec succès." : "Utilisateur réactivé avec succès."
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Erreur inconnue lors de la ${currentStatus === "ACTIVE" ? "désactivation" : "réactivation"}`;
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setStatusDialogOpen(false);
      setUserToToggleStatus(null);
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    }
  };

  const openToggleStatusDialog = (
    user: User,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setUserToToggleStatus(user);
    setStatusDialogOpen(true);
  };

  const openDetailsDialog = async (
    user: User,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedUser(user);
    setDetailsDialogOpen(true);
    await fetchUserDetails(user.id);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    callback: (
      event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
    ) => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback(event);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRoleDisplay = (user: User | null) => {
    if (!user) return "-";
    switch (user.role) {
      case "ADMIN":
        return "Admin";
      case "GESTIONNAIRE":
        return "Gestionnaire";
      case "MAGASINNIER":
        return "Magasinier";
      case "DEMANDEUR":
        return user.demandeur?.type === "ENSEIGNANT"
          ? "Enseignant"
          : user.demandeur?.type === "EMPLOYE"
          ? "Employé"
          : "Demandeur";
      case "UNDEFINED":
        return "Non défini";
      default:
        return user.role;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "EN_COURS":
      case "EN_ATTENTE":
        return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
      case "LIVREE":
      case "APPROUVEE":
        return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
      case "ANNULEE":
      case "REJETEE":
        return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
      case "EN_RETOUR":
        return "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
    }
  };

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
      case "DEACTIVATED":
        return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
    }
  };

  if (!isClient) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg mt-4" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg mt-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg shadow-md">
        <h3 className="font-bold text-red-700 dark:text-red-200 title-hover">
          Erreur de Chargement
        </h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={fetchUsers}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
        >
          Réessayer
        </Button>
        <span className="sr-only">{liveRegionMessage}</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
            Gestion des Utilisateurs
          </h2>
          <div className="flex gap-4">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              aria-label={
                showAddForm
                  ? "Annuler l'ajout d'un utilisateur"
                  : "Ajouter un nouvel utilisateur"
              }
            >
              <PlusCircle className="h-5 w-5" />
              {showAddForm ? "Annuler" : "Ajouter un Utilisateur"}
            </Button>
            <Button
              onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              aria-label={
                viewMode === "cards"
                  ? "Passer à la vue tableau"
                  : "Passer à la vue cartes"
              }
            >
              {viewMode === "cards" ? "Vue Tableau" : "Vue Cartes"}
            </Button>
          </div>
        </div>
        <span className="sr-only">{liveRegionMessage}</span>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          <div className="space-y-2">
            <Label
              htmlFor="emailFilter"
              className="text-sm font-semibold text-blue-700 dark:text-gray-200"
            >
              Filtrer par Email
            </Label>
            <Input
              id="emailFilter"
              value={searchEmail}
              onChange={handleEmailSearch}
              placeholder="Entrez l'email de l'utilisateur"
              className="w-[200px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-describedby="emailFilterDesc"
            />
            <p id="emailFilterDesc" className="text-xs text-blue-500 dark:text-gray-400">
              Filtrez les utilisateurs par leur adresse email.
            </p>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="roleFilter"
              className="text-sm font-semibold text-blue-700 dark:text-gray-200"
            >
              Filtrer par Rôle
            </Label>
            <select
              id="roleFilter"
              value={selectedRole}
              onChange={handleRoleFilter}
              className="w-[200px] h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-describedby="roleFilterDesc"
            >
              <option value="">Tous les rôles</option>
              <option value="ADMIN">Admin</option>
              <option value="DEMANDEUR">Demandeur</option>
              <option value="GESTIONNAIRE">Gestionnaire</option>
              <option value="MAGASINNIER">Magasinier</option>
              <option value="UNDEFINED">Non défini</option>
            </select>
            <p id="roleFilterDesc" className="text-xs text-blue-500 dark:text-gray-400">
              Filtrez les utilisateurs par leur rôle.
            </p>
          </div>
        </motion.div>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={addDialogRef}
            aria-labelledby="add-user-title"
            aria-describedby="add-user-description"
          >
            <VisuallyHidden>
              <h3 id="add-user-title">Ajouter un nouvel utilisateur</h3>
              <p id="add-user-description">
                Formulaire pour ajouter un nouvel utilisateur avec ses détails.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Ajouter un nouvel utilisateur
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {formError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Entrez l'adresse email"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Entrez une adresse email valide.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    Nom
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Entrez le nom (optionnel)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    Mot de passe <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Entrez le mot de passe"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Minimum 8 caractères.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="role"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    Rôle <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="GESTIONNAIRE">Gestionnaire</option>
                    <option value="MAGASINNIER">Magasinier</option>
                    <option value="DEMANDEUR">Demandeur</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  {isSubmitting ? "Création..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucun utilisateur trouvé.
          </motion.div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-200"
                  role="region"
                  aria-labelledby={`user-${user.id}`}
                >
                  <h3
                    id={`user-${user.id}`}
                    className="text-lg font-bold text-blue-800 dark:text-gray-100 title-hover"
                  >
                    {user.email}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Nom: {user.name || "-"}
                  </p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                        : user.role === "GESTIONNAIRE" || user.role === "MAGASINNIER"
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                        : user.role === "UNDEFINED"
                        ? "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300"
                        : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    }`}
                  >
                    {getRoleDisplay(user)}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Statut:{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getUserStatusColor(
                        user.status
                      )}`}
                    >
                      {user.status === "ACTIVE" ? "Actif" : "Désactivé"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Créé le: {formatDate(user.createdAt)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                      onClick={(e) => openDetailsDialog(user, e)}
                      onKeyDown={(e) =>
                        handleKeyDown(e, (ev) => openDetailsDialog(user, ev))
                      }
                      disabled={detailsLoading}
                      aria-label={`Voir les détails de l'utilisateur ${user.email}`}
                      aria-busy={detailsLoading && selectedUser?.id === user.id}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {user.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700"
                        onClick={(e) => openToggleStatusDialog(user, e)}
                        onKeyDown={(e) =>
                          handleKeyDown(e, (ev) => openToggleStatusDialog(user, ev))
                        }
                        aria-label={`Désactiver l'utilisateur ${user.email}`}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700"
                        onClick={(e) => openToggleStatusDialog(user, e)}
                        onKeyDown={(e) =>
                          handleKeyDown(e, (ev) => openToggleStatusDialog(user, ev))
                        }
                        aria-label={`Réactiver l'utilisateur ${user.email}`}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des utilisateurs enregistrés dans le système.
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">
                    Email
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">
                    Nom
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">
                    Rôle
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">
                    Statut
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">
                    Créé le
                  </TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {user.name || "-"}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {getRoleDisplay(user)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getUserStatusColor(
                            user.status
                          )}`}
                        >
                          {user.status === "ACTIVE" ? "Actif" : "Désactivé"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={(e) => openDetailsDialog(user, e)}
                            onKeyDown={(e) =>
                              handleKeyDown(e, (ev) => openDetailsDialog(user, ev))
                            }
                            disabled={detailsLoading}
                            aria-label={`Voir les détails de l'utilisateur ${user.email}`}
                            aria-busy={detailsLoading && selectedUser?.id === user.id}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700"
                              onClick={(e) => openToggleStatusDialog(user, e)}
                              onKeyDown={(e) =>
                                handleKeyDown(e, (ev) => openToggleStatusDialog(user, ev))
                              }
                              aria-label={`Désactiver l'utilisateur ${user.email}`}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700"
                              onClick={(e) => openToggleStatusDialog(user, e)}
                              onKeyDown={(e) =>
                                handleKeyDown(e, (ev) => openToggleStatusDialog(user, ev))
                              }
                              aria-label={`Réactiver l'utilisateur ${user.email}`}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-gray-50 dark:bg-gray-700">
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-gray-700 dark:text-gray-200 font-medium"
                  >
                    Total Utilisateurs
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">
                    {filteredUsers?.length || 0}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        <Dialog
          open={statusDialogOpen}
          onOpenChange={(open) => {
            setStatusDialogOpen(open);
            if (!open) {
              setUserToToggleStatus(null);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={statusDialogRef}
            aria-labelledby="toggle-status-user-title"
            aria-describedby="toggle-status-user-description"
          >
            <VisuallyHidden>
              <h3 id="toggle-status-user-title">Confirmer la modification du statut de l'utilisateur</h3>
              <p id="toggle-status-user-description">
                Confirmation pour modifier le statut de l'utilisateur.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setStatusDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Confirmer la Modification
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              Êtes-vous sûr de vouloir{" "}
              {userToToggleStatus?.status === "ACTIVE" ? "désactiver" : "réactiver"}{" "}
              l'utilisateur{" "}
              <span className="font-medium text-blue-600 dark:text-blue-300">
                {userToToggleStatus?.email || "Inconnu"}
              </span>
              ? Cette action{" "}
              {userToToggleStatus?.status === "ACTIVE"
                ? "empêchera l'utilisateur de se connecter et définira son rôle comme non défini."
                : "permettra à l'utilisateur de se reconnecter avec son rôle précédent."}
            </p>
            <DialogFooter className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={() => userToToggleStatus && handleToggleStatus(userToToggleStatus.id, userToToggleStatus.status)}
                className={`
                  ${userToToggleStatus?.status === "ACTIVE"
                    ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900"
                    : "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-900"
                  } text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200
                `}
              >
                {userToToggleStatus?.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={detailsDialogOpen}
          onOpenChange={(open) => {
            setDetailsDialogOpen(open);
            if (!open) {
              setSelectedUser(null);
              setUserDetails(null);
              setDetailsError(null);
              setDetailsLoading(false);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
            ref={detailsDialogRef}
            aria-labelledby="details-user-title"
            aria-describedby="details-user-description"
          >
            <VisuallyHidden>
              <h3 id="details-user-title">Détails de l'utilisateur</h3>
              <p id="details-user-description">
                Informations détaillées sur les commandes et demandes de l'utilisateur.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setDetailsDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Détails de l'Utilisateur: {selectedUser?.email || "Inconnu"}
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <span className="sr-only">{liveRegionMessage}</span>
              </div>
            ) : detailsError ? (
              <div
                className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600"
                role="alert"
                aria-live="assertive"
              >
                <h4 className="font-bold text-red-700 dark:text-red-200 title-hover">
                  Erreur
                </h4>
                <p className="text-red-600 dark:text-red-300 mt-2">{detailsError}</p>
                <p className="text-red-600 dark:text-red-300 mt-2">
                  Vérifiez que l'utilisateur existe et que le serveur est accessible.
                </p>
                <Button
                  onClick={() => selectedUser && fetchUserDetails(selectedUser.id)}
                  variant="outline"
                  className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  disabled={detailsLoading}
                  aria-label="Réessayer le chargement des détails de l'utilisateur"
                >
                  Réessayer
                </Button>
                <span className="sr-only">{liveRegionMessage}</span>
              </div>
            ) : !selectedUser ? (
              <div className="p-4 text-gray-600 dark:text-gray-300">
                Aucun utilisateur sélectionné.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Informations Générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>ID:</strong> {selectedUser?.id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Nom:</strong> {selectedUser?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Rôle:</strong> {getRoleDisplay(selectedUser)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Statut:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getUserStatusColor(
                            selectedUser.status
                          )}`}
                        >
                          {selectedUser.status === "ACTIVE" ? "Actif" : "Désactivé"}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Créé le:</strong>{" "}
                        {selectedUser ? formatDate(selectedUser.createdAt) : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedUser.role === "ADMIN" ||
                selectedUser.role === "GESTIONNAIRE" ||
                selectedUser.role === "MAGASINNIER" ? (
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                      Commandes Transmises
                    </h4>
                    {userDetails?.commandes?.length ? (
                      <div className="space-y-3 mt-2">
                        {userDetails.commandes.map((commande) => (
                          <div
                            key={commande.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                            role="region"
                            aria-label={`Commande ${commande.id}`}
                          >
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Commande:</strong> #{commande.id.slice(0, 8)}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Statut:</strong>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                  commande.statut
                                )}`}
                              >
                                {commande.statut}
                              </span>
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Produits:</strong>{" "}
                              {commande.produits
                                .map((p) => `${p.produit.nom} (${p.quantite})`)
                                .join(", ")}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Date:</strong> {formatDate(commande.date)}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Créée le:</strong> {formatDate(commande.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Aucune commande transmise.
                      </p>
                    )}
                  </div>
                ) : null}

                {selectedUser.role === "DEMANDEUR" && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                      Demandes Transmises
                    </h4>
                    {userDetails?.demandes?.length ? (
                      <div className="space-y-3 mt-2">
                        {userDetails.demandes.map((demande) => (
                          <div
                            key={demande.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                            role="region"
                            aria-label={`Demande ${demande.id}`}
                          >
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Demande:</strong> #{demande.id.slice(0, 8)}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Statut:</strong>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                  demande.statut
                                )}`}
                              >
                                {demande.statut}
                              </span>
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Produits:</strong>{" "}
                              {demande.produits
                                .map((p) => `${p.produit.nom} (${p.quantite})`)
                                .join(", ")}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Créée le:</strong> {formatDate(demande.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Aucune demande transmise.
                      </p>
                    )}
                  </div>
                )}

                {(selectedUser.role === "GESTIONNAIRE" ||
                  selectedUser.role === "MAGASINNIER") && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                      Demandes Acceptées
                    </h4>
                    {userDetails?.acceptedDemandes?.length ? (
                      <div className="space-y-3 mt-2">
                        {userDetails.acceptedDemandes.map((demande) => (
                          <div
                            key={demande.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                            role="region"
                            aria-label={`Demande acceptée ${demande.id}`}
                          >
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Demande:</strong> #{demande.id.slice(0, 8)}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Statut:</strong>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                  demande.statut
                                )}`}
                              >
                                {demande.statut}
                              </span>
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Produits:</strong>{" "}
                              {demande.produits
                                .map((p) => `${p.produit.nom} (${p.quantite})`)
                                .join(", ")}
                            </p>
                            <p className="text-gray-800 dark:text-gray-100">
                              <strong>Créée le:</strong> {formatDate(demande.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Aucune demande acceptée.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex justify-end mt-6">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  disabled={detailsLoading}
                >
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <style jsx>{`
        .title-hover {
          position: relative;
          transition: all 0.2s ease;
        }
        .title-hover:hover {
          transform: scale(1.05);
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
        .title-hover:hover::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(to right, #2563eb, #4f46e5);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}

export default DataUsers;