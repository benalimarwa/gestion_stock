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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type pour les commandes annulées
type Produit = {
  id: string;
  nom: string;
  quantite: number;
};

type CancelledOrder = {
  id: string;
  fournisseur: {
    id: string;
    nom: string;
  };
  produits: {
    produit: Produit;
    quantite: number;
  }[];
  statut: "ANNULEE";
  date: string;
};

export function CancelledOrdersTable() {
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<CancelledOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CancelledOrder | null>(null);
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
    const fetchCancelledOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/gestionnaire/commandes/commandes-annulees");
        
        if (!response.ok) {
          console.error(`Erreur API: ${response.status} ${response.statusText}`);
          throw new Error("Erreur lors de la récupération des commandes annulées");
        }
        
        const data = await response.json();
        setCancelledOrders(data);
        setFilteredOrders(data); // Par défaut, afficher toutes les commandes
      } catch (err) {
        setError("Impossible de charger les commandes annulées");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCancelledOrders();
  }, []);

  // Filtrer les commandes par mois quand selectedMonth change
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredOrders(cancelledOrders);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = cancelledOrders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate.getMonth() === monthNumber;
    });

    setFilteredOrders(filtered);
  }, [selectedMonth, cancelledOrders]);

  // Fonction pour obtenir le premier produit comme élément principal à afficher
  const getPrimaryProductName = (order: CancelledOrder) => {
    if (!order.produits || order.produits.length === 0) return "Aucun produit";
    
    if (order.produits.length === 1) {
      return order.produits[0].produit.nom;
    }
    
    return `${order.produits[0].produit.nom} +${order.produits.length - 1}`;
  };

  // Fonction pour calculer la quantité totale des produits d'une commande
  const getTotalQuantity = (order: CancelledOrder) => {
    if (!order.produits || order.produits.length === 0) return 0;
    
    return order.produits.reduce((total, item) => total + item.quantite, 0);
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return <div className="flex justify-center p-4">Chargement des commandes annulées...</div>;
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
        <TableCaption>Liste des commandes annulées.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID Commande</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Article(s)</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead className="text-right">Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Aucune commande annulée trouvée
              </TableCell>
            </TableRow>
          ) : (
            filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id.substring(0, 8)}...</TableCell>
                <TableCell>{order.fournisseur.nom}</TableCell>
                <TableCell>{getPrimaryProductName(order)}</TableCell>
                <TableCell>{getTotalQuantity(order)}</TableCell>
                <TableCell className="text-right">{formatDate(order.date)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
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
            <TableCell colSpan={5}>Total Commandes Annulées</TableCell>
            <TableCell className="text-right">{filteredOrders.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de la Commande</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-3">
              <p>
                <strong>ID Commande :</strong> {selectedOrder.id}
              </p>
              <p>
                <strong>Fournisseur :</strong> {selectedOrder.fournisseur.nom}
              </p>
              <p>
                <strong>Date :</strong> {formatDate(selectedOrder.date)}
              </p>
              <p>
                <strong>Statut :</strong> Annulée
              </p>
              <div className="mt-4">
                <p className="font-medium mb-2">Liste des produits :</p>
                <ul className="space-y-2">
                  {selectedOrder.produits.map((item, index) => (
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