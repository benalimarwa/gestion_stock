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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type pour les commandes retournées
type Produit = {
  id: string;
  nom: string;
  quantite: number;
};

type ReturnedOrder = {
  id: string;
  fournisseur: {
    id: string;
    nom: string;
  };
  produits: {
    produit: Produit;
    quantite: number;
  }[];
  statut: "EN-COURS";
  date: string;
  dateLivraison?: string;
  raisonRetour?: string;
};

export function OngoingOrdersTable() {
  const [returnedOrders, setReturnedOrders] = useState<ReturnedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ReturnedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ReturnedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  
  // Nouvel état pour le modal de raison de retour
  const [returnReasonModal, setReturnReasonModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [orderToReturn, setOrderToReturn] = useState<string | null>(null);

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
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gestionnaire/commandes/commandes-en-attente");
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des commandes");
      }
      
      const data = await response.json();
      setReturnedOrders(data);
      setFilteredOrders(data); // Par défaut, afficher toutes les commandes
    } catch (err) {
      setError("Impossible de charger les commandes en cours");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les commandes par mois quand selectedMonth change
  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredOrders(returnedOrders);
      return;
    }

    const monthNumber = parseInt(selectedMonth);
    const filtered = returnedOrders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate.getMonth() === monthNumber;
    });

    setFilteredOrders(filtered);
  }, [selectedMonth, returnedOrders]);

  // Fonction pour mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId: string, newStatus: string, raisonRetour?: string) => {
    try {
      setProcessingOrder(orderId);
      
      let successMessage = "";
      
      if (newStatus === "LIVREE") {
        successMessage = "Commande marquée comme livrée. Quantités de produits mises à jour!";
      } else if (newStatus === "EN_RETOUR") {
        successMessage = "Commande marquée comme en retour";
      } else if (newStatus === "ANNULEE") {
        successMessage = "Commande annulée avec succès";
      }
      
      const body: any = { statut: newStatus };
      
      // Ajouter la raison de retour si elle est fournie
      if (raisonRetour) {
        body.raisonRetour = raisonRetour;
      }
      
      const response = await fetch(`/api/commandes/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour du statut de la commande`);
      }

      // Mettre à jour la liste des commandes
      const updatedOrders = returnedOrders.filter(order => order.id !== orderId);
      setReturnedOrders(updatedOrders);
      
      // Mettre à jour également les commandes filtrées
      if (selectedMonth === "all") {
        setFilteredOrders(updatedOrders);
      } else {
        const monthNumber = parseInt(selectedMonth);
        setFilteredOrders(updatedOrders.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate.getMonth() === monthNumber;
        }));
      }
      
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de mettre à jour le statut de la commande");
    } finally {
      setProcessingOrder(null);
    }
  };

  // Nouvelle fonction pour gérer le processus de retour
  const handleReturnOrder = () => {
    if (!orderToReturn || !returnReason.trim()) {
      toast.error("Veuillez fournir une raison de retour");
      return;
    }
    
    updateOrderStatus(orderToReturn, "EN_RETOUR", returnReason.trim());
    setReturnReasonModal(false);
    setReturnReason("");
    setOrderToReturn(null);
  };

  // Fonction pour ouvrir le modal de raison de retour
  const openReturnReasonModal = (orderId: string) => {
    setOrderToReturn(orderId);
    setReturnReason("");
    setReturnReasonModal(true);
  };

  // Fonction pour obtenir le premier produit comme élément principal à afficher
  const getPrimaryProductName = (order: ReturnedOrder) => {
    if (!order.produits || order.produits.length === 0) return "Aucun produit";
    
    if (order.produits.length === 1) {
      return order.produits[0].produit.nom;
    }
    
    return `${order.produits[0].produit.nom} +${order.produits.length - 1}`;
  };

  // Fonction pour calculer la quantité totale des produits d'une commande
  const getTotalQuantity = (order: ReturnedOrder) => {
    if (!order.produits || order.produits.length === 0) return 0;
    
    return order.produits.reduce((total, item) => total + item.quantite, 0);
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const handleDeliveryClick = (orderId: string) => {
    // Afficher une confirmation avant de procéder
    if (confirm("Confirmer la livraison ? Les quantités de produits seront augmentées en stock.")) {
      updateOrderStatus(orderId, "LIVREE");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Chargement des commandes en cours...</div>;
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
        <TableCaption>Liste des commandes en cours.</TableCaption>
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
                Aucune commande en cours trouvée
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Voir Détail
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleDeliveryClick(order.id)}
                      disabled={processingOrder === order.id}
                    >
                      Livrée
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600"
                      onClick={() => openReturnReasonModal(order.id)}
                      disabled={processingOrder === order.id}
                    >
                      En retour
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => updateOrderStatus(order.id, "ANNULEE")}
                      disabled={processingOrder === order.id}
                    >
                      Annulée
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>Total Commandes en Cours</TableCell>
            <TableCell className="text-right">{filteredOrders.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {/* Modal pour les détails de la commande */}
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
                <strong>Date de commande :</strong> {formatDate(selectedOrder.date)}
              </p>
              <p>
                <strong>Statut :</strong> En cours
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

      {/* Nouveau modal pour la raison de retour */}
      <Dialog open={returnReasonModal} onOpenChange={setReturnReasonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raison du retour</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Veuillez indiquer la raison du retour:</Label>
              <Textarea
                id="reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Exemple: Produits endommagés, erreur de commande..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setReturnReasonModal(false);
                setOrderToReturn(null);
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleReturnOrder}
              disabled={!returnReason.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Confirmer le retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}