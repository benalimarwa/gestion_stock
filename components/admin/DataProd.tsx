"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Eye, Trash2, PlusCircle, X, Pencil } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Produit = {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  categorie: { nom: string; id: string } | null;
  remarque: string | null;
  statut: "NORMALE" | "CRITIQUE" | "RUPTURE";
  critere: "DURABLE" | "CONSOMMABLE";
  createdAt: string;
  updatedAt: string;
};

type Categorie = {
  id: string;
  nom: string;
};

type Fournisseur = {
  id: string;
  nom: string;
  contact: string;
};

type Commande = {
  id: string;
  fournisseur: { nom: string };
  dateLivraison: string | null;
  quantite: number;
};

type Demande = {
  id: string;
  demandeur: { user: { name: string } };
  dateApprouvee: string | null;
  quantite: number;
};

export default function DataProd() {
  const [products, setProducts] = useState<Produit[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddFournisseurForm, setShowAddFournisseurForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    marque: "Inconnu",
    quantite: "",
    quantiteMinimale: "0",
    categorieId: "",
    fournisseurId: null as string | null,
    remarque: "",
    critere: "DURABLE" as "DURABLE" | "CONSOMMABLE",
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    nom: "",
    marque: "Inconnu",
    quantite: "",
    quantiteMinimale: "0",
    categorieId: "",
    fournisseurId: null as string | null,
    remarque: "",
    critere: "DURABLE" as "DURABLE" | "CONSOMMABLE",
  });
  const [fournisseurFormData, setFournisseurFormData] = useState({
    nom: "",
    contact: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [fournisseurFormError, setFournisseurFormError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [critereFilter, setCritereFilter] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [productsWithAssociations, setProductsWithAssociations] = useState<Set<string>>(new Set());
  const { isLoaded, userId } = useAuth();
  const detailsDialogRef = useRef<HTMLDivElement | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const addDialogRef = useRef<HTMLDivElement | null>(null);
  const editDialogRef = useRef<HTMLDivElement | null>(null);
  const fournisseurDialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLiveRegionMessage("Chargement des produits, catégories et fournisseurs...");
      const [productsResponse, categoriesResponse, fournisseursResponse, associationsResponse] = await Promise.all([
        fetch("/api/admin/produit", { headers: { "Content-Type": "application/json" } }),
        fetch("/api/admin/categorie", { headers: { "Content-Type": "application/json" } }),
        fetch("/api/admin/fourprod", { headers: { "Content-Type": "application/json" } }),
        fetch("/api/admin/produits/associations", { headers: { "Content-Type": "application/json" } }),
      ]);

      if (!productsResponse.ok) throw new Error(`Erreur HTTP ${productsResponse.status}`);
      if (!categoriesResponse.ok) throw new Error(`Erreur HTTP ${categoriesResponse.status}`);
      if (!fournisseursResponse.ok) throw new Error(`Erreur HTTP ${fournisseursResponse.status}`);
      if (!associationsResponse.ok) throw new Error(`Erreur HTTP ${associationsResponse.status}`);

      const [productsData, categoriesData, fournisseursData, associationsData] = await Promise.all([
        productsResponse.json(),
        categoriesResponse.json(),
        fournisseursResponse.json(),
        associationsResponse.json(),
      ]);

      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
      setFournisseurs(fournisseursData);
      setProductsWithAssociations(new Set(associationsData));
      setLiveRegionMessage("Données chargées avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let updatedProducts = [...products];

    if (nameFilter) {
      updatedProducts = updatedProducts.filter((product) =>
        product.nom.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (statusFilter) {
      updatedProducts = updatedProducts.filter((product) => product.statut === statusFilter);
    }

    if (critereFilter) {
      updatedProducts = updatedProducts.filter((product) => product.critere === critereFilter);
    }

    setFilteredProducts(updatedProducts);
  }, [nameFilter, statusFilter, critereFilter, products]);

  useEffect(() => {
    const focusFirstElement = (dialogRef: React.RefObject<HTMLDivElement | null>) => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        ) as HTMLElement | null;
        firstFocusable?.focus();
      }
    };

    if (detailsDialogOpen) focusFirstElement(detailsDialogRef);
    if (deleteDialogOpen) focusFirstElement(deleteDialogRef);
    if (showAddForm) focusFirstElement(addDialogRef);
    if (showEditForm) focusFirstElement(editDialogRef);
    if (showAddFournisseurForm) focusFirstElement(fournisseurDialogRef);
  }, [detailsDialogOpen, deleteDialogOpen, showAddForm, showEditForm, showAddFournisseurForm]);

  const fetchProductDetails = async (productId: string) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setLiveRegionMessage("Chargement des détails du produit...");
    try {
      const [commandesResponse, demandesResponse] = await Promise.all([
        fetch(`/api/admin/produits/commandes?produitId=${productId}&statut=LIVREE`, {
          headers: { "Content-Type": "application/json" },
        }),
        fetch(`/api/admin/produits/demandes?produitId=${productId}&statut=APPROUVEE`, {
          headers: { "Content-Type": "application/json" },
        }),
      ]);

      if (!commandesResponse.ok) throw new Error(`Erreur HTTP ${commandesResponse.status}`);
      if (!demandesResponse.ok) throw new Error(`Erreur HTTP ${demandesResponse.status}`);

      const [commandesData, demandesData] = await Promise.all([
        commandesResponse.json(),
        demandesResponse.json(),
      ]);

      setCommandes(commandesData);
      setDemandes(demandesData);
      setLiveRegionMessage("Détails chargés avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des détails";
      setDetailsError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const logRegistryAction = async (
    productIds: string | string[],
    actionType: "PRODUIT_AJOUTE" | "PRODUIT_MODIFIE" | "PRODUIT_SUPPRIME",
    description: string
  ) => {
    try {
      const response = await fetch("/api/registre", {
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
      toast.warning("Action enregistrée, mais échec de l'enregistrement dans le registre");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nom = formData.nom.trim();
    const marque = formData.marque.trim() || "Inconnu";
    const quantite = Math.floor(Number(formData.quantite));
    const quantiteMinimale = Math.floor(Number(formData.quantiteMinimale));
    const categorieId = formData.categorieId.trim();
    const fournisseurId = formData.fournisseurId?.trim() || null;
    const remarque = formData.remarque.trim() || null;
    const critere = formData.critere;

    if (!nom || quantite < 0 || !categorieId || !critere) {
      setFormError("Veuillez remplir tous les champs obligatoires correctement");
      setLiveRegionMessage("Erreur : champs obligatoires manquants ou incorrects.");
      return;
    }

    if (quantiteMinimale < 0) {
      setFormError("La quantité minimale ne peut pas être négative");
      setLiveRegionMessage("Erreur : la quantité minimale ne peut pas être négative.");
      return;
    }

    try {
      setLiveRegionMessage("Enregistrement du produit...");
      const response = await fetch("/api/admin/produit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          marque,
          quantite,
          quantiteMinimale,
          categorieId,
          fournisseurId,
          remarque,
          critere,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();
      setProducts((prev) => [...prev, data]);
      setFilteredProducts((prev) => [...prev, data]);

      await logRegistryAction(
        data.id,
        "PRODUIT_AJOUTE",
        `Produit ${nom} ajouté avec ${quantite} unités`
      );

      setFormData({
        nom: "",
        marque: "Inconnu",
        quantite: "",
        quantiteMinimale: "0",
        categorieId: "",
        fournisseurId: null,
        remarque: "",
        critere: "DURABLE",
      });
      setShowAddForm(false);
      setFormError(null);
      toast.success("Produit créé avec succès");
      setLiveRegionMessage("Produit créé avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setFormError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = editFormData.id;
    const nom = editFormData.nom.trim();
    const marque = editFormData.marque.trim() || "Inconnu";
    const quantite = Math.floor(Number(editFormData.quantite));
    const quantiteMinimale = Math.floor(Number(editFormData.quantiteMinimale));
    const categorieId = editFormData.categorieId.trim();
    const fournisseurId = editFormData.fournisseurId?.trim() || null;
    const remarque = editFormData.remarque.trim() || null;
    const critere = editFormData.critere;

    if (!isLoaded || !userId) {
      setEditFormError("Accès non autorisé. Veuillez vous connecter.");
      setLiveRegionMessage("Erreur : accès non autorisé. Veuillez vous connecter.");
      return;
    }

    if (!id || !nom || quantite < 0 || !categorieId || !critere) {
      setEditFormError("Veuillez remplir tous les champs obligatoires correctement");
      setLiveRegionMessage("Erreur : champs obligatoires manquants ou incorrects.");
      return;
    }

    if (quantiteMinimale < 0) {
      setEditFormError("La quantité minimale ne peut pas être négative");
      setLiveRegionMessage("Erreur : la quantité minimale ne peut pas être négative.");
      return;
    }

    try {
      setLiveRegionMessage("Mise à jour du produit...");

      const originalProduct = products.find((p) => p.id === id);
      if (!originalProduct) {
        throw new Error("Produit original non trouvé");
      }

      const response = await fetch(`/api/admin/produit?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          marque,
          quantite,
          quantiteMinimale,
          categorieId,
          fournisseurId,
          remarque,
          critere,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const updatedProduct = await response.json();

      setProducts((prev) =>
        prev.map((product) => (product.id === id ? updatedProduct : product))
      );
      setFilteredProducts((prev) =>
        prev.map((product) => (product.id === id ? updatedProduct : product))
      );

      const changes: string[] = [];
      if (updatedProduct.nom !== originalProduct.nom) changes.push(`Nom: ${originalProduct.nom} → ${updatedProduct.nom}`);
      if (updatedProduct.marque !== originalProduct.marque) changes.push(`Marque: ${originalProduct.marque} → ${updatedProduct.marque}`);
      if (updatedProduct.quantite !== originalProduct.quantite) changes.push(`Quantité: ${originalProduct.quantite} → ${updatedProduct.quantite}`);
      if (updatedProduct.quantiteMinimale !== originalProduct.quantiteMinimale) changes.push(`Quantité Minimale: ${originalProduct.quantiteMinimale} → ${updatedProduct.quantiteMinimale}`);
      if (updatedProduct.critere !== originalProduct.critere) changes.push(`Critère: ${originalProduct.critere} → ${updatedProduct.critere}`);
      if (updatedProduct.remarque !== originalProduct.remarque) changes.push(`Remarque: ${originalProduct.remarque || "aucune"} → ${updatedProduct.remarque || "aucune"}`);

      if (changes.length > 0) {
        const description = `Produit modifié: ${updatedProduct.nom} (${updatedProduct.marque}). Changements: ${changes.join(", ")}`;
        await logRegistryAction(updatedProduct.id, "PRODUIT_MODIFIE", description);
      }

      if (updatedProduct.statut === "CRITIQUE" || updatedProduct.statut === "RUPTURE") {
        try {
          const usersResponse = await fetch("/api/emails/admin/users", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!usersResponse.ok) {
            const responseBody = await usersResponse.text();
            const errorData = responseBody ? JSON.parse(responseBody) : {};
            throw new Error(errorData.message || `Erreur HTTP ${usersResponse.status} from /api/emails/admin/users`);
          }

          const contentTypeUsers = usersResponse.headers.get("content-type");
          if (!contentTypeUsers || !contentTypeUsers.includes("application/json")) {
            throw new Error("Received non-JSON response from /api/emails/admin/users");
          }

          const users = await usersResponse.json();
          const recipientEmails = users
            .filter((user: { role: string }) => ["ADMIN", "MAGASINNIER"].includes(user.role))
            .map((user: { email: string }) => user.email);

          if (recipientEmails.length === 0) {
            toast.warning("Aucun destinataire trouvé pour les alertes de stock", {
              style: { background: "#7F1D1D", color: "#FEE2E2" },
            });
          } else {
            const emailResponse = await fetch("/api/emails/admin/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produitId: updatedProduct.id,
                produitNom: updatedProduct.nom,
                statut: updatedProduct.statut,
                quantite: updatedProduct.quantite,
                quantiteMinimale: updatedProduct.quantiteMinimale,
                adminEmails: recipientEmails,
              }),
            });

            if (!emailResponse.ok) {
              const emailText = await emailResponse.text();
              let emailError = emailText;
              try {
                const emailData = JSON.parse(emailText);
                emailError = emailData.error || emailData.message || "Erreur inconnue";
              } catch {
                console.warn("Email response is not JSON:", emailText);
              }
              toast.warning(`Produit mis à jour, mais échec de l'envoi de l'email d'alerte: ${emailError}`, {
                style: { background: "#7F1D1D", color: "#FEE2E2" },
              });
            } else {
              toast.success("Notification envoyée aux administrateurs et magasiniers", {
                style: { background: "#1E3A8A", color: "#E0E7FF" },
              });
            }
          }
        } catch (emailErr) {
          const errorMessage = emailErr instanceof Error ? emailErr.message : "Erreur lors de l'envoi de l'email d'alerte";
          toast.warning(`Produit mis à jour, mais échec de l'envoi de l'email d'alerte: ${errorMessage}`, {
            style: { background: "#7F1D1D", color: "#FEE2E2" },
          });
        }
      }

      setEditFormData({
        id: "",
        nom: "",
        marque: "Inconnu",
        quantite: "",
        quantiteMinimale: "0",
        categorieId: "",
        fournisseurId: null,
        remarque: "",
        critere: "DURABLE",
      });
      setShowEditForm(false);
      setEditFormError(null);
      toast.success("Produit mis à jour avec succès");
      setLiveRegionMessage("Produit mis à jour avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setEditFormError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    }
  };

  const handleFournisseurSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nom = fournisseurFormData.nom.trim();
    const contact = fournisseurFormData.contact.trim();

    if (!nom || !contact) {
      setFournisseurFormError("Veuillez remplir tous les champs obligatoires");
      setLiveRegionMessage("Erreur : champs obligatoires manquants pour le fournisseur.");
      return;
    }

    try {
      setLiveRegionMessage("Enregistrement du fournisseur...");
      const response = await fetch("/api/admin/fourprod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, contact }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const newFournisseur = await response.json();
      setFournisseurs((prev) => [...prev, newFournisseur]);
      setFournisseurFormData({ nom: "", contact: "" });
      setShowAddFournisseurForm(false);
      setFournisseurFormError(null);
      toast.success("Fournisseur créé avec succès");
      setLiveRegionMessage("Fournisseur créé avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setFournisseurFormError(errorMessage);
      toast.error(errorMessage);
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!productId) {
      toast.error("Aucun produit sélectionné pour la suppression");
      setLiveRegionMessage("Erreur : aucun produit sélectionné pour la suppression.");
      return;
    }

    try {
      setLiveRegionMessage("Suppression du produit en cours...");
      const response = await fetch(`/api/admin/produit?id=${productId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const productName = products.find((p) => p.id === productId)?.nom || "Inconnu";
      setProducts((prev) => prev.filter((product) => product.id !== productId));
      setFilteredProducts((prev) => prev.filter((product) => product.id !== productId));
      setProductsWithAssociations((prev) => {
        const updated = new Set(prev);
        updated.delete(productId);
        return updated;
      });

      await logRegistryAction(
        productId,
        "PRODUIT_SUPPRIME",
        `Produit ${productName} supprimé`
      );

      toast.success("Produit supprimé avec succès");
      setLiveRegionMessage("Produit supprimé avec succès.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue lors de la suppression";
      let displayMessage = "Échec de la suppression du produit.";
      if (errorMessage.includes("lié à des commandes ou des demandes")) {
        displayMessage = "Le produit ne peut pas être supprimé car il est lié à des commandes ou des demandes.";
      } else if (errorMessage.includes("Produit introuvable")) {
        displayMessage = "Le produit n'existe pas ou a déjà été supprimé.";
      } else if (errorMessage.includes("ID du produit requis")) {
        displayMessage = "L'identifiant du produit est requis.";
      } else {
        displayMessage = `Erreur serveur : ${errorMessage}`;
      }
      toast.error(displayMessage);
      setLiveRegionMessage(`Erreur : ${displayMessage}`);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
        lastFocusedElement.current = null;
      }
    }
  };

  const openDeleteDialog = (
    productId: string,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (
    product: Produit,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setEditFormData({
      id: product.id,
      nom: product.nom,
      marque: product.marque,
      quantite: product.quantite.toString(),
      quantiteMinimale: product.quantiteMinimale.toString(),
      categorieId: product.categorie?.id || "",
      fournisseurId: null, // Fournisseur non récupéré ici, à ajuster si nécessaire
      remarque: product.remarque || "",
      critere: product.critere,
    });
    setShowEditForm(true);
  };

  const openDetailsDialog = async (
    product: Produit,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedProduct(product);
    setDetailsDialogOpen(true);
    await fetchProductDetails(product.id);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    callback: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback(event);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Date invalide";
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Erreur de format";
    }
  };

  const getStatusColor = (statut: string): string => {
    switch (statut) {
      case "NORMALE":
        return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
      case "CRITIQUE":
        return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
      case "RUPTURE":
        return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
    }
  };

  if (!isClient) return null;

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg mt-4" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg mt-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg shadow-md">
        <h3 className="font-bold text-red-700 dark:text-red-200">Erreur de Chargement</h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
        >
          Réessayer
        </Button>
        <span className="sr-only">{liveRegionMessage}</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Gestion des Produits
          </h2>
          <div className="flex gap-4">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              aria-label={showAddForm ? "Annuler l'ajout d'un produit" : "Ajouter un nouveau produit"}
            >
              <PlusCircle className="h-5 w-5" />
              {showAddForm ? "Annuler" : "Ajouter un Produit"}
            </Button>
            <Button
              onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              aria-label={viewMode === "cards" ? "Passer à la vue tableau" : "Passer à la vue cartes"}
            >
              {viewMode === "cards" ? "Vue Tableau" : "Vue Cartes"}
            </Button>
          </div>
        </div>
        <span className="sr-only">{liveRegionMessage}</span>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          <div className="space-y-2">
            <Label htmlFor="nameFilter" className="text-sm font-semibold text-blue-700 dark:text-gray-200">
              Filtrer par Nom
            </Label>
            <Input
              id="nameFilter"
              value={nameFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameFilter(e.target.value)}
              placeholder="Entrez le nom du produit"
              className="w-[200px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-label="Filtrer les produits par nom"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statusFilter" className="text-sm font-semibold text-blue-700 dark:text-gray-200">
              Filtrer par Statut
            </Label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="w-[200px] h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-label="Filtrer les produits par statut"
            >
              <option value="">Tous les statuts</option>
              <option value="NORMALE">Normale</option>
              <option value="CRITIQUE">Critique</option>
              <option value="RUPTURE">Rupture</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="critereFilter" className="text-sm font-semibold text-blue-700 dark:text-gray-200">
              Filtrer par Critère
            </Label>
            <select
              id="critereFilter"
              value={critereFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCritereFilter(e.target.value)}
              className="w-[200px] h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
              aria-label="Filtrer les produits par critère"
            >
              <option value="">Tous les critères</option>
              <option value="DURABLE">Durable</option>
              <option value="CONSOMMABLE">Consommable</option>
            </select>
          </div>
        </motion.div>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={addDialogRef}
          >
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue d'ajout de produit"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Ajouter un nouveau produit
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Remplissez les champs ci-dessous pour ajouter un produit.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {formError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Nom du produit <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Entrez le nom du produit"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marque" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Marque
                  </Label>
                  <Input
                    id="marque"
                    value={formData.marque}
                    onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                    placeholder="Marque (Inconnu par défaut)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantite" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantité <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="quantite"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    placeholder="Quantité en stock"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantiteMinimale" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantité Minimale
                  </Label>
                  <Input
                    id="quantiteMinimale"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantiteMinimale}
                    onChange={(e) => setFormData({ ...formData, quantiteMinimale: e.target.value })}
                    placeholder="Quantité minimale (0 par défaut)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categorieId" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Catégorie <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="categorieId"
                    value={formData.categorieId}
                    onChange={(e) => setFormData({ ...formData, categorieId: e.target.value })}
                    required
                    className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  >
                    <option value="" disabled>Sélectionnez une catégorie</option>
                    {categories.map((categorie) => (
                      <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fournisseurId" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Fournisseur
                  </Label>
                  <div className="flex gap-2">
                    <select
                      id="fournisseurId"
                      value={formData.fournisseurId ?? ""}
                      onChange={(e) => setFormData({ ...formData, fournisseurId: e.target.value || null })}
                      className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    >
                      <option value="">Aucun fournisseur</option>
                      {fournisseurs.map((fournisseur) => (
                        <option key={fournisseur.id} value={fournisseur.id}>{fournisseur.nom}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowAddFournisseurForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                      aria-label="Ajouter un nouveau fournisseur"
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="critere" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Critère <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="critere"
                    value={formData.critere}
                    onChange={(e) => setFormData({ ...formData, critere: e.target.value as "DURABLE" | "CONSOMMABLE" })}
                    required
                    className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  >
                    <option value="DURABLE">Durable</option>
                    <option value="CONSOMMABLE">Consommable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarque" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Remarque
                  </Label>
                  <Input
                    id="remarque"
                    value={formData.remarque}
                    onChange={(e) => setFormData({ ...formData, remarque: e.target.value })}
                    placeholder="Ajoutez une remarque (optionnel)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={editDialogRef}
          >
            <button
              onClick={() => setShowEditForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue de modification de produit"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Modifier le produit
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Modifiez les informations du produit ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {editFormError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {editFormError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nom" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Nom du produit <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="edit-nom"
                    value={editFormData.nom}
                    onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                    placeholder="Entrez le nom du produit"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-marque" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Marque
                  </Label>
                  <Input
                    id="edit-marque"
                    value={editFormData.marque}
                    onChange={(e) => setEditFormData({ ...editFormData, marque: e.target.value })}
                    placeholder="Marque (Inconnu par défaut)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantite" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantité <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="edit-quantite"
                    type="number"
                    min="0"
                    step="1"
                    value={editFormData.quantite}
                    onChange={(e) => setEditFormData({ ...editFormData, quantite: e.target.value })}
                    placeholder="Quantité en stock"
                    required
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quantiteMinimale" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantité Minimale
                  </Label>
                  <Input
                    id="edit-quantiteMinimale"
                    type="number"
                    min="0"
                    step="1"
                    value={editFormData.quantiteMinimale}
                    onChange={(e) => setEditFormData({ ...editFormData, quantiteMinimale: e.target.value })}
                    placeholder="Quantité minimale (0 par défaut)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-categorieId" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Catégorie <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="edit-categorieId"
                    value={editFormData.categorieId}
                    onChange={(e) => setEditFormData({ ...editFormData, categorieId: e.target.value })}
                    required
                    className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  >
                    <option value="" disabled>Sélectionnez une catégorie</option>
                    {categories.map((categorie) => (
                      <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fournisseurId" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Fournisseur
                  </Label>
                  <div className="flex gap-2">
                    <select
                      id="edit-fournisseurId"
                      value={editFormData.fournisseurId ?? ""}
                      onChange={(e) => setEditFormData({ ...editFormData, fournisseurId: e.target.value || null })}
                      className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    >
                      <option value="">Aucun fournisseur</option>
                      {fournisseurs.map((fournisseur) => (
                        <option key={fournisseur.id} value={fournisseur.id}>{fournisseur.nom}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowAddFournisseurForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                      aria-label="Ajouter un nouveau fournisseur"
                    >
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-critere" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Critère <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="edit-critere"
                    value={editFormData.critere}
                    onChange={(e) => setEditFormData({ ...editFormData, critere: e.target.value as "DURABLE" | "CONSOMMABLE" })}
                    required
                    className="w-full h-10 rounded-md bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                    aria-required="true"
                  >
                    <option value="DURABLE">Durable</option>
                    <option value="CONSOMMABLE">Consommable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-remarque" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Remarque
                  </Label>
                  <Input
                    id="edit-remarque"
                    value={editFormData.remarque}
                    onChange={(e) => setEditFormData({ ...editFormData, remarque: e.target.value })}
                    placeholder="Ajoutez une remarque (optionnel)"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddFournisseurForm} onOpenChange={setShowAddFournisseurForm}>
          <DialogContent
            className="sm:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={fournisseurDialogRef}
          >
            <button
              onClick={() => setShowAddFournisseurForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue d'ajout de fournisseur"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Ajouter un nouveau fournisseur
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Remplissez les champs ci-dessous pour ajouter un fournisseur.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFournisseurSubmit} className="space-y-6">
              {fournisseurFormError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {fournisseurFormError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="fournisseurNom" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Nom du fournisseur <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="fournisseurNom"
                  value={fournisseurFormData.nom}
                  onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, nom: e.target.value })}
                  placeholder="Entrez le nom du fournisseur"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  aria-required="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fournisseurContact" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Contact <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="fournisseurContact"
                  value={fournisseurFormData.contact}
                  onChange={(e) => setFournisseurFormData({ ...fournisseurFormData, contact: e.target.value })}
                  placeholder="Entrez le contact du fournisseur (email ou téléphone)"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100"
                  aria-required="true"
                />
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucun produit trouvé.
          </motion.div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProducts.map((produit, index) => (
                <motion.div
                  key={produit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-200"
                >
                  <h3 className="text-lg font-bold text-blue-800 dark:text-gray-100">{produit.nom}</h3>
                  <p className="text-sm text-blue-600 dark:text-gray-300 mt-2">Marque: {produit.marque}</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(produit.statut)}`}>
                    {produit.statut}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Quantité: {produit.quantite} (Min: {produit.quantiteMinimale})
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Catégorie: {produit.categorie?.nom || "Non catégorisé"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Critère: {produit.critere}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Remarque: {produit.remarque || "-"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Créé: {formatDate(produit.createdAt)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mis à jour: {formatDate(produit.updatedAt)}</p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                      onClick={(e) => openDetailsDialog(produit, e)}
                      onKeyDown={(e) => handleKeyDown(e, (event) => openDetailsDialog(produit, event))}
                      disabled={detailsLoading}
                      aria-label={`Voir les détails du produit ${produit.nom}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-yellow-200 dark:border-yellow-600 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-700"
                      onClick={(e) => openEditDialog(produit, e)}
                      onKeyDown={(e) => handleKeyDown(e, (event) => openEditDialog(produit, event))}
                      aria-label={`Modifier le produit ${produit.nom}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700"
                      onClick={(e) => openDeleteDialog(produit.id, e)}
                      onKeyDown={(e) => handleKeyDown(e, (event) => openDeleteDialog(produit.id, event))}
                      disabled={productsWithAssociations.has(produit.id)}
                      aria-label={`Supprimer le produit ${produit.nom}`}
                      aria-disabled={productsWithAssociations.has(produit.id) ? "true" : "false"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
            <Table className="w-full text-sm">
              <TableCaption>Liste des produits en stock</TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Nom</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Marque</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Quantité</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Quantité Min.</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Catégorie</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Critère</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Remarque</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Créé le</TableHead>
                  <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Mis à jour</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProducts.map((produit, index) => (
                    <motion.tr
                      key={produit.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">{produit.nom}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.marque}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.quantite}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.quantiteMinimale}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.categorie?.nom || "Non catégorisé"}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.critere}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{produit.remarque || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(produit.statut)}`}>
                          {produit.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{formatDate(produit.createdAt)}</TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">{formatDate(produit.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={(e) => openDetailsDialog(produit, e)}
                            onKeyDown={(e) => handleKeyDown(e, (event) => openDetailsDialog(produit, event))}
                            disabled={detailsLoading}
                            aria-label={`Voir les détails du produit ${produit.nom}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-yellow-200 dark:border-yellow-600 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-700"
                            onClick={(e) => openEditDialog(produit, e)}
                            onKeyDown={(e) => handleKeyDown(e, (event) => openEditDialog(produit, event))}
                            aria-label={`Modifier le produit ${produit.nom}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700"
                            onClick={(e) => openDeleteDialog(produit.id, e)}
                            onKeyDown={(e) => handleKeyDown(e, (event) => openDeleteDialog(produit.id, event))}
                            disabled={productsWithAssociations.has(produit.id)}
                            aria-label={`Supprimer le produit ${produit.nom}`}
                            aria-disabled={productsWithAssociations.has(produit.id) ? "true" : "false"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-gray-50 dark:bg-gray-700">
                <TableRow>
                  <TableCell colSpan={10} className="text-gray-700 dark:text-gray-200 font-medium">Total Produits</TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">{filteredProducts.length}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setProductToDelete(null);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            ref={deleteDialogRef}
          >
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue de suppression"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Confirmer la Suppression
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <p className="text-gray-700 dark:text-gray-200 mb-6">
              Produit à supprimer :{" "}
              <span className="font-medium text-red-600 dark:text-red-300">
                {products.find((p) => p.id === productToDelete)?.nom || "Inconnu"}
              </span>
            </p>
            <DialogFooter className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                onClick={() => productToDelete && handleDelete(productToDelete)}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={detailsDialogOpen}
          onOpenChange={(open) => {
            setDetailsDialogOpen(open);
            if (!open) {
              setSelectedProduct(null);
              setCommandes([]);
              setDemandes([]);
              setDetailsError(null);
              setDetailsLoading(false);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
            ref={detailsDialogRef}
          >
            <button
              onClick={() => setDetailsDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails du Produit: {selectedProduct?.nom || "Inconnu"}
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ) : detailsError ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600">
                <h4 className="font-bold text-red-700 dark:text-red-200">Erreur</h4>
                <p className="text-red-600 dark:text-red-300 mt-2">{detailsError}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Commandes Livrées</h4>
                  {commandes.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Aucune commande livrée pour ce produit.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Date de Livraison</TableHead>
                          <TableHead>Quantité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commandes.map((commande) => (
                          <TableRow key={commande.id}>
                            <TableCell>{commande.fournisseur.nom}</TableCell>
                            <TableCell>{commande.dateLivraison ? formatDate(commande.dateLivraison) : "Non livré"}</TableCell>
                            <TableCell>{commande.quantite}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Demandes Approuvées</h4>
                  {demandes.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Aucune demande approuvée pour ce produit.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Date Approuvée</TableHead>
                          <TableHead>Quantité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demandes.map((demande) => (
                          <TableRow key={demande.id}>
                            <TableCell>{demande.demandeur.user.name}</TableCell>
                            <TableCell>{demande.dateApprouvee ? formatDate(demande.dateApprouvee) : "Non approuvé"}</TableCell>
                            <TableCell>{demande.quantite}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300"
                >
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

