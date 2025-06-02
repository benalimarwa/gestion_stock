"use client";

import { useEffect, useState, useRef } from "react";
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
import { Eye, Package, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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
  } | null;
  produits: {
    produit: Produit;
    quantite: number;
  }[];
  statut: "EN_COURS" | "LIVREE" | "EN_RETOUR" | "ANNULEE" | "VALIDE" | "NON_VALIDE";
  createdAt: string;
  updatedAt: string;
  datePrevu?: string;
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
  const [returnReasonModal, setReturnReasonModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [orderToReturn, setOrderToReturn] = useState<string | null>(null);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [orderToDeliver, setOrderToDeliver] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError(null);
      const response = await fetch("/api/magasinier/commandes/commandes-en-attente");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des commandes");
      }
      const data = await response.json();
      setReturnedOrders(data);
      setFilteredOrders(data);
    } catch (err) {
      setError("Impossible de charger les commandes en cours");
      console.error(err);
      toast.error("Impossible de charger les commandes en cours");
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
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === monthNumber;
    });
    setFilteredOrders(filtered);
  }, [selectedMonth, returnedOrders]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const resetFileInput = () => {
    setInvoiceFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const logRegistryAction = async (productIds: string[], actionType: "COMMANDE_LIVREE", description: string) => {
    try {
      const response = await fetch("/api/magasinier/registre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds,
          actionType,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'enregistrement dans le registre");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement dans le registre:", error);
      toast.warning("Commande livrée, mais échec de l'enregistrement dans le registre");
    }
  };
// Version recommandée avec FormData (plus simple pour les uploads de fichiers)
const deliverOrder = async () => {
  if (!orderToDeliver) return;
  
  try {
    setProcessingOrder(orderToDeliver);
    
    const formData = new FormData();
    formData.append("statut", "LIVREE");
    
    if (invoiceFile) {
      console.log("Frontend file details:", {
        name: invoiceFile.name,
        size: invoiceFile.size,
        type: invoiceFile.type,
        lastModified: invoiceFile.lastModified,
      });
      
      if (invoiceFile.size === 0) {
        toast.error("Le fichier facture est vide");
        return;
      }
      if (invoiceFile.type !== "application/pdf") {
        toast.error("Veuillez sélectionner un fichier PDF valide");
        return;
      }
      
      // Vérifier que le fichier peut être lu
      try {
        const arrayBuffer = await invoiceFile.arrayBuffer();
        console.log("File can be read, buffer size:", arrayBuffer.byteLength);
        if (arrayBuffer.byteLength === 0) {
          toast.error("Le fichier sélectionné est corrompu ou vide");
          return;
        }
      } catch (readError) {
        console.error("Error reading file:", readError);
        toast.error("Impossible de lire le fichier sélectionné");
        return;
      }
      
      formData.append("facture", invoiceFile);
    }

    console.log("Sending request to:", `/api/magasinier/commandes/commandes-en-attente/${orderToDeliver}/status`);
    
    const response = await fetch(`/api/magasinier/commandes/commandes-en-attente/${orderToDeliver}/status`, {
      method: "PUT",
      body: formData,
      // IMPORTANT: Ne pas définir Content-Type pour FormData
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        errorMessage = errorData.error || errorData.message || `Erreur ${response.status}`;
      } catch (jsonError) {
        // Si la réponse n'est pas du JSON valide
        const textResponse = await response.text();
        console.error("Non-JSON error response:", textResponse);
        errorMessage = `Erreur serveur: ${response.status} - ${textResponse || 'Réponse vide'}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("Success response:", result);

    // Gestion du succès
    const order = returnedOrders.find((o) => o.id === orderToDeliver);
    if (order && order.produits.length > 0) {
      const productIds = order.produits.map((item) => item.produit.id);
      const description = `Commande ${order.id.substring(0, 8)}... livrée. Produits: ${order.produits
        .map((item) => `${item.produit.nom} (Quantité: ${item.quantite})`)
        .join(", ")}`;
      await logRegistryAction(productIds, "COMMANDE_LIVREE", description);
    }

    const updatedOrders = returnedOrders.filter((order) => order.id !== orderToDeliver);
    setReturnedOrders(updatedOrders);
    updateFilteredOrders(orderToDeliver);
    toast.success("Commande marquée comme livrée. Quantités de produits mises à jour !");
    
  } catch (err) {
    console.error("Erreur lors de la livraison de la commande:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : 'No stack trace');
    toast.error(err instanceof Error ? err.message : "Impossible de mettre à jour le statut de la commande");
  } finally {
    setProcessingOrder(null);
    setDeliveryModal(false);
    setOrderToDeliver(null);
    resetFileInput();
  }
};

// Option 2: Si votre API ne peut gérer que du JSON, vous devrez convertir le fichier en base64
const deliverOrderWithBase64 = async () => {
  if (!orderToDeliver) return;
  
  try {
    setProcessingOrder(orderToDeliver);
    
    // Typer correctement l'objet de requête
    let requestBody: {
      statut: string;
      facture?: {
        data: string;
        name: string;
        type: string;
      };
    } = {
      statut: "LIVREE"
    };
    
    if (invoiceFile) {
      console.log("Frontend file details:", {
        name: invoiceFile.name,
        size: invoiceFile.size,
        type: invoiceFile.type,
        lastModified: invoiceFile.lastModified,
      });
      
      if (invoiceFile.size === 0) {
        toast.error("Le fichier facture est vide");
        return;
      }
      if (invoiceFile.type !== "application/pdf") {
        toast.error("Veuillez sélectionner un fichier PDF valide");
        return;
      }
      
      // Convertir le fichier en base64
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result.split(',')[1]); // Enlever le préfixe data:
            } else {
              reject(new Error('Erreur de lecture du fichier'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(invoiceFile);
        });
        
        requestBody.facture = {
          data: base64,
          name: invoiceFile.name,
          type: invoiceFile.type
        };
      } catch (readError) {
        console.error("Error reading file:", readError);
        toast.error("Impossible de lire le fichier sélectionné");
        return;
      }
    }

    const response = await fetch(`/api/magasinier/commandes/commandes-en-attente/${orderToDeliver}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        const textResponse = await response.text();
        console.error("Non-JSON error response:", textResponse);
        throw new Error(`Erreur serveur: ${response.status} - ${textResponse}`);
      }
      throw new Error(errorData.error || errorData.message || `Erreur ${response.status}`);
    }

    const result = await response.json();
    console.log("Success response:", result);

    // Reste du code de gestion du succès...
    const order = returnedOrders.find((o) => o.id === orderToDeliver);
    if (order && order.produits.length > 0) {
      const productIds = order.produits.map((item) => item.produit.id);
      const description = `Commande ${order.id.substring(0, 8)}... livrée. Produits: ${order.produits
        .map((item) => `${item.produit.nom} (Quantité: ${item.quantite})`)
        .join(", ")}`;
      await logRegistryAction(productIds, "COMMANDE_LIVREE", description);
    }

    const updatedOrders = returnedOrders.filter((order) => order.id !== orderToDeliver);
    setReturnedOrders(updatedOrders);
    updateFilteredOrders(orderToDeliver);
    toast.success("Commande marquée comme livrée. Quantités de produits mises à jour !");
    
  } catch (err) {
    console.error("Erreur lors de la livraison de la commande:", err);
    toast.error(err instanceof Error ? err.message : "Impossible de mettre à jour le statut de la commande");
  } finally {
    setProcessingOrder(null);
    setDeliveryModal(false);
    setOrderToDeliver(null);
    resetFileInput();
  }
};
  const updateOrderStatus = async (orderId: string, newStatus: string, raisonRetour?: string) => {
    try {
      setProcessingOrder(orderId);
      const successMessage =
        newStatus === "EN_RETOUR" ? "Commande marquée comme en retour" : "Commande annulée avec succès";
      const formData = new FormData();
      formData.append("statut", newStatus);
      if (raisonRetour) {
        formData.append("raisonRetour", raisonRetour);
      }
      const response = await fetch(`/api/magasinier/commandes/commandes-en-attente/${orderId}/status`, {
        method: "PUT",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }
      const updatedOrders = returnedOrders.filter((order) => order.id !== orderId);
      setReturnedOrders(updatedOrders);
      updateFilteredOrders(orderId);
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Impossible de mettre à jour le statut de la commande");
    } finally {
      setProcessingOrder(null);
    }
  };

  const updateFilteredOrders = (orderId: string) => {
    if (selectedMonth === "all") {
      setFilteredOrders((prev) => prev.filter((order) => order.id !== orderId));
    } else {
      const monthNumber = parseInt(selectedMonth);
      setFilteredOrders((prev) =>
        prev.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === monthNumber && order.id !== orderId;
        })
      );
    }
  };

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

  const openReturnReasonModal = (orderId: string) => {
    setOrderToReturn(orderId);
    setReturnReason("");
    setReturnReasonModal(true);
  };

  const openDeliveryModal = (orderId: string) => {
    setOrderToDeliver(orderId);
    resetFileInput();
    setDeliveryModal(true);
  };

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
          <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Commandes en Cours
          </h2>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
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
            <TableCaption>Liste des commandes en cours.</TableCaption>
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
                    Aucune commande en cours trouvée
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
                    <TableCell className="text-right">{formatDate(order.createdAt)}</TableCell>
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
                          className="h-8 w-8 p-0 border-green-200 text-green-600 hover:bg-green-100 hover:text-green-800"
                          onClick={() => openDeliveryModal(order.id)}
                          disabled={processingOrder === order.id}
                          aria-label={`Marquer la commande ${order.id} comme livrée`}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-amber-200 text-amber-600 hover:bg-amber-100 hover:text-amber-800"
                          onClick={() => openReturnReasonModal(order.id)}
                          disabled={processingOrder === order.id}
                          aria-label={`Marquer la commande ${order.id} comme en retour`}
                        >
                          <X className="h-4 w-4" />
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
                  Total Commandes en Cours
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {filteredOrders.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Modal pour les détails de la commande */}
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
                    <strong>Date de commande :</strong> {formatDate(selectedOrder.createdAt)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Statut :</strong> En cours
                  </p>
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
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal pour la raison de retour */}
        <Dialog
          open={returnReasonModal}
          onOpenChange={(open) => {
            if (!open) {
              setOrderToReturn(null);
              setReturnReason("");
            }
            setReturnReasonModal(open);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-amber-100">
            <button
              onClick={() => setReturnReasonModal(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-700">
                Raison du Retour
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reason" className="text-gray-700">
                  Veuillez indiquer la raison du retour :
                </Label>
                <Textarea
                  id="reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Exemple : Produits endommagés, erreur de commande..."
                  className="min-h-[120px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={handleReturnOrder}
                disabled={!returnReason.trim() || !!processingOrder}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
              >
                Confirmer le retour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal pour la livraison avec upload de facture */}
        <Dialog
          open={deliveryModal}
          onOpenChange={(open) => {
            if (!open) {
              setOrderToDeliver(null);
              resetFileInput();
            }
            setDeliveryModal(open);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-green-100">
            <button
              onClick={() => setDeliveryModal(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-700">
                Confirmer la Livraison
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice" className="text-gray-700">
                  Facture (PDF, optionnel) :
                </Label>
                <Input
                  id="invoice"
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="bg-gray-50 border-gray-200 text-gray-700"
                />
                <p className="text-sm text-gray-500">
                  Vous pouvez télécharger une facture au format PDF (optionnel).
                </p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={deliverOrder}
                disabled={!!processingOrder}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
              >
                Confirmer la livraison
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}