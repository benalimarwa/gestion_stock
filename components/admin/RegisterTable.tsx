"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircle, RefreshCw, ArrowUpDown, Eye } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// Define TypeScript interface for RegistreEntry
interface RegistreEntry {
  id: string;
  userId: string;
  actionType: string;
  description: string | null;
  createdAt: string;
  user: {
    email: string;
  };
}

/**
 * Formats a date string into a French locale format.
 * @param dateString - The date string to format.
 * @returns Formatted date or fallback text if invalid.
 */
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

/**
 * Formats action type into a human-readable string and assigns a color.
 * @param actionType - The action type to format.
 * @returns Object with formatted name and color class.
 */
const formatActionType = (actionType: string): { name: string; color: string } => {
  const actionMap: Record<string, { name: string; color: string }> = {
    PRODUIT_AJOUTE: { name: "Produit Ajouté", color: "bg-teal-500" },
    PRODUIT_MODIFIE: { name: "Produit Modifié", color: "bg-indigo-500" },
    PRODUIT_SUPPRIME: { name: "Produit Supprimé", color: "bg-red-500" },
    COMMANDE_LIVREE: { name: "Commande Livrée", color: "bg-green-500" },
    DEMANDE_PRISE: { name: "Demande Prise", color: "bg-blue-500" },
    DEMANDEEXCEPT_PRISE: { name: "Demande Exceptionnelle Prise", color: "bg-purple-500" },
    VALIDE_COMMANDE: { name: "Commande Validée", color: "bg-emerald-500" },
    ACCEPT_DEMANDE: { name: "Demande Acceptée", color: "bg-cyan-500" },
    ACCEPTDEM_EXCEPT: { name: "Demande Exceptionnelle Acceptée", color: "bg-pink-500" },
  };
  return actionMap[actionType] || { name: actionType, color: "bg-gray-500" };
};

/**
 * RegistreTable component with vibrant colors, creative styling, and details modal.
 */
export function RegistreTable() {
  const [registreEntries, setRegistreEntries] = useState<RegistreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof RegistreEntry>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedEntry, setSelectedEntry] = useState<RegistreEntry | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching data from /api/registre");
      const response = await fetch("/api/registre", {
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
        body: text,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Endpoint non trouvé (/api/registre). Vérifiez que l'API est correctement configurée.");
        }
        if (!text) {
          throw new Error(`Réponse vide du serveur (status ${response.status})`);
        }
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error(`Réponse HTML reçue (status ${response.status}): ${text.slice(0, 100)}...`);
        }
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || "Erreur lors du chargement des entrées du registre");
        } catch {
          throw new Error(`Réponse JSON invalide (status ${response.status}): ${text}`);
        }
      }

      const data: RegistreEntry[] = JSON.parse(text);
      if (!Array.isArray(data)) {
        console.error("API returned non-array for registreEntries:", data);
        throw new Error("Données des entrées du registre invalides");
      }

      setRegistreEntries(data);
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error);
      setError(error.message);
      toast.error(error.message || "Erreur lors du chargement des données", {
        style: { background: "#EF4444", color: "#FEE2E2" },
      });
      setRegistreEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

 // Filter and sort entries
