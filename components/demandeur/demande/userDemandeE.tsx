"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatutDemande, StatutDemandeExceptionnelle } from "@prisma/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Type definitions
type Product = {
  id: string;
  nom: string;
  quantite: number;
  marque: string | null;
  categorie: { nom: string } | null;
};

type ExceptionalProduct = {
  id: string;
  name: string;
  marque: string | null;
  description: string | null;
};

type DemandeProduit = {
  id: string;
  produitId: string;
  produit: Product;
  quantite: number;
};

type DemandeProduitExceptionnel = {
  id: string;
  produitItemId: string;
  produitExceptionnel: ExceptionalProduct;
  quantite: number;
};

type PendingRequest = {
  id: string;
  produits: DemandeProduit[];
  produitsExceptionnels: DemandeProduitExceptionnel[];
  statut: StatutDemande | StatutDemandeExceptionnelle;
  createdAt: string;
  type: "REGULIERE" | "EXCEPTIONNELLE";
};

type RegularProductInput = {
  produitId: string;
  quantite: number;
};

type ExceptionalProductInput = {
  produitItemId: string;
  name: string;
  marque: string;
  description: string;
  quantite: number;
};

export function PendingRequestsTable() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAddExceptionalModalOpen, setIsAddExceptionalModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<RegularProductInput[]>([
    { produitId: "", quantite: 1 },
  ]);
  const [newExceptionalProducts, setNewExceptionalProducts] = useState<
    { name: string; marque: string; description: string; quantite: number }[]
  >([{ name: "", marque: "", description: "", quantite: 1 }]);
  const [editProducts, setEditProducts] = useState<RegularProductInput[]>([
    { produitId: "", quantite: 1 },
  ]);
  const [editExceptionalProducts, setEditExceptionalProducts] = useState<ExceptionalProductInput[]>([
    { produitItemId: "", name: "", marque: "", description: "", quantite: 1 },
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [quantityErrors, setQuantityErrors] = useState<boolean[]>([false]);
  const [exceptionalQuantityErrors, setExceptionalQuantityErrors] = useState<boolean[]>([false]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [requestsRes, productsRes] = await Promise.all([
          fetch("/api/demandeurUser/demandes/enattente"),
          fetch("/api/demandeurUser/demandes/enattente/products"),
        ]);

        if (!requestsRes.ok) {
          const errorData = await requestsRes.json();
          throw new Error(errorData.error || "Erreur lors du chargement des demandes");
        }
        if (!productsRes.ok) {
          const errorData = await productsRes.json();
          throw new Error(errorData.error || "Erreur lors du chargement des produits");
        }

        const [requestsData, productsData] = await Promise.all([
          requestsRes.json(),
          productsRes.json(),
        ]);

        if (!Array.isArray(requestsData)) {
          throw new Error("Données des demandes invalides reçues du serveur");
        }
        if (!Array.isArray(productsData)) {
          console.warn("Produits invalides reçus, initialisation à un tableau vide");
          setProducts([]);
        } else {
          setProducts(productsData);
        }

        console.log("Fetched products:", productsData);
        setPendingRequests(requestsData);
      } catch (error: any) {
        console.error("Erreur lors du chargement des données:", error);
        setError(error.message);
        setProducts([]);
        toast.error(error.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setQuantityErrors(new Array(newProducts.length).fill(false));
  }, [newProducts.length]);

  useEffect(() => {
    setExceptionalQuantityErrors(new Array(newExceptionalProducts.length).fill(false));
  }, [newExceptionalProducts.length]);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string: ${dateString}`);
        return "Date invalide";
      }
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date invalide";
    }
  }, []);

  const formatStatus = useCallback((status: StatutDemande | StatutDemandeExceptionnelle): string => {
    switch (status) {
      case StatutDemande.EN_ATTENTE:
      case StatutDemandeExceptionnelle.EN_ATTENTE:
        return "En attente";
      case StatutDemande.APPROUVEE:
        return "Approuvée";
      case StatutDemande.REJETEE:
        return "Rejetée";
      case StatutDemande.PRISE:
        return "Prise";
      case StatutDemandeExceptionnelle.ACCEPTEE:
        return "Acceptée";
      case StatutDemandeExceptionnelle.COMMANDEE:
        return "Commandée";
      case StatutDemandeExceptionnelle.LIVREE:
        return "Livrée";
      default:
        return status;
    }
  }, []);

  const handleAddProduct = () => {
    setNewProducts([...newProducts, { produitId: "", quantite: 1 }]);
  };

  const handleAddExceptionalProduct = () => {
    setNewExceptionalProducts([
      ...newExceptionalProducts,
      { name: "", marque: "", description: "", quantite: 1 },
    ]);
  };

  const handleAddEditProduct = () => {
    setEditProducts([...editProducts, { produitId: "", quantite: 1 }]);
  };

  const handleAddEditExceptionalProduct = () => {
    setEditExceptionalProducts([
      ...editExceptionalProducts,
      { produitItemId: "", name: "", marque: "", description: "", quantite: 1 },
    ]);
  };

  const handleProductChange = (
    index: number,
    field: "produitId" | "quantite",
    value: string | number
  ) => {
    const updatedProducts = [...newProducts];
    if (field === "quantite") {
      const parsedValue = value === "" ? "" : parseInt(value as string, 10);
      const quantite = parsedValue === "" || isNaN(parsedValue) ? 1 : parsedValue;
      updatedProducts[index].quantite = quantite;
      const newErrors = [...quantityErrors];
      newErrors[index] = quantite <= 0;
      setQuantityErrors(newErrors);
    } else {
      updatedProducts[index].produitId = value as string;
    }
    setNewProducts(updatedProducts);
  };

  const handleExceptionalProductChange = (
    index: number,
    field: "name" | "marque" | "description" | "quantite",
    value: string | number
  ) => {
    const updatedProducts = [...newExceptionalProducts];
    if (field === "quantite") {
      const parsedValue = value === "" ? "" : parseInt(value as string, 10);
      const quantite = parsedValue === "" || isNaN(parsedValue) ? 1 : parsedValue;
      updatedProducts[index].quantite = quantite;
      const newErrors = [...exceptionalQuantityErrors];
      newErrors[index] = quantite <= 0;
      setExceptionalQuantityErrors(newErrors);
    } else if (field === "name") {
      updatedProducts[index].name = value as string;
    } else {
      updatedProducts[index][field] = value as string;
    }
    setNewExceptionalProducts(updatedProducts);
  };

  const handleEditProductChange = (
    index: number,
    field: "produitId" | "quantite",
    value: string | number
  ) => {
    const updatedProducts = [...editProducts];
    if (field === "quantite") {
      const parsedValue = value === "" ? "" : parseInt(value as string, 10);
      updatedProducts[index].quantite = parsedValue === "" || isNaN(parsedValue) ? 1 : parsedValue;
    } else {
      updatedProducts[index].produitId = value as string;
    }
    setEditProducts(updatedProducts);
  };

  const handleEditExceptionalProductChange = (
    index: number,
    field: "produitItemId" | "name" | "marque" | "description" | "quantite",
    value: string | number
  ) => {
    const updatedProducts = [...editExceptionalProducts];
    if (field === "quantite") {
      const parsedValue = value === "" ? "" : parseInt(value as string, 10);
      updatedProducts[index].quantite = parsedValue === "" || isNaN(parsedValue) ? 1 : parsedValue;
    } else {
      updatedProducts[index][field] = value as string;
    }
    setEditExceptionalProducts(updatedProducts);
  };

  const handleRemoveProduct = (index: number) => {
    if (newProducts.length > 1) {
      setNewProducts(newProducts.filter((_, i) => i !== index));
      setQuantityErrors(quantityErrors.filter((_, i) => i !== index));
    }
  };

  const handleRemoveExceptionalProduct = (index: number) => {
    if (newExceptionalProducts.length > 1) {
      setNewExceptionalProducts(newExceptionalProducts.filter((_, i) => i !== index));
      setExceptionalQuantityErrors(exceptionalQuantityErrors.filter((_, i) => i !== index));
    }
  };

  const handleRemoveEditProduct = (index: number) => {
    if (editProducts.length > 1) {
      setEditProducts(editProducts.filter((_, i) => i !== index));
    }
  };

  const handleRemoveEditExceptionalProduct = (index: number) => {
    if (editExceptionalProducts.length > 1) {
      setEditExceptionalProducts(editExceptionalProducts.filter((_, i) => i !== index));
    }
  };

  const checkExistingExceptionalProducts = async () => {
    try {
      const response = await fetch("/api/demandeurUser/demandes/enattente/existing-exceptional-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products: newExceptionalProducts }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(`Erreur lors de la vérification des produits existants: ${errorData.error || response.statusText}`);
      }

      const existingProducts = await response.json();
      console.log("Client received duplicates:", existingProducts);
      return existingProducts;
    } catch (error) {
      console.error("Erreur lors de la vérification des produits:", error);
      toast.error( "Erreur lors de la vérification des produits existants");
      return [];
    }
  };

  const handleAddExceptionalRequest = async () => {
    if (!newExceptionalProducts || newExceptionalProducts.some(p => !p.name.trim() || !/[a-zA-Z]/.test(p.name))) {
      toast.error("Veuillez entrer un nom valide contenant au moins une lettre pour chaque produit exceptionnel");
      return;
    }
    if (exceptionalQuantityErrors.some((error) => error)) {
      toast.error("Veuillez entrer une quantité valide (supérieure à 0) pour chaque produit exceptionnel");
      return;
    }

    setSubmitting(true);
    try {
      const existingProducts = await checkExistingExceptionalProducts();
      if (existingProducts.length > 0) {
        const duplicateNames = existingProducts.map((p:Product) => `${p.nom}${p.marque ? ` (${p.marque})` : ''}`).join(", ");
        toast.error(`Les produits suivants existent déjà dans la base : ${duplicateNames}. Veuillez utiliser des noms différents.`);
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/demandeurUser/demandes/enattente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ produitsExceptionnels: newExceptionalProducts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'ajout de la demande exceptionnelle");
      }

      let newRequest = await response.json();
      
      if (!newRequest.produits) newRequest.produits = [];
      if (!newRequest.produitsExceptionnels) newRequest.produitsExceptionnels = [];
      
      setPendingRequests([newRequest, ...pendingRequests]);
      setIsAddExceptionalModalOpen(false);
      setNewExceptionalProducts([{ name: "", marque: "", description: "", quantite: 1 }]);
      setExceptionalQuantityErrors([false]);
      toast.success("Demande exceptionnelle ajoutée avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error( "Erreur lors de l'ajout de la demande exceptionnelle");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRequest = async () => {
    if (!newProducts || newProducts.some((p) => !p.produitId)) {
      toast.error("Veuillez sélectionner un produit pour chaque élément");
      return;
    }
    if (quantityErrors.some((error) => error)) {
      toast.error("Veuillez entrer une quantité valide (supérieure à 0) pour chaque produit");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/demandeurUser/demandes/enattente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ produits: newProducts }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'ajout de la demande");
      }

      let newRequest = await response.json();
      
      if (!newRequest.produits) newRequest.produits = [];
      if (!newRequest.produitsExceptionnels) newRequest.produitsExceptionnels = [];
      
      setPendingRequests([newRequest, ...pendingRequests]);
      setIsAddModalOpen(false);
      setNewProducts([{ produitId: "", quantite: 1 }]);
      setQuantityErrors([false]);
      toast.success("Demande ajoutée avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'ajout de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = (request: PendingRequest) => {
    console.log("Editing request:", request);
    if (request.type === "REGULIERE") {
      const formattedProducts = request.produits.map((p) => ({
        produitId: p.produitId,
        quantite: p.quantite,
      }));
      setEditProducts(formattedProducts.length ? formattedProducts : [{ produitId: "", quantite: 1 }]);
      setEditExceptionalProducts([]);
    } else {
      const formattedExceptionalProducts = request.produitsExceptionnels.map((p) => ({
        produitItemId: p.produitItemId,
        name: p.produitExceptionnel.name,
        marque: p.produitExceptionnel.marque || "",
        description: p.produitExceptionnel.description || "",
        quantite: p.quantite,
      }));
      setEditProducts([]);
      setEditExceptionalProducts(
        formattedExceptionalProducts.length
          ? formattedExceptionalProducts
          : [{ produitItemId: "", name: "", marque: "", description: "", quantite: 1 }]
      );
    }
    setSelectedRequest(request);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;

    if (selectedRequest.type === "REGULIERE") {
      if (!editProducts || editProducts.some((p) => !p.produitId)) {
        toast.error("Veuillez sélectionner un produit pour chaque élément");
        return;
      }
      if (editProducts.some((p) => !p.quantite || p.quantite <= 0)) {
        toast.error("Veuillez entrer une quantité valide (supérieure à 0) pour chaque produit");
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch(`/api/demandeurUser/demandes/enattente/${selectedRequest.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            produits: editProducts,
            type: "REGULIERE",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erreur lors de la modification de la demande");
        }

        const updatedRequest: PendingRequest = await response.json();
        
        // Ensure updatedRequest has the correct structure
        if (!updatedRequest || !updatedRequest.id) {
          throw new Error("La réponse de l'API ne contient pas une demande valide");
        }

        // Ensure produits and produitsExceptionnels are initialized
        if (!updatedRequest.produits) updatedRequest.produits = [];
        if (!updatedRequest.produitsExceptionnels) updatedRequest.produitsExceptionnels = [];

        // Update state with validation
        setPendingRequests((prev) => {
          if (!Array.isArray(prev)) {
            console.error("Previous pendingRequests is not an array:", prev);
            return [updatedRequest]; // Fallback to an array with the updated request
          }
          return prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req));
        });

        setIsEditModalOpen(false);
        setSelectedRequest(null);
        setEditProducts([{ produitId: "", quantite: 1 }]);
        toast.success("Demande modifiée avec succès");
      } catch (error: any) {
        console.error("Erreur:", error);
        toast.error(error.message || "Erreur lors de la modification de la demande");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!editExceptionalProducts || editExceptionalProducts.some((p) => !p.name.trim())) {
        toast.error("Veuillez entrer un nom pour chaque produit exceptionnel");
        return;
      }
      if (editExceptionalProducts.some((p) => !p.quantite || p.quantite <= 0)) {
        toast.error("Veuillez entrer une quantité valide (supérieure à 0) pour chaque produit exceptionnel");
        return;
      }
      if (!editExceptionalProducts || editExceptionalProducts.some(p => !p.name.trim() || !/[a-zA-Z]/.test(p.name))) {
        toast.error("Veuillez entrer un nom valide contenant au moins une lettre pour chaque produit exceptionnel");
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch(`/api/demandeurUser/demandes/enattente/${selectedRequest.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            produitsExceptionnels: editExceptionalProducts,
            type: "EXCEPTIONNELLE",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erreur lors de la modification de la demande exceptionnelle");
        }

        const updatedRequest: PendingRequest = await response.json();

        // Ensure updatedRequest has the correct structure
        if (!updatedRequest || !updatedRequest.id) {
          throw new Error("La réponse de l'API ne contient pas une demande valide");
        }

        // Ensure produits and produitsExceptionnels are initialized
        if (!updatedRequest.produits) updatedRequest.produits = [];
        if (!updatedRequest.produitsExceptionnels) updatedRequest.produitsExceptionnels = [];

        // Update state with validation
        setPendingRequests((prev) => {
          if (!Array.isArray(prev)) {
            console.error("Previous pendingRequests is not an array:", prev);
            return [updatedRequest]; // Fallback to an array with the updated request
          }
          return prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req));
        });

        setIsEditModalOpen(false);
        setSelectedRequest(null);
        setEditExceptionalProducts([
          { produitItemId: "", name: "", marque: "", description: "", quantite: 1 },
        ]);
        toast.success("Demande exceptionnelle modifiée avec succès");
      } catch (error: any) {
        console.error("Erreur:", error);
        toast.error(error.message || "Erreur lors de la modification de la demande exceptionnelle");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteRequest = async (requestId: string, type: "REGULIERE" | "EXCEPTIONNELLE") => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette demande ?")) return;

    try {
      const response = await fetch(`/api/demandeurUser/demandes/enattente/${requestId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression de la demande");
      }

      setPendingRequests(pendingRequests.filter((req) => req.id !== requestId));
      toast.success(`Demande ${type === "REGULIERE" ? "" : "exceptionnelle"} supprimée avec succès`);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la suppression de la demande");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          max-width: 28rem;
          width: 100%;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          position: relative;
          padding: 1.5rem;
        }
        .hidden {
          display: none;
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Demandes en Attente
        </h2>
        <div className="space-x-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            Ajouter Nouvelle Demande
          </Button>
          <Button
            onClick={() => setIsAddExceptionalModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            Ajouter Demande Exceptionnelle
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            <div>
              <p className="mb-2">{error}</p>
              <Button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  Promise.all([
                    fetch("/api/demandeurUser/demandes/enattente"),
                    fetch("/api/demandeurUser/demandes/enattente/products"),
                  ]).then(() => setLoading(false));
                }}
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
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-500 mb-4">Vos demandes en attente.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">ID Demande</TableHead>
                <TableHead className="text-gray-700 font-semibold">Type</TableHead>
                <TableHead className="text-gray-700 font-semibold">Articles</TableHead>
                <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                <TableHead className="text-gray-700 font-semibold">Date</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!Array.isArray(pendingRequests) || pendingRequests.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucune demande en attente trouvée
                  </TableCell>
                </TableRow>
              ) : (
                pendingRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-blue-600">
                      {request.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {request.type === "REGULIERE" ? "Régulière" : "Exceptionnelle"}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {request.produits.map((produit) => (
                        <div key={produit.id}>
                          {produit.produit.nom} ({produit.quantite})
                        </div>
                      ))}
                      {request.produitsExceptionnels.map((produit) => (
                        <div key={produit.id} className="text-indigo-600">
                          {produit.produitExceptionnel.name} ({produit.quantite})
                          <span className="text-xs text-indigo-500"> (Exceptionnel)</span>
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-gray-700">{formatStatus(request.statut)}</TableCell>
                    <TableCell className="text-gray-700">{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                      >
                        Voir Détail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRequest(request)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRequest(request.id, request.type)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700">
                  Total Demandes en attente
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {pendingRequests.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {selectedRequest && !isEditModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-labelledby="request-details-title"
            aria-describedby="request-details-description"
            className="modal-content"
          >
            <h3 id="request-details-title" className="hidden">
              Détails de la Demande
            </h3>
            <p id="request-details-description" className="hidden">
              Affiche les détails d'une demande en attente, y compris les produits demandés et le statut.
            </p>
            <div className="grid gap-4">
              <h3 className="text-xl font-bold text-gray-800">Détails de la Demande</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-gray-700">ID Demande</p>
                    <p className="text-gray-600">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Type</p>
                    <p className="text-gray-600">
                      {selectedRequest.type === "REGULIERE" ? "Régulière" : "Exceptionnelle"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Statut</p>
                    <p className="text-gray-600">{formatStatus(selectedRequest.statut)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Date de création</p>
                    <p className="text-gray-600">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-semibold text-gray-700 mb-2">Liste des produits</p>
                  {selectedRequest.produits.length === 0 && selectedRequest.produitsExceptionnels.length === 0 ? (
                    <p className="text-gray-500">Aucun produit</p>
                  ) : (
                    <ul className="space-y-2 border-t border-gray-200 pt-2">
                      {selectedRequest.produits.map((produit) => (
                        <li key={produit.id} className="pb-2">
                          <p className="text-gray-700">{produit.produit.nom}</p>
                          <p className="text-sm text-gray-500">Quantité: {produit.quantite}</p>
                          {produit.produit.marque && (
                            <p className="text-sm text-gray-500">Marque: {produit.produit.marque}</p>
                          )}
                        </li>
                      ))}
                      {selectedRequest.produitsExceptionnels.map((produit) => (
                        <li key={produit.id} className="pb-2 text-indigo-600">
                          <p>{produit.produitExceptionnel.name}</p>
                          <p className="text-sm text-indigo-500">Quantité: {produit.quantite} (Exceptionnel)</p>
                          {produit.produitExceptionnel.marque && (
                            <p className="text-sm text-indigo-500">
                              Marque: {produit.produitExceptionnel.marque}
                            </p>
                          )}
                          {produit.produitExceptionnel.description && (
                            <p className="text-sm text-indigo-500">
                              Description: {produit.produitExceptionnel.description}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-labelledby="add-request-title"
            aria-describedby="add-request-description"
            className="modal-content"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Ajouter une Nouvelle Demande</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </Button>
            </div>
            <h3 id="add-request-title" className="hidden">
              Ajouter une Nouvelle Demande
            </h3>
            <p id="add-request-description" className="hidden">
              Permet d'ajouter une nouvelle demande avec une liste de produits réguliers.
            </p>
            <div className="grid gap-4">
              <h3 className="text-xl font-bold text-gray-800">Ajouter une Nouvelle Demande</h3>
              {loading ? (
                <Skeleton className="h-10 w-full rounded" />
              ) : !products || products.length === 0 ? (
                <div className="text-gray-500">Aucun produit disponible</div>
              ) : newProducts && newProducts.length > 0 ? (
                <>
                  {console.log("newProducts before map:", newProducts)}
                  {newProducts.map((product: RegularProductInput, index: number) => (
                    <div key={index} className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-700">Produit {index + 1}</Label>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-500"
                            onClick={() => handleRemoveProduct(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3">
                          <select
                            value={product.produitId}
                            onChange={(e) => handleProductChange(index, "produitId", e.target.value)}
                            className="w-full p-2 border rounded bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label={`Sélectionner le produit ${index + 1}`}
                          >
                            <option value="" className="text-gray-500">
                              Sélectionner un produit
                            </option>
                            {products && products.length > 0 ? (
                              products.map((item: Product) => (
                                <option key={item.id} value={item.id} className="text-gray-700">
                                  {item.nom} ({item.categorie?.nom || "Sans catégorie"})
                                </option>
                              ))
                            ) : (
                              <option disabled>Aucun produit disponible</option>
                            )}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            placeholder="Qté"
                            min="1"
                            value={product.quantite?.toString() || "1"}
                            onChange={(e) => handleProductChange(index, "quantite", e.target.value)}
                            className={`bg-gray-50 text-gray-700 border-gray-200 ${
                              quantityErrors[index] ? "border-red-500" : ""
                            } focus:ring-blue-400`}
                            aria-label={`Quantité pour le produit ${index + 1}`}
                          />
                          {quantityErrors[index] && (
                            <p className="text-red-500 text-xs mt-1">Quantité invalide</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-gray-500">Aucun produit ajouté</div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddProduct}
                disabled={loading || !products || products.length === 0}
                className="border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Ajouter un article
              </Button>
              <Button
                onClick={handleAddRequest}
                disabled={submitting || loading || !products || products.length === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAddExceptionalModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-labelledby="add-exceptional-request-title"
            aria-describedby="add-exceptional-request-description"
            className="modal-content"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Ajouter une Demande Exceptionnelle</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setIsAddExceptionalModalOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </Button>
            </div>
            <h3 id="add-exceptional-request-title" className="hidden">
              Ajouter une Demande Exceptionnelle
            </h3>
            <p id="add-exceptional-request-description" className="hidden">
              Permet d'ajouter une nouvelle demande avec des produits exceptionnels personnalisés.
            </p>
            <div className="grid gap-4">
              <h3 className="text-xl font-bold text-gray-800">Ajouter une Demande Exceptionnelle</h3>
              {newExceptionalProducts && newExceptionalProducts.length > 0 ? (
                <>
                  {console.log("newExceptionalProducts before map:", newExceptionalProducts)}
                  {newExceptionalProducts.map((product: { name: string; marque: string; description: string; quantite: number }, index: number) => (
                    <div key={index} className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-700">Produit Exceptionnel {index + 1}</Label>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-500"
                            onClick={() => handleRemoveExceptionalProduct(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <div>
                          <Label className="text-gray-700">Nom</Label>
                          <Input
                            type="text"
                            placeholder="Nom du produit"
                            value={product.name}
                            onChange={(e) => handleExceptionalProductChange(index, "name", e.target.value)}
                            className={`bg-gray-50 text-gray-700 border-gray-200 ${
                              !product.name.trim() ? "border-red-500" : ""
                            } focus:ring-blue-400`}
                            aria-label={`Nom du produit exceptionnel ${index + 1}`}
                          />
                          {!product.name.trim() && (
                            <p className="text-red-500 text-xs mt-1">Nom requis</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-gray-700">Marque (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Marque"
                            value={product.marque}
                            onChange={(e) => handleExceptionalProductChange(index, "marque", e.target.value)}
                            className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                            aria-label={`Marque du produit exceptionnel ${index + 1}`}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Description (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Description"
                            value={product.description}
                            onChange={(e) =>
                              handleExceptionalProductChange(index, "description", e.target.value)
                            }
                            className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                            aria-label={`Description du produit exceptionnel ${index + 1}`}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Quantité</Label>
                          <Input
                            type="number"
                            placeholder="Qté"
                            min="1"
                            value={product.quantite?.toString() || "1"}
                            onChange={(e) => handleExceptionalProductChange(index, "quantite", e.target.value)}
                            className={`bg-gray-50 text-gray-700 border-gray-200 ${
                              exceptionalQuantityErrors[index] ? "border-red-500" : ""
                            } focus:ring-blue-400`}
                            aria-label={`Quantité pour le produit exceptionnel ${index + 1}`}
                          />
                          {exceptionalQuantityErrors[index] && (
                            <p className="text-red-500 text-xs mt-1">Quantité invalide</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-gray-500">Aucun produit exceptionnel ajouté</div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddExceptionalProduct}
                className="border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Ajouter un article
              </Button>
              <Button
                onClick={handleAddExceptionalRequest}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="modal-overlay">
          <div
            role="dialog"
            aria-labelledby="edit-request-title"
            aria-describedby="edit-request-description"
            className="modal-content"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Modifier la Demande {selectedRequest?.type === "REGULIERE" ? "Régulière" : "Exceptionnelle"}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Fermer"
              >
                ✕
              </Button>
            </div>
            <h3 id="edit-request-title" className="hidden">
              Modifier la Demande {selectedRequest?.type === "REGULIERE" ? "Régulière" : "Exceptionnelle"}
            </h3>
            <p id="edit-request-description" className="hidden">
              Permet de modifier les détails d'une demande existante, y compris les produits.
            </p>
            <div className="grid gap-4">
              {selectedRequest?.type === "REGULIERE" ? (
                loading ? (
                  <Skeleton className="h-10 w-full rounded" />
                ) : !products || products.length === 0 ? (
                  <div className="text-gray-500">Aucun produit disponible</div>
                ) : editProducts && editProducts.length > 0 ? (
                  <>
                    {console.log("editProducts before map:", editProducts)}
                    {editProducts.map((product: RegularProductInput, index: number) => (
                      <div key={index} className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-gray-700">Produit {index + 1}</Label>
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-red-500"
                              onClick={() => handleRemoveEditProduct(index)}
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-3">
                            <select
                              value={product.produitId}
                              onChange={(e) => handleEditProductChange(index, "produitId", e.target.value)}
                              className="w-full p-2 border rounded bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              aria-label={`Sélectionner le produit ${index + 1}`}
                            >
                              <option value="" className="text-gray-500">
                                Sélectionner un produit
                              </option>
                              {products && products.length > 0 ? (
                                products.map((item: Product) => (
                                  <option key={item.id} value={item.id} className="text-gray-700">
                                    {item.nom} ({item.categorie?.nom || "Sans catégorie"})
                                  </option>
                                ))
                              ) : (
                                <option disabled>Aucun produit disponible</option>
                              )}
                            </select>
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              placeholder="Qté"
                              min="1"
                              value={product.quantite?.toString() || "1"}
                              onChange={(e) => handleEditProductChange(index, "quantite", e.target.value)}
                              className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                              aria-label={`Quantité pour le produit ${index + 1}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddEditProduct}
                      disabled={loading || !products || products.length === 0}
                      className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Ajouter un article
                    </Button>
                  </>
                ) : (
                  <div className="text-gray-500">Aucun produit ajouté</div>
                )
              ) : editExceptionalProducts && editExceptionalProducts.length > 0 ? (
                <>
                  {console.log("editExceptionalProducts before map:", editExceptionalProducts)}
                  {editExceptionalProducts.map((product: ExceptionalProductInput, index: number) => (
                    <div key={index} className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-700">Produit Exceptionnel {index + 1}</Label>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-500"
                            onClick={() => handleRemoveEditExceptionalProduct(index)}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <div>
                          <Label className="text-gray-700">Nom</Label>
                          <Input
                            type="text"
                            placeholder="Nom du produit"
                            value={product.name}
                            onChange={(e) =>
                              handleEditExceptionalProductChange(index, "name", e.target.value)
                            }
                            className={`bg-gray-50 text-gray-700 border-gray-200 ${
                              !product.name.trim() ? "border-red-500" : ""
                            } focus:ring-blue-400`}
                            aria-label={`Nom du produit exceptionnel ${index + 1}`}
                          />
                          {!product.name.trim() && (
                            <p className="text-red-500 text-xs mt-1">Nom requis</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-gray-700">Marque (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Marque"
                            value={product.marque}
                            onChange={(e) =>
                              handleEditExceptionalProductChange(index, "marque", e.target.value)
                            }
                            className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                            aria-label={`Marque du produit exceptionnel ${index + 1}`}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Description (optionnel)</Label>
                          <Input
                            type="text"
                            placeholder="Description"
                            value={product.description}
                            onChange={(e) =>
                              handleEditExceptionalProductChange(index, "description", e.target.value)
                            }
                            className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                            aria-label={`Description du produit exceptionnel ${index + 1}`}
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700">Quantité</Label>
                          <Input
                            type="number"
                            placeholder="Qté"
                            min="1"
                            value={product.quantite?.toString() || "1"}
                            onChange={(e) =>
                              handleEditExceptionalProductChange(index, "quantite", e.target.value)
                            }
                            className="bg-gray-50 text-gray-700 border-gray-200 focus:ring-blue-400"
                            aria-label={`Quantité pour le produit exceptionnel ${index + 1}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddEditExceptionalProduct}
                    className="border-blue-200 text-blue-600 hover:bg-blue-100"
                  >
                    Ajouter un article
                  </Button>
                </>
              ) : (
                <div className="text-gray-500">Aucun produit exceptionnel ajouté</div>
              )}
              <Button
                onClick={handleSaveEdit}
                disabled={submitting || (selectedRequest?.type === "REGULIERE" && (loading || !products || products.length === 0))}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}