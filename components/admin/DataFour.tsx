"use client";

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, X, Eye, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';

// Déclaration du module file-saver (déjà présente, mais conservée pour compatibilité)
declare module 'file-saver';

type Fournisseur = {
  id: string;
  nom: string;
  contact: string;
  _count?: {
    commandes: number;
    produits: number;
    demandesExceptionnelles: number;
  };
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
  dateLivraison?: string | null;
  datePrevu?: string;
  createdAt: string;
  updatedAt: string;
  produits: { quantite: number; produit: { nom: string } }[];
};

type DemandeExceptionnelle = {
  id: string;
  statut: string;
  datePrevu?: string;
  dateLivraison?: string | null;
  createdAt: string;
  updatedAt: string;
  produitsExceptionnels: { quantite: number; produitExceptionnel: { name: string } }[];
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
  const [formData, setFormData] = useState<FormData>({ nom: '', contact: '', produitIds: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [demandesExceptionnelles, setDemandesExceptionnelles] = useState<DemandeExceptionnelle[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingCommandes, setIsLoadingCommandes] = useState(false);
  const [commandesError, setCommandesError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [fournisseurToDelete, setFournisseurToDelete] = useState<Fournisseur | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFournisseur, setEditFournisseur] = useState<Fournisseur | null>(null);
  const [editFormData, setEditFormData] = useState<{ nom: string; contact: string }>({ nom: '', contact: '' });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Fonction pour récupérer les données initiales
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fournisseursResponse, produitsResponse] = await Promise.all([
        fetch('/api/admin/fournisseur'),
        fetch('/api/admin/produit'),
      ]);

      if (!fournisseursResponse.ok || !produitsResponse.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const [fournisseursData, produitsData] = await Promise.all([
        fournisseursResponse.json(),
        produitsResponse.json(),
      ]);

      setFournisseurs(fournisseursData);
      setProduits(produitsData);
    } catch (err) {
      console.error('Erreur fetchData:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = (fournisseur: Fournisseur) => {
    setFournisseurToDelete(fournisseur);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fournisseurToDelete) return;

    try {
      const response = await fetch(`/api/admin/fournisseur?id=${fournisseurToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la suppression du fournisseur');
      }

      setFournisseurs((prev) => prev.filter((f) => f.id !== fournisseurToDelete.id));
      setIsDeleteOpen(false);
      setFournisseurToDelete(null);
      toast.success('Fournisseur supprimé avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleViewDetails = async (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setIsDetailsOpen(true);
    setIsLoadingCommandes(true);
    setCommandesError(null);
    setCommandes([]);
    setDemandesExceptionnelles([]);

    try {
      const response = await fetch(`/api/admin/comandefour1?fournisseurId=${fournisseur.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la récupération des données');
      }

      const data = await response.json();
      console.log('Commandes reçues:', data.commandes?.map((c: Commande) => ({
        id: c.id,
        statut: c.statut,
        dateLivraison: c.dateLivraison,
      })));

      setCommandes(data.commandes || []);
      setDemandesExceptionnelles(data.demandesExceptionnelles || []);
    } catch (err) {
      console.error('Erreur handleViewDetails:', err);
      setCommandesError(err instanceof Error ? err.message : 'Erreur inconnue');
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
      setFormError('Le nom et le contact sont requis');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/fournisseur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), contact: contact.trim(), produitIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la création du fournisseur');
      }

      const data = await response.json();
      setFournisseurs((prev) => [...prev, data]);
      setFormData({ nom: '', contact: '', produitIds: [] });
      setIsAddOpen(false);
      toast.success('Fournisseur ajouté avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'ajout:', err);
      setFormError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (fournisseur: Fournisseur) => {
    setEditFournisseur(fournisseur);
    setEditFormData({ nom: fournisseur.nom, contact: fournisseur.contact });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFournisseur) return;

    setIsEditSubmitting(true);
    setEditFormError(null);

    const { nom, contact } = editFormData;

    if (!nom.trim() || !contact.trim()) {
      setEditFormError('Le nom et le contact sont requis');
      setIsEditSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/fourdetail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editFournisseur.id, nom: nom.trim(), contact: contact.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de la mise à jour du fournisseur');
      }

      const data = await response.json();
      setFournisseurs((prev) =>
        prev.map((f) =>
          f.id === editFournisseur.id ? { ...f, nom: data.nom, contact: data.contact, updatedAt: data.updatedAt } : f
        )
      );
      setIsEditOpen(false);
      setEditFournisseur(null);
      setEditFormData({ nom: '', contact: '' });
      toast.success('Fournisseur mis à jour avec succès');
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setEditFormError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!selectedFournisseur) return;

    try {
      const response = await fetch(`/api/admin/comandefour1/excel?fournisseurId=${selectedFournisseur.id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de l\'exportation vers Excel');
      }

      const blob = await response.blob();
      saveAs(blob, `fournisseur_${selectedFournisseur.nom}_details.xlsx`);
      toast.success('Fichier Excel exporté avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'exportation:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProduitChange = (produitId: string) => {
    setFormData((prev) => ({
      ...prev,
      produitIds: prev.produitIds.includes(produitId)
        ? prev.produitIds.filter((id) => id !== produitId)
        : [...prev.produitIds, produitId],
    }));
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Non définie';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Erreur de format';
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsOpen(false);
    setSelectedFournisseur(null);
    setCommandes([]);
    setDemandesExceptionnelles([]);
    setCommandesError(null);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <Skeleton className="h-10 w-[200px] rounded-lg" />
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
            Gestion des Fournisseurs
          </h2>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg flex items-center gap-2 shadow-md hover:from-blue-600 hover:to-indigo-600 transition-all"
                aria-label="Ajouter un nouveau fournisseur"
              >
                <PlusCircle className="h-4 w-4" />
                Ajouter un fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl border border-blue-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Ajouter un nouveau fournisseur
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Remplissez les informations pour ajouter un fournisseur.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                {formError && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                    Erreur: {formError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-sm font-medium text-gray-700">
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
                    className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium text-gray-700">
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
                    className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="produits" className="text-sm font-medium text-gray-700">
                    Produits associés
                  </Label>
                  <Select onValueChange={handleProduitChange} disabled={produits.length === 0}>
                    <SelectTrigger
                      id="produits"
                      className="bg-gray-50 border-gray-200 text-gray-700 focus:ring-2 focus:ring-blue-400"
                      aria-label="Sélectionner des produits associés"
                    >
                      <SelectValue placeholder="Sélectionnez des produits" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-700">
                      {produits
                        .filter((produit) => !formData.produitIds.includes(produit.id))
                        .map((produit) => (
                          <SelectItem
                            key={produit.id}
                            value={produit.id}
                            className="text-gray-700 hover:bg-blue-50"
                          >
                            {produit.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Sélectionnez les produits fournis (optionnel)</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.produitIds.map((produitId) => {
                      const produit = produits.find((p) => p.id === produitId);
                      return (
                        <div
                          key={produitId}
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                        >
                          <span>{produit?.nom || 'Produit inconnu'}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleProduitChange(produitId)}
                            className="hover:bg-blue-200 rounded-full"
                            aria-label={`Supprimer ${produit?.nom}`}
                          >
                            <X className="h-3 w-3 text-blue-600" />
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
                      className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
                        </svg>
                        Ajout...
                      </span>
                    ) : (
                      'Ajouter'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-500 mb-4">Liste des fournisseurs enregistrés</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="w-[200px] text-gray-700 font-semibold">Nom</TableHead>
                <TableHead className="text-gray-700 font-semibold">Contact</TableHead>
                <TableHead className="text-gray-700 font-semibold">Nombre de commandes</TableHead>
                <TableHead className="text-gray-700 font-semibold">Créé le</TableHead>
                <TableHead className="text-gray-700 font-semibold">Mis à jour le</TableHead>
                <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600">{fournisseur.nom}</TableCell>
                      <TableCell className="text-gray-700">{fournisseur.contact}</TableCell>
                      <TableCell className="text-gray-700">{fournisseur._count ? fournisseur._count.commandes : 0}</TableCell>
                      <TableCell className="text-gray-700">{formatDate(fournisseur.createdAt)}</TableCell>
                      <TableCell className="text-gray-700">{formatDate(fournisseur.updatedAt)}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(fournisseur)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          aria-label={`Voir les détails de ${fournisseur.nom}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(fournisseur)}
                          className="border-yellow-200 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800"
                          aria-label={`Modifier ${fournisseur.nom}`}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(fournisseur)}
                          disabled={(fournisseur._count?.commandes ?? 0) > 0 || (fournisseur._count?.demandesExceptionnelles ?? 0) > 0}
                          className={`border-red-200 text-red-600 hover:bg-red-100 hover:text-red-800 ${
                            ((fournisseur._count?.commandes ?? 0) > 0 || (fournisseur._count?.demandesExceptionnelles ?? 0) > 0)
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          aria-label={`Supprimer ${fournisseur.nom}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={6} className="text-gray-700">
                  Total: {fournisseurs.length} fournisseurs
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl border border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Modifier le fournisseur
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Modifiez les informations du fournisseur.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editFormError && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                  Erreur: {editFormError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-nom" className="text-sm font-medium text-gray-700">
                  Nom *
                </Label>
                <Input
                  id="edit-nom"
                  name="nom"
                  value={editFormData.nom}
                  onChange={handleEditInputChange}
                  placeholder="Nom du fournisseur"
                  required
                  aria-required="true"
                  className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact" className="text-sm font-medium text-gray-700">
                  Contact *
                </Label>
                <Input
                  id="edit-contact"
                  name="contact"
                  value={editFormData.contact}
                  onChange={handleEditInputChange}
                  placeholder="Email ou téléphone"
                  required
                  aria-required="true"
                  className="bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex justify-end gap-2">
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
                  disabled={isEditSubmitting}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                >
                  {isEditSubmitting ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
                      </svg>
                      Mise à jour...
                    </span>
                  ) : (
                    'Mettre à jour'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-3xl bg-white rounded-xl shadow-2xl border border-blue-100 max-h-[80vh] flex flex-col">
            <button
              onClick={handleCloseDetailsModal}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Détails du fournisseur: {selectedFournisseur?.nom || 'Inconnu'}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Commandes et demandes exceptionnelles associées à ce fournisseur
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {isLoadingCommandes ? (
                <div className="space-y-2 py-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : commandesError ? (
                <div className="text-center py-4 bg-red-50 rounded border border-red-200">
                  <p className="text-red-600 text-sm">Erreur: {commandesError}</p>
                </div>
              ) : (
                <>
                  {/* Table des commandes */}
                  <h3 className="text-lg font-semibold text-gray-700 mt-4">Commandes</h3>
                  {commandes.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Aucune commande trouvée pour ce fournisseur.
                    </div>
                  ) : (
                    <div className="relative overflow-x-auto rounded-lg border border-gray-200 mb-6">
                      <Table className="min-w-[600px] text-sm">
                        <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                          <TableRow>
                            <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Date de livraison</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Date prévue</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Produits</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Créée le</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Mise à jour le</TableHead>
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
                                className="hover:bg-blue-50 transition-colors duration-200"
                              >
                                <TableCell className="text-gray-700">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      commande.statut === 'LIVREE'
                                        ? 'bg-green-100 text-green-800'
                                        : commande.statut === 'EN_COURS'
                                        ? 'bg-blue-100 text-blue-800'
                                        : commande.statut === 'ANNULEE'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {commande.statut}
                                  </span>
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {commande.statut === 'LIVREE' ? formatDate(commande.dateLivraison) : 'Non définie'}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {formatDate(commande.datePrevu)}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {commande.produits.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <span className="text-gray-700">{p.produit.nom}</span>
                                      <span className="text-gray-500">(Qté: {p.quantite})</span>
                                    </div>
                                  ))}
                                </TableCell>
                                <TableCell className="text-gray-700">{formatDate(commande.createdAt)}</TableCell>
                                <TableCell className="text-gray-700">{formatDate(commande.updatedAt)}</TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Table des demandes exceptionnelles */}
                  <h3 className="text-lg font-semibold text-gray-700 mt-4">Demandes Exceptionnelles</h3>
                  {demandesExceptionnelles.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Aucune demande exceptionnelle trouvée pour ce fournisseur.
                    </div>
                  ) : (
                    <div className="relative overflow-x-auto rounded-lg border border-gray-200">
                      <Table className="min-w-[600px] text-sm">
                        <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                          <TableRow>
                            <TableHead className="w-[150px] text-gray-700 font-semibold">ID Demande</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Date de livraison</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Date prévue</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Produits</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Créée le</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Mise à jour le</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {demandesExceptionnelles.map((demande, idx) => (
                              <motion.tr
                                key={demande.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                className="hover:bg-blue-50 transition-colors duration-200"
                              >
                                <TableCell className="text-gray-700">{demande.id.slice(0, 8)}...</TableCell>
                                <TableCell className="text-gray-700">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      demande.statut === 'LIVREE'
                                        ? 'bg-green-100 text-green-800'
                                        : demande.statut === 'COMMANDEE'
                                        ? 'bg-blue-100 text-blue-800'
                                        : demande.statut === 'ACCEPTEE'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : demande.statut === 'EN_ATTENTE'
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {demande.statut}
                                  </span>
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {demande.statut === 'LIVREE' ? formatDate(demande.dateLivraison) : 'Non définie'}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {formatDate(demande.datePrevu)}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {demande.produitsExceptionnels.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <span className="text-gray-700">{p.produitExceptionnel.name}</span>
                                      <span className="text-gray-500">(Qté: {p.quantite})</span>
                                    </div>
                                  ))}
                                </TableCell>
                                <TableCell className="text-gray-700">{formatDate(demande.createdAt)}</TableCell>
                                <TableCell className="text-gray-700">{formatDate(demande.updatedAt)}</TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                className="border-green-200 text-green-600 hover:bg-green-100"
                onClick={handleExportToExcel}
              >
                Exporter (Excel)
              </Button>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                  onClick={handleCloseDetailsModal}
                >
                  Fermer
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-2xl border border-blue-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Êtes-vous sûr de vouloir supprimer le fournisseur{' '}
                <span className="font-semibold text-gray-800">{fournisseurToDelete?.nom || 'Inconnu'}</span> ? Cette
                action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Annuler
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

export default DataFour;