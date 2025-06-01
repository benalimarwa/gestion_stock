"use client";

import { useEffect, useState, useRef } from "react";
import { Eye, Check, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
import { Skeleton } from "@/components/ui/skeleton";

// Enum for valid demande statuses
const VALID_STATUSES = ["EN_ATTENTE", "APPROUVEE", "REJETEE"] as const;
type DemandeStatus = typeof VALID_STATUSES[number];

type Demande = {
  id: string;
  statut: DemandeStatus;
  createdAt: string;
  demandeur: { user: { name: string; email: string } };
  details?: { nom: string; description: string }[];
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date non disponible";
  }
};

const getStatusColor = (statut: string) => {
  switch (statut) {
    case "EN_ATTENTE":
      return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
    case "APPROUVEE":
      return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
    case "REJETEE":
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
    default:
      return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
  }
};

export function DemandeAcceptee() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [filteredDemandes, setFilteredDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [processingDemandes, setProcessingDemandes] = useState<Set<string>>(new Set());
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingDemandeId, setRejectingDemandeId] = useState<string | null>(null);
  const [showAcceptAlert, setShowAcceptAlert] = useState<{ show: boolean; demandeId: string | null }>({ show: false, demandeId: null });
  const [showRejectAlert, setShowRejectAlert] = useState<{ show: boolean; demandeId: string | null }>({ show: false, demandeId: null });
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const rejectDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchDemandes();
  }, []);

  useEffect(() => {
    const result = demandes.filter((demande) => demande.statut === "APPROUVEE" || demande.statut === "EN_ATTENTE");
    setFilteredDemandes(result);
  }, [demandes]);

  useEffect(() => {
    if (isDetailsOpen && detailsDialogRef.current) {
      const firstFocusable = detailsDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
    if (isRejectDialogOpen && rejectDialogRef.current) {
      const firstFocusable = rejectDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isDetailsOpen, isRejectDialogOpen]);

  async function fetchDemandes() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/demande/acceptee", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const text = await response.text();

      if (!text) {
        console.warn("Empty API response");
        setDemandes([]);
        return;
      }

      let data: Demande[] | { error: string };
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || `Erreur HTTP: ${response.status}`);
      }

      setDemandes(data as Demande[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast.error(errorMessage, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setLoading(false);
    }
  }

  const handleViewDetails = async (
    demande: Demande,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedDemande(demande);
    setDetailsLoading(true);
    setIsDetailsOpen(true);

    try {
      const response = await fetch(`/api/admin/demande/acceptee?id=${demande.id}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const text = await response.text();

      if (!text) {
        throw new Error("Réponse vide de l'API");
      }

      let data: Demande | { error: string };
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || `Erreur HTTP: ${response.status}`);
      }

      setSelectedDemande(data as Demande);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec du chargement des détails: ${errorMessage}`, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      setSelectedDemande(demande);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAccept = async (demandeId: string) => {
    setProcessingDemandes((prev) => new Set(prev).add(demandeId));

    try {
      const response = await fetch(`/api/admin/demande/acceptee?id=${demandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "APPROUVEE" }),
        credentials: "include",
      });

      const text = await response.text();
      let data: Demande | { error: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || `Erreur HTTP: ${response.status}`);
      }

      if (selectedDemande && selectedDemande.id === demandeId) {
        setSelectedDemande(data as Demande);
      }

      await fetchDemandes();
      setShowAcceptAlert({ show: true, demandeId });
      setTimeout(() => setShowAcceptAlert({ show: false, demandeId: null }), 3000);
      toast.success("Demande acceptée avec succès", {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec de l'acceptation: ${errorMessage}`, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setProcessingDemandes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(demandeId);
        return newSet;
      });
    }
  };

  const handleReject = async () => {
    if (!rejectingDemandeId || !rejectReason.trim()) {
      toast.error("Veuillez fournir un motif de rejet", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      return;
    }

    setProcessingDemandes((prev) => new Set(prev).add(rejectingDemandeId));

    try {
      const response = await fetch(`/api/admin/demande/acceptee?id=${rejectingDemandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "REJETEE", rejectionReason: rejectReason.trim() }),
        credentials: "include",
      });

      const text = await response.text();
      let data: Demande | { error: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || `Erreur HTTP: ${response.status}`);
      }

      if (selectedDemande && selectedDemande.id === rejectingDemandeId) {
        setSelectedDemande(data as Demande);
      }

      await fetchDemandes();
      setIsRejectDialogOpen(false);
      setRejectReason("");
      setRejectingDemandeId(null);
      setShowRejectAlert({ show: true, demandeId: rejectingDemandeId });
      setTimeout(() => setShowRejectAlert({ show: false, demandeId: null }), 3000);
      toast.success("Demande rejetée avec succès", {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec du rejet: ${errorMessage}`, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setProcessingDemandes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(rejectingDemandeId!);
        return newSet;
      });
    }
  };

  const handleRollbackDemande = async (demandeId: string) => {
    setProcessingDemandes((prev) => new Set(prev).add(demandeId));

    try {
      const response = await fetch(`/api/admin/demande/acceptee?id=${demandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "EN_ATTENTE" }),
        credentials: "include",
      });

      const text = await response.text();
      let data: Demande | { error: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || `Erreur HTTP: ${response.status}`);
      }

      if (selectedDemande && selectedDemande.id === demandeId) {
        setSelectedDemande(data as Demande);
      }

      await fetchDemandes();
      toast.success("Approbation de la demande annulée avec succès (statut: EN_ATTENTE)", {
        style: { background: "#7E22CE", color: "#EDE9FE" },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec de l'annulation: ${errorMessage}`, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setProcessingDemandes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(demandeId);
        return newSet;
      });
    }
  };

  const openRejectDialog = (
    demandeId: string,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setRejectingDemandeId(demandeId);
    setRejectReason("");
    setIsRejectDialogOpen(true);
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

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <div className="mt-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg mt-2" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg shadow-md">
        <h3 className="font-bold text-red-700 dark:text-red-200 title-hover">Erreur de Chargement</h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={() => { setError(null); fetchDemandes(); }}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
          aria-label="Réessayer de charger les demandes"
        >
          Réessayer
        </Button>
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
            Demandes Acceptées et En Attente
          </h2>
        </div>

        <AnimatePresence>
          {showAcceptAlert.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Alert className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-600">
                <AlertTitle>Demande Acceptée</AlertTitle>
                <AlertDescription>
                  La demande #{showAcceptAlert.demandeId?.slice(0, 8)} a été acceptée avec succès.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          {showRejectAlert.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Alert className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-600">
                <AlertTitle>Demande Rejetée</AlertTitle>
                <AlertDescription>
                  La demande #{showRejectAlert.demandeId?.slice(0, 8)} a été rejetée avec succès.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredDemandes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucune demande trouvée.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des demandes acceptées et en attente
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">ID Demande</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Demandeur</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Produits</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date</TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredDemandes.map((demande, index) => (
                    <motion.tr
                      key={demande.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        #{demande.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {demande.demandeur.user.name || "Inconnu"} (
                        {demande.demandeur.user.email || "Email indisponible"})
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(demande.statut)}`}
                        >
                          {demande.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {Array.isArray(demande.details) && demande.details.length > 0
                          ? demande.details
                              .map((p) => `${p.nom} (${p.description})`)
                              .join(", ")
                          : "Aucun produit"}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(demande.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={(e) => handleViewDetails(demande, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => handleViewDetails(demande, ev))}
                            disabled={detailsLoading}
                            aria-label={`Voir les détails de la demande ${demande.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {demande.statut === "EN_ATTENTE" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 ${
                                  processingDemandes.has(demande.id) ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={() => handleAccept(demande.id)}
                                disabled={processingDemandes.has(demande.id)}
                                aria-label={`Accepter la demande ${demande.id}`}
                              >
                                {processingDemandes.has(demande.id) ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 dark:border-green-300 border-t-transparent" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 ${
                                  processingDemandes.has(demande.id) ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={(e) => openRejectDialog(demande.id, e)}
                                onKeyDown={(e) => handleKeyDown(e, (ev) => openRejectDialog(demande.id, ev))}
                                disabled={processingDemandes.has(demande.id)}
                                aria-label={`Rejeter la demande ${demande.id}`}
                              >
                                {processingDemandes.has(demande.id) ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 dark:border-red-300 border-t-transparent" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                          {demande.statut === "APPROUVEE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 ${
                                processingDemandes.has(demande.id) ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              onClick={() => handleRollbackDemande(demande.id)}
                              disabled={processingDemandes.has(demande.id)}
                              aria-label={`Annuler l'approbation de la demande ${demande.id}`}
                            >
                              <XCircle className="h-4 w-4" />
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
                  <TableCell colSpan={6} className="text-gray-700 dark:text-gray-200 font-medium">
                    Total: {filteredDemandes.length} demandes
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) {
              setSelectedDemande(null);
              setDetailsLoading(false);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
            ref={detailsDialogRef}
            aria-labelledby="details-demande-title"
            aria-describedby="details-demande-description"
          >
            <VisuallyHidden>
              <h3 id="details-demande-title">Détails de la demande</h3>
              <p id="details-demande-description">
                Informations détaillées sur la demande sélectionnée.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer les détails de la demande"
            >
              
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Détails de la demande #{selectedDemande?.id.slice(0, 8) || "Inconnu"}
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ) : !selectedDemande ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600">
                <p className="text-red-600 dark:text-red-300">
                  Erreur lors du chargement des détails.
                </p>
                <Button
                  onClick={() => selectedDemande && handleViewDetails(selectedDemande, { currentTarget: document.activeElement } as any)}
                  variant="outline"
                  className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  disabled={!selectedDemande}
                  aria-label="Réessayer de charger les détails"
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Informations Générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>ID:</strong> {selectedDemande.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Statut:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            selectedDemande.statut
                          )}`}
                        >
                          {selectedDemande.statut}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Demandeur:</strong>{" "}
                        {selectedDemande.demandeur.user.name || "Inconnu"} (
                        {selectedDemande.demandeur.user.email || "Email indisponible"})
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Créée le:</strong> {formatDate(selectedDemande.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Détails des Produits
                  </h4>
                  <div className="mt-2">
                    <p className="text-gray-800 dark:text-gray-100">
                      <strong>Demande:</strong> #{selectedDemande.id.slice(0, 8)}
                    </p>
                    <p className="text-gray-800 dark:text-gray-100 mt-1">
                      <strong>Statut:</strong>{" "}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          selectedDemande.statut
                        )}`}
                      >
                        {selectedDemande.statut}
                      </span>
                    </p>
                    <ul className="mt-2 space-y-2">
                      {Array.isArray(selectedDemande.details) && selectedDemande.details.length > 0 ? (
                        selectedDemande.details.map((p, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-600 rounded"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-medium">
                              {p.nom}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                              {p.description}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-600 dark:text-gray-300">
                          Aucun produit
                        </li>
                      )}
                    </ul>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      Demandeur: {selectedDemande.demandeur.user.name || "Inconnu"} (
                      {selectedDemande.demandeur.user.email || "Email indisponible"})
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      Créée le: {formatDate(selectedDemande.createdAt)}
                    </p>
                    {selectedDemande.statut === "EN_ATTENTE" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleAccept(selectedDemande.id)}
                          disabled={processingDemandes.has(selectedDemande.id)}
                          className={`bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 text-white hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingDemandes.has(selectedDemande.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Accepter la demande ${selectedDemande.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accepter
                        </Button>
                        <Button
                          onClick={(e) => openRejectDialog(selectedDemande.id, e)}
                          disabled={processingDemandes.has(selectedDemande.id)}
                          className={`bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingDemandes.has(selectedDemande.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Rejeter la demande ${selectedDemande.id}`}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {selectedDemande.statut === "APPROUVEE" && (
                      <Button
                        onClick={() => handleRollbackDemande(selectedDemande.id)}
                        disabled={processingDemandes.has(selectedDemande.id)}
                        className={`mt-4 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                          processingDemandes.has(selectedDemande.id) ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        aria-label={`Annuler l'approbation de la demande ${selectedDemande.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler l'Approbation
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            <DialogFooter className="flex justify-end mt-6">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  aria-label="Fermer les détails"
                >
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isRejectDialogOpen}
          onOpenChange={(open) => {
            setIsRejectDialogOpen(open);
            if (!open) {
              setRejectReason("");
              setRejectingDemandeId(null);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={rejectDialogRef}
            aria-labelledby="reject-demande-title"
            aria-describedby="reject-demande-description"
          >
            <VisuallyHidden>
              <h3 id="reject-demande-title">Rejeter la demande</h3>
              <p id="reject-demande-description">
                Entrez le motif du rejet pour la demande sélectionnée.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setIsRejectDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue de rejet"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Rejeter la Demande
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Veuillez entrer le motif du rejet pour la demande #{rejectingDemandeId?.slice(0, 8) || "N/A"}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Entrez le motif du rejet"
                className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                aria-label="Motif du rejet"
              />
            </div>
            <DialogFooter className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  aria-label="Annuler le rejet"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleReject}
                className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                disabled={!rejectReason.trim()}
                aria-label="Confirmer le rejet"
              >
                Confirmer
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

export default DemandeAcceptee;