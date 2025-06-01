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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Produit = {
  id: string;
  produitId: string;
  nom: string;
  quantite: number;
};

type PendingRequest = {
  requestId: string;
  demandeurName: string;
  demandeurId: string;
  produits: Produit[];
  createdAt: string;
  raisonRefus?: string;
};

export function RejectedRequestsTable() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [mode, setMode] = useState<"view" | null>(null);
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
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch("/api/gestionnaire/demandes/demande-rejetee");
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setPendingRequests(data);
      setFilteredRequests(data); // Par défaut, afficher toutes les demandes
    } catch (err) {
      console.error("Erreur lors de la récupération des données:", err);
      setError("Impossible de charger les demandes rejetées");
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les demandes par mois quand selectedMonth change
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredRequests(pendingRequests);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = pendingRequests.filter((request) => {
      const requestDate = new Date(request.createdAt);
      return requestDate.getMonth() === monthNumber;
    });

    setFilteredRequests(filtered);
  }, [selectedMonth, pendingRequests]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const resetDialog = () => {
    setSelectedRequest(null);
    setMode(null);
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div>
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
        <TableCaption>Liste des demandes rejetées.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID Demande</TableHead>
            <TableHead>Demandeur</TableHead>
            <TableHead>Produits</TableHead>
            <TableHead className="text-right">Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            // Affichage des squelettes pendant le chargement
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : filteredRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                Aucune demande rejetée pour cette période
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
                <TableCell className="text-right">{formatDate(request.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedRequest(request); setMode("view"); }}>
                    Voir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Demandes Rejetées</TableCell>
            <TableCell className="text-right">{loading ? '-' : filteredRequests.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Dialog open={!!selectedRequest} onOpenChange={resetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Détails de la Demande Rejetée
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-3">
              <p><strong>ID Demande :</strong> {selectedRequest.requestId}</p>
              <p><strong>Demandeur :</strong> {selectedRequest.demandeurName}</p>
              <p><strong>Date de création :</strong> {formatDate(selectedRequest.createdAt)}</p>
              
              {selectedRequest.raisonRefus && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="font-medium text-red-700 mb-1">Motif du refus :</h4>
                  <p className="text-red-600">{selectedRequest.raisonRefus}</p>
                </div>
              )}
              
              <div className="mt-3">
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}