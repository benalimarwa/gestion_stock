"use client"; // Assure que ce composant est exécuté uniquement côté client

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Produit = {
  nom: string;
  quantite: number;
  id: string;
};

type ApprovedRequest = {
  requestId: string;
  demandeurName: string;
  produits: Produit[];
  createdAt: string;
  updatedAt: string;
};

export function ApprovedRequestsTable() {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ApprovedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovedRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Générer la liste des mois en français
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
    const fetchApprovedRequests = async () => {
      try {
        const response = await fetch("/api/gestionnaire/demandes/demande-app");
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        setApprovedRequests(data);
        setFilteredRequests(data); // Par défaut, afficher toutes les demandes
      } catch (err) {
        console.error("Erreur lors de la récupération des données:", err);
        setError("Impossible de charger les demandes approuvées");
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedRequests();
  }, []);

  // Filtrer les demandes par mois quand selectedMonth change
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredRequests(approvedRequests);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = approvedRequests.filter((request) => {
      // Utiliser updatedAt car c'est la date d'approbation
      const requestDate = new Date(request.updatedAt);
      return requestDate.getMonth() === monthNumber;
    });

    setFilteredRequests(filtered);
  }, [selectedMonth, approvedRequests]);

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par mois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableCaption>Liste des demandes approuvées.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID Demande</TableHead>
            <TableHead>Demandeur</TableHead>
            <TableHead>Produits</TableHead>
            <TableHead className="text-right">Date dapprobation</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            // Affichage de squelettes pendant le chargement
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : filteredRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Aucune demande approuvée trouvée pour cette période
              </TableCell>
            </TableRow>
          ) : (
            filteredRequests.map((request) => (
              <TableRow key={request.requestId}>
                <TableCell className="font-medium">{request.requestId.substring(0, 8)}...</TableCell>
                <TableCell>{request.demandeurName}</TableCell>
                <TableCell>
                  {request.produits.length > 0 
                    ? `${request.produits[0].nom} ${request.produits.length > 1 ? `+ ${request.produits.length - 1} autres` : ''}` 
                    : 'Aucun produit'}
                </TableCell>
                <TableCell className="text-right">{formatDate(request.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                    Voir Détail
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Demandes</TableCell>
            <TableCell className="text-right">{loading ? '-' : filteredRequests.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {/* Modal pour afficher les détails */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Détails de la Demande</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <p><strong>ID Demande :</strong> {selectedRequest.requestId}</p>
              <p><strong>Demandeur :</strong> {selectedRequest.demandeurName}</p>
              <p><strong>Date de création :</strong> {formatDate(selectedRequest.createdAt)}</p>
              <p><strong>Date d approbation :</strong> {formatDate(selectedRequest.updatedAt)}</p>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Produits demandés:</h4>
                <ul className="space-y-2">
                  {selectedRequest.produits.map((produit) => (
                    <li key={produit.id} className="pl-2 border-l-2 border-gray-200">
                      {produit.nom} - Quantité: {produit.quantite}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}