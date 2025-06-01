"use client";

import { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { ProductSelectionModal } from "./ProductSelectionModal";
import { OrderFormModal } from "./OrderFormModal";
import { toast } from "sonner";

interface Product {
  id: string;
  nom: string;
  marque?: string;
}

interface OrderProduct {
  id: string;
  produit: Product;
  quantite: number;
  reordered: boolean;
}

interface Commande {
  id: string;
  statut: string;
  datePrevu: string | null;
  dateLivraison: string | null;
  createdAt: string;
  produits: OrderProduct[];
}

interface SelectedProduct {
  id: string;
  produitId: string;
  nom: string;
  marque: string;
  quantite: number;
}

export function ValidatedOrdersTable() {
  const [orders, setOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Commande | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/gestionnaire/commandes/validee");
      if (!response.ok) {
        throw new Error("Échec de la récupération des commandes");
      }
      const data: Commande[] = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Commande) => {
    setSelectedOrder(order);
    setShowProductModal(true);
  };

  const handleProductsSelected = (products: SelectedProduct[]) => {
    setSelectedProducts(products);
    setShowProductModal(false);
    setShowOrderForm(true);
  };

  const handleOrderSubmit = async () => {
    setShowOrderForm(false);
    setSelectedProducts([]);
    await fetchOrders();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const ordersWithMetadata = orders.map((order) => ({
    ...order,
    reorderableProducts: order.produits.filter((p) => !p.reordered).length,
  }));

  if (loading) {
    return (
      <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
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
          onClick={fetchOrders}
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
          Commandes Validées
        </h2>
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-500 mb-4">
              Liste des commandes validées
            </TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="w-[120px] text-gray-700 font-semibold">
                  ID Commande
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                <TableHead className="text-gray-700 font-semibold">Produits</TableHead>
                <TableHead className="text-gray-700 font-semibold">
                  Produits Recom.
                </TableHead>
                <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {ordersWithMetadata.length > 0 ? (
                  ordersWithMetadata.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {order.produits.length} produits
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {order.reorderableProducts} disponible(s)
                      </TableCell>
                      <TableCell className="text-gray-700">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            order.statut === "LIVREE"
                              ? "bg-green-100 text-green-800"
                              : order.statut === "EN_COURS"
                              ? "bg-blue-100 text-blue-800"
                              : order.statut === "ANNULEE"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                          disabled={order.reorderableProducts === 0}
                          className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50"
                          aria-label={`Voir les détails de la commande ${order.id}`}
                        >
                          Détails
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-gray-500"
                    >
                      Aucune commande validée trouvée
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={6} className="text-gray-700">
                  Total: {ordersWithMetadata.length} commandes
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {showProductModal && selectedOrder && (
          <ProductSelectionModal
            order={selectedOrder}
            onClose={() => setShowProductModal(false)}
            onProductsSelected={handleProductsSelected}
          />
        )}

        {showOrderForm && selectedOrder && (
          <OrderFormModal
            selectedProducts={selectedProducts}
            sourceOrderId={selectedOrder.id}
            onClose={() => setShowOrderForm(false)}
            onSubmit={handleOrderSubmit}
          />
        )}
      </motion.div>
    </div>
  );
}