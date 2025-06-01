"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, X, Edit, Eye, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";

type ProduitCritere = "DURABLE" | "CONSOMMABLE";

export type Product = {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  statut: "NORMALE" | "CRITIQUE" | "RUPTURE";
  critere: ProduitCritere;
  categorie: {
    id: string;
    nom: string;
  };
  remarque?: string | null;
};



// EditProductForm (add onCancel and update onSave type)
const EditProductForm = ({
  product,
  onSave,
  onCancel,
}: {
  product: Product;
  onSave: (updatedProduct: Partial<Omit<Product, 'categorie'>>) => Promise<void>;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = React.useState({
    nom: product.nom,
    marque: product.marque,
    quantite: product.quantite,
    quantiteMinimale: product.quantiteMinimale,
    critere: product.critere,
    remarque: product.remarque || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.includes("quantite") ? Number(value) : value }));
  };

  const calculateStatus = () => {
    const quantity = Number(formData.quantite);
    const minQuantity = Number(formData.quantiteMinimale);
    if (quantity <= 0) return "RUPTURE";
    if (quantity <= minQuantity) return "CRITIQUE";
    return "NORMALE";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ ...formData, id: product.id, statut: calculateStatus() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nom" className="text-sm font-medium text-gray-700">Nom *</Label>
          <Input
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marque" className="text-sm font-medium text-gray-700">Marque *</Label>
          <Input
            id="marque"
            name="marque"
            value={formData.marque}
            onChange={handleChange}
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantite" className="text-sm font-medium text-gray-700">Quantité *</Label>
          <Input
            id="quantite"
            name="quantite"
            type="number"
            value={formData.quantite}
            onChange={handleChange}
            min="0"
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantiteMinimale" className="text-sm font-medium text-gray-700">Quantité Minimale *</Label>
          <Input
            id="quantiteMinimale"
            name="quantiteMinimale"
            type="number"
            value={formData.quantiteMinimale}
            onChange={handleChange}
            min="0"
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statut" className="text-sm font-medium text-gray-700">Statut</Label>
          <div className="h-10 px-3 py-2 border border-gray-200 rounded-lg flex items-center text-gray-600 bg-gray-50">
            {calculateStatus()}
            <span className="text-xs ml-2">(Déterminé automatiquement)</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="critere" className="text-sm font-medium text-gray-700">Critère *</Label>
          <Select
            name="critere"
            value={formData.critere}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, critere: value as ProduitCritere }))}
          >
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400">
              <SelectValue placeholder="Sélectionner un critère" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              <SelectItem value="DURABLE" className="hover:bg-blue-50">Durable</SelectItem>
              <SelectItem value="CONSOMMABLE" className="hover:bg-blue-50">Consommable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="remarque" className="text-sm font-medium text-gray-700">Remarque</Label>
        <Input
          id="remarque"
          name="remarque"
          value={formData.remarque}
          onChange={handleChange}
          className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-100"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
};
type NewProductData = Omit<Product, 'id' | 'statut' | 'categorie'> & { categorieId: string ,statut:string};
const AddProductForm = ({
  onSave,
  onCancel,
  categories,
  
}: {
  onSave: (newProduct: NewProductData) => void;
  onCancel: () => void; // Uncommented - this is needed since it's used in the parent component
  categories: { id: string; nom: string }[];
}) => {
  const [formData, setFormData] = React.useState({
    nom: "",
    marque: "",
    statut:"",
    quantite: 0,
    quantiteMinimale: 0,
    categorieId: "",
    critere: "DURABLE" as ProduitCritere,
    remarque: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.includes("quantite") ? Number(value) : value }));
  };

  const calculateStatus = () => {
    const quantity = Number(formData.quantite);
    const minQuantity = Number(formData.quantiteMinimale);
    if (quantity <= 0) return "RUPTURE";
    if (quantity <= minQuantity) return "CRITIQUE";
    return "NORMALE";
  };

  const validateName = (name: string) => {
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    return nameRegex.test(name.trim());
  };

  const validateMarque = (marque: string) => {
    const marqueRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    return marqueRegex.test(marque.trim());
  };

  const checkDuplicateProduct = async (nom: string, marque: string) => {
    try {
      const response = await fetch(
        `/api/magasinier/produits/check?nom=${encodeURIComponent(nom.trim())}&marque=${encodeURIComponent(marque.trim())}`
      );
      if (!response.ok) {
        throw new Error("Erreur lors de la vérification du produit");
      }
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("Erreur lors de la vérification du produit:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      toast.error("Le nom du produit est requis.");
      return;
    }
    if (!validateName(formData.nom)) {
      toast.error("Le nom du produit doit contenir uniquement des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    if (!formData.marque.trim()) {
      toast.error("La marque du produit est requise.");
      return;
    }
    if (!validateMarque(formData.marque)) {
      toast.error("La marque du produit doit contenir uniquement des lettres, espaces, tirets ou apostrophes.");
      return;
    }

    try {
      const isDuplicate = await checkDuplicateProduct(formData.nom, formData.marque);
      if (isDuplicate) {
        toast.error(`Un produit avec le nom "${formData.nom}" et la marque "${formData.marque}" existe déjà.`);
        return;
      }
    } catch (error) {
      toast.error("Erreur lors de la vérification du produit. Veuillez réessayer.");
      return;
    }

    if (!formData.categorieId) {
      toast.error("Veuillez sélectionner une catégorie.");
      return;
    }

    onSave({
      ...formData,
      quantite: Number(formData.quantite),
      quantiteMinimale: Number(formData.quantiteMinimale),
      statut: calculateStatus(),
    });
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nom" className="text-sm font-medium text-gray-700">Nom *</Label>
          <Input
            id="nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="marque" className="text-sm font-medium text-gray-700">Marque *</Label>
          <Input
            id="marque"
            name="marque"
            value={formData.marque}
            onChange={handleChange}
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantite" className="text-sm font-medium text-gray-700">Quantité *</Label>
          <Input
            id="quantite"
            name="quantite"
            type="number"
            value={formData.quantite}
            onChange={handleChange}
            min="0"
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantiteMinimale" className="text-sm font-medium text-gray-700">Quantité Minimale *</Label>
          <Input
            id="quantiteMinimale"
            name="quantiteMinimale"
            type="number"
            value={formData.quantiteMinimale}
            onChange={handleChange}
            min="0"
            required
            className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categorieId" className="text-sm font-medium text-gray-700">Catégorie *</Label>
          <Select
            name="categorieId"
            value={formData.categorieId}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, categorieId: value }))}
          >
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} className="hover:bg-blue-50">
                  {category.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="critere" className="text-sm font-medium text-gray-700">Critère *</Label>
          <Select
            name="critere"
            value={formData.critere}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, critere: value as ProduitCritere }))}
          >
            <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400">
              <SelectValue placeholder="Sélectionner un critère" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              <SelectItem value="DURABLE" className="hover:bg-blue-50">Durable</SelectItem>
              <SelectItem value="CONSOMMABLE" className="hover:bg-blue-50">Consommable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="remarque" className="text-sm font-medium text-gray-700">Remarque</Label>
        <Input
          id="remarque"
          name="remarque"
          value={formData.remarque}
          onChange={handleChange}
          className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-100"
          >
            Annuler
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
};

