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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Define the Commande type
type Commande = {
  id: string;
  statut: string;
  date: string;
  createdAt: string;
  produits: { produit: { nom: string }; quantite: number }[];
};

// Define the API response type
type ApiResponse = {
  nonValide: Commande[];
  valide: Commande[];
};

// Utility function to format dates
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

// Status color function
const getStatusColor = (statut: string) => {
  switch (statut) {
    case "VALIDE":
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
    case "NON_VALIDE":
      return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
    case "LIVREE":
      return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
    case "EN_COURS":
    case "EN_ATTENTE":
      return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
    case "ANNULEE":
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
    case "EN_RETOUR":
      return "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300";
    default:
      return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
  }
};

export function DatacommandeValidenonvalide() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [filteredCommandes, setFilteredCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [commandStatusFilter, setCommandStatusFilter] = useState<string>("");
  const [validatingCommandes, setValidatingCommandes] = useState<Set<string>>(new Set());
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchCommandes();
  }, []);

  useEffect(() => {
    let result = commandes.filter((commande) =>
      ["VALIDE", "NON_VALIDE"].includes(commande.statut)
    );

    if (commandStatusFilter) {
      result = result.filter((commande) => commande.statut === commandStatusFilter);
    }

    result.sort((a, b) => {
      if (a.statut === "NON_VALIDE" && b.statut === "VALIDE") return -1;
      if (a.statut === "VALIDE" && b.statut === "NON_VALIDE") return 1;
      return 0;
    });

    setFilteredCommandes(result);
  }, [commandes, commandStatusFilter]);

  useEffect(() => {
    if (isDetailsOpen && detailsDialogRef.current) {
      const firstFocusable = detailsDialogRef.current.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isDetailsOpen]);

  async function fetchCommandes() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/commande/non-valide", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const text = await response.text();

      if (!text) {
        console.warn("Réponse vide de l'API");
        setCommandes([]);
        return;
      }

      let data: ApiResponse;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error( `Erreur HTTP: ${response.status}`);
      }

      const allCommandes = [...data.nonValide, ...data.valide];
      setCommandes(allCommandes);
    } catch (err) {
      console.error("Erreur dans fetchCommandes:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast.error(errorMessage, {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setLoading(false);
    }
  }

  const handleCommandStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCommandStatusFilter(e.target.value);
  };

  const handleViewDetails = async (
    commande: Commande,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedCommande(commande);
    setDetailsLoading(true);
    setIsDetailsOpen(true);

    try {
      const response = await fetch(`/api/admin/commande/non-valide?id=${commande.id}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const text = await response.text();

      if (!text) {
        throw new Error("Réponse vide de l'API");
      }

      let data: Commande;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      setSelectedCommande(data);
    } catch (err) {
      console.error("Erreur dans handleViewDetails:", err);
      toast.error(err instanceof Error ? err.message : "Erreur inconnue", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
      setSelectedCommande(null);
    } finally {
      setDetailsLoading(false);
    }
  };
const handleValidateCommande = async (commandeId: string) => {
  setValidatingCommandes((prev) => new Set(prev).add(commandeId));

  try {
    console.log(`PATCH /api/admin/commande/non-valide?id=${commandeId}`);
    const response = await fetch(`/api/admin/commande/non-valide?id=${commandeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "VALIDE" }),
    });
    console.log("PATCH response:", response.status, response.statusText);

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("PATCH response is not JSON:", text);
      throw new Error("Réponse invalide du serveur");
    }

    if (!response.ok) {
      console.error("PATCH error response:", data);
      throw new Error(data.error || `Erreur HTTP: ${response.status}`);
    }

    console.log("POST /api/registre");
    const registreResponse = await fetch("/api/registre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: "VALIDE_COMMANDE",
        description: `Commande ${commandeId} validée`,
      }),
    });
    console.log("POST response:", registreResponse.status, registreResponse.statusText);

    const registreText = await registreResponse.text();
    let registreData;
    try {
      registreData = registreText ? JSON.parse(registreText) : {};
    } catch {
      console.error("POST response is not JSON:", registreText);
      throw new Error("Réponse invalide du serveur pour le registre");
    }

    if (!registreResponse.ok) {
      console.error("POST error response:", registreData);
      throw new Error(registreData.error || `Erreur HTTP: ${registreResponse.status}`);
    }

    await fetchCommandes();
    toast.success("Commande validée avec succès (statut: VALIDE)", {
      style: { background: "#1E3A8A", color: "#E0E7FF" },
    });
  } catch (err) {
    console.error("Erreur dans handleValidateCommande:", err);
    toast.error(err instanceof Error ? err.message : "Erreur inconnue", {
      style: { background: "#7F1D1D", color: "#FEE2E2" },
    });
  } finally {
    setValidatingCommandes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(commandeId);
      return newSet;
    });
  }
};
  const handleCancelValidation = async (commandeId: string) => {
    setValidatingCommandes((prev) => new Set(prev).add(commandeId));

    try {
      const response = await fetch(`/api/admin/commande/non-valide?id=${commandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "NON_VALIDE" }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      await fetchCommandes();
      toast.success("Validation de la commande annulée avec succès (statut: NON_VALIDE)", {
        style: { background: "#7E22CE", color: "#EDE9FE" },
      });
    } catch (err) {
      console.error("Erreur dans handleCancelValidation:", err);
      toast.error(err instanceof Error ? err.message : "Erreur inconnue", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setValidatingCommandes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commandeId);
        return newSet;
      });
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
          onClick={fetchCommandes}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
          aria-label="Réessayer de charger les commandes"
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
            Commandes Validées et Non Validées
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="statusFilter" className="text-sm font-semibold text-blue-700 dark:text-gray-200">
              Filtrer par Statut
            </Label>
            <select
              id="statusFilter"
              value={commandStatusFilter}
              onChange={handleCommandStatusFilter}
              className="w-[200px] h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-label="Filtrer les commandes par statut"
            >
              <option value="">Tous</option>
              <option value="VALIDE">Validé</option>
              <option value="NON_VALIDE">Non Validé</option>
            </select>
          </div>
        </motion.div>

        {filteredCommandes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucune commande trouvée.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des commandes validées et non validées.
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">ID Commande</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Produits</TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredCommandes.map((commande, index) => (
                    <motion.tr
                      key={commande.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                        #{commande.id.slice(0, 7)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(commande.statut)}`}
                        >
                          {commande.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {formatDate(commande.date)}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {commande.produits
                          ?.map((p) => `${p.produit.nom || "Produit inconnu"} (${p.quantite || 0})`)
                          .join(", ") || "Aucun produit"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-1 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                            onClick={(e) => handleViewDetails(commande, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => handleViewDetails(commande, ev))}
                            aria-label={`Voir les détails de la commande ${commande.id.slice(0, 7)}`}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          {commande.statut === "NON_VALIDE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-9 w-9 p-1 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800 ${
                                validatingCommandes.has(commande.id)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => handleValidateCommande(commande.id)}
                              disabled={validatingCommandes.has(commande.id)}
                              aria-label={`Valider la commande ${commande.id.slice(0, 7)}`}
                            >
                              {validatingCommandes.has(commande.id) ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 dark:border-green-400 border-t-transparent" />
                              ) : (
                                <CheckCircle className="h-5 w-5" />
                              )}
                            </Button>
                          )}
                          {commande.statut === "VALIDE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-9 w-9 p-1 border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-700 ${
                                validatingCommandes.has(commande.id)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => handleCancelValidation(commande.id)}
                              disabled={validatingCommandes.has(commande.id)}
                              aria-label={`Annuler la validation de la commande ${commande.id.slice(0, 7)}`}
                            >
                              {validatingCommandes.has(commande.id) ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 dark:border-red-400 border-t-transparent" />
                              ) : (
                                <XCircle className="h-5 w-5" />
                              )}
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
                  <TableCell colSpan={5} className="text-gray-600 dark:text-gray-300 font-semibold">
                    Total Commandes: {filteredCommandes.length}
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
              setSelectedCommande(null);
              setDetailsLoading(false);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[85vh] overflow-y-auto"
            ref={detailsDialogRef}
            aria-labelledby="modal-commande-title"
            aria-describedby="modal-commande-description"
          >
            <DialogHeader>
              <DialogTitle id="modal-commande-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Détails de la commande #{selectedCommande?.id.slice(0, 7) || "Inconnu"}
              </DialogTitle>
              <DialogDescription id="modal-commande-description" className="text-gray-600 dark:text-gray-400">
                Informations détaillées sur la commande sélectionnée.
              </DialogDescription>
            </DialogHeader>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="absolute top-3 right-3 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Close command details dialog"
            >
              <X className="h-4 w-4" />
            </button>
            {detailsLoading ? (
              <div className="space-y-3" aria-live="polite" aria-busy="true">
                <Skeleton className="h-6 w-full rounded-md" />
                <Skeleton className="h-6 w-full rounded-md" />
                <Skeleton className="h-6 w-full rounded-md" />
              </div>
            ) : !selectedCommande ? (
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700">
                <p className="text-red-700 dark:text-red-300 font-medium">
                  Erreur lors du chargement des détails de la commande.
                </p>
                <Button
                  onClick={() => selectedCommande && handleViewDetails(selectedCommande, {
                    currentTarget: lastFocusedElement.current || document.createElement("button"),
                  } as React.MouseEvent<HTMLButtonElement>)}
                  variant="outline"
                  className="mt-3 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                  disabled={!selectedCommande}
                  aria-label="Réessayer de charger les détails"
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Informations Générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>ID:</strong> {selectedCommande.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Statut:</strong>{" "}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            selectedCommande.statut
                          )}`}
                        >
                          {selectedCommande.statut}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Date:</strong> {formatDate(selectedCommande.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Créée le:</strong> {formatDate(selectedCommande.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Détails des Produits
                  </h4>
                  <div className="mt-2">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Commande:</strong> #{selectedCommande.id.slice(0, 7)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      <strong>Statut:</strong>{" "}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          selectedCommande.statut
                        )}`}
                      >
                        {selectedCommande.statut}
                      </span>
                    </p>
                    <ul className="mt-3 space-y-2">
                      {selectedCommande.produits?.length > 0 ? (
                        selectedCommande.produits.map((p, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                          >
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {p.produit.nom || "Produit inconnu"}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              Quantité: {p.quantite || 0}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-600 dark:text-gray-400">
                          Aucun produit
                        </li>
                      )}
                    </ul>
                    <p className="text-gray-600 dark:text-gray-400 mt-3">
                      Date: {formatDate(selectedCommande.date)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Créée le: {formatDate(selectedCommande.createdAt)}
                    </p>
                    {selectedCommande.statut === "NON_VALIDE" && (
                      <Button
                        onClick={() => handleValidateCommande(selectedCommande.id)}
                        disabled={validatingCommandes.has(selectedCommande.id)}
                        className={`mt-4 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 shadow-md hover:shadow-lg transition-all duration-200 ${
                          validatingCommandes.has(selectedCommande.id)
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        aria-label={`Valider la commande ${selectedCommande.id.slice(0, 7)}`}
                      >
                        {validatingCommandes.has(selectedCommande.id) ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Valider
                      </Button>
                    )}
                    {selectedCommande.statut === "VALIDE" && (
                      <Button
                        onClick={() => handleCancelValidation(selectedCommande.id)}
                        disabled={validatingCommandes.has(selectedCommande.id)}
                        className={`mt-4 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 shadow-md hover:shadow-lg transition-all duration-200 ${
                          validatingCommandes.has(selectedCommande.id)
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        aria-label={`Annuler la validation de la commande ${selectedCommande.id.slice(0, 7)}`}
                      >
                        {validatingCommandes.has(selectedCommande.id) ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Annuler la Validation
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            <DialogFooter className="flex justify-end mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Fermer le dialogue des détails"
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

export default DatacommandeValidenonvalide;