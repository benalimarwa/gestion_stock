"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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

interface ProductSelectionModalProps {
  order: Commande;
  onClose: () => void;
  onProductsSelected: (products: SelectedProduct[]) => void;
}

export function ProductSelectionModal({
  order,
  onClose,
  onProductsSelected,
}: ProductSelectionModalProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const orderProducts = order.produits.map((item) => ({
    id: item.produit.id,
    produitId: item.produit.id,
    nom: item.produit.nom,
    marque: item.produit.marque || "Inconnu",
    quantite: item.quantite,
    reordered: item.reordered,
  }));

  const handleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = () => {
    const selected = orderProducts.filter((product) =>
      selectedProductIds.includes(product.id)
    );
    onProductsSelected(selected);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Détails de la commande - {order.id.substring(0, 8)}...
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          <h3 className="font-medium mb-2">
            Sélectionner les produits pour la nouvelle commande
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sélectionner</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderProducts.map((product) => (
                <TableRow
                  key={product.id}
                  className={product.reordered ? "opacity-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={() => handleSelectProduct(product.id)}
                      disabled={product.reordered}
                    />
                  </TableCell>
                  <TableCell>{product.nom}</TableCell>
                  <TableCell>{product.quantite}</TableCell>
                  <TableCell>
                    {product.reordered ? (
                      <span className="text-xs text-gray-500">
                        Déjà recommandé
                      </span>
                    ) : (
                      <span className="text-xs text-green-500">Disponible</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProductIds.length === 0}
          >
            Passer la commande pour les produits sélectionnés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}