// ProductDetails (unchanged)
const ProductDetails = ({ product }: { product: Product }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Nom</h4>
          <p className="text-gray-600">{product.nom}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Marque</h4>
          <p className="text-gray-600">{product.marque}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Catégorie</h4>
          <p className="text-gray-600">{product.categorie.nom}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Quantité</h4>
          <p className="text-gray-600">{product.quantite}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Quantité Minimale</h4>
          <p className="text-gray-600">{product.quantiteMinimale}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Statut</h4>
          <Badge
            className={
              product.statut === "NORMALE"
                ? "bg-green-100 text-green-800"
                : product.statut === "CRITIQUE"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }
          >
            {product.statut.toLowerCase()}
          </Badge>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700">Critère</h4>
          <Badge variant="outline" className="border-blue-200 text-blue-600">
            {product.critere.toLowerCase()}
          </Badge>
        </div>
      </div>
      {product.remarque && (
        <div>
          <h4 className="text-sm font-medium text-gray-700">Remarque</h4>
          <p className="text-gray-600">{product.remarque}</p>
        </div>
      )}
    </div>
  );
};

// CommandeForm (unchanged)
const CommandeForm = ({
  selectedProducts,
  products,
  onSubmit,
  onCancel,
}: {
  selectedProducts: string[];
  products: Product[];
  onSubmit: (commande: any) => void;
  onCancel: () => void;
}) => {
  const [quantities, setQuantities] = React.useState<Record<string, number>>(
    selectedProducts.reduce((acc, id) => ({ ...acc, [id]: 1 }), {})
  );

  const filteredProducts = products.filter((product) => selectedProducts.includes(product.id));

  const handleQuantityChange = (id: string, value: number) => {
    const parsedValue = Math.max(1, Math.floor(Number(value) || 1));
    setQuantities((prev) => ({ ...prev, [id]: parsedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit");
      return;
    }
    const invalidQuantities = selectedProducts.some(
      (id) => !quantities[id] || quantities[id] <= 0 || !Number.isInteger(quantities[id])
    );
    if (invalidQuantities) {
      toast.error("Toutes les quantités doivent être des entiers supérieurs à 0");
      return;
    }
    const commandeData = {
      statut: "NON_VALIDE",
      produits: selectedProducts.map((id) => ({
        produitId: id,
        quantite: quantities[id],
      })),
    };
    console.log("CommandeForm submitting:", JSON.stringify(commandeData, null, 2));
    onSubmit(commandeData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700">Produits sélectionnés</h3>
        {filteredProducts.length === 0 ? (
          <p className="text-gray-500">Aucun produit sélectionné</p>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-gray-700">{product.nom}</p>
                  <p className="text-sm text-gray-500">{product.marque} - {product.categorie.nom}</p>
                </div>
                <div className="w-32">
                  <Label htmlFor={`quantity-${product.id}`} className="sr-only">Quantité</Label>
                  <Input
                    id={`quantity-${product.id}`}
                    type="number"
                    min="1"
                    value={quantities[product.id] || 1}
                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
                    required
                    className="bg-white border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-100"
          >
            Annuler
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={filteredProducts.length === 0}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50"
        >
          Confirmer la commande
        </Button>
      </DialogFooter>
    </form>
  );
};

// ProductsDataTable (updated with registry logging)
export function ProductsDataTable() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [isCommandeDialogOpen, setIsCommandeDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [productsWithAssociations, setProductsWithAssociations] = React.useState<Set<string>>(new Set());

  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  React.useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsResponse, categoriesResponse, associationsResponse] = await Promise.all([
        fetch("/api/magasinier/produits"),
        fetch("/api/magasinier/categories"),
        fetch("/api/admin/produits/associations"), // Utiliser l'API existante
      ]);

      if (!productsResponse.ok) throw new Error("Erreur lors du chargement des produits");
      if (!categoriesResponse.ok) throw new Error("Erreur lors du chargement des catégories");
      if (!associationsResponse.ok) throw new Error("Erreur lors du chargement des associations");

      const [productsData, categoriesData, associationsData] = await Promise.all([
        productsResponse.json(),
        categoriesResponse.json(),
        associationsResponse.json(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setProductsWithAssociations(new Set(associationsData)); // Stocker les IDs des produits avec associations
    } catch (error) {
      console.error("Erreur:", error);
      setError("Impossible de charger les données");
      toast.error("Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  const logRegistryAction = async (productId: string, actionType: "PRODUIT_AJOUTE" | "PRODUIT_MODIFIE" | "PRODUIT_SUPPRIME", description: string) => {
    try {
      const response = await fetch("/api/magasinier/registre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
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

  const handleDeleteProduct = async (id: string) => {
    try {
      const product = products.find((p) => p.id === id);
      const response = await fetch(`/api/magasinier/produits/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression du produit");
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      toast.success("Produit supprimé avec succès");

      // Log the deletion in the registry
      if (product) {
        await logRegistryAction(
          id,
          "PRODUIT_SUPPRIME",
          `Produit supprimé: ${product.nom} (${product.marque})`
        );
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le produit");
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Tout sélectionner"
          className="border-gray-200"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Sélectionner la ligne"
          className="border-gray-200"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "nom",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-gray-700 font-semibold hover:bg-blue-50"
        >
          Nom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-blue-600 font-medium">{row.getValue("nom")}</div>,
    },
    {
      accessorKey: "categorie.nom",
      header: () => <div className="text-gray-700 font-semibold">Catégorie</div>,
      cell: ({ row }) => <div className="text-gray-700">{row.original.categorie.nom}</div>,
    },
    {
      accessorKey: "quantite",
      header: () => <div className="text-right text-gray-700 font-semibold">Quantité</div>,
      cell: ({ row }) => <div className="text-right text-gray-700">{row.getValue("quantite")}</div>,
    },
    {
      accessorKey: "quantiteMinimale",
      header: () => <div className="text-right text-gray-700 font-semibold">Quantité Min</div>,
      cell: ({ row }) => <div className="text-right text-gray-700">{row.getValue("quantiteMinimale")}</div>,
    },
    {
      accessorKey: "statut",
      header: () => <div className="text-gray-700 font-semibold">Statut</div>,
      cell: ({ row }) => {
        const statut = row.getValue("statut") as string;
        return (
          <Badge
            className={
              statut === "NORMALE"
                ? "bg-green-100 text-green-800"
                : statut === "CRITIQUE"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }
          >
            {statut.toLowerCase()}
          </Badge>
        );
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "critere",
      header: () => <div className="text-gray-700 font-semibold">Critère</div>,
      cell: ({ row }) => (
        <Badge variant="outline" className="border-blue-200 text-blue-600">
          {String(row.getValue("critere")).toLowerCase()}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
  id: "actions",
  enableHiding: false,
  cell: ({ row }) => {
    const product = row.original;
    return (
      <div className="flex space-x-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
          onClick={() => {
            setSelectedProduct(product);
            setIsEditDialogOpen(true);
          }}
          aria-label={`Modifier ${product.nom}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
          onClick={() => {
            setSelectedProduct(product);
            setIsDetailsDialogOpen(true);
          }}
          aria-label={`Voir les détails de ${product.nom}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-800"
          onClick={() => {
            setProductToDelete(product);
            setIsDeleteDialogOpen(true);
          }}
          disabled={productsWithAssociations.has(product.id)} // Désactiver si le produit a des associations
          aria-label={`Supprimer ${product.nom}`}
          aria-disabled={productsWithAssociations.has(product.id) ? "true" : "false"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  },
}
  ];

 const handleUpdateProduct = async (updatedProduct: any) => {
  try {
    const originalProduct = products.find((p) => p.id === updatedProduct.id);
    const response = await fetch(`/api/magasinier/produits/${updatedProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct),
    });

    if (!response.ok) throw new Error("Erreur lors de la mise à jour du produit");

    const updatedData = await response.json();
    setProducts(products.map((p) => (p.id === updatedData.id ? updatedData : p)));
    setIsEditDialogOpen(false);
    toast.success("Produit mis à jour avec succès");

    // Log the modification in the registry
    if (originalProduct) {
      const changes = [];
      if (updatedProduct.nom !== originalProduct.nom) changes.push(`Nom: ${originalProduct.nom} → ${updatedProduct.nom}`);
      if (updatedProduct.marque !== originalProduct.marque) changes.push(`Marque: ${originalProduct.marque} → ${updatedProduct.marque}`);
      if (updatedProduct.quantite !== originalProduct.quantite) changes.push(`Quantité: ${originalProduct.quantite} → ${updatedProduct.quantite}`);
      if (updatedProduct.quantiteMinimale !== originalProduct.quantiteMinimale) changes.push(`Quantité Minimale: ${originalProduct.quantiteMinimale} → ${updatedProduct.quantiteMinimale}`);
      if (updatedProduct.critere !== originalProduct.critere) changes.push(`Critère: ${originalProduct.critere} → ${updatedProduct.critere}`);
      if (updatedProduct.remarque !== originalProduct.remarque) changes.push(`Remarque: ${originalProduct.remarque || "aucune"} → ${updatedProduct.remarque || "aucune"}`);

      const description = `Produit modifié: ${updatedProduct.nom} (${updatedProduct.marque}). Changements: ${changes.join(", ")}`;
      await logRegistryAction(updatedProduct.id, "PRODUIT_MODIFIE", description);
    }

    // Check if the product's status is CRITIQUE or RUPTURE
    if (updatedData.statut === "CRITIQUE" || updatedData.statut === "RUPTURE") {
      try {
        // Fetch all admin and magasinier users
        const usersResponse = await fetch("/api/emails/admin/users", {
          headers: { "Content-Type": "application/json" },
        });

        if (!usersResponse.ok) {
          throw new Error(`Erreur HTTP ${usersResponse.status}`);
        }

        const users = await usersResponse.json();
        const recipientEmails = users
          .filter((user: { role: string }) => ["ADMIN", "MAGASINNIER"].includes(user.role))
          .map((user: { email: string }) => user.email);

        if (recipientEmails.length > 0) {
          const emailResponse = await fetch("/api/emails/admin/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              produitId: updatedData.id,
              produitNom: updatedData.nom,
              statut: updatedData.statut,
              quantite: updatedData.quantite,
              quantiteMinimale: updatedData.quantiteMinimale,
              adminEmails: recipientEmails,
            }),
          });

          const emailText = await emailResponse.text();
          if (!emailResponse.ok) {
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
  } catch (error) {
    console.error("Erreur:", error);
    toast.error("Impossible de mettre à jour le produit");
  }
};

  const handleAddProduct = async (newProduct: any) => {
  try {
    const response = await fetch("/api/magasinier/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });

    if (!response.ok) throw new Error("Erreur lors de la création du produit");

    const createdProduct = await response.json();
    setProducts((prev) => [...prev, createdProduct]);
    setIsAddDialogOpen(false);
    toast.success("Produit ajouté avec succès");

    // Find the category name for logging (fallback to categorieId if categorie is missing)
    const categoryName =
      createdProduct.categorie?.nom ||
      categories.find((cat) => cat.id === createdProduct.categorieId)?.nom ||
      "Inconnue";

    // Log the addition in the registry
    await logRegistryAction(
      createdProduct.id,
      "PRODUIT_AJOUTE",
      `Produit ajouté: ${createdProduct.nom} (${createdProduct.marque}), Quantité: ${createdProduct.quantite}, Catégorie: ${categoryName}`
    );
  } catch (error) {
    console.error("Erreur:", error);
    toast.error("Impossible de créer le produit");
  }
};
  const handleCommandeSubmit = async (commandeData: any) => {
    try {
      const response = await fetch("/api/magasinier/produits/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création de la commande");
      }

      setIsCommandeDialogOpen(false);
      setRowSelection({});
      toast.success("Commande créée avec succès");
      router.refresh();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error instanceof Error ? error.message : "Impossible de créer la commande");
    }
  };

  const table = useReactTable({
    data: products,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedRowIds = selectedRows.map((row) => row.original.id);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-md">
        <h3 className="font-bold text-red-700">Authentification requise</h3>
        <p className="mt-2">Veuillez vous connecter pour accéder à la gestion des produits.</p>
        <Button
          onClick={() => router.push("/sign-in")}
          variant="outline"
          className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
        >
          Se connecter
        </Button>
      </div>
    );
  }

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
          onClick={() => window.location.reload()}
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
            Gestion des Produits
          </h2>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 flex items-center gap-2"
            aria-label="Ajouter un nouveau produit"
          >
            <ShoppingCart className="h-4 w-4" />
            Ajouter Produit
          </Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Filtrer par nom..."
            value={(table.getColumn("nom")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("nom")?.setFilterValue(event.target.value)}
            className="max-w-sm bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
          />
          <Select
            value={(table.getColumn("statut")?.getFilterValue() as string[])?.[0] || "all"}
            onValueChange={(value) => {
              if (value === "all") {
                table.getColumn("statut")?.setFilterValue(undefined);
              } else {
                table.getColumn("statut")?.setFilterValue([value]);
              }
            }}
          >
            <SelectTrigger
              className="w-[180px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
              aria-label="Filtrer par statut"
            >
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              <SelectItem value="all" className="hover:bg-blue-50">Tous les statuts</SelectItem>
              <SelectItem value="NORMALE" className="hover:bg-blue-50">Normale</SelectItem>
              <SelectItem value="CRITIQUE" className="hover:bg-blue-50">Critique</SelectItem>
              <SelectItem value="RUPTURE" className="hover:bg-blue-50">Rupture</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn("critere")?.getFilterValue() as string[])?.[0] || "all"}
            onValueChange={(value) => {
              if (value === "all") {
                table.getColumn("critere")?.setFilterValue(undefined);
              } else {
                table.getColumn("critere")?.setFilterValue([value]);
              }
            }}
          >
            <SelectTrigger
              className="w-[180px] bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
              aria-label="Filtrer par critère"
            >
              <SelectValue placeholder="Critère" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 text-gray-700">
              <SelectItem value="all" className="hover:bg-blue-50">Tous les critères</SelectItem>
              <SelectItem value="DURABLE" className="hover:bg-blue-50">Durable</SelectItem>
              <SelectItem value="CONSOMMABLE" className="hover:bg-blue-50">Consommable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedRows.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={() => setIsCommandeDialogOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 flex items-center gap-2"
              aria-label={`Passer une commande pour ${selectedRows.length} produit(s)`}
            >
              <ShoppingCart className="h-4 w-4" />
              Passer commande ({selectedRows.length})
            </Button>
          </div>
        )}
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-gray-700 font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                      Aucun produit trouvé
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-500">
            {table.getFilteredSelectedRowModel().rows.length} sur{" "}
            {table.getFilteredRowModel().rows.length} produit(s) sélectionné(s)
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              Suivant
            </Button>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setIsEditDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
            
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Modifier le produit
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Modifiez les détails du produit ci-dessous.
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <EditProductForm
                product={selectedProduct}
                onSave={handleUpdateProduct}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setIsAddDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Ajouter un produit
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Remplissez les détails du nouveau produit ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <AddProductForm
              onSave={handleAddProduct}
              onCancel={() => setIsAddDialogOpen(false)}
              categories={categories}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setIsDetailsDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails du produit
              </DialogTitle>
            </DialogHeader>
            {selectedProduct && <ProductDetails product={selectedProduct} />}
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCommandeDialogOpen} onOpenChange={setIsCommandeDialogOpen}>
          <DialogContent className="sm:max-w-[700px] bg-white rounded-xl shadow-2xl border border-blue-100">
            <button
              onClick={() => setIsCommandeDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Passer une commande
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Spécifiez les quantités pour chaque produit sélectionné.
              </DialogDescription>
            </DialogHeader>
            <CommandeForm
              selectedProducts={selectedRowIds}
              products={products}
              onSubmit={handleCommandeSubmit}
              onCancel={() => setIsCommandeDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl border border-red-100">
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-pink-600">
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer le produit{" "}
                <span className="font-semibold">
                  {productToDelete?.nom} ({productToDelete?.marque})
                </span>{" "}
                ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                  onClick={() => setProductToDelete(null)}
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => productToDelete && handleDeleteProduct(productToDelete.id)}
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}