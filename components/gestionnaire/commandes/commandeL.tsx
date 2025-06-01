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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  useEffect(() => {
    const fetchDeliveredOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/gestionnaire/commandes/commandes-livrees", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Erreur HTTP ${response.status}: ${errorData || "Erreur lors de la récupération des commandes"}`);
        }

        const data = await response.json();
        setDeliveredOrders(data);
        setFilteredOrders(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        setError(`Impossible de charger les commandes livrées: ${errorMessage}`);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

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
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const handleViewFacture = async (orderId: string) => {
    if (!selectedOrder || !selectedOrder.facture) {
      setFactureError("Aucune facture disponible pour cette commande");
      return;
    }

    try {
      setFactureLoading(true);
      setFactureError(null);
      const response = await fetch(`/api/gestionnaire/commandes/facture/${orderId}`);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorData || "Erreur lors de la récupération de la facture"}`);
      }

      const data = await response.json();
      if (data.facturePath) {
        setFacturePath(data.facturePath);
        setFactureModalOpen(true);
      } else {
        throw new Error("Chemin de facture non disponible");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setFactureError(`Impossible de charger la facture: ${errorMessage}`);
      console.error("Facture fetch error:", err);
    } finally {
      setFactureLoading(false);
    }
  };

  const openFactureInNewTab = () => {
    if (facturePath) window.open(facturePath, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <span className="ml-4 text-lg font-semibold text-gray-700">Chargement des commandes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto bg-red-50 border-red-200 shadow-md">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      {/* Header with Filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Commandes Livrées
        </h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px] bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 focus:ring-blue-400">
            <SelectValue placeholder="Filtrer par mois" />
          </SelectTrigger>
          <SelectContent className="bg-white shadow-lg border-blue-100">
            <SelectItem value="all" className="hover:bg-blue-50">Tous les mois</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value} className="hover:bg-blue-50">
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto rounded-lg border border-gray-200">
        <Table className="w-full text-sm">
          <TableCaption className="text-gray-500 mb-4">Historique des commandes livrées</TableCaption>
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
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Aucune commande livrée trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="hover:bg-blue-50 transition-colors duration-200"
                >
                  <TableCell className="font-medium text-blue-600">{order.id.substring(0, 8)}...</TableCell>
                  <TableCell className="text-gray-700">{order.fournisseur?.nom || "Non spécifié"}</TableCell>
                  <TableCell className="text-gray-700">{getPrimaryProductName(order)}</TableCell>
                  <TableCell className="text-gray-700">{getTotalQuantity(order)}</TableCell>
                  <TableCell className="text-right text-gray-700">{formatDate(order.dateLivraison)}</TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-all"
                    >
                      Détails
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        handleViewFacture(order.id);
                      }}
                      disabled={!order.facture}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Facture
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-gray-50">
            <TableRow>
              <TableCell colSpan={5} className="text-gray-700 font-medium">Total Commandes Livrées</TableCell>
              <TableCell className="text-right text-gray-700 font-semibold">{filteredOrders.length}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Modal for Order Details */}
      <Dialog open={!!selectedOrder && !factureModalOpen} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg bg-white rounded-xl shadow-2xl border border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Détails de la Commande
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 max-h-[70vh] overflow-y-auto p-4">
              <div className="space-y-2">
                <p className="text-gray-700"><strong>ID Commande :</strong> {selectedOrder.id}</p>
                <p className="text-gray-700"><strong>Fournisseur :</strong> {selectedOrder.fournisseur?.nom || "Non spécifié"}</p>
                {selectedOrder.fournisseur?.contact && (
                  <p className="text-gray-700"><strong>Contact :</strong> {selectedOrder.fournisseur.contact}</p>
                )}
                <p className="text-gray-700"><strong>Date de livraison :</strong> {formatDate(selectedOrder.dateLivraison)}</p>
                <p className="text-gray-700"><strong>Date prévue :</strong> {formatDate(selectedOrder.datePrevu)}</p>
                <p className="text-gray-700"><strong>Statut :</strong> <span className="text-green-600 font-medium">Livrée</span></p>
              </div>
              <div className="mt-4">
                <p className="font-medium text-gray-800 mb-2">Liste des produits :</p>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="p-3 text-left text-gray-700 font-semibold">Produit</th>
                        <th className="p-3 text-left text-gray-700 font-semibold">Marque</th>
                        <th className="p-3 text-right text-gray-700 font-semibold">Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.produits.map((item, index) => (
                        <tr key={index} className="border-t hover:bg-blue-50 transition-colors">
                          <td className="p-3 text-gray-700">{item.produit.nom}</td>
                          <td className="p-3 text-gray-700">{item.produit.marque}</td>
                          <td className="p-3 text-right text-gray-700">{item.quantite}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <DialogFooter className="mt-4">
                {selectedOrder.facture ? (
                  <Button
                    onClick={() => handleViewFacture(selectedOrder.id)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
                  >
                    <FileText className="h-4 w-4 mr-2" /> Voir la facture
                  </Button>
                ) : (
                  <Button disabled variant="outline" className="border-gray-300 text-gray-500">
                    <AlertCircle className="h-4 w-4 mr-2" /> Pas de facture
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal for Invoice */}
      <Dialog open={factureModalOpen} onOpenChange={setFactureModalOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl border border-blue-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Facture de la Commande
            </DialogTitle>
          </DialogHeader>
          {factureLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
              <span className="ml-4 text-lg font-semibold text-gray-700">Chargement de la facture...</span>
            </div>
          ) : factureError ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">{factureError}</AlertDescription>
            </Alert>
          ) : facturePath ? (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex-1 overflow-hidden border rounded-lg shadow-inner">
                <iframe src={facturePath} className="w-full h-full" title="Facture" />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setFactureModalOpen(false)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Fermer
                </Button>
                <Button
                  onClick={openFactureInNewTab}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                >
                  <Download className="h-4 w-4 mr-2" /> Télécharger
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="text-gray-700">Impossible d'afficher la facture</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}