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
import { Trash2, Eye, Plus, X, FileText } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

// Types adaptés au schéma de l'API
type Produit = {
  id: string;
  nom: string;
  quantite: number;
};

type Order = {
  id: string;
  fournisseur: { id: string; nom: string } | null;
  produits: { produit: Produit; quantite: number }[];
  statut: "VALIDE" | "NON_VALIDE";
  date: string;
  admin?: { id: string; name: string } | null;
};

type NewOrderData = {
  produits: { produitId: string; quantite: number }[];
};

export function ValidatedOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newOrder, setNewOrder] = useState<NewOrderData>({
    produits: [{ produitId: "", quantite: 1 }],
  });
  const [availableProduits, setAvailableProduits] = useState<Produit[]>([]);
  const [magasinierName, setMagasinierName] = useState<string>("Magasinier inconnu");
  const [adminNames, setAdminNames] = useState<{ [orderId: string]: string }>({}); // Store admin names for each order

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
    fetchOptions();
    fetchMagasinierProfile();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/magasinier/commandes/mescommandes");
      console.log("Fetch orders response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Fetch orders error data:", errorData);
        throw new Error(errorData.error || "Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      console.log("Fetch orders data:", data);
      setOrders(data);
      setFilteredOrders(data);

      // Fetch admin names for validated orders
      const validatedOrders = data.filter((order: Order) => order.statut === "VALIDE");
      const adminPromises = validatedOrders.map(async (order: Order) => {
        const adminName = await fetchAdminName(order.id);
        return { orderId: order.id, adminName };
      });
      const adminResults = await Promise.all(adminPromises);
      const adminMap = adminResults.reduce((acc: { [key: string]: string }, { orderId, adminName }) => {
        acc[orderId] = adminName;
        return acc;
      }, {});
      setAdminNames(adminMap);
    } catch (err: any) {
      setError(`Impossible de charger les commandes: ${err.message}`);
      console.error("Fetch orders error:", err);
      toast.error(`Impossible de charger les commandes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await fetch("/api/magasinier/commandes/mescommandes/products");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des produits");
      }
      const data = await response.json();
      if (data.error) throw new Error(data.details || data.error);
      console.log("Fetched products:", data);
      setAvailableProduits(data);
    } catch (err: any) {
      console.error("Fetch options error:", err);
      toast.error("Impossible de charger les produits");
    }
  };

  const fetchMagasinierProfile = async () => {
    try {
      const response = await fetch("/api/magasinier/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Magasinier profile response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Magasinier profile error data:", errorData);
        throw new Error(`HTTP error! status: ${response.status}, ${errorData.error || ""}`);
      }
      const data = await response.json();
      setMagasinierName(data.name || "Magasinier inconnu");
      console.log("Magasinier name set to:", data.name);
    } catch (err: any) {
      console.error("Fetch magasinier profile error:", err.message, err.stack);
      setMagasinierName("Magasinier inconnu");
    }
  };

  const fetchAdminName = async (orderId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/magasinier/commandes/admin?id=${orderId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error fetching admin for order ${orderId}:`, errorData);
        return "Admin inconnu";
      }
      const data = await response.json();
      return data.adminName || "Admin inconnu";
    } catch (err: any) {
      console.error(`Error fetching admin name for order ${orderId}:`, err.message);
      return "Admin inconnu";
    }
  };

  const handleAddOrder = async () => {
    if (newOrder.produits.some((prod) => !prod.produitId || prod.quantite <= 0)) {
      toast.error("Veuillez sélectionner des produits valides avec des quantités positives");
      return;
    }

    console.log("Sending POST request with data:", JSON.stringify(newOrder, null, 2));
    try {
      setIsAdding(true);
      const response = await fetch("/api/magasinier/commandes/mescommandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
      console.log("POST response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("POST error data:", errorData);
        throw new Error(errorData.error || "Erreur lors de la création de la commande");
      }
      const newOrderData = await response.json();
      console.log("POST response data:", newOrderData);
      setOrders((prev) => [...prev, newOrderData]);
      setFilteredOrders((prev) => [...prev, newOrderData]);
      setNewOrder({ produits: [{ produitId: "", quantite: 1 }] });
      toast.success("Commande ajoutée avec succès");
    } catch (err: any) {
      console.error("Add order error:", err);
      toast.error(err.message || "Impossible d'ajouter la commande");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/magasinier/commandes/mescommandes?id=${orderId}`, {
        method: "DELETE",
      });
      console.log("DELETE response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("DELETE error data:", errorData);
        throw new Error(errorData.error || "Erreur lors de la suppression de la commande");
      }
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setFilteredOrders((prev) => prev.filter((order) => order.id !== orderId));
      toast.success("Commande annulée avec succès");
    } catch (err: any) {
      console.error("Cancel order error:", err);
      toast.error(err.message || "Impossible d'annuler la commande");
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

  const generatePDF = (order: Order) => {
    try {
      const doc = new jsPDF();

      // Load and add the faculty logo
      const logoUrl = "/essths.png";
      const logoWidth = 30;
      const logoHeight = 30;
      doc.addImage(logoUrl, "PNG", 20, 10, logoWidth, logoHeight);

      // Add Magasinier name
      doc.setFontSize(12);
      doc.text(`Magasinier: ${magasinierName}`, 20, 45);

      // Add Order Details
      doc.setFontSize(16);
      doc.text("Détails de la Commande", 20, 60);
      doc.setFontSize(12);
      doc.text(`ID Commande: ${order.id}`, 20, 70);
      doc.text(`Fournisseur: ${order.fournisseur?.nom || "Non défini"}`, 20, 80);
      doc.text(`Date: ${formatDate(order.date)}`, 20, 90);
      doc.text(`Statut: ${getStatusLabel(order.statut)}`, 20, 100);
      if (order.statut === "VALIDE") {
        const adminName = adminNames[order.id] || "Admin inconnu";
        doc.text(`Validée par: ${adminName}`, 20, 110);
      }
      doc.text("Produits:", 20, 120);
      let yPosition = 130;
      order.produits.forEach((item, index) => {
        doc.text(`${index + 1}. ${item.produit.nom} - Quantité: ${item.quantite}`, 20, yPosition);
        yPosition += 10;
      });
      doc.save(`commande-${order.id}.pdf`);
      toast.success("PDF exporté avec succès");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("Erreur lors de l'exportation en PDF: " + err.message);
    }
  };

  useEffect(() => {
    let filtered = [...orders];
    if (selectedStatus !== "all") {
      filtered = filtered.filter((order) => order.statut === selectedStatus);
    }
    if (selectedMonth !== "all") {
      const monthNumber = parseInt(selectedMonth);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === monthNumber;
      });
    }
    setFilteredOrders(filtered);
  }, [selectedStatus, selectedMonth, orders]);

  const getPrimaryProductName = (order: Order) => {
    if (!order.produits || order.produits.length === 0) return "Aucun produit";
    if (order.produits.length === 1) return order.produits[0].produit.nom;
    return `${order.produits[0].produit.nom} +${order.produits.length - 1}`;
  };

  const getTotalQuantity = (order: Order) => {
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

  const getStatusStyle = (status: string) => {
    return status === "VALIDE"
      ? "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
      : "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
  };

  const getStatusLabel = (status: string) => {
    return status === "VALIDE" ? "Validée" : "Non validée";
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
            Gestion des Commandes
          </h2>
          <div className="flex gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger
                className="w-[180px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
                aria-label="Filtrer par statut"
              >
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-700">
                <SelectItem value="all" className="hover:bg-blue-50">
                  Tous les statuts
                </SelectItem>
                <SelectItem value="VALIDE" className="hover:bg-blue-50">
                  Validée
                </SelectItem>
                <SelectItem value="NON_VALIDE" className="hover:bg-blue-50">
                  Non validée
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger
                className="w-[180px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
                aria-label="Filtrer par mois"
              >
                <SelectValue placeholder="Filtrer par mois" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-700">
                <SelectItem value="all" className="hover:bg-blue-50">
                  Tous les mois
                </SelectItem>
                {months.map((month) => (
                  <SelectItem
                    key={month.value}
                    value={month.value}
                    className="hover:bg-blue-50"
                  >
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
              onClick={() => setIsAdding(true)}
              aria-label="Ajouter une nouvelle commande"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption>Liste des commandes validées et non validées.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-blue-200">
              <TableRow>
                <TableHead className="text-blue-700 font-semibold">ID Commande</TableHead>
                <TableHead className="text-blue-700 font-semibold">Fournisseur</TableHead>
                <TableHead className="text-blue-700 font-semibold">Article(s)</TableHead>
                <TableHead className="text-blue-700 font-semibold">Quantité</TableHead>
                <TableHead className="text-blue-700 font-semibold">Statut</TableHead>
                <TableHead className="text-blue-700 font-semibold">Validée par</TableHead>
                <TableHead className="text-right text-blue-700 font-semibold">Date</TableHead>
                <TableHead className="text-right text-blue-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                    Aucune commande trouvée
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
                    <TableCell>{order.fournisseur?.nom || "Non défini"}</TableCell>
                    <TableCell>{getPrimaryProductName(order)}</TableCell>
                    <TableCell>{getTotalQuantity(order)}</TableCell>
                    <TableCell>
                      <span className={getStatusStyle(order.statut)}>
                        {getStatusLabel(order.statut)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {order.statut === "VALIDE" ? adminNames[order.id] || "Admin inconnu" : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">{formatDate(order.date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`Voir les détails de la commande ${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.statut === "NON_VALIDE" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-800"
                              onClick={() => setOrderToDelete(order)}
                              disabled={isDeleting}
                              aria-label={`Annuler la commande ${order.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                              onClick={() => generatePDF(order)}
                              aria-label={`Exporter la commande ${order.id} en PDF`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={7} className="text-gray-700 font-medium">
                  Total Commandes
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {filteredOrders.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Modal de détail de commande */}
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
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
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
                    <strong>Fournisseur :</strong> {selectedOrder.fournisseur?.nom || "Non défini"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Date :</strong> {formatDate(selectedOrder.date)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Statut :</strong>{" "}
                    <span className={getStatusStyle(selectedOrder.statut)}>
                      {getStatusLabel(selectedOrder.statut)}
                    </span>
                  </p>
                  {selectedOrder.statut === "VALIDE" && (
                    <p className="text-gray-700">
                      <strong>Validée par :</strong>{" "}
                      <span className="text-blue-600 font-medium">
                        {adminNames[selectedOrder.id] || "Admin inconnu"}
                      </span>
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
                          <p className="text-sm text-gray-500">
                            Quantité : {item.quantite}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedOrder.statut === "VALIDE" && (
                  <div className="text-gray-500 text-sm">
                    Debug: Admin name - {adminNames[selectedOrder.id] || "Not fetched"}
                  </div>
                )}
                <DialogFooter className="mt-4">
                  {selectedOrder.statut === "NON_VALIDE" && (
                    <>
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800 mr-2"
                        onClick={() => generatePDF(selectedOrder)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Exporter en PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-800"
                        onClick={() => {
                          setOrderToDelete(selectedOrder);
                          setSelectedOrder(null);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Annuler la commande
                      </Button>
                    </>
                  )}
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Fermer
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Boîte de dialogue de confirmation pour la suppression */}
        <AlertDialog
          open={!!orderToDelete}
          onOpenChange={() => !isDeleting && setOrderToDelete(null)}
        >
          <AlertDialogContent className="bg-white rounded-xl shadow-2xl border border-red-100">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Annuler la commande
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible et
                supprimera définitivement la commande de la base de données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <DialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                className="border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => orderToDelete && handleCancelOrder(orderToDelete.id)}
                disabled={isDeleting}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </DialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog pour ajouter une commande */}
        <Dialog
          open={isAdding}
          onOpenChange={(open) => {
            if (!isAdding) setIsAdding(open);
          }}
        >
          <DialogContent className="sm:max-w-[500px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Ajouter une nouvelle commande
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="produits" className="text-sm font-medium text-gray-700">
                  Produits
                </label>
                {newOrder.produits.map((prod, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={prod.produitId}
                      onValueChange={(value) => {
                        const updatedProduits = [...newOrder.produits];
                        updatedProduits[index] = { ...prod, produitId: value };
                        setNewOrder({ ...newOrder, produits: updatedProduits });
                      }}
                    >
                      <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400">
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-700">
                        {availableProduits.map((produit) => (
                          <SelectItem
                            key={produit.id}
                            value={produit.id}
                            className="hover:bg-blue-50"
                          >
                            {produit.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="number"
                      min="1"
                      value={prod.quantite}
                      onChange={(e) => {
                        const updatedProduits = [...newOrder.produits];
                        updatedProduits[index] = {
                          ...prod,
                          quantite: parseInt(e.target.value) || 1,
                        };
                        setNewOrder({ ...newOrder, produits: updatedProduits });
                      }}
                      className="w-20 p-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                      placeholder="Quantité"
                    />
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-100"
                        onClick={() => {
                          const updatedProduits = newOrder.produits.filter(
                            (_, i) => i !== index
                          );
                          setNewOrder({ ...newOrder, produits: updatedProduits });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-blue-200 text-blue-600 hover:bg-blue-100"
                  onClick={() =>
                    setNewOrder({
                      ...newOrder,
                      produits: [...newOrder.produits, { produitId: "", quantite: 1 }],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un produit
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleAddOrder}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              >
                {isAdding ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}