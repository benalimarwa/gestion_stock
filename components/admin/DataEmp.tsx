"use client";

import { useEffect, useState, useRef } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, Power, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@clerk/nextjs";

type Demandeur = {
  id: string;
  userId: string;
  user: { email: string; status: "ACTIVE" | "DEACTIVATED"; role: "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER" | "UNDEFINED" };
  type: "EMPLOYE" | "ENSEIGNANT";
  _count?: { demandes: number };
  createdAt: string;
  updatedAt: string;
};

export function DataEmp() {
  const [demandeurs, setDemandeurs] = useState<Demandeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", type: "EMPLOYE", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [demandeurToToggleStatus, setDemandeurToToggleStatus] = useState<Demandeur | null>(null);
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const addDialogRef = useRef<HTMLDivElement>(null);
  const statusDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchDemandeurs();
  }, []);

  useEffect(() => {
    if (isAddOpen && addDialogRef.current) {
      const firstFocusable = addDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
    if (isStatusOpen && statusDialogRef.current) {
      const firstFocusable = statusDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isAddOpen, isStatusOpen]);

  async function parseApiResponse(response: Response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Response is not JSON:", text);
      throw new Error("Réponse invalide du serveur");
    }
  }

  async function fetchDemandeurs() {
    try {
      setLoading(true);
      setError(null);
      setLiveRegionMessage("Chargement des demandeurs...");
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const response = await fetch("/api/admin/demandeur", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || "Erreur lors de la récupération");
      setDemandeurs(data);
      setLiveRegionMessage("Demandeurs chargés avec succès.");
    } catch (err) {
      console.error("Erreur dans fetchDemandeurs:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | string, name?: string) => {
    if (typeof e === "string") {
      setFormData((prev) => ({ ...prev, type: e as "EMPLOYE" | "ENSEIGNANT" }));
    } else {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }
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
    if (!["EMPLOYE", "ENSEIGNANT"].includes(formData.type)) {
      setFormError("Type invalide. Choisissez Employé ou Enseignant");
      setLiveRegionMessage("Erreur : type invalide.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setLiveRegionMessage("Création du demandeur...");

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const payload = {
        email: formData.email,
        type: formData.type,
        password: formData.password,
      };
      const response = await fetch("/api/admin/demandeur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du demandeur");
      }

      setFormData({ email: "", type: "EMPLOYE", password: "" });
      setIsAddOpen(false);
      await fetchDemandeurs();
      toast.success("Demandeur ajouté avec succès");
      setLiveRegionMessage("Demandeur ajouté avec succès.");
    } catch (err) {
      console.error("Erreur détaillée:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setFormError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStatusDialog = (
    demandeur: Demandeur,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setDemandeurToToggleStatus(demandeur);
    setIsStatusOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!demandeurToToggleStatus) return;

    try {
      setLiveRegionMessage(
        demandeurToToggleStatus.user.status === "ACTIVE"
          ? "Désactivation du demandeur..."
          : "Réactivation du demandeur..."
      );
      const token = await getToken();
      if (!token) {
        throw new Error("Non authentifié : aucun jeton d'authentification.");
      }
      const newStatus = demandeurToToggleStatus.user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
      const response = await fetch(`/api/admin/users/${demandeurToToggleStatus.userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(
          data.error || `Erreur lors de la ${newStatus === "DEACTIVATED" ? "désactivation" : "réactivation"} du demandeur`
        );
      }

      const updatedUser = await response.json();
      setDemandeurs((prev) =>
        prev.map((demandeur) =>
          demandeur.id === demandeurToToggleStatus.id
            ? { ...demandeur, user: { ...demandeur.user, status: newStatus, role: updatedUser.role || demandeur.user.role } }
            : demandeur
        )
      );
      toast.success(
        newStatus === "DEACTIVATED" ? "Demandeur désactivé avec succès" : "Demandeur réactivé avec succès"
      );
      setLiveRegionMessage(
        newStatus === "DEACTIVATED" ? "Demandeur désactivé avec succès." : "Demandeur réactivé avec succès."
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Erreur inconnue lors de la ${demandeurToToggleStatus?.user.status === "ACTIVE" ? "désactivation" : "réactivation"}`;
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setIsStatusOpen(false);
      setDemandeurToToggleStatus(null);
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    callback: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback(event);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
      case "DEACTIVATED":
        return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "GESTIONNAIRE":
        return "Gestionnaire";
      case "MAGASINNIER":
        return "Magasinier";
      case "DEMANDEUR":
        return "Demandeur";
      case "UNDEFINED":
        return "Non défini";
      default:
        return role;
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
        <h3 className="font-bold text-red-700 dark:text-red-200 title-hover">Erreur de Chargement</h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={fetchDemandeurs}
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
            Gestion des Demandeurs
          </h2>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
            aria-label="Ajouter un nouveau demandeur"
          >
            <PlusCircle className="h-5 w-5" />
            Ajouter un demandeur
          </Button>
        </div>
        <span className="sr-only">{liveRegionMessage}</span>

        <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-600 dark:text-gray-300">
              Liste des demandeurs (employés et enseignants).
            </TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
              <TableRow>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Utilisateur</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Type</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Rôle</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Demandes</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Créé le</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Mis à jour</TableHead>
                <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandeurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-gray-500 dark:text-gray-400">
                    Aucun demandeur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {demandeurs.map((demandeur, index) => (
                    <motion.tr
                      key={demandeur.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        {demandeur.user?.email || demandeur.userId || "Utilisateur inconnu"}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {demandeur.type === "EMPLOYE" ? "Employé" : "Enseignant"}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {getRoleDisplay(demandeur.user.role)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(demandeur.user.status)}`}>
                          {demandeur.user.status === "ACTIVE" ? "Actif" : "Désactivé"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {demandeur._count?.demandes || 0}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(demandeur.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(demandeur.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {demandeur.user.status === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700"
                            onClick={(e) => openStatusDialog(demandeur, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => openStatusDialog(demandeur, ev))}
                            aria-label={`Désactiver le demandeur ${demandeur.user?.email || demandeur.userId || "inconnu"}`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700"
                            onClick={(e) => openStatusDialog(demandeur, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => openStatusDialog(demandeur, ev))}
                            aria-label={`Réactiver le demandeur ${demandeur.user?.email || demandeur.userId || "inconnu"}`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
            <TableFooter className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableCell colSpan={7} className="text-gray-700 dark:text-gray-200 font-medium">
                  Total Demandeurs
                </TableCell>
                <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">
                  {demandeurs?.length || 0}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Add Demandeur Dialog */}
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open && lastFocusedElement.current) {
              lastFocusedElement.current.focus();
              lastFocusedElement.current = null;
            }
          }}
        >
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={addDialogRef}
            aria-labelledby="add-demandeur-title"
            aria-describedby="add-demandeur-description"
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Ajouter un nouveau demandeur
              </DialogTitle>
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                aria-label="Fermer le dialogue"
              >
                <X className="h-4 w-4" />
              </button>
              <VisuallyHidden>
                <DialogDescription id="add-demandeur-description">
                  Formulaire pour ajouter un nouveau demandeur avec email, mot de passe et type (Employé ou Enseignant).
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {formError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Entrez l'adresse email"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Entrez une adresse email valide (ex. nom@domaine.com)
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Mot de passe <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Entrez un mot de passe"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-semibold text-gray–

-gray-200">
                  Type de demandeur <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange(value, "type")}
                  name="type"
                >
                  <SelectTrigger
                    id="type"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 transition-all duration-200"
                  >
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100">
                    <SelectItem value="EMPLOYE" className="text-gray-800 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-700">
                      Employé
                    </SelectItem>
                    <SelectItem value="ENSEIGNANT" className="text-gray-800 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-700">
                      Enseignant
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choisissez entre Employé ou Enseignant
                </p>
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
                  {isSubmitting ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Status Toggle Dialog */}
        <Dialog
          open={isStatusOpen}
          onOpenChange={(open) => {
            setIsStatusOpen(open);
            if (!open) {
              setDemandeurToToggleStatus(null);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={statusDialogRef}
            aria-labelledby="status-demandeur-title"
            aria-describedby="status-demandeur-description"
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Confirmer la modification du statut
              </DialogTitle>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                aria-label="Fermer le dialogue"
              >
                <X className="h-4 w-4" />
              </button>
              <VisuallyHidden>
                <DialogDescription id="status-demandeur-description">
                  Confirmez la modification du statut du demandeur. Cette action peut empêcher ou permettre l'accès au compte.
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <p className="text-gray-700 dark:text-gray-200">
              Êtes-vous sûr de vouloir{" "}
              {demandeurToToggleStatus?.user.status === "ACTIVE" ? "désactiver" : "réactiver"}{" "}
              le demandeur{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-300">
                {demandeurToToggleStatus?.user?.email || demandeurToToggleStatus?.userId || "Inconnu"}
              </span>{" "}
              ? Cette action{" "}
              {demandeurToToggleStatus?.user.status === "ACTIVE"
                ? "empêchera le demandeur de se connecter."
                : "permettra au demandeur de se reconnecter avec son rôle précédent."}
            </p>
            <DialogFooter className="mt-4 flex justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleToggleStatus}
                className={`
                  ${demandeurToToggleStatus?.user.status === "ACTIVE"
                    ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800"
                    : "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800"
                  } text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200
                `}
              >
                {demandeurToToggleStatus?.user.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
              </Button>
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

export default DataEmp;