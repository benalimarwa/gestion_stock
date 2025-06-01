"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Eye, CheckCircle, XCircle, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
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

type Demande = {
  id: string;
  statut: "EN_ATTENTE" | "APPROUVEE" | "REJETEE";
  createdAt: string;
  dateApprouvee?: string | null;
  raisonRefus?: string | null;
  demandeur?: { user: { id: string; name: string; email: string } } | null;
  admin?: { user: { name: string; email: string } } | null;
  produits?: { produit: { id: string; nom: string; remarque?: string }; quantite: number }[];
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

const getStatusColor = (statut: Demande["statut"]) => {
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

export function DemandeEnAttente() {
  const { isLoaded, userId } = useAuth();
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

  const fetchDemandes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/demande/en-attente");
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
        throw new Error("Réponse invalide du serveur. Veuillez réessayer plus tard.");
      }

      if (!response.ok) {
        throw new Error((data as { error: string }).error || "Une erreur est survenue lors de la récupération des données.");
      }

      setDemandes(data as Demande[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inconnue est survenue.";
      setError(errorMessage);
      toast.error(errorMessage, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      setError("Accès non autorisé. Veuillez vous connecter.");
      setLoading(false);
      return;
    }

    fetchDemandes();
  }, [isLoaded, userId, fetchDemandes]);

  useEffect(() => {
    const result = demandes.filter((demande) => demande.statut === "EN_ATTENTE");
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

  const handleViewDetails = useCallback(async (demande: Demande, event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedDemande(demande);
    setDetailsLoading(true);
    setIsDetailsOpen(true);

    try {
      const response = await fetch(`/api/admin/demande/en-attente?id=${demande.id}`);
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
  }, []);

  const handleApproveDemande = async (demandeId: string) => {
    setProcessingDemandes((prev) => new Set(prev).add(demandeId));

    try {
      const demande = filteredDemandes.find(d => d.id === demandeId);
      if (!demande || !demande.demandeur?.user) {
        throw new Error("Demande ou demandeur non trouvé");
      }

      const demandeurEmail = demande.demandeur.user.email;
      if (!demandeurEmail) {
        throw new Error("Email du demandeur invalide ou manquant");
      }

      const response = await fetch(`/api/admin/demande/en-attente?id=${demandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "APPROUVEE",
          dateApprouvee: new Date().toISOString(),
        }),
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
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const emailResponse = await fetch("/api/emails/demandeur/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: demandeId,
          produits: (demande.produits || []).map(p => ({
            nom: p.produit.nom,
            quantite: p.quantite,
            remarque: p.produit.remarque,
          })),
          demandeurEmail,
          statut: "APPROUVEE",
        }),
      });

      const emailText = await emailResponse.text();
      if (!emailResponse.ok) {
        let emailError = emailText;
        try {
          const emailData = JSON.parse(emailText);
          emailError = emailData.error || emailData.message || "Erreur inconnue";
        } catch {
          console.warn("Email response is not JSON:", emailText);
        }
        toast.warning(`Demande approuvée, mais échec de l'envoi de l'email: ${emailError}`, {
          style: { background: "#7F1D1D", color: "#FEE2E2" },
        });
      } else {
        toast.success("Notification envoyée au demandeur", {
          style: { background: "#1E3A8A", color: "#E0E7FF" },
        });
      }
      // Step 3: Log the DEMANDEACCEPT action in the Registre
    console.log("POST /api/registre");
    const registreResponse = await fetch("/api/registre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: "DEMANDEACCEPT",
        description: `Demande ${demandeId} approuvée`,
      }),
    });

    const registreText = await registreResponse.text();
    let registreData;
    try {
      registreData = registreText ? JSON.parse(registreText) : {};
    } catch {
      console.error("Registre response is not JSON:", registreText);
      throw new Error("Réponse invalide du serveur pour le registre");
    }

    if (!registreResponse.ok) {
      console.error("POST /api/registre error response:", registreData);
      throw new Error(registreData.error || `Erreur HTTP: ${registreResponse.status}`);
    }
      if (selectedDemande && selectedDemande.id === demandeId) {
        setSelectedDemande(data as Demande);
      }

      await fetchDemandes();
      setShowAcceptAlert({ show: true, demandeId });
      setTimeout(() => setShowAcceptAlert({ show: false, demandeId: null }), 3000);
      toast.success("Demande approuvée avec succès", {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Échec de l'approbation: ${errorMessage}`, {
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

  const handleRejectDemande = async () => {
    if (!rejectingDemandeId || !rejectReason.trim()) {
      toast.error("Veuillez fournir un motif de rejet", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      return;
    }

    setProcessingDemandes((prev) => new Set(prev).add(rejectingDemandeId));

    try {
      const demande = filteredDemandes.find(d => d.id === rejectingDemandeId);
      if (!demande || !demande.demandeur?.user) {
        throw new Error("Demande ou demandeur non trouvé");
      }

      const demandeurEmail = demande.demandeur.user.email;
      if (!demandeurEmail) {
        throw new Error("Email du demandeur invalide ou manquant");
      }

      const response = await fetch(`/api/admin/demande/en-attente?id=${rejectingDemandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "REJETEE",
          raisonRefus: rejectReason.trim(),
        }),
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
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const emailResponse = await fetch("/api/emails/demandeur/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: rejectingDemandeId,
          produits: (demande.produits || []).map(p => ({
            nom: p.produit.nom,
            quantite: p.quantite,
            remarque: p.produit.remarque,
          })),
          demandeurEmail,
          statut: "REJETEE",
          raisonRefus: rejectReason.trim(),
        }),
      });

      const emailText = await emailResponse.text();
      if (!emailResponse.ok) {
        let emailError = emailText;
        try {
          const emailData = JSON.parse(emailText);
          emailError = emailData.error || emailData.message || "Erreur inconnue";
        } catch {
          console.warn("Email response is not JSON:", emailText);
        }
        toast.warning(`Demande rejetée, mais échec de l'envoi de l'email: ${emailError}`, {
          style: { background: "#7F1D1D", color: "#FEE2E2" },
        });
      } else {
        toast.success("Notification envoyée au demandeur", {
          style: { background: "#1E3A8A", color: "#E0E7FF" },
        });
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

  const openRejectDialog = (demandeId: string, event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setRejectingDemandeId(demandeId);
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, callback: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void) => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        callback(event);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-4">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg shadow-md space-y-4">
        <h3 className="font-bold text-red-700 dark:text-red-200 title-hover">Erreur de Chargement</h3>
        <p>{error}</p>
        <Button
          onClick={() => { setError(null); fetchDemandes(); }}
          variant="outline"
          className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
          aria-label="Réessayer de charger les demandes"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
            Demandes en Attente
          </h2>
        </div>

        <AnimatePresence>
          {showAcceptAlert.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Alert className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-600">
                <AlertTitle>Demande Approuvée</AlertTitle>
                <AlertDescription>
                  La demande #{showAcceptAlert.demandeId?.slice(0, 8)} a été approuvée avec succès.
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
            Aucune demande en attente trouvée.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des demandes en attente
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
                        {demande.demandeur?.user?.name || "Inconnu"} (
                        {demande.demandeur?.user?.email || "Email indisponible"})
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(demande.statut)}`}
                        >
                          {demande.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {Array.isArray(demande.produits) && demande.produits.length > 0
                          ? demande.produits
                              .map((p) => `${p.produit.nom} (${p.produit.remarque || "Aucune remarque"})`)
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
                            aria-label={`Voir les détails de la demande ${demande.id.slice(0, 8)}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 ${
                              processingDemandes.has(demande.id) ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            onClick={() => handleApproveDemande(demande.id)}
                            disabled={processingDemandes.has(demande.id)}
                            aria-label={`Approuver la demande ${demande.id.slice(0, 8)}`}
                          >
                            {processingDemandes.has(demande.id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 dark:border-green-300 border-t-transparent" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
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
                            aria-label={`Rejeter la demande ${demande.id.slice(0, 8)}`}
                          >
                            {processingDemandes.has(demande.id) ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 dark:border-red-300 border-t-transparent" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
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
            className="sm:max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
            ref={detailsDialogRef}
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Détails de la demande #{selectedDemande?.id.slice(0, 8) || "Inconnu"}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Informations détaillées sur la demande sélectionnée.
              </DialogDescription>
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
                  onClick={(e) => selectedDemande && handleViewDetails(selectedDemande, e as React.MouseEvent<HTMLButtonElement>)}
                  variant="outline"
                  className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  disabled={!selectedDemande}
                  aria-label="Réessayer de charger les détails de la demande"
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
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Informations Générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
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
                        {selectedDemande.demandeur?.user?.name || "Inconnu"} (
                        {selectedDemande.demandeur?.user?.email || "Email indisponible"})
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Créée le:</strong> {formatDate(selectedDemande.createdAt)}
                      </p>
                    </div>
                    {selectedDemande.statut === "APPROUVEE" && selectedDemande.dateApprouvee && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Date d'approbation:</strong>{" "}
                          {formatDate(selectedDemande.dateApprouvee)}
                        </p>
                      </div>
                    )}
                    {selectedDemande.statut === "APPROUVEE" && selectedDemande.admin && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Approuvée par:</strong>{" "}
                          {selectedDemande.admin.user?.name || "Inconnu"} (
                          {selectedDemande.admin.user?.email || "Email indisponible"})
                        </p>
                      </div>
                    )}
                    {selectedDemande.statut === "REJETEE" && selectedDemande.raisonRefus && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Motif du refus:</strong> {selectedDemande.raisonRefus}
                        </p>
                      </div>
                    )}
                    {selectedDemande.statut === "REJETEE" && selectedDemande.admin && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Rejetée par:</strong>{" "}
                          {selectedDemande.admin.user?.name || "Inconnu"} (
                          {selectedDemande.admin.user?.email || "Email indisponible"})
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Détails des Produits
                  </h4>
                  <div className="mt-3">
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
                    <ul className="mt-3 space-y-2">
                      {Array.isArray(selectedDemande.produits) && selectedDemande.produits.length > 0 ? (
                        selectedDemande.produits.map((p, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-600 rounded"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-medium">
                              {p.produit.nom}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                              Quantité: {p.quantite} ({p.produit.remarque || "Aucune remarque"})
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-600 dark:text-gray-300">
                          Aucun produit
                        </li>
                      )}
                    </ul>
                    <p className="text-gray-600 dark:text-gray-300 mt-3">
                      Demandeur: {selectedDemande.demandeur?.user?.name || "Inconnu"} (
                      {selectedDemande.demandeur?.user?.email || "Email indisponible"})
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      Créée le: {formatDate(selectedDemande.createdAt)}
                    </p>
                    {selectedDemande.statut === "EN_ATTENTE" && (
                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={() => handleApproveDemande(selectedDemande.id)}
                          disabled={processingDemandes.has(selectedDemande.id)}
                          className={`bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 text-white hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingDemandes.has(selectedDemande.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Approuver la demande ${selectedDemande.id.slice(0, 8)}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approuver
                        </Button>
                        <Button
                          onClick={(e) => openRejectDialog(selectedDemande.id, e)}
                          disabled={processingDemandes.has(selectedDemande.id)}
                          className={`bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingDemandes.has(selectedDemande.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Rejeter la demande ${selectedDemande.id.slice(0, 8)}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                      </div>
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
                  aria-label="Fermer le dialogue des détails"
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
            <DialogHeader>
              <DialogTitle id="reject-demande-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Rejeter la Demande
              </DialogTitle>
              <DialogDescription id="reject-demande-description" className="text-gray-600 dark:text-gray-300">
                Veuillez entrer le motif du rejet pour la demande #{rejectingDemandeId?.slice(0, 8) || "N/A"}.
              </DialogDescription>
            </DialogHeader>
            <button
              onClick={() => setIsRejectDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue de rejet"
            >
              <X className="h-4 w-4" />
            </button>
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
                  aria-label="Annuler le rejet de la demande"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleRejectDemande}
                className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                disabled={!rejectReason.trim()}
                aria-label="Confirmer le rejet de la demande"
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

export default DemandeEnAttente;