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
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types pour les demandes refusées
type Produit = {
  id: string;
  nom: string;
  quantite: number;
};

type DemandeProduit = {
  produit: Produit;
  quantite: number;
};

type RefusedDemande = {
  id: string;
  statut: "REJETEE";
  dateApprouvee: string | null;
  raisonRefus: string | null;
  createdAt: string;
  produits: DemandeProduit[];
};

export function RefusedOrdersTable() {
  const [refusedDemandes, setRefusedDemandes] = useState<RefusedDemande[]>([]);
  const [filteredDemandes, setFilteredDemandes] = useState<RefusedDemande[]>([]);
  const [selectedDemande, setSelectedDemande] = useState<RefusedDemande | null>(null);
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
    fetchRefusedDemandes();
  }, []);

  const fetchRefusedDemandes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/demandeurUser/demandes/refusee");
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des demandes refusées");
      }
      
      const data = await response.json();
      setRefusedDemandes(data);
      setFilteredDemandes(data); // Par défaut, afficher toutes les demandes
    } catch (err) {
      setError("Impossible de charger les demandes refusées");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les demandes par mois quand selectedMonth change
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredDemandes(refusedDemandes);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = refusedDemandes.filter((demande) => {
      const demandeDate = new Date(demande.createdAt);
      return demandeDate.getMonth() === monthNumber;
    });

    setFilteredDemandes(filtered);
  }, [selectedMonth, refusedDemandes]);

  // Fonction pour obtenir le premier produit comme élément principal à afficher
  const getPrimaryProductName = (demande: RefusedDemande) => {
    if (!demande.produits || demande.produits.length === 0) return "Aucun produit";
    
    if (demande.produits.length === 1) {
      return demande.produits[0].produit.nom;
    }
    
    return `${demande.produits[0].produit.nom} +${demande.produits.length - 1}`;
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return <div className="flex justify-center p-4">Chargement des demandes refusées...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
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
        <TableCaption>Demandes refusées.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID Demande</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Raison du refus</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDemandes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Aucune demande refusée trouvée
              </TableCell>
            </TableRow>
          ) : (
            filteredDemandes.map((demande) => (
              <TableRow key={demande.id}>
                <TableCell className="font-medium">{demande.id.substring(0, 8)}...</TableCell>
                <TableCell>{getPrimaryProductName(demande)}</TableCell>
                <TableCell>{formatDate(demande.createdAt)}</TableCell>
                <TableCell>{demande.raisonRefus || "Non spécifié"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDemande(demande)}
                  >
                    Voir Détail
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Total Demandes Refusées</TableCell>
            <TableCell className="text-right">{filteredDemandes.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Dialog open={!!selectedDemande} onOpenChange={() => setSelectedDemande(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la Demande Refusée</DialogTitle>
          </DialogHeader>
          {selectedDemande && (
            <div className="grid gap-3">
              <p>
                <strong>ID Demande :</strong> {selectedDemande.id}
              </p>
              <p>
                <strong>Date de création :</strong> {formatDate(selectedDemande.createdAt)}
              </p>
              <p>
                <strong>Statut :</strong> Refusée
              </p>
              <p>
                <strong>Raison du refus :</strong> {selectedDemande.raisonRefus || "Non spécifié"}
              </p>
              <div className="mt-4">
                <p className="font-medium mb-2">Liste des produits :</p>
                <ul className="space-y-2">
                  {selectedDemande.produits.map((item, index) => (
                    <li key={index} className="border-b pb-2">
                      <p>{item.produit.nom}</p>
                      <p className="text-sm text-gray-500">
                        Quantité: {item.quantite}
                      </p>
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