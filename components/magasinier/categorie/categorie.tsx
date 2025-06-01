"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil, PlusCircle, Trash2, X, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Category {
  id: string;
  nom: string;
  description?: string;
  produits: Product[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    produits: number;
  };
}

interface Product {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  categorieId: string;
  remarque?: string;
  statut: "NORMALE" | "CRITIQUE" | "RUPTURE";
  critere: "DURABLE" | "CONSOMMABLE";
  createdAt: string;
  updatedAt: string;
}

export function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewForm, setShowViewForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/categorie", {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Erreur lors de la récupération des catégories (Status: ${response.status})`
        );
      }
      const data: Category[] = await response.json();
      console.log("Categories fetched:", data.map(c => ({ id: c.id, nom: c.nom, produitsCount: c._count?.produits ?? 0 })));
      setCategories(data);
      setFilteredCategories(data);
    } catch (err) {
      console.error("Erreur dans fetchCategories:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les catégories en fonction de la recherche
  useEffect(() => {
    const filtered = categories.filter(category =>
      category.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCategories(filtered);
  }, [searchQuery, categories]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch category details
  const fetchCategoryDetails = async (id: string) => {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error("ID de catégorie invalide");
      }
      console.log("Fetching category details for ID:", id);
      const response = await fetch(`/api/admin/categorie/${id}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Fetch category details failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          errorData.error || `Erreur lors de la récupération des détails de la catégorie (Status: ${response.status})`
        );
      }
      const data: Category = await response.json();
      setSelectedCategory(data);
      return data;
    } catch (err) {
      console.error("Erreur dans fetchCategoryDetails:", err);
      toast.error(err instanceof Error ? err.message : "Impossible de récupérer les détails de la catégorie");
      throw err;
    }
  };

  // Handle add category
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.description) {
      setFormError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      const response = await fetch("/api/admin/categorie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'ajout de la catégorie");
      }
      await response.json();
      toast.success("Catégorie ajoutée avec succès");
      setShowAddForm(false);
      setFormData({ nom: "", description: "" });
      setFormError(null);
      await fetchCategories();
    } catch (err) {
      console.error("Erreur dans handleAddSubmit:", err);
      setFormError(err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout de la catégorie");
    }
  };

  // Handle edit category
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.description) {
      setFormError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!selectedCategory) {
      setFormError("Aucune catégorie sélectionnée");
      return;
    }
    try {
      const response = await fetch(`/api/admin/categorie?id=${selectedCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la modification de la catégorie");
      }
      await response.json();
      toast.success("Catégorie modifiée avec succès");
      setShowEditForm(false);
      setFormData({ nom: "", description: "" });
      setFormError(null);
      setSelectedCategory(null);
      await fetchCategories();
    } catch (err) {
      console.error("Erreur dans handleEditSubmit:", err);
      setFormError(err instanceof Error ? err.message : String(err));
      toast.error(err instanceof Error ? err.message : "Erreur lors de la modification de la catégorie");
    }
  };

  // Handle delete category
  const handleDelete = async (id: string) => {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        toast.error("ID de catégorie invalide");
        return;
      }
      const url = `/api/admin/categorie/${id}`;
      console.log("Attempting to delete category with ID:", id, "at URL:", url);
      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("Catégorie supprimée avec succès");
        await fetchCategories();
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      toast.error(errorData.error || "Erreur lors de la suppression de la catégorie");
    } catch (err) {
      console.error("Erreur dans handleDelete:", err);
      toast.error("Une erreur inattendue est survenue lors de la suppression de la catégorie");
    }
  };

  // Open edit form
  const openEditForm = async (category: Category) => {
    try {
      console.log("Opening edit form for category ID:", category.id);
      if (!category.id) {
        throw new Error("ID de catégorie manquant");
      }
      const categoryDetails = await fetchCategoryDetails(category.id);
      if (categoryDetails) {
        setFormData({
          nom: categoryDetails.nom,
          description: categoryDetails.description || "",
        });
        setShowEditForm(true);
      }
    } catch (err) {
      console.error("Erreur dans openEditForm:", err);
    }
  };

  // Open view form
  const openViewForm = async (category: Category) => {
    try {
      console.log("Opening view form for category ID:", category.id);
      if (!category.id) {
        throw new Error("ID de catégorie manquant");
      }
      await fetchCategoryDetails(category.id);
      setShowViewForm(true);
    } catch (err) {
      console.error("Erreur dans openViewForm:", err);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

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
          onClick={fetchCategories}
          variant="outline"
          className="mt-4 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
        >
          Réessayer
        </Button>
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
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Gestion des Catégories
          </h2>
          <div className="flex gap-4 items-center">
            {/* Barre de recherche */}
            <div className="relative w-[200px]">
              <Input
                type="text"
                placeholder="Rechercher une catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                aria-label="Rechercher une catégorie par nom"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              aria-label="Ajouter une nouvelle catégorie"
            >
              <PlusCircle className="h-5 w-5" />
              {showAddForm ? "Annuler" : "Ajouter une Catégorie"}
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

        {/* Add Category Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            aria-describedby="add-category-description"
          >
            <DialogTitle>
              <VisuallyHidden>Ajouter une nouvelle catégorie</VisuallyHidden>
            </DialogTitle>
            <VisuallyHidden>
              <p id="add-category-description">
                Formulaire pour ajouter une nouvelle catégorie avec nom et description.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Ajouter une nouvelle catégorie
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {formError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="nom" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nom de la catégorie
                </Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Entrez le nom de la catégorie"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Entrez un nom unique pour la catégorie
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Entrez une description"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fournissez une brève description de la catégorie
                </p>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Categories Display */}
        {filteredCategories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12 text-gray-500 dark:text-gray-400 text-xl"
          >
            Aucune catégorie trouvée
          </motion.div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCategories.map((categorie, index) => (
                <motion.div
                  key={categorie.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all duration-200"
                >
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{categorie.nom}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Description: {categorie.description || "-"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Nombre de produits: {categorie._count?.produits ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Créé: {formatDate(categorie.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mis à jour: {formatDate(categorie.updatedAt)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                      onClick={() => openViewForm(categorie)}
                      aria-label={`Voir les détails de ${categorie.nom}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                      onClick={() => openEditForm(categorie)}
                      aria-label={`Modifier ${categorie.nom}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleDelete(categorie.id)}
                      disabled={(categorie._count?.produits ?? 0) > 0}
                      aria-label={`Supprimer ${categorie.nom}`}
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
              <TableCaption className="text-gray-600 dark:text-gray-300">
                Liste des catégories de produits
              </TableCaption>
              <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                <TableRow>
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Nom</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Description</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Nombre de produits</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Créé le</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Mis à jour le</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredCategories.map((categorie, index) => (
                    <motion.tr
                      key={categorie.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        {categorie.nom}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {categorie.description || "-"}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {categorie._count?.produits ?? 0}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(categorie.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(categorie.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={() => openViewForm(categorie)}
                            aria-label={`Voir les détails de ${categorie.nom}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={() => openEditForm(categorie)}
                            aria-label={`Modifier ${categorie.nom}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 dark:border-red-600 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDelete(categorie.id)}
                            disabled={(categorie._count?.produits ?? 0) > 0}
                            aria-label={`Supprimer ${categorie.nom}`}
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
                  <TableCell colSpan={5} className="text-gray-700 dark:text-gray-200 font-medium">
                    Total Catégories
                  </TableCell>
                  <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">
                    {filteredCategories.length}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* View Category Dialog */}
        <Dialog open={showViewForm} onOpenChange={setShowViewForm}>
          <DialogContent
            className="sm:max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            aria-describedby="view-category-description"
          >
            <DialogTitle>
              <VisuallyHidden>Détails de la catégorie</VisuallyHidden>
            </DialogTitle>
            <VisuallyHidden>
              <p id="view-category-description">
                Informations détaillées sur la catégorie et ses produits associés.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setShowViewForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Détails de la catégorie
            </h3>
            {selectedCategory && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Nom</h4>
                    <p className="mt-1 text-gray-800 dark:text-gray-100">{selectedCategory.nom}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Nombre de produits</h4>
                    <p className="mt-1 text-gray-800 dark:text-gray-100">
                      {selectedCategory._count?.produits ?? 0}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</h4>
                    <p className="mt-1 text-gray-800 dark:text-gray-100">
                      {selectedCategory.description || "Aucune description"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Créé le</h4>
                    <p className="mt-1 text-gray-800 dark:text-gray-100">
                      {formatDate(selectedCategory.createdAt)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Mis à jour le</h4>
                    <p className="mt-1 text-gray-800 dark:text-gray-100">
                      {formatDate(selectedCategory.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100">Liste des produits</h4>
                  {selectedCategory.produits && selectedCategory.produits.length > 0 ? (
                    <Table className="bg-gray-50 dark:bg-gray-700 rounded-md">
                      <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                        <TableRow>
                          <TableHead className="text-gray-700 dark:text-gray-200">Nom</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-200">Marque</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-200">Quantité</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-200">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCategory.produits.map((produit) => (
                          <TableRow key={produit.id}>
                            <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                              {produit.nom}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-200">
                              {produit.marque}
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-200">
                              {produit.quantite}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  produit.statut === "NORMALE"
                                    ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                    : produit.statut === "CRITIQUE"
                                    ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300"
                                    : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                                }`}
                              >
                                {produit.statut}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300">
                      Cette catégorie ne contient aucun produit.
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="flex justify-end mt-6">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                >
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
            aria-describedby="edit-category-description"
          >
            <DialogTitle>
              <VisuallyHidden>Modifier la catégorie</VisuallyHidden>
            </DialogTitle>
            <VisuallyHidden>
              <p id="edit-category-description">
                Formulaire pour modifier les détails d'une catégorie existante.
              </p>
            </VisuallyHidden>
            <button
              onClick={() => setShowEditForm(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              aria-label="Fermer le dialogue"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Modifier la catégorie
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-600 dark:text-red-300">
                    Erreur : {formError}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-nom" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nom de la catégorie
                </Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Entrez le nom de la catégorie"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Entrez un nom unique pour la catégorie
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Entrez une description"
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fournissez une brève description de la catégorie
                </p>
              </div>
              <DialogFooter className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}