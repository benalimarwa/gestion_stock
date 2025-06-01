"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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

const API_BASE_PATH = "/api/demandeurUser/demandes/exceptionnelle";

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

    case StatutDemandeExceptionnelle.REJETEE:
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
   
    default:
      return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
  }
};

export function ExceptionalRequestsList() {
  const [exceptionalRequests, setExceptionalRequests] = useState<ExceptionalRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ExceptionalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(exceptionalRequests);
    } else {
      setFilteredRequests(
        exceptionalRequests.filter((request) => request.statut === statusFilter)
      );
    }
  }, [exceptionalRequests, statusFilter]);

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

  const statusOptions = [
    { value: "all", label: "Tous les statuts" },
    { value: StatutDemandeExceptionnelle.EN_ATTENTE, label: "En attente" },
    { value: StatutDemandeExceptionnelle.ACCEPTEE, label: "Acceptée" },

    { value: StatutDemandeExceptionnelle.REJETEE, label: "Rejetée" },
   
  ];

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <Skeleton className="h-8 w-[150px] rounded-lg mt-4" />
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
            Liste des Demandes Exceptionnelles
          </h2>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            aria-label="Filtrer par statut"
          >
            <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucune demande exceptionnelle trouvée pour ce statut.
          </motion.div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des demandes exceptionnelles
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">ID Demande</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Articles</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date de Création</TableHead>
                  
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

export default ExceptionalRequestsList;