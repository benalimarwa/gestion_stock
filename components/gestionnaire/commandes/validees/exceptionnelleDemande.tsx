"use client";

import React from "react"; // Added React import
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { StatutDemandeExceptionnelle } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

// Type definitions
type ExceptionalProduct = {
  id: string;
  name: string;
  marque: string | null;
  description: string | null;
};

type DemandeProduitExceptionnel = {
  id: string;
  produitExceptionnelId: string;
  produitExceptionnel: ExceptionalProduct;
  quantite: number;
};

type DemandeExceptionnelle = {
  id: string;
  produitsExceptionnels: DemandeProduitExceptionnel[];
  statut: StatutDemandeExceptionnelle;
  createdAt: string;
  demandeurId: string;
  dateApprouvee: string | null;
  raisonRefus: string | null;
  fournisseurId?: string | null;
  datePrevu?: string | null;
};

type Fournisseur = {
  id: string;
  nom: string;
  contact: string;
  score: number | null;
};

// API endpoint constant
const API_BASE_PATH = "/api/gestionnaire/demandes/exceptionnelle/approuvees";

export function ApprovedExceptionalRequestsTable() {
  const [exceptionalRequests, setExceptionalRequests] = useState<DemandeExceptionnelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DemandeExceptionnelle | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Fournisseur[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [selectedDatePrevu, setSelectedDatePrevu] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    nom: "",
    contact: "",
    score: "",
  });
  // Track ordered product IDs in memory (resets on app restart)
  const [orderedProductIdsMap, setOrderedProductIdsMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchData();
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(
        "/api/gestionnaire/commandes/validee/fournisseurs"
      );
      if (!response.ok) {
        throw new Error("Échec de la récupération des fournisseurs");
      }
      const data: Fournisseur[] = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des fournisseurs:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des fournisseurs"
      );
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching data from ${API_BASE_PATH}`);
      const response = await fetch(API_BASE_PATH, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      console.log("GET Response:", {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: text.slice(0, 100),
      });

      if (!response.ok) {
        if (!text) {
          throw new Error(`Empty response from server (status ${response.status})`);
        }
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error(
            `Received HTML response (status ${response.status}): ${text.slice(0, 100)}...`
          );
        }
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Erreur lors du chargement des demandes exceptionnelles");
        } catch {
          throw new Error(`Invalid JSON response (status ${response.status}): ${text.slice(0, 100)}...`);
        }
      }

      const data: DemandeExceptionnelle[] = JSON.parse(text);
      if (!Array.isArray(data)) {
        console.error("API returned non-array for exceptionalRequests:", data);
        throw new Error("Données des demandes invalides");
      }

      setExceptionalRequests(data);
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error);
      setError(error.message);
      toast.error(error.message || "Erreur lors du chargement des données");
      setExceptionalRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatStatus = (status: StatutDemandeExceptionnelle): string => {
    switch (status) {
      case StatutDemandeExceptionnelle.EN_ATTENTE:
        return "En attente";
      case StatutDemandeExceptionnelle.ACCEPTEE:
        return "Acceptée";
      case StatutDemandeExceptionnelle.COMMANDEE:
        return "Commandée";
      case StatutDemandeExceptionnelle.LIVREE:
        return "Livrée";
      default:
        return status;
    }
  };

  const handleMarkAsOrdered = (request: DemandeExceptionnelle) => {
    setSelectedRequest(request);
    setSelectedProductIds([]);
    setSupplierId("");
    setSelectedDatePrevu("");
    setShowProductModal(true);
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleProductsSelected = () => {
    setShowProductModal(false);
    setShowOrderForm(true);
  };

  const handleSupplierFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setNewSupplier((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.nom || !newSupplier.contact) {
      toast.error("Le nom et le contact du fournisseur sont requis");
      return;
    }

    try {
      const response = await fetch(
        "/api/gestionnaire/commandes/validee/create/fournisseur",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nom: newSupplier.nom,
            contact: newSupplier.contact,
            score: newSupplier.score ? parseFloat(newSupplier.score) : null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Échec de la création du fournisseur"
        );
      }

      const createdSupplier: Fournisseur = await response.json();
      setSuppliers((prev) => [...prev, createdSupplier]);
      setSupplierId(createdSupplier.id);
      setShowSupplierForm(false);
      setNewSupplier({ nom: "", contact: "", score: "" });
      toast.success("Fournisseur créé avec succès");
    } catch (error) {
      console.error("Erreur lors de la création du fournisseur:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Échec de la création du fournisseur"
      );
    }
  };

  const handleOrderSubmit = async () => {
    if (!selectedRequest || !supplierId || !selectedDatePrevu) {
      toast.error("Veuillez sélectionner un fournisseur et une date prévue");
      return;
    }

    setSubmitting(true);
    try {
      const selectedProducts = selectedRequest.produitsExceptionnels.filter((p) =>
        selectedProductIds.includes(p.id)
      );

      // Update the in-memory ordered product IDs
      const currentOrderedIds = orderedProductIdsMap[selectedRequest.id] || [];
      const updatedOrderedIds = [...currentOrderedIds, ...selectedProductIds];
      setOrderedProductIdsMap((prev) => ({
        ...prev,
        [selectedRequest.id]: updatedOrderedIds,
      }));

      // Calculate the new status based on the in-memory count
      const totalProducts = selectedRequest.produitsExceptionnels.length;
      const orderedProductsCount = updatedOrderedIds.length;
      const newStatus =
        orderedProductsCount >= totalProducts
          ? StatutDemandeExceptionnelle.COMMANDEE
          : StatutDemandeExceptionnelle.EN_ATTENTE;

      // Convertir la date au format ISO
      const datePrevuISO = new Date(selectedDatePrevu).toISOString();

      const response = await fetch(`${API_BASE_PATH}/${selectedRequest.id}/commander`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedProducts,
          supplierId,
          datePrevu: datePrevuISO,
          newStatus,
        }),
      });

      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      console.log("PATCH Response:", {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: text.slice(0, 100),
      });

      if (!response.ok) {
        if (!text) {
          throw new Error(`Empty response from server (status ${response.status})`);
        }
        if (text.startsWith("<!DOCTYPE")) {
          throw new Error(
            `Received HTML response (status ${response.status}): ${text.slice(0, 100)}...`
          );
        }
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || "Erreur lors de la mise à jour de la demande");
        } catch {
          throw new Error(`Invalid JSON response (status ${response.status}): ${text.slice(0, 100)}...`);
        }
      }

      toast.success("Demande mise à jour avec succès");
      setShowOrderForm(false); // Close the modal immediately after success
      await fetchData(); // Refresh the data after closing the modal
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour de la demande:", error);
      toast.error(error.message || "Erreur lors de la mise à jour de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const getUnorderedProducts = (request: DemandeExceptionnelle) => {
    const orderedIds = orderedProductIdsMap[request.id] || [];
    return request.produitsExceptionnels.filter(
      (produit) => !orderedIds.includes(produit.id)
    );
  };

  const getOrderedProductsCount = (request: DemandeExceptionnelle) => {
    return (orderedProductIdsMap[request.id] || []).length;
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Demandes Exceptionnelles Approuvées
        </h2>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              <div>
                <p className="mb-2">{error}</p>
                <Button
                  onClick={() => fetchData()}
                  variant="outline"
                  className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Réessayer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !Array.isArray(exceptionalRequests) ? (
          <div className="text-red-500 text-center py-8">
            Erreur: Liste des demandes non disponible
          </div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableCaption className="text-gray-500 mb-4">
                Liste des demandes exceptionnelles approuvées ou en attente.
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <TableRow>
                  <TableHead className="text-gray-700 font-semibold">ID Demande</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Articles</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Produits Commandés</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Date d'Approbation</TableHead>
                  <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {exceptionalRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucune demande exceptionnelle trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    exceptionalRequests.map((request, index) => {
                      const unorderedProducts = getUnorderedProducts(request);
                      const orderedCount = getOrderedProductsCount(request);
                      return (
                        <motion.tr
                          key={request.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="hover:bg-blue-50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium text-blue-600">
                            {request.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {request.produitsExceptionnels.map((produit) => (
                              <div key={produit.id} className="text-indigo-600">
                                {produit.produitExceptionnel.name} ({produit.quantite})
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {orderedCount}/{request.produitsExceptionnels.length} produits commandés
                          </TableCell>
                          <TableCell className="text-gray-700">{formatStatus(request.statut)}</TableCell>
                          <TableCell className="text-gray-700">{formatDate(request.dateApprouvee)}</TableCell>
                          <TableCell className="text-right">
                            {request.statut === StatutDemandeExceptionnelle.COMMANDEE ? (
                              <span className="text-gray-500">-</span>
                            ) : (
                              <Button
                                onClick={() => handleMarkAsOrdered(request)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={unorderedProducts.length === 0}
                              >
                                Marquer comme Commandée
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-gray-50">
                <TableRow>
                  <TableCell colSpan={5} className="text-gray-700">
                    Total Demandes Exceptionnelles
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {exceptionalRequests.length}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Product Selection Modal */}
        {showProductModal && selectedRequest && (
          <Dialog open onOpenChange={() => setShowProductModal(false)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Sélectionner les produits à commander</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {getUnorderedProducts(selectedRequest).map((produit) => (
                  <div key={produit.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={produit.id}
                      checked={selectedProductIds.includes(produit.id)}
                      onCheckedChange={() => handleToggleProduct(produit.id)}
                    />
                    <Label htmlFor={produit.id} className="text-sm">
                      {produit.produitExceptionnel.name} ({produit.quantite})
                    </Label>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowProductModal(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleProductsSelected}
                  disabled={selectedProductIds.length === 0}
                >
                  Continuer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Order Form Modal */}
        {showOrderForm && selectedRequest && (
          <Dialog open onOpenChange={() => setShowOrderForm(false)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirmer la commande</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="supplier">Fournisseur</Label>
                  <Button
                    variant="outline"
                    onClick={() => setShowSupplierForm(!showSupplierForm)}
                  >
                    {showSupplierForm ? "Annuler" : "Ajouter un nouveau fournisseur"}
                  </Button>
                </div>
                {showSupplierForm ? (
                  <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Ajouter un nouveau fournisseur</h4>
                    <div>
                      <Label className="block text-sm font-medium">Nom</Label>
                      <Input
                        name="nom"
                        value={newSupplier.nom}
                        onChange={handleSupplierFormChange}
                        placeholder="Nom du fournisseur"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium">Contact</Label>
                      <Input
                        name="contact"
                        value={newSupplier.contact}
                        onChange={handleSupplierFormChange}
                        placeholder="Informations de contact"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium">
                        Score (optionnel)
                      </Label>
                      <Input
                        name="score"
                        type="number"
                        value={newSupplier.score}
                        onChange={handleSupplierFormChange}
                        placeholder="Score du fournisseur"
                        step="0.1"
                      />
                    </div>
                    <Button onClick={handleAddSupplier}>Enregistrer le fournisseur</Button>
                  </div>
                ) : (
                  <Select onValueChange={setSupplierId} value={supplierId}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.nom}{" "}
                          {supplier.score !== null && `(Score: ${supplier.score})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div>
                  <Label htmlFor="datePrevu">Date prévue</Label>
                  <Input
                    id="datePrevu"
                    type="date"
                    value={selectedDatePrevu}
                    onChange={(e) => setSelectedDatePrevu(e.target.value)}
                    className="w-full"
                    placeholder="Sélectionner une date prévue"
                  />
                </div>
                <div>
                  <Label>Produits sélectionnés</Label>
                  <ul className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                    {selectedRequest.produitsExceptionnels
                      .filter((p) => selectedProductIds.includes(p.id))
                      .map((produit) => (
                        <li key={produit.id} className="text-sm text-gray-700">
                          {produit.produitExceptionnel.name} ({produit.quantite})
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowOrderForm(false)}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleOrderSubmit}
                  disabled={submitting || !supplierId || !selectedDatePrevu}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </div>
  );
}