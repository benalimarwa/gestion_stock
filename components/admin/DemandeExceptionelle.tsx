"use client";

import { useEffect, useState, useRef } from "react";
import { Eye, Check, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { StatutDemandeExceptionnelle } from "@prisma/client";

type ExceptionalProduct = {
  id: string;
  name: string;
  marque: string | null;
  description: string | null;
};

type DemandeProduitExceptionnel = {
  id: string;
  produitExceptionnelId: string;
  produitExceptionnel: ExceptionalProduct;
  quantite: number;
};

type ExceptionalRequest = {
  id: string;
  produitsExceptionnels: DemandeProduitExceptionnel[];
  statut: StatutDemandeExceptionnelle;
  createdAt: string;
  demandeurId: string;
  dateApprouvee: string | null;
  raisonRefus: string | null;
};

const API_BASE_PATH = "/api/admin/demandes/exceptionelle";

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

const formatStatus = (status: StatutDemandeExceptionnelle): string => {
  switch (status) {
    case StatutDemandeExceptionnelle.EN_ATTENTE:
      return "En attente";
    case StatutDemandeExceptionnelle.ACCEPTEE:
      return "Acceptée";
    case StatutDemandeExceptionnelle.COMMANDEE:
      return "Commandée";
    case StatutDemandeExceptionnelle.LIVREE:
      return "Livrée";
    case StatutDemandeExceptionnelle.REJETEE:
      return "Rejetée";
    default:
      return status;
  }
};

const getStatusColor = (statut: StatutDemandeExceptionnelle) => {
  switch (statut) {
    case StatutDemandeExceptionnelle.EN_ATTENTE:
      return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
    case StatutDemandeExceptionnelle.ACCEPTEE:
      return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
    case StatutDemandeExceptionnelle.COMMANDEE:
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
    case StatutDemandeExceptionnelle.LIVREE:
      return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
    case StatutDemandeExceptionnelle.REJETEE:
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
    default:
      return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
  }
};

export function PendingExceptionalRequestsTable() {
  const [exceptionalRequests, setExceptionalRequests] = useState<ExceptionalRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ExceptionalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ExceptionalRequest | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [showAcceptAlert, setShowAcceptAlert] = useState<{ show: boolean; requestId: string | null }>({ show: false, requestId: null });
  const [showRejectAlert, setShowRejectAlert] = useState<{ show: boolean; requestId: string | null }>({ show: false, requestId: null });
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const rejectDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const result = exceptionalRequests.filter((request) => request.statut === StatutDemandeExceptionnelle.EN_ATTENTE);
    setFilteredRequests(result);
  }, [exceptionalRequests]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching data from ${API_BASE_PATH}`);
      const response = await fetch(API_BASE_PATH, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      console.log("GET Response:", {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: text.slice(0, 100),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Endpoint non trouvé (${API_BASE_PATH}). Vérifiez que l'API est correctement configurée.`
          );
        }
        if (!text) {
          throw new Error(`Réponse vide du serveur (status ${response.status})`);
        }
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error(`Réponse HTML reçue (status ${response.status}): ${text.slice(0, 100)}...`);
        }
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Erreur lors du chargement des demandes exceptionnelles");
        } catch {
          throw new Error(`Réponse JSON invalide (status ${response.status}): ${text.slice(0, 100)}...`);
        }
      }

      const data: ExceptionalRequest[] = JSON.parse(text);
      if (!Array.isArray(data)) {
        console.error("API returned non-array for exceptionalRequests:", data);
        throw new Error("Données des demandes invalides");
      }

      setExceptionalRequests(data);
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error);
      setError(error.message);
      toast.error(error.message || "Erreur lors du chargement des données", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      setExceptionalRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (
  request: ExceptionalRequest,
  event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
) => {
  lastFocusedElement.current = event.currentTarget as HTMLElement;
  setSelectedRequest(request);
  setDetailsLoading(true);
  setIsDetailsOpen(true);

  try {
    const response = await fetch(`${API_BASE_PATH}/${request.id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const text = await response.text();
    console.log("GET Details Response:", {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      body: text.slice(0, 100),
    });

    if (!response.ok) {
      let errorMessage = "Erreur lors du chargement des détails";
      if (response.status === 404) {
        errorMessage = `Demande exceptionnelle non trouvée (ID: ${request.id})`;
      } else if (!text) {
        errorMessage = `Réponse vide du serveur (status ${response.status})`;
      } else if (text.startsWith("<!DOCTYPE")) {
        errorMessage = `Réponse HTML reçue (status ${response.status}): ${text.slice(0, 100)}...`;
      } else {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Réponse JSON invalide (status ${response.status}): ${text.slice(0, 100)}...`;
        }
      }
      throw new Error(errorMessage);
    }

    const data: ExceptionalRequest = JSON.parse(text);
    setSelectedRequest(data);
  } catch (error: any) {
    console.error("Erreur lors du chargement des détails:", error);
    toast.error(error.message || "Erreur lors du chargement des détails", {
      style: { background: "#7F1D1D", color: "#FEE2E2" },
    });
    setSelectedRequest(request); // Fallback to the original request
  } finally {
    setDetailsLoading(false);
  }
};

  const handleStatusUpdate = async (requestId: string, status: "ACCEPTEE" | "PRISE" | "REJETEE", raisonRefus?: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));

    try {
    
    

      const response = await fetch(`${API_BASE_PATH}/${requestId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
   
      });

      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      console.log("PATCH Status Update Response:", {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: text,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Endpoint de mise à jour non trouvé (${API_BASE_PATH}/${requestId}/accept). Vérifiez la configuration de l'API.`
          );
        }
        if (!text) {
          throw new Error(`Réponse vide du serveur (status ${response.status})`);
        }
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error(`Réponse HTML reçue (status ${response.status}): ${text.slice(0, 100)}...`);
        }
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Erreur lors de la mise à jour de la demande");
        } catch {
          throw new Error(`Réponse JSON invalide (status ${response.status}): ${text}`);
        }
      }

      const updatedRequest: ExceptionalRequest = JSON.parse(text);
      setExceptionalRequests((prev) =>
        prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req))
      );
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(updatedRequest);
      }
      const alertSetter = status === "REJETEE" ? setShowRejectAlert : setShowAcceptAlert;
      alertSetter({ show: true, requestId });
      setTimeout(() => alertSetter({ show: false, requestId: null }), 3000);
      toast.success(`Demande exceptionnelle ${status === "REJETEE" ? "rejetée" : status === "ACCEPTEE" ? "acceptée" : "prise"} avec succès`, {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error(error.message || "Erreur lors de la mise à jour de la demande", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectingRequestId || !rejectReason.trim()) {
      toast.error("Veuillez fournir un motif de rejet", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      return;
    }

    console.log(`Initiating rejection for request ${rejectingRequestId} with reason: ${rejectReason.trim()}`);
    await handleStatusUpdate(rejectingRequestId, "REJETEE", rejectReason.trim());
    setIsRejectDialogOpen(false);
    setRejectReason("");
    setRejectingRequestId(null);
  };

  const openRejectDialog = (
    requestId: string,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setRejectingRequestId(requestId);
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
          onClick={() => { setError(null); fetchData(); }}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
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
            Demandes Exceptionnelles
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
                <AlertTitle>Demande Traitée</AlertTitle>
                <AlertDescription>
                  La demande #{showAcceptAlert.requestId?.slice(0, 8)} a été traitée avec succès.
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
                  La demande #{showRejectAlert.requestId?.slice(0, 8)} a été rejetée avec succès.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucune demande exceptionnelle trouvée.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des demandes exceptionnelles en attente
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">ID Demande</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Articles</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date</TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        #{request.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {request.produitsExceptionnels.map((produit) => (
                          <div key={produit.id} className="text-blue-600 dark:text-blue-300">
                            {produit.produitExceptionnel.name} ({produit.quantite})
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.statut)}`}
                        >
                          {formatStatus(request.statut)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(request.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={(e) => handleViewDetails(request, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => handleViewDetails(request, ev))}
                            disabled={detailsLoading}
                            aria-label={`Voir les détails de la demande ${request.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.statut === StatutDemandeExceptionnelle.EN_ATTENTE && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 w-8 p-0 border-green-200 dark:border-green-600 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 ${
                                  processingRequests.has(request.id) ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={() => handleStatusUpdate(request.id, "ACCEPTEE")}
                                disabled={processingRequests.has(request.id)}
                                aria-label={`Accepter la demande ${request.id}`}
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 ${
                                  processingRequests.has(request.id) ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                                onClick={(e) => openRejectDialog(request.id, e)}
                                onKeyDown={(e) => handleKeyDown(e, (ev) => openRejectDialog(request.id, ev))}
                                disabled={processingRequests.has(request.id)}
                                aria-label={`Rejeter la demande ${request.id}`}
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-gray-50 dark:bg-gray-700">
                <TableRow>
                  <TableCell colSpan={4} className="text-gray-700 dark:text-gray-200 font-medium">
                    Total Demandes Exceptionnelles
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">
                    {filteredRequests.length}
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
              setSelectedRequest(null);
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
            aria-labelledby="details-request-title"
            aria-describedby="details-request-description"
          >
            <VisuallyHidden>
              <h3 id="details-request-title">Détails de la demande exceptionnelle</h3>
              <p id="details-request-description">
                Informations détaillées sur la demande exceptionnelle sélectionnée.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
             
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Détails de la demande #{selectedRequest?.id.slice(0, 8) || "Inconnu"}
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ) : !selectedRequest ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600">
                <p className="text-red-600 dark:text-red-300">
                  Erreur lors du chargement des détails.
                </p>
                <Button
                  onClick={() => selectedRequest && handleViewDetails(selectedRequest, { currentTarget: document.activeElement } as any)}
                  variant="outline"
                  className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  disabled={!selectedRequest}
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
                        <strong>ID:</strong> {selectedRequest.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Statut:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            selectedRequest.statut
                          )}`}
                        >
                          {formatStatus(selectedRequest.statut)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Demandeur ID:</strong> {selectedRequest.demandeurId}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-800 dark:text-gray-100">
                        <strong>Créée le:</strong> {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                    {selectedRequest.dateApprouvee && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Approuvée le:</strong> {formatDate(selectedRequest.dateApprouvee)}
                        </p>
                      </div>
                    )}
                    {selectedRequest.raisonRefus && (
                      <div>
                        <p className="text-gray-800 dark:text-gray-100">
                          <strong>Raison du refus:</strong> {selectedRequest.raisonRefus}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 title-hover">
                    Détails des Produits
                  </h4>
                  <div className="mt-2">
                    <p className="text-gray-800 dark:text-gray-100">
                      <strong>Demande:</strong> #{selectedRequest.id.slice(0, 8)}
                    </p>
                    <p className="text-gray-800 dark:text-gray-100 mt-1">
                      <strong>Statut:</strong>{" "}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          selectedRequest.statut
                        )}`}
                      >
                        {formatStatus(selectedRequest.statut)}
                      </span>
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedRequest.produitsExceptionnels.length > 0 ? (
                        selectedRequest.produitsExceptionnels.map((produit, index) => (
                          <li
                            key={produit.id}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-600 rounded"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-medium">
                              {produit.produitExceptionnel.name} (Quantité: {produit.quantite})
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                              {produit.produitExceptionnel.marque || "Sans marque"} -{" "}
                              {produit.produitExceptionnel.description || "Sans description"}
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
                      Créée le: {formatDate(selectedRequest.createdAt)}
                    </p>
                    {selectedRequest.statut === StatutDemandeExceptionnelle.EN_ATTENTE && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleStatusUpdate(selectedRequest.id, "ACCEPTEE")}
                          disabled={processingRequests.has(selectedRequest.id)}
                          className={`bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-800 text-white hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingRequests.has(selectedRequest.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Accepter la demande ${selectedRequest.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accepter
                        </Button>
                        <Button
                          onClick={(e) => openRejectDialog(selectedRequest.id, e)}
                          disabled={processingRequests.has(selectedRequest.id)}
                          className={`bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                            processingRequests.has(selectedRequest.id) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          aria-label={`Rejeter la demande ${selectedRequest.id}`}
                        >
                          <X className="h-4 w-4 mr-2" />
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
              setRejectingRequestId(null);
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
            aria-labelledby="reject-request-title"
            aria-describedby="reject-request-description"
          >
            <VisuallyHidden>
              <h3 id="reject-request-title">Rejeter la demande exceptionnelle</h3>
              <p id="reject-request-description">
                Entrez le motif du rejet pour la demande exceptionnelle sélectionnée.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setIsRejectDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Rejeter la Demande
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Veuillez entrer le motif du rejet pour la demande #{rejectingRequestId?.slice(0, 8) || "N/A"}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Entrez le motif du rejet"
                className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
              />
            </div>
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
                onClick={handleRejectRequest}
                className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                disabled={!rejectReason.trim()}
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

export default PendingExceptionalRequestsTable;