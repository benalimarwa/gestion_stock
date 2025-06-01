"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
  score: number | null;
}

interface SelectedProduct {
  id: string;
  produitId: string;
  nom: string;
  marque: string;
  quantite: number;
}

interface OrderFormModalProps {
  selectedProducts: SelectedProduct[];
  sourceOrderId: string;
  onClose: () => void;
  onSubmit: () => void;
}

export function OrderFormModal({
  selectedProducts,
  sourceOrderId,
  onClose,
  onSubmit,
}: OrderFormModalProps) {
  const [products, setProducts] = useState<SelectedProduct[]>(selectedProducts);
  const [suppliers, setSuppliers] = useState<Fournisseur[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedDatePrevu, setSelectedDatePrevu] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    nom: "",
    contact: "",
    score: "",
  });

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProducts(
      products.map((product) =>
        product.id === productId
          ? { ...product, quantite: quantity >= 1 ? quantity : 1 }
          : product
      )
    );
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
      setSelectedSupplier(createdSupplier.id);
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

  const handleSubmit = async () => {
    if (!selectedSupplier || !selectedDatePrevu) {
      toast.error("Veuillez sélectionner un fournisseur et une date prévue");
      return;
    }

    setSubmitting(true);

    try {
      const formattedProducts = products.map((product) => ({
        produitId: product.produitId,
        quantite: product.quantite,
      }));

      // Convertir la date au format ISO (ex. "2025-05-20" -> "2025-05-20T00:00:00.000Z")
      const datePrevuISO = new Date(selectedDatePrevu).toISOString();

      const response = await fetch(
        "/api/gestionnaire/commandes/validee/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fournisseurId: selectedSupplier,
            sourceOrderId,
            produits: formattedProducts,
            datePrevu: datePrevuISO,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Échec de la création de la commande"
        );
      }

      toast.success("Commande créée avec succès");
      onSubmit();
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Échec de la création de la commande"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle commande</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Produits sélectionnés</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.nom}</TableCell>
                  <TableCell>{product.marque}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={product.quantite}
                      onChange={(e) =>
                        handleQuantityChange(product.id, parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Sélectionner un fournisseur</h3>
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
                <label className="block text-sm font-medium">Nom</label>
                <Input
                  name="nom"
                  value={newSupplier.nom}
                  onChange={handleSupplierFormChange}
                  placeholder="Nom du fournisseur"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Contact</label>
                <Input
                  name="contact"
                  value={newSupplier.contact}
                  onChange={handleSupplierFormChange}
                  placeholder="Informations de contact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Score (optionnel)
                </label>
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
          ) : loading ? (
            <div className="text-center py-4">Chargement des fournisseurs...</div>
          ) : (
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-full">
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
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-2">Sélectionner la date prévue</h3>
          <Input
            type="date"
            value={selectedDatePrevu}
            onChange={(e) => setSelectedDatePrevu(e.target.value)}
            className="w-full"
            placeholder="Sélectionner une date prévue"
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSupplier || !selectedDatePrevu || submitting}
          >
            {submitting ? "Création de la commande..." : "Confirmer la commande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}