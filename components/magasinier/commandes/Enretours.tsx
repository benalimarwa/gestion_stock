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
import { Eye, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { motion } from "framer-motion";

// Type pour les produits et commandes
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
  } | null;
  produits: {
    produit: Produit;
    quantite: number;
  }[];
  statut: "EN_RETOUR";
  date: string;
  raisonRetour: string | null;
};

export function ReturnedOrdersTable() {
  const [returnedOrders, setReturnedOrders] = useState<ReturnedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ReturnedOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ReturnedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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
    fetchReturnedOrders();
  }, []);

  const fetchReturnedOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/magasinier/commandes/commandes-en-retour");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      setReturnedOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      setError("Impossible de charger les commandes en retour");
      console.error(err);
      toast.error("Impossible de charger les commandes en retour");
    } finally {
      setLoading(false);
    }
  };

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

  const getPrimaryProductName = (order: ReturnedOrder) => {
    if (!order.produits || order.produits.length === 0) return "Aucun produit";
    if (order.produits.length === 1) return order.produits[0].produit.nom;
    return `${order.produits[0].produit.nom} +${order.produits.length - 1}`;
  };

  const getTotalQuantity = (order: ReturnedOrder) => {
    if (!order.produits || order.produits.length === 0) return 0;
    return order.produits.reduce((total, item) => total + item.quantite, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleReceiveReturnedOrder = async (orderId: string) => {
    try {
      setProcessing(orderId);
      const response = await fetch(`/api/magasinier/commandes/commandes-en-retour/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ statut: "LIVREE" }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour de la commande");
      }
      const updatedOrders = returnedOrders.filter((order) => order.id !== orderId);
      setReturnedOrders(updatedOrders);
      setFilteredOrders((prev) => prev.filter((order) => order.id !== orderId));
      toast.success("Commande marquée comme livrée. Stock mis à jour !");
      setSelectedOrder(null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de mettre à jour la commande");
    } finally {
      setProcessing(null);
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
          onClick={fetchReturnedOrders}
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Commandes en Retour
          </h2>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger
              className="w-[180px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
              aria-label="Filtrer par mois"
            >
              <SelectValue placeholder="Filtrer par mois" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              <SelectItem value="all" className="hover:bg-blue-50">Tous les mois</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value} className="hover:bg-blue-50">
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption>Liste des commandes en retour.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">ID Commande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Fournisseur</TableHead>
                <TableHead className="text-gray-700 font-semibold">Article(s)</TableHead>
                <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Date</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                    Aucune commande en retour trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-blue-600">
                      {order.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{order.fournisseur?.nom || "Sans fournisseur"}</TableCell>
                    <TableCell>{getPrimaryProductName(order)}</TableCell>
                    <TableCell>{getTotalQuantity(order)}</TableCell>
                    <TableCell className="text-right">{formatDate(order.date)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                        onClick={() => setSelectedOrder(order)}
                        aria-label={`Voir les détails de la commande ${order.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700 font-medium">
                  Total Commandes en Retour
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {filteredOrders.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails de la Commande
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>ID Commande :</strong> {selectedOrder.id}
                  </p>
                  <p className="text-gray-700">
                    <strong>Fournisseur :</strong> {selectedOrder.fournisseur?.nom || "Non spécifié"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Date :</strong> {formatDate(selectedOrder.date)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Statut :</strong> En retour
                  </p>
                  {selectedOrder.raisonRetour && (
                    <p className="text-gray-700">
                      <strong>Raison du retour :</strong> {selectedOrder.raisonRetour}
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-medium text-gray-700 mb-2">Liste des produits :</p>
                  {selectedOrder.produits.length === 0 ? (
                    <p className="text-gray-500">Aucun produit</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedOrder.produits.map((item, index) => (
                        <li key={index} className="border-b pb-2 border-gray-200">
                          <p className="text-gray-700">{item.produit.nom}</p>
                          <p className="text-sm text-gray-500">Quantité : {item.quantite}</p>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  <Button
                    onClick={() => handleReceiveReturnedOrder(selectedOrder.id)}
                    disabled={processing === selectedOrder.id}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                  >
                    {processing === selectedOrder.id ? "Traitement..." : "Réceptionner le retour"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}