const filteredAndSortedEntries = useMemo(() => {
  let result = [...registreEntries];

  // Filter by search term
  if (searchTerm) {
    result = result.filter(
      (entry) =>
        entry.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatActionType(entry.actionType).name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
  }

  // Sort entries
  result.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "id":
        aValue = a.id;
        bValue = b.id;
        break;
      case "userId":
        aValue = a.user.email; // Compare email instead of user object
        bValue = b.user.email;
        break;
      case "actionType":
        aValue = formatActionType(a.actionType).name; // Compare formatted action type
        bValue = formatActionType(b.actionType).name;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case "description":
        aValue = a.description ?? "";
        bValue = b.description ?? "";
        break;
      default:
        // Exhaustive check: should never reach here due to keyof RegistreEntry
        aValue = "";
        bValue = "";
        break;
    }

    // Handle sorting for dates (createdAt)
    if (sortField === "createdAt") {
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }

    // Handle sorting for strings
    return sortOrder === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  return result;
}, [registreEntries, searchTerm, sortField, sortOrder]);

  // Handle sorting
  const handleSort = (field: keyof RegistreEntry) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-teal-900 dark:to-indigo-900 rounded-2xl shadow-xl border border-teal-200 dark:border-teal-700">
        <Skeleton className="h-10 w-[250px] rounded-lg bg-teal-200 dark:bg-teal-800" />
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-indigo-100 dark:bg-indigo-800" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 text-red-600 dark:text-red-300 rounded-2xl shadow-xl border border-red-200 dark:border-red-700">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          <h3 className="text-xl font-bold text-red-700 dark:text-red-200">Erreur de Chargement</h3>
        </div>
        <p className="mt-3 text-red-600 dark:text-red-300">{error}</p>
        <Button
          onClick={fetchData}
          variant="outline"
          className="mt-4 border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800 hover:shadow-lg transition-all duration-200"
          aria-label="Réessayer de charger les données"
        >
          <RefreshCw className="mr-2 h-5 w-5 animate-spin-on-hover" /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-teal-900 dark:to-indigo-900 rounded-2xl shadow-xl border border-teal-200 dark:border-teal-700">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-400 dark:to-indigo-400 animate-pulse-slow">
            Registre des Actions
          </h2>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Rechercher par email, action ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-72 bg-white dark:bg-gray-800 border-teal-400 dark:border-teal-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 transition-all duration-200"
              aria-label="Rechercher dans le registre"
            />
            <Button
              onClick={fetchData}
              variant="outline"
              className="border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800 hover:shadow-lg transition-all duration-200"
              aria-label="Rafraîchir les données"
            >
              <RefreshCw className="mr-2 h-5 w-5 animate-spin-on-hover" /> Rafraîchir
            </Button>
          </div>
        </div>

        {filteredAndSortedEntries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16 text-gray-600 dark:text-gray-400 text-xl"
          >
            Aucune entrée dans le registre.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-xl border border-teal-300 dark:border-teal-700 shadow-lg">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300 pb-4">
                Liste des actions enregistrées dans le registre
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-800 dark:to-indigo-800">
                <TableRow>
                  <TableHead
                    className="text-white dark:text-gray-100 font-bold cursor-pointer hover:bg-teal-700 dark:hover:bg-teal-900 transition-colors duration-200"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-2">
                      ID Action
                      <ArrowUpDown className="h-4 w-4" />
                      {sortField === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-white dark:text-gray-100 font-bold cursor-pointer hover:bg-teal-700 dark:hover:bg-teal-900 transition-colors duration-200"
                    onClick={() => handleSort("userId")}
                  >
                    <div className="flex items-center gap-2">
                      Utilisateur
                      <ArrowUpDown className="h-4 w-4" />
                      {sortField === "userId" && (sortOrder === "asc" ? "↑" : "↓")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-white dark:text-gray-100 font-bold cursor-pointer hover:bg-teal-700 dark:hover:bg-teal-900 transition-colors duration-200"
                    onClick={() => handleSort("actionType")}
                  >
                    <div className="flex items-center gap-2">
                      Type d'Action
                      <ArrowUpDown className="h-4 w-4" />
                      {sortField === "actionType" && (sortOrder === "asc" ? "↑" : "↓")}
                    </div>
                  </TableHead>
                  <TableHead className="text-white dark:text-gray-100 font-bold">
                    Description
                  </TableHead>
                  <TableHead
                    className="text-white dark:text-gray-100 font-bold cursor-pointer hover:bg-teal-700 dark:hover:bg-teal-900 transition-colors duration-200"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      <ArrowUpDown className="h-4 w-4" />
                      {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                    </div>
                  </TableHead>
                  <TableHead className="text-white dark:text-gray-100 font-bold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAndSortedEntries.map((entry, index) => {
                    const { name, color } = formatActionType(entry.actionType);
                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all duration-200 hover:shadow-md"
                      >
                        <TableCell className="font-medium text-teal-600 dark:text-teal-300">
                          #{entry.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-gray-800 dark:text-gray-200">
                          {entry.user.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${color} text-white hover:${color}/80`}>{name}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-800 dark:text-gray-200 max-w-xs truncate">
                          {entry.description || "Aucune description"}
                        </TableCell>
                        <TableCell className="text-gray-800 dark:text-gray-200">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-teal-200 dark:border-teal-600 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800"
                            onClick={() => setSelectedEntry(entry)}
                            aria-label={`Voir les détails de l'action ${entry.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-gradient-to-r from-teal-100 to-indigo-100 dark:from-teal-800 dark:to-indigo-800">
                <TableRow>
                  <TableCell colSpan={5} className="text-gray-800 dark:text-gray-200 font-bold">
                    Total des Actions
                  </TableCell>
                  <TableCell className="text-right text-gray-800 dark:text-gray-200 font-bold">
                    {filteredAndSortedEntries.length}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Dialog for viewing action details */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-teal-50 to-indigo-50 dark:from-teal-900 dark:to-indigo-900 rounded-xl shadow-2xl border border-teal-200 dark:border-teal-700">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-2 right-2 p-1 bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-300 rounded-full hover:bg-teal-200 dark:hover:bg-teal-700 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-400 dark:to-indigo-400">
                Détails de l'Action
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="grid gap-4 py-4">
                <div className="space-y-3 text-gray-800 dark:text-gray-200">
                  <p>
                    <strong className="text-teal-600 dark:text-teal-300">ID Action :</strong>{" "}
                    {selectedEntry.id}
                  </p>
                  <p>
                    <strong className="text-teal-600 dark:text-teal-300">Utilisateur :</strong>{" "}
                    {selectedEntry.user.email}
                  </p>
                  <p>
                    <strong className="text-teal-600 dark:text-teal-300">Type d'Action :</strong>{" "}
                    <Badge className={`${formatActionType(selectedEntry.actionType).color} text-white`}>
                      {formatActionType(selectedEntry.actionType).name}
                    </Badge>
                  </p>
                  <p>
                    <strong className="text-teal-600 dark:text-teal-300">Description :</strong>{" "}
                    {selectedEntry.description || "Aucune description"}
                  </p>
                  <p>
                    <strong className="text-teal-600 dark:text-teal-300">Date :</strong>{" "}
                    {formatDate(selectedEntry.createdAt)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800"
                >
                  Fermer
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom CSS for animations */}
        <style jsx global>{`
          .animate-spin-on-hover:hover {
            animation: spin 1s linear infinite;
          }
          .animate-pulse-slow {
            animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </motion.div>
    </div>
  );
}

export default RegistreTable;