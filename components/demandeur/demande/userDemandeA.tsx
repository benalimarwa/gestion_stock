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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types pour les demandes approuvées
type Produit = {
  id: string;
  nom: string;
  quantite: number;
  marque: string | null;
};

type DemandeProduit = {
  id: string;
  produit: Produit;
  quantite: number;
};

type ApprovedRequest = {
  id: string;
  produits: DemandeProduit[];
  statut: "APPROUVEE";
  createdAt: string;
  dateApprouvee: string | null;
};

export function ApprovedRequestsTable() {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ApprovedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovedRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Liste des mois en français
  const months = [
    { value: "0", label: "Janvier" },
    { value: "1", label: "Février" },
    { value: "2", label: "Mars" },
    { value: "3", label: "Avril" },
    { value: "4", label: "Mai" },
    { value: "5", label: "Juin" },
    { value: "6", label: "Juillet" },
    { value: "7", label: "Août" },
    { value: "8", label: "Septembre" },
    { value: "9", label: "Octobre" },
    { value: "10", label: "Novembre" },
    { value: "11", label: "Décembre" },
  ];

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  // Récupérer les demandes approuvées du demandeur connecté
  const fetchApprovedRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      
      console.log("Fetching approved requests...");
      const response = await fetch("/api/demandeurUser/demandes/approuvee");
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        
        throw new Error(
          errorData.error || "Erreur lors de la récupération des demandes approuvées"
        );
      }
      
      const data: ApprovedRequest[] = await response.json();
      console.log("Fetched data:", data);
      
      setApprovedRequests(data);
      setFilteredRequests(data);
    } catch (error: any) {
      console.error("Erreur complète:", error);
      setError(error.message || "Une erreur inattendue s'est produite");
      
      // Capture des détails supplémentaires pour le débogage
      if (error.details) {
        setErrorDetails(error.details);
      }
      
      toast.error(
        error.message || "Impossible de charger les demandes approuvées"
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les demandes par mois
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredRequests(approvedRequests);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = approvedRequests.filter((request) => {
      if (!request.dateApprouvee) return false;
      const approveDate = new Date(request.dateApprouvee);
      return approveDate.getMonth() === monthNumber;
    });

    setFilteredRequests(filtered);
  }, [selectedMonth, approvedRequests]);

  // Obtenir le nom du produit principal
  const getPrimaryProductName = (request: ApprovedRequest) => {
    if (!request.produits || request.produits.length === 0) return "Aucun produit";
    if (request.produits.length === 1) return request.produits[0].produit.nom;
    return `${request.produits[0].produit.nom} +${request.produits.length - 1}`;
  };

  // Calculer la quantité totale
  const getTotalQuantity = (request: ApprovedRequest) => {
    if (!request.produits || request.produits.length === 0) return 0;
    return request.produits.reduce((total, item) => total + item.quantite, 0);
  };

  // Formater la date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non défini";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Détermine si l'erreur est liée à l'authentification ou à l'utilisateur manquant
  const isAuthError = () => {
    return (
      error?.includes("Non authentifié") ||
      error?.includes("Utilisateur non trouvé") ||
      error?.includes("Aucun profil demandeur")
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Demandes Approuvées
        </h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400">
            <SelectValue placeholder="Filtrer par mois" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Tous les mois</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            <div>
              <p className="mb-2">{error}</p>
              {errorDetails && (
                <p className="text-sm text-gray-700">Détails: {errorDetails}</p>
              )}
              {isAuthError() && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-amber-800 font-medium">Problème d'authentification détecté</p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-amber-700">
                    <li>Vérifiez que vous êtes bien connecté</li>
                    <li>Votre profil utilisateur pourrait ne pas être correctement configuré</li>
                    <li>Aucun profil demandeur n'est peut-être associé à votre compte</li>
                  </ul>
                </div>
              )}
              <Button
                onClick={fetchApprovedRequests}
                variant="outline"
                className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Réessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-500 mb-4">Liste de vos demandes approuvées.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">ID Demande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Article(s)</TableHead>
                <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
                <TableHead className="text-gray-700 font-semibold">Date de demande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Date d'approbation</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucune demande approuvée trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-blue-50 transition-colors duration-200">
                    <TableCell className="font-medium text-blue-600">
                      {request.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-gray-700">{getPrimaryProductName(request)}</TableCell>
                    <TableCell className="text-gray-700">{getTotalQuantity(request)}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(request.dateApprouvee)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                      >
                        Voir Détail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700">Total Demandes Approuvées</TableCell>
                <TableCell className="text-right text-gray-700">{filteredRequests.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="bg-white rounded-xl shadow-2xl border border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails de la Demande
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-gray-700">ID Demande</p>
                  <p className="text-gray-600">{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Statut</p>
                  <p className="text-gray-600">Approuvée</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Date de création</p>
                  <p className="text-gray-600">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Date d'approbation</p>
                  <p className="text-gray-600">{formatDate(selectedRequest.dateApprouvee)}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="font-semibold text-gray-700 mb-2">Liste des produits</p>
                {selectedRequest.produits.length === 0 ? (
                  <p className="text-gray-500">Aucun produit</p>
                ) : (
                  <ul className="space-y-2 border-t border-gray-200 pt-2">
                    {selectedRequest.produits.map((item) => (
                      <li key={item.id} className="pb-2">
                        <p className="text-gray-700">{item.produit.nom}</p>
                        <p className="text-sm text-gray-500">Quantité: {item.quantite}</p>
                        {item.produit.marque && (
                          <p className="text-sm text-gray-500">Marque: {item.produit.marque}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                className="border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}