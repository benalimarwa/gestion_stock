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
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, X, Eye, RefreshCw } from "lucide-react";
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

/**
 * DataFour component to manage suppliers with a vibrant blue gradient design.
 */
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

  // Fetch suppliers and products
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fournisseursResponse, produitsResponse] = await Promise.all([
        fetch("/api/admin/fournisseur"),
        fetch("/api/admin/produit"),
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle view details
  const handleViewDetails = async (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsDetailsOpen(true);
    setIsLoadingCommandes(true);
    setCommandesError(null);
    setCommandes([]);

    try {
      const response = await fetch(`/api/admin/comandefour1?fournisseurId=${fournisseur.id}`);
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

  // Handle add supplier submission
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
      const response = await fetch("/api/admin/fournisseur", {
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
      toast.success("Fournisseur ajouté avec succès");
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes for add form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle product selection
  const handleProduitChange = (produitId: string) => {
    setFormData((prev) => ({
      ...prev,
      produitIds: prev.produitIds.includes(produitId)
        ? prev.produitIds.filter((id) => id !== produitId)
        : [...prev.produitIds, produitId],
    }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Close details modal
  const handleCloseDetailsModal = () => {
    setIsDetailsOpen(false);
    setSelectedFournisseur(null);
    setCommandes([]);
    setCommandesError(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-600">
        <Skeleton className="h-10 w-[250px] rounded-lg bg-blue-200 dark:bg-blue-800" />
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-blue-100 dark:bg-blue-800" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 text-red-600 dark:text-red-300 rounded-2xl shadow-xl border border-red-200 dark:border-red-700">
        <div className="flex items-center gap-3">
          <svg className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-red-700 dark:text-red-200">Erreur de Chargement</h3>
        </div>
        <p className="mt-3">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-lg transition-all duration-200"
          aria-label="Réessayer de charger les données"
        >
          <RefreshCw className="mr-2 h-5 w-5 animate-spin-on-hover" /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-600">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200 animate-pulse-slow">
            Gestion des Fournisseurs
          </h2>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg flex items-center gap-2 shadow-md hover:from-blue-600 hover:to-blue-800 transition-all duration-200"
                aria-label="Ajouter un nouveau fournisseur"
              >
                <PlusCircle className="h-5 w-5 animate-spin-on-hover" />
                Ajouter un Fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-600">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200">
                  Ajouter un Nouveau Fournisseur
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  Remplissez les informations pour ajouter un fournisseur.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                {formError && (
                  <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-700">
                    Erreur: {formError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Nom *
                  </Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    placeholder="Nom du fournisseur"
                    required
                    aria-required="true"
                    className="bg-gray-50 dark:bg-gray-700 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Contact *
                  </Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Email ou téléphone"
                    required
                    aria-required="true"
                    className="bg-gray-50 dark:bg-gray-700 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="produits" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Produits Associés
                  </Label>
                  <Select onValueChange={handleProduitChange} disabled={produits.length === 0}>
                    <SelectTrigger
                      id="produits"
                      className="bg-gray-50 dark:bg-gray-700 border-blue-300 dark:border-blue-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      aria-label="Sélectionner des produits associés"
                    >
                      <SelectValue placeholder="Sélectionnez des produits" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-600 text-gray-900 dark:text-gray-100">
                      {produits
                        .filter((produit) => !formData.produitIds.includes(produit.id))
                        .map((produit) => (
                          <SelectItem
                            key={produit.id}
                            value={produit.id}
                            className="text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900"
                          >
                            {produit.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sélectionnez les produits fournis (optionnel)</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.produitIds.map((produitId) => {
                      const produit = produits.find((p) => p.id === produitId);
                      return (
                        <div
                          key={produitId}
                          className="flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium"
                        >
                          <span>{produit?.nom || "Produit inconnu"}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProduitChange(produitId)}
                            className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full"
                            aria-label={`Supprimer ${produit?.nom}`}
                          >
                            <X className="h-3 w-3 text-blue-600 dark:text-blue-300" />
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
                      className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
                    >
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 hover:shadow-lg transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
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

        <div className="relative overflow-x-auto rounded-xl border border-blue-300 dark:border-blue-600 shadow-lg">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-600 dark:text-gray-300 pb-4">
              Liste des fournisseurs enregistrés
            </TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-600">
              <TableRow>
                <TableHead className="w-[200px] text-white dark:text-gray-100 font-bold">Nom</TableHead>
                <TableHead className="text-white dark:text-gray-100 font-bold">Contact</TableHead>
                <TableHead className="text-white dark:text-gray-100 font-bold">Nombre de Commandes</TableHead>
                <TableHead className="text-white dark:text-gray-100 font-bold">Créé le</TableHead>
                <TableHead className="text-white dark:text-gray-100 font-bold">Mis à jour le</TableHead>
                <TableHead className="text-white dark:text-gray-100 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Aucun fournisseur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {fournisseurs.map((fournisseur, index) => (
                    <motion.tr
                      key={fournisseur.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 hover:shadow-md"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        {fournisseur.nom}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-gray-200">{fournisseur.contact}</TableCell>
                      <TableCell className="text-gray-800 dark:text-gray-200">
                        {fournisseur._count?.commandes || 0}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-gray-200">
                        {formatDate(fournisseur.createdAt)}
                      </TableCell>
                      <TableCell className="text-gray-800 dark:text-gray-200">
                        {formatDate(fournisseur.updatedAt)}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(fournisseur)}
                          className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-lg transition-all duration-200"
                          aria-label={`Voir les détails de ${fournisseur.nom}`}
                        >
                          <Eye className="h-4 w-4 mr-1 animate-pulse-on-hover" />
                          Détails
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
            <TableFooter className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700">
              <TableRow>
                <TableCell colSpan={6} className="text-gray-800 dark:text-gray-200 font-bold">
                  Total: {fournisseurs.length} fournisseurs
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-600 max-h-[80vh] flex flex-col">
            <button
              onClick={handleCloseDetailsModal}
              className="absolute top-2 right-2 p-1 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200">
                Commandes du Fournisseur: {selectedFournisseur?.nom || "Inconnu"}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Liste des commandes associées à ce fournisseur
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {isLoadingCommandes ? (
                <div className="space-y-2 py-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg bg-blue-200 dark:bg-blue-800" />
                  ))}
                </div>
              ) : commandesError ? (
                <div className="text-center py-4 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                  <p className="text-red-600 dark:text-red-300 text-sm">Erreur: {commandesError}</p>
                </div>
              ) : commandes.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Aucune commande trouvée pour ce fournisseur.
                </div>
              ) : (
                <div className="relative overflow-x-auto rounded-lg border border-blue-300 dark:border-blue-600">
                  <Table className="min-w-[600px] text-sm">
                    <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-600">
                      <TableRow>
                        <TableHead className="w-[150px] text-white dark:text-gray-100 font-bold">ID Commande</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Statut</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Date</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Date Prévue</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Produits</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Créée le</TableHead>
                        <TableHead className="text-white dark:text-gray-100 font-bold">Mise à jour le</TableHead>
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
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 hover:shadow-md"
                          >
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {commande.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  commande.statut === "LIVREE"
                                    ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                                    : commande.statut === "EN_COURS"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                                    : commande.statut === "ANNULEE"
                                    ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
                                }`}
                              >
                                {commande.statut}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {formatDate(commande.date)}
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {formatDate(commande.datePrevu)}
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {commande.produits.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span>{p.produit.nom}</span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    (Qté: {p.quantite})
                                  </span>
                                </div>
                              ))}
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {formatDate(commande.createdAt)}
                            </TableCell>
                            <TableCell className="text-gray-800 dark:text-gray-200">
                              {formatDate(commande.updatedAt)}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-lg transition-all duration-200"
                  onClick={handleCloseDetailsModal}
                >
                  Fermer
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        .animate-spin-on-hover:hover {
          animation: spin 1s linear infinite;
        }
        .animate-pulse-on-hover:hover {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default DataFour;