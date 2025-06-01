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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Define the Product type based on the API response and Prisma schema
interface Product {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  categorie: { nom: string };
}

export function ProductListTable() {
  // Use the Product type for state
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from the API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/demandeurUser/produit");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erreur lors de la récupération des produits");
        }
        const data: Product[] = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } catch (error: any) {
        console.error("Erreur:", error);
        setError(error.message);
        toast.error(error.message || "Impossible de charger les produits");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else if (selectedProduct && value > selectedProduct.quantite) {
      setQuantity(selectedProduct.quantite);
    } else {
      setQuantity(value);
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error("La quantité doit être supérieure à 0");
      return;
    }

    try {
      const response = await fetch("/api/demandeurUser/produit/demande", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          produitId: selectedProduct.id,
          quantite: quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création de la demande");
      }

      await response.json();
      toast.success(`Demande créée pour ${quantity} ${selectedProduct.nom}`);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Impossible de créer la demande");
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Liste des Produits
        </h2>
      </div>

      <div className="relative flex-1 group mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <Input
          placeholder="Rechercher un produit par nom..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400 focus:bg-white shadow-sm transition-all group-hover:shadow-blue-200"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-md mb-6">
          <h3 className="font-bold text-red-700">Erreur</h3>
          <p className="mt-2">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
          >
            Réessayer
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-500 mb-4">Liste des produits disponibles.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">Nom du Produit</TableHead>
                <TableHead className="text-gray-700 font-semibold">Marque</TableHead>
                <TableHead className="text-gray-700 font-semibold">Stock Disponible</TableHead>
                <TableHead className="text-gray-700 font-semibold">Catégorie</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? "Aucun produit correspondant à la recherche" : "Aucun produit disponible"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-blue-50 transition-colors duration-200">
                    <TableCell className="font-medium text-blue-600">{product.nom || "N/A"}</TableCell>
                    <TableCell className="text-gray-700">{product.marque || "Inconnu"}</TableCell>
                    <TableCell className="text-gray-700">{product.quantite ?? 0}</TableCell>
                    <TableCell className="text-gray-700">{product.categorie?.nom || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setQuantity(1);
                        }}
                        disabled={product.quantite <= 0}
                        className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                      >
                        Demander
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={4} className="text-gray-700">Total Produits</TableCell>
                <TableCell className="text-right text-gray-700">{filteredProducts.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="bg-white rounded-xl shadow-2xl border border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Commander un Produit
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-gray-700">Nom</Label>
                  <p className="text-gray-600">{selectedProduct.nom || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">Marque</Label>
                  <p className="text-gray-600">{selectedProduct.marque || "Inconnu"}</p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">Stock Disponible</Label>
                  <p className="text-gray-600">{selectedProduct.quantite ?? 0}</p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">Catégorie</Label>
                  <p className="text-gray-600">{selectedProduct.categorie?.nom || "N/A"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="font-semibold text-gray-700">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  min={1}
                  max={selectedProduct.quantite}
                  onChange={handleQuantityChange}
                  className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                />
                {quantity <= 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    La quantité doit être supérieure à 0
                  </p>
                )}
                {quantity > selectedProduct.quantite && (
                  <p className="text-red-500 text-sm mt-1">
                    La quantité ne peut pas dépasser le stock disponible
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                onClick={handleConfirmOrder}
                disabled={quantity <= 0 || quantity > selectedProduct.quantite}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
              >
                Confirmer la Demande
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedProduct(null)}
                className="border-blue-200 text-blue-600 hover:bg-blue-100"
              >
                Annuler
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}