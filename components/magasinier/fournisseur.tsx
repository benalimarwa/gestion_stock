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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, X, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Fournisseur = {
  id: string;
  nom: string;
  contact: string;
  _count?: { commandes: number };
  createdAt: string;
  updatedAt: string;
};

type Produit = {
  id: string;
  nom: string;
};

type Commande = {
  id: string;
  statut: string;
  date: string;
  datePrevu: string;
  createdAt: string;
  updatedAt: string;
  produits: { quantite: number; produit: { nom: string } }[];
};

type FormData = {
  nom: string;
  contact: string;
  produitIds: string[];
};

export function DataFour() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ nom: "", contact: "", produitIds: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingCommandes, setIsLoadingCommandes] = useState(false);
  const [commandesError, setCommandesError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [fournisseurToDelete, setFournisseurToDelete] = useState<Fournisseur | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [fournisseursResponse, produitsResponse] = await Promise.all([
          fetch("/api/magasinier/fournisseur"),
          fetch("/api/magasinier/fournisseur/produit"),
        ]);

        const [fournisseursText, produitsText] = await Promise.all([
          fournisseursResponse.text(),
          produitsResponse.text(),
        ]);

        let fournisseursData, produitsData;
        try {
          fournisseursData = JSON.parse(fournisseursText);
          produitsData = JSON.parse(produitsText);
        } catch {
          console.error("Invalid JSON:", { fournisseursText, produitsText });
          throw new Error("Réponse invalide du serveur");
        }

        if (!fournisseursResponse.ok) {
          throw new Error(fournisseursData.error || "Erreur lors de la récupération des fournisseurs");
        }
        if (!produitsResponse.ok) {
          throw new Error(produitsData.error || "Erreur lors de la récupération des produits");
        }

        setFournisseurs(fournisseursData);
        setProduits(produitsData);
      } catch (err) {
        console.error("Erreur fetchData:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDelete = (fournisseur: Fournisseur) => {
    setFournisseurToDelete(fournisseur);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fournisseurToDelete) return;

    try {
      const response = await fetch(`/api/magasinier/fournisseur?id=${fournisseurToDelete.id}`, {
        method: "DELETE",
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(data.error || "Échec de la suppression du fournisseur");
      }

      setFournisseurs((prev) => prev.filter((f) => f.id !== fournisseurToDelete.id));
      setIsDeleteOpen(false);
      setFournisseurToDelete(null);
      toast.success("Fournisseur supprimé avec succès", {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      toast.error(err instanceof Error ? err.message : "Erreur inconnue", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    }
  };

  const handleViewDetails = async (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsDetailsOpen(true);
    setIsLoadingCommandes(true);
    setCommandesError(null);
    setCommandes([]);

    try {
      const response = await fetch(`/api/magasinier/fournisseur/commande?fournisseurId=${fournisseur.id}`);
      const text = await response.text();
      let commandesData;
      try {
        commandesData = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(commandesData.error || "Erreur lors de la récupération des commandes");
      }
      setCommandes(commandesData);
    } catch (err) {
      console.error("Erreur handleViewDetails:", err);
      setCommandesError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoadingCommandes(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const { nom, contact, produitIds } = formData;

    if (!nom.trim() || !contact.trim()) {
      setFormError("Le nom et le contact sont requis");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/magasinier/fournisseur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim(), contact: contact.trim(), produitIds }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(data.error || "Échec de la création du fournisseur");
      }

      setFournisseurs((prev) => [...prev, data]);
      setFormData({ nom: "", contact: "", produitIds: [] });
      setIsAddOpen(false);
      toast.success("Fournisseur ajouté avec succès", {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      });
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur inconnue", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProduitChange = (produitId: string) => {
    setFormData((prev) => ({
      ...prev,
      produitIds: prev.produitIds.includes(produitId)
        ? prev.produitIds.filter((id) => id !== produitId)
        : [...prev.produitIds, produitId],
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-blue-900/60 backdrop-blur-md p-4 rounded-lg shadow-md border border-blue-800/60 text-blue-200 text-sm font-medium animate-pulse font-[Inter,sans-serif]"
        >
          <svg className="animate-spin h-8 w-8 text-blue-200 mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
          </svg>
          <p className="mt-2">Chargement des fournisseurs...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-red-300 bg-red-900/60 backdrop-blur-md p-4 rounded-lg shadow-md border border-red-800/60 font-[Inter,sans-serif] text-sm"
        >
          Erreur: {error}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-250 to-purple-350 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
          <div className="relative flex justify-between items-center flex-col md:flex-row gap-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif]">
              Gestion des Fournisseurs
            </h2>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 backdrop-blur-md h-9 px-4 text-sm">
                  <PlusCircle className="h-4 w-4" />
                  Ajouter un fournisseur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-w-[90vw] bg-blue-900/60 backdrop-blur-md rounded-lg shadow-2xl p-4 border border-blue-800/60 transition-all duration-300">
                <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-blue-200 font-[Inter,sans-serif]">
                    Ajouter un nouveau fournisseur
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4 relative">
                  {formError && (
                    <div className="text-red-300 text-xs bg-red-900/60 p-2 rounded border border-red-800/60">
                      Erreur: {formError}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="nom" className="text-sm font-semibold text-blue-200">
                      Nom
                    </Label>
                    <Input
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      placeholder="Nom du fournisseur"
                      required
                      className="bg-blue-800/50 border-blue-700/60 text-blue-100 placeholder-blue-400 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-9 px-3 text-sm"
                    />
                    <p className="text-xs text-blue-300">Entrez le nom complet du fournisseur</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact" className="text-sm font-semibold text-blue-200">
                      Contact
                    </Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      placeholder="Email ou téléphone"
                      required
                      className="bg-blue-800/50 border-blue-700/60 text-blue-100 placeholder-blue-400 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 h-9 px-3 text-sm"
                    />
                    <p className="text-xs text-blue-300">Entrez un email ou numéro de téléphone valide</p>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-blue-200">Produits associés</Label>
                    <Select
                      onValueChange={handleProduitChange}
                      value=""
                      disabled={produits.length === 0}
                    >
                      <SelectTrigger className="bg-blue-800/50 border-blue-700/60 text-blue-100 focus:ring-blue-500 transition-all duration-200 h-9 px-3 text-sm">
                        <SelectValue placeholder="Sélectionnez des produits" />
                      </SelectTrigger>
                      <SelectContent className="bg-blue-900/80 backdrop-blur-md border-blue-800/60 text-blue-100">
                        {produits.map((produit) => (
                          <SelectItem
                            key={produit.id}
                            value={produit.id}
                            className="text-blue-200 hover:bg-blue-800/70 text-sm py-1"
                          >
                            {produit.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-300">Sélectionnez les produits fournis (optionnel)</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.produitIds.map((produitId) => {
                        const produit = produits.find((p) => p.id === produitId);
                        return (
                          <div
                            key={produitId}
                            className="flex items-center gap-1 bg-blue-800/80 text-blue-100 px-2 py-0.5 rounded-full text-xs font-medium"
                          >
                            <span>{produit?.nom}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProduitChange(produitId)}
                              className="hover:bg-blue-700/80 rounded-full"
                            >
                              <X className="h-3 w-3 text-blue-200" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-blue-200 border-blue-700/60 hover:bg-blue-800/70 transition-all duration-200 hover:scale-105 h-9 px-4 text-sm"
                      >
                        Annuler
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 backdrop-blur-md h-9 px-4 text-sm"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-4 w-4 text-blue-100" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
                          </svg>
                          Ajout...
                        </span>
                      ) : (
                        "Ajouter"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <Table className="bg-blue-900/80 backdrop-blur-md rounded-lg shadow-md border border-blue-800/60">
              <TableCaption className="text-blue-200 font-medium font-[Inter,sans-serif] text-sm">
                Liste des fournisseurs enregistrés
              </TableCaption>
              <TableHeader className="bg-blue-700/80">
                <TableRow>
                  <TableHead className="w-[200px] text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Nom
                  </TableHead>
                  <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Contact
                  </TableHead>
                  <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Nombre de commandes
                  </TableHead>
                  <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Créé le
                  </TableHead>
                  <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Mis à jour le
                  </TableHead>
                  <TableHead className="w-[150px] text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2 text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {fournisseurs.map((fournisseur, index) => (
                    <motion.tr
                      key={fournisseur.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`transition-all duration-200 ${
                        index % 2 === 0 ? "bg-blue-800/50" : "bg-blue-900/50"
                      } hover:bg-blue-800/70`}
                    >
                      <TableCell className="font-medium text-blue-100 text-sm py-2">{fournisseur.nom}</TableCell>
                      <TableCell className="text-blue-200 text-sm py-2">{fournisseur.contact}</TableCell>
                      <TableCell className="text-blue-200 text-sm py-2">
                        {fournisseur._count?.commandes || 0}
                      </TableCell>
                      <TableCell className="text-blue-200 text-sm py-2">{formatDate(fournisseur.createdAt)}</TableCell>
                      <TableCell className="text-blue-200 text-sm py-2">{formatDate(fournisseur.updatedAt)}</TableCell>
                      <TableCell className="flex justify-center gap-2 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(fournisseur)}
                          className="bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 transition-all duration-200 hover:scale-105 backdrop-blur-md h-8 px-3 text-xs"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(fournisseur)}
                          className="bg-red-600/80 text-red-100 hover:bg-red-700/80 transition-all duration-200 hover:scale-105 backdrop-blur-md h-8 px-3 text-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
              <TableFooter className="bg-blue-700/80">
                <TableRow>
                  <TableCell colSpan={6} className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                    Total: {fournisseurs.length} fournisseurs
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <Dialog open={isDetailsOpen} onOpenChange={(open) => {
            if (!open) {
              setSelectedFournisseur(null);
              setIsDetailsOpen(false);
              setCommandes([]);
              setCommandesError(null);
            }
          }}>
            <DialogContent className="sm:max-w-3xl max-w-[90vw] bg-blue-900/60 backdrop-blur-md rounded-lg shadow-2xl p-4 border border-blue-800/60 h-[70vh] flex flex-col transition-all duration-300">
              <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
              <button
                onClick={() => {
                  setSelectedFournisseur(null);
                  setIsDetailsOpen(false);
                  setCommandes([]);
                  setCommandesError(null);
                }}
                className="absolute top-2 right-2 p-1 bg-blue-800/80 text-blue-100 rounded-full hover:bg-blue-700/80 hover:scale-110 transition-all duration-200"
                aria-label="Fermer la fenêtre"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-full relative">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-blue-200 font-[Inter,sans-serif] pr-8">
                    Commandes du fournisseur: {selectedFournisseur?.nom}
                  </DialogTitle>
                </DialogHeader>
                {isLoadingCommandes ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-8 w-8 text-blue-200 mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
                    </svg>
                    <p className="mt-2 text-blue-200 text-sm font-medium font-[Inter,sans-serif]">
                      Chargement des commandes...
                    </p>
                  </div>
                ) : commandesError ? (
                  <div className="text-center py-4 bg-red-900/60 rounded border border-red-800/60">
                    <p className="text-red-300 text-sm font-medium font-[Inter,sans-serif]">
                      Erreur: {commandesError}
                    </p>
                  </div>
                ) : commandes.length === 0 ? (
                  <div className="text-center py-4 text-blue-200 text-sm font-medium font-[Inter,sans-serif]">
                    Aucune commande trouvée pour ce fournisseur.
                  </div>
                ) : (
                  <div className="relative max-h-[50vh] overflow-y-auto overflow-x-auto rounded-lg">
                    <Table className="min-w-[600px] bg-blue-900/80 backdrop-blur-md border border-blue-800/60">
                      <TableHeader className="bg-blue-700/80">
                        <TableRow>
                          <TableHead className="w-[150px] text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            ID Commande
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Statut
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Date
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Date Prévue
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Produits
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Créée le
                          </TableHead>
                          <TableHead className="text-blue-100 font-semibold font-[Inter,sans-serif] text-sm py-2">
                            Mise à jour le
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {commandes.map((commande, idx) => (
                            <motion.tr
                              key={commande.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.3, delay: idx * 0.1 }}
                              className={`transition-all duration-200 ${
                                idx % 2 === 0 ? "bg-blue-800/50" : "bg-blue-900/50"
                              } hover:bg-blue-800/70`}
                            >
                              <TableCell className="text-blue-100 text-sm py-2">
                                {commande.id.slice(0, 8)}...
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                <span
                                  className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                                    commande.statut === "LIVREE"
                                      ? "bg-green-900/60 text-green-300"
                                      : commande.statut === "EN_COURS"
                                      ? "bg-blue-900/60 text-blue-300"
                                      : commande.statut === "ANNULEE"
                                      ? "bg-red-900/60 text-red-300"
                                      : "bg-yellow-900/60 text-yellow-300"
                                  }`}
                                >
                                  {commande.statut}
                                </span>
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                {formatDate(commande.date)}
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                {formatDate(commande.datePrevu)}
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                {commande.produits.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-blue-100">{p.produit.nom}</span>
                                    <span className="text-blue-300">(Qté: {p.quantite})</span>
                                  </div>
                                ))}
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                {formatDate(commande.createdAt)}
                              </TableCell>
                              <TableCell className="text-blue-200 text-sm py-2">
                                {formatDate(commande.updatedAt)}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="text-blue-200 border-blue-700/60 hover:bg-blue-800/70 transition-all duration-200 hover:scale-105 h-9 px-4 text-sm"
                    >
                      Fermer
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent className="sm:max-w-md max-w-[90vw] bg-blue-900/60 backdrop-blur-md rounded-lg shadow-2xl p-4 border border-blue-800/60 transition-all duration-300">
              <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-blue-200 font-[Inter,sans-serif]">
                  Confirmer la suppression
                </DialogTitle>
                <DialogDescription className="text-sm text-blue-300 mt-2">
                  Êtes-vous sûr de vouloir supprimer le fournisseur{" "}
                  <span className="font-semibold text-blue-100">{fournisseurToDelete?.nom}</span> ? Cette action est
                  irréversible.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="text-blue-200 border-blue-700/60 hover:bg-blue-800/70 transition-all duration-200 hover:scale-105 h-9 px-4 text-sm"
                  >
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="bg-red-600/80 text-red-100 hover:bg-red-700/80 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg backdrop-blur-md h-9 px-4 text-sm"
                >
                  Supprimer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
}

export default DataFour;