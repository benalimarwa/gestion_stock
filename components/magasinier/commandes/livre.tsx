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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, AlertCircle, Eye, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Types mis à jour pour correspondre au schéma Prisma
type Produit = {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
};

type CommandeProduit = {
  produit: Produit;
  quantite: number;
};

type DeliveredOrder = {
  id: string;
  fournisseurId: string | null;
  fournisseur: {
    id: string;
    nom: string;
    contact?: string;
  } | null;
  produits: CommandeProduit[];
  statut: "LIVREE";
  dateLivraison: string;
  datePrevu: string;
  facture: string | null;
};

export function DeliveredOrdersTable() {
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<DeliveredOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DeliveredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [facturePath, setFacturePath] = useState<string | null>(null);
  const [factureLoading, setFactureLoading] = useState(false);
  const [factureError, setFactureError] = useState<string | null>(null);

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

  // Moved fetchDeliveredOrders outside useEffect
  const fetchDeliveredOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/magasinier/commandes/commandes-livrees");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      setDeliveredOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      setError("Impossible de charger les commandes livrées");
      console.error(err);
      toast.error("Impossible de charger les commandes livrées");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveredOrders();
  }, []);

  useEffect(() => {
    if (selectedMonth === "all") {
      setFilteredOrders(deliveredOrders);
      return;
    }
    const monthNumber = parseInt(selectedMonth);
    const filtered = deliveredOrders.filter((order) => {
      const orderDate = new Date(order.dateLivraison);
      return orderDate.getMonth() === monthNumber;
    });
    setFilteredOrders(filtered);
  }, [selectedMonth, deliveredOrders]);

  const getPrimaryProductName = (order: DeliveredOrder) => {
    if (!order.produits || order.produits.length === 0) return "Aucun produit";
    if (order.produits.length === 1) return order.produits[0].produit.nom;
    return `${order.produits[0].produit.nom} +${order.produits.length - 1}`;
  };

  const getTotalQuantity = (order: DeliveredOrder) => {
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

  const handleViewFacture = async (orderId: string) => {
    try {
      setFactureLoading(true);
      setFactureError(null);
      const response = await fetch(`/api/magasinier/commandes/facture/${orderId}`);
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de la facture");
      }
      const data = await response.json();
      if (data.facturePath) {
        setFacturePath(data.facturePath);
        setFactureModalOpen(true);
      } else {
        throw new Error("Chemin de facture non disponible");
      }
    } catch (err) {
      setFactureError("Impossible de charger la facture");
      console.error(err);
      toast.error("Impossible de charger la facture");
    } finally {
      setFactureLoading(false);
    }
  };

  const openFactureInNewTab = () => {
    if (facturePath) {
      window.open(facturePath, "_blank");
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
          onClick={() => {
            setLoading(true);
            fetchDeliveredOrders(); // Now accessible
          }}
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
            Commandes Livrées
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
            <TableCaption>Liste des commandes livrées.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">ID Commande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Fournisseur</TableHead>
                <TableHead className="text-gray-700 font-semibold">Article(s)</TableHead>
                <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Date de livraison</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                    Aucune commande livrée trouvée
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
                    <TableCell>{order.fournisseur?.nom || "Non spécifié"}</TableCell>
                    <TableCell>{getPrimaryProductName(order)}</TableCell>
                    <TableCell>{getTotalQuantity(order)}</TableCell>
                    <TableCell className="text-right">{formatDate(order.dateLivraison)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`Voir les détails de la commande ${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          onClick={() => {
                            setSelectedOrder(order);
                            handleViewFacture(order.id);
                          }}
                          disabled={!order.facture}
                          aria-label={`Voir la facture de la commande ${order.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700 font-medium">
                  Total Commandes Livrées
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {filteredOrders.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Modal pour les détails de la commande */}
        <Dialog open={!!selectedOrder && !factureModalOpen} onOpenChange={() => setSelectedOrder(null)}>
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
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>ID Commande :</strong> {selectedOrder.id}
                  </p>
                  <p className="text-gray-700">
                    <strong>Fournisseur :</strong> {selectedOrder.fournisseur?.nom || "Non spécifié"}
                  </p>
                  {selectedOrder.fournisseur?.contact && (
                    <p className="text-gray-700">
                      <strong>Contact :</strong> {selectedOrder.fournisseur.contact}
                    </p>
                  )}
                  <p className="text-gray-700">
                    <strong>Date de livraison :</strong> {formatDate(selectedOrder.dateLivraison)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Date prévue :</strong> {formatDate(selectedOrder.datePrevu)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Statut :</strong> Livrée
                  </p>
                </div>
                <div className="mt-4">
                  <p className="font-medium text-gray-700 mb-2">Liste des produits :</p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left text-gray-700">Produit</th>
                          <th className="p-2 text-left text-gray-700">Marque</th>
                          <th className="p-2 text-right text-gray-700">Quantité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.produits.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-2 text-center text-gray-500">
                              Aucun produit
                            </td>
                          </tr>
                        ) : (
                          selectedOrder.produits.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 text-gray-700">{item.produit.nom}</td>
                              <td className="p-2 text-gray-700">{item.produit.marque}</td>
                              <td className="p-2 text-right text-gray-700">{item.quantite}</td>
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
                  {selectedOrder.facture ? (
                    <Button
                      onClick={() => handleViewFacture(selectedOrder.id)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" /> Voir la facture
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="border-gray-200 text-gray-500"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" /> Pas de facture disponible
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal pour afficher la facture */}
        <Dialog open={factureModalOpen} onOpenChange={setFactureModalOpen}>
          <DialogContent className="sm:max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setFactureModalOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Facture de la Commande
              </DialogTitle>
            </DialogHeader>
            {factureLoading ? (
              <div className="flex justify-center items-center h-full">
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ) : factureError ? (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600">{factureError}</AlertDescription>
              </Alert>
            ) : facturePath ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex-1 overflow-hidden border rounded-lg border-gray-200">
                  <iframe
                    src={facturePath}
                    className="w-full h-full"
                    title="Facture"
                  ></iframe>
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
                    onClick={openFactureInNewTab}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" /> Télécharger
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <p className="text-gray-500">Impossible d'afficher la facture</p>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}