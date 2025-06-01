"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AlertCircle, Package, Eye, X, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Types basés sur le schéma Prisma
type ProduitExceptionnel = {
  id: string;
  name: string;
  marque: string | null;
  description: string | null;
};

type DemandeProduitExceptionnel = {
  id: string;
  produitExceptionnel: ProduitExceptionnel;
  quantite: number;
  isOrdered: boolean;
};

type Demandeur = {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  type: "EMPLOYE" | "ENSEIGNANT";
};

type DemandeExceptionnelle = {
  id: string;
  demandeurId: string;
  demandeur: Demandeur;
  produitsExceptionnels: DemandeProduitExceptionnel[];
  statut: "ACCEPTEE" | "COMMANDEE" | "LIVREE" | "PRISE"; // Ajoutez PRISE
  dateApprouvee: string;
  createdAt: string;
  updatedAt: string;
};

export function ExceptionalDemandesTable() {
  const [exceptionalDemandes, setExceptionalDemandes] = useState<DemandeExceptionnelle[]>([]);
  const [selectedDemande, setSelectedDemande] = useState<DemandeExceptionnelle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [takenDemandes, setTakenDemandes] = useState<Set<string>>(new Set());

  const fetchExceptionalDemandes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/magasinier/demandes/demandes-exceptionnelles", {
        cache: "no-store",
      });
      console.log("Statut de la réponse:", response.status, response.statusText);
      console.log("En-têtes de la réponse:", Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        const responseText = await response.text();
        console.log("Contenu de la réponse:", responseText.slice(0, 500));
        let errorData: { message?: string } = {};
        try {
          errorData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error("Erreur de parsing JSON:", jsonError, "Contenu:", responseText.slice(0, 500));
          throw new Error(`Erreur HTTP ${response.status}: Réponse non-JSON reçue`);
        }
        throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
      }
      const data = await response.json();
      setExceptionalDemandes(data);
    } catch (err: any) {
      console.error("Erreur dans fetchExceptionalDemandes:", err);
      setError(err.message || "Impossible de charger les demandes exceptionnelles");
      toast.error(err.message || "Impossible de charger les demandes exceptionnelles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptionalDemandes();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getProductsList = (demande: DemandeExceptionnelle) => {
    if (!demande.produitsExceptionnels || demande.produitsExceptionnels.length === 0) return "Aucun produit";
    if (demande.produitsExceptionnels.length === 1) {
      return `${demande.produitsExceptionnels[0].produitExceptionnel.name} (${demande.produitsExceptionnels[0].quantite})`;
    }
    return `${demande.produitsExceptionnels[0].produitExceptionnel.name} (${demande.produitsExceptionnels[0].quantite}) +${demande.produitsExceptionnels.length - 1}`;
  };

  const handleMarkAsTaken = async (demandeId: string) => {
  try {
    setProcessingId(demandeId);
    const response = await fetch(`/api/magasinier/demandes/demandes-exceptionnelles/${demandeId}/prise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Utilisateur non authentifié");
      } else if (response.status === 403) {
        throw new Error("Accès interdit : rôle magasinier requis");
      } else if (response.status === 404) {
        throw new Error("Demande non trouvée ou non livrée");
      } else if (response.status === 400) {
        throw new Error(data.message || "Erreur de validation (stock insuffisant ou produit non trouvé)");
      }
      throw new Error(data.message || `Erreur HTTP ${response.status}`);
    }
    
    // Mettre à jour l'état local pour marquer la demande comme PRISE
    setExceptionalDemandes((prev) =>
      prev.map((demande) =>
        demande.id === demandeId ? { ...demande, statut: "PRISE" } : demande
      )
    );
    
    setTakenDemandes((prev) => new Set(prev).add(demandeId));
    toast.success("Demande exceptionnelle marquée comme prise, stock mis à jour.");
    setSelectedDemande(null);
    await fetchExceptionalDemandes(); // Rafraîchir la liste
  } catch (err: any) {
    console.error("Erreur dans handleMarkAsTaken:", err);
    toast.error(err.message || "Une erreur est survenue lors du traitement de la demande");
  } finally {
    setProcessingId(null);
  }
};

  const handleMarkAsDelivered = async (demandeId: string) => {
    try {
      setProcessingId(demandeId);
      // Mark the demand as delivered
      const response = await fetch(`/api/magasinier/demandes/demandes-exceptionnelles/${demandeId}/livree`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Utilisateur non authentifié");
        } else if (response.status === 403) {
          throw new Error("Accès interdit : rôle magasinier requis");
        } else if (response.status === 404) {
          throw new Error("Demande non trouvée ou non commandée");
        }
        throw new Error(data.message || `Erreur HTTP ${response.status}`);
      }

      // Update local state
      setExceptionalDemandes((prev) =>
        prev.map((demande) =>
          demande.id === demandeId ? { ...demande, statut: "LIVREE" } : demande
        )
      );

      // Find the demand to get demandeur and products
      const demande = exceptionalDemandes.find((d) => d.id === demandeId);
      if (!demande) {
        throw new Error("Demande non trouvée dans l'état local");
      }

      // Prepare email data
      const produits = demande.produitsExceptionnels.map((item) => ({
        nom: item.produitExceptionnel.name,
        quantite: item.quantite,
        remarque: item.produitExceptionnel.description || undefined,
      }));

      // Send email notification
      const emailResponse = await fetch("/api/emails/demandeur/livree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          demandeurEmail: demande.demandeur.user.email,
          requestId: demande.id,
          produits,
          statut: "LIVREE",
        }),
      });

      const emailData = await emailResponse.json();
      if (!emailResponse.ok) {
        console.error("Erreur lors de l'envoi de l'email:", emailData);
        toast.warning("Demande marquée comme livrée, mais échec de l'envoi de l'email au demandeur.");
      } else {
        toast.success("Demande marquée comme livrée et notification envoyée au demandeur.");
      }

      setSelectedDemande(null);
    } catch (err: any) {
      console.error("Erreur dans handleMarkAsDelivered:", err);
      toast.error(err.message || "Une erreur est survenue lors du marquage comme livrée");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-md">
        <h3 className="font-bold text-red-700">Erreur de chargement</h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={fetchExceptionalDemandes}
          variant="outline"
          className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Demandes Exceptionnelles
        </h2>
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption>Liste des demandes exceptionnelles acceptées ou livrées.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">ID Demande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Demandeur</TableHead>
                <TableHead className="text-gray-700 font-semibold">Articles</TableHead>
                <TableHead className="text-gray-700 font-semibold">Date d'acceptation</TableHead>
                <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptionalDemandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                    Aucune demande exceptionnelle trouvée
                  </TableCell>
                </TableRow>
              ) : (
                exceptionalDemandes.map((demande, index) => (
                  <motion.tr
                    key={demande.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={takenDemandes.has(demande.id) ? "bg-gray-100" : "hover:bg-blue-50 transition-colors duration-200"}
                  >
                    <TableCell className="font-medium text-blue-600">
                      {demande.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {demande.demandeur?.user?.name || demande.demandeur?.user?.email || "Utilisateur inconnu"}
                    </TableCell>
                    <TableCell>{getProductsList(demande)}</TableCell>
                    <TableCell>{formatDate(demande.dateApprouvee)}</TableCell>
                    <TableCell>
                      {demande.statut === "PRISE" ? (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
    Prise
  </span>
) : demande.statut === "LIVREE" ? (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    Livrée
  </span>
) : demande.statut === "COMMANDEE" ? (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
    Commandée
  </span>
) : (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
    Acceptée
  </span>
)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          onClick={() => setSelectedDemande(demande)}
                          aria-label={`Voir les détails de la demande ${demande.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {demande.statut === "COMMANDEE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                            onClick={() => handleMarkAsDelivered(demande.id)}
                            disabled={!!processingId}
                            aria-label={`Marquer la demande ${demande.id} comme livrée`}
                          >
                            {processingId === demande.id && !takenDemandes.has(demande.id) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer comme livrée
                              </>
                            )}
                          </Button>
                        )}
                        {demande.statut === "LIVREE" && !takenDemandes.has(demande.id) && (
  <Button
    variant="outline"
    size="sm"
    className="border-green-200 text-green-600 hover:bg-green-100 hover:text-green-800 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
    onClick={() => handleMarkAsTaken(demande.id)}
    disabled={!!processingId}
    aria-label={`Marquer la demande ${demande.id} comme prise`}
  >
    {processingId === demande.id ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Traitement...
      </>
    ) : (
      <>
        <Package className="h-4 w-4 mr-2" />
        Marquer comme prise
      </>
    )}
  </Button>
)}

                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700 font-medium">
                  Total Demandes
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {exceptionalDemandes.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Modal pour les détails de la demande */}
        <Dialog open={!!selectedDemande} onOpenChange={() => setSelectedDemande(null)}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setSelectedDemande(null)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails de la Demande Exceptionnelle
              </DialogTitle>
            </DialogHeader>
            {selectedDemande && (
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>ID Demande :</strong> {selectedDemande.id}
                  </p>
                  <p className="text-gray-700">
                    <strong>Demandeur :</strong>{" "}
                    {selectedDemande.demandeur?.user?.name || "Non spécifié"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Email :</strong>{" "}
                    {selectedDemande.demandeur?.user?.email || "Non spécifié"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Type de demandeur :</strong>{" "}
                    {selectedDemande.demandeur?.type === "EMPLOYE" ? "Employé" : "Enseignant"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Date d'acceptation :</strong>{" "}
                    {formatDate(selectedDemande.dateApprouvee)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Date de création :</strong> {formatDate(selectedDemande.createdAt)}
                  </p>
                  <p className="text-gray-700">
  <strong>Statut :</strong>{" "}
  {selectedDemande.statut === "PRISE" ? "Prise" :
   selectedDemande.statut === "LIVREE" ? "Livrée" : 
   selectedDemande.statut === "COMMANDEE" ? "Commandée" : "Acceptée"}
</p>
                </div>
                <div className="mt-4">
                  <p className="font-medium text-gray-700 mb-2">Liste des produits exceptionnels :</p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left text-gray-700">Produit</th>
                          <th className="p-2 text-left text-gray-700">Marque</th>
                          <th className="p-2 text-right text-gray-700">Quantité</th>
                          <th className="p-2 text-right text-gray-700">Commandé</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDemande.produitsExceptionnels.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-2 text-center text-gray-500">
                              Aucun produit
                            </td>
                          </tr>
                        ) : (
                          selectedDemande.produitsExceptionnels.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2 text-gray-700">{item.produitExceptionnel.name}</td>
                              <td className="p-2 text-gray-700">{item.produitExceptionnel.marque || "Non spécifié"}</td>
                              <td className="p-2 text-right text-gray-700">{item.quantite}</td>
                              <td className="p-2 text-right text-gray-700">{item.isOrdered ? "Oui" : "Non"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Fermer
                    </Button>
                  </DialogClose>
                  {selectedDemande.statut === "LIVREE" && !takenDemandes.has(selectedDemande.id) && (
  <Button
    onClick={() => {
      handleMarkAsTaken(selectedDemande.id);
    }}
    disabled={!!processingId}
    className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
  >
    {processingId === selectedDemande.id ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Traitement...
      </>
    ) : (
      <>
        <Package className="h-4 w-4 mr-2" />
        Marquer comme prise
      </>
    )}
  </Button>
)}
                  
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}