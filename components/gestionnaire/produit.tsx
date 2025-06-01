"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // Re-added toast import

type Produit = {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  remarque?: string;
  statut: string;
  categorie?: {
    nom: string;
  };
  categorieId?: string;
  createdAt: string;
  updatedAt: string;
};

type DemandeApprouvee = {
  id: string;
  demandeur: {
    user: {
      name: string;
    };
  };
  dateApprouvee: string;
  quantite: number;
};

type CommandeLivree = {
  id: string;
  fournisseur: {
    nom: string;
  };
  dateLivraison: string;
  quantite: number;
};

export function DataProdProduitsTable() {
  const [products, setProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Produit | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [demandesApprouvees, setDemandesApprouvees] = useState<DemandeApprouvee[]>([]);
  const [commandesLivrees, setCommandesLivrees] = useState<CommandeLivree[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [filteredProducts, setFilteredProducts] = useState<Produit[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const productsResponse = await fetch("/api/gestionnaire/produits");

      if (!productsResponse.ok) {
        throw new Error(`Erreur produits: ${productsResponse.status}`);
      }

      const productsData = await productsResponse.json();
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (err) {
      console.error("Erreur de chargement:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.nom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "TOUS" || product.statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredProducts(filtered);
  }, [searchTerm, statusFilter, products]);

  const fetchProductDetails = async (productId: string) => {
    setLoadingDetails(true);
    try {
      const demandesResponse = await fetch(`/api/gestionnaire/produits/demandes?produitId=${productId}&statut=APPROUVEE`);
      if (!demandesResponse.ok) {
        throw new Error(`Erreur demandes: ${demandesResponse.status}`);
      }
      const commandesResponse = await fetch(`/api/gestionnaire/produits/commandes?produitId=${productId}&statut=LIVREE`);
      if (!commandesResponse.ok) {
        throw new Error(`Erreur commandes: ${commandesResponse.status}`);
      }

      const [demandesData, commandesData] = await Promise.all([
        demandesResponse.json(),
        commandesResponse.json(),
      ]);

      setDemandesApprouvees(demandesData);
      setCommandesLivrees(commandesData.commandesProduit || commandesData);
    } catch (err) {
      console.error("Erreur lors de la récupération des détails:", err);
      toast.error("Impossible de charger les détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = async (product: Produit) => {
    setSelectedProduct(product);
    setShowDetailDialog(true);
    await fetchProductDetails(product.id);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non défini";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "RUPTURE":
        return "bg-red-100 text-red-800 px-2 py-1 rounded";
      case "CRITIQUE":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded";
      default:
        return "bg-green-100 text-green-800 px-2 py-1 rounded";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
        <Button onClick={fetchData} variant="outline" className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Gestion des Produits
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
          <Input
            placeholder="Rechercher un produit par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-400 focus:bg-white shadow-sm transition-all group-hover:shadow-blue-200"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:bg-white shadow-sm"
          >
            <option value="TOUS">Tous les statuts</option>
            <option value="NORMALE">Normale</option>
            <option value="CRITIQUE">Critique</option>
            <option value="RUPTURE">Rupture</option>
          </select>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-gray-200">
        <Table className="w-full text-sm">
          <TableCaption className="text-gray-500 mb-4">Liste des produits en stock.</TableCaption>
          <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
            <TableRow>
              <TableHead className="text-gray-700 font-semibold">Nom</TableHead>
              <TableHead className="text-gray-700 font-semibold">Marque</TableHead>
              <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
              <TableHead className="text-gray-700 font-semibold">Qté min.</TableHead>
              <TableHead className="text-gray-700 font-semibold">Catégorie</TableHead>
              <TableHead className="text-gray-700 font-semibold">Statut</TableHead>
              <TableHead className="text-gray-700 font-semibold">Créé le</TableHead>
              <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((produit) => (
                <TableRow key={produit.id} className="hover:bg-blue-50 transition-colors duration-200">
                  <TableCell className="font-medium text-blue-600">{produit.nom}</TableCell>
                  <TableCell className="text-gray-700">{produit.marque}</TableCell>
                  <TableCell className="text-gray-700">{produit.quantite}</TableCell>
                  <TableCell className="text-gray-700">{produit.quantiteMinimale}</TableCell>
                  <TableCell className="text-gray-700">{produit.categorie?.nom || "Non catégorisé"}</TableCell>
                  <TableCell>
                    <span className={getStatusClass(produit.statut)}>{produit.statut}</span>
                  </TableCell>
                  <TableCell className="text-gray-700">{formatDate(produit.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(produit)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                    >
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-gray-700 text-center mt-4">
        {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé
        {filteredProducts.length > 1 ? "s" : ""}
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl bg-white rounded-xl shadow-2xl border border-blue-100">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Détails du produit: {selectedProduct.nom}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Informations complètes et historique des mouvements
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <Tabs defaultValue="details">
                  <TabsList className="mb-4 bg-gray-50 rounded-lg">
                    <TabsTrigger
                      value="details"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                    >
                      Informations
                    </TabsTrigger>
                    <TabsTrigger
                      value="demandes"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                    >
                      Demandes approuvées
                    </TabsTrigger>
                    <TabsTrigger
                      value="commandes"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                    >
                      Commandes livrées
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-800">Informations du produit</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-gray-700">Nom:</p>
                            <p className="text-gray-600">{selectedProduct.nom}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Marque:</p>
                            <p className="text-gray-600">{selectedProduct.marque}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Quantité en stock:</p>
                            <p className="text-gray-600">{selectedProduct.quantite}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Quantité minimale:</p>
                            <p className="text-gray-600">{selectedProduct.quantiteMinimale}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Catégorie:</p>
                            <p className="text-gray-600">{selectedProduct.categorie?.nom || "Non catégorisé"}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Statut:</p>
                            <p className={getStatusClass(selectedProduct.statut)}>{selectedProduct.statut}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Date de création:</p>
                            <p className="text-gray-600">{formatDate(selectedProduct.createdAt)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Dernière mise à jour:</p>
                            <p className="text-gray-600">{formatDate(selectedProduct.updatedAt)}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="font-semibold text-gray-700">Remarque:</p>
                          <p className="mt-1 p-2 border border-gray-200 rounded-lg bg-gray-50 min-h-[60px] text-gray-600">
                            {selectedProduct.remarque || "Aucune remarque"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="demandes">
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-800">Historique des demandes approuvées</CardTitle>
                        <CardDescription className="text-gray-600">
                          Liste des demandes approuvées pour ce produit
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingDetails ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full rounded-lg" />
                            ))}
                          </div>
                        ) : demandesApprouvees.length > 0 ? (
                          <Table>
                            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                              <TableRow>
                                <TableHead className="text-gray-700 font-semibold">Demandeur</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Date d’approbation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {demandesApprouvees.map((demande) => (
                                <TableRow
                                  key={demande.id}
                                  className="hover:bg-blue-50 transition-colors duration-200"
                                >
                                  <TableCell className="text-gray-700">
                                    {demande.demandeur?.user?.name || "Anonyme"}
                                  </TableCell>
                                  <TableCell className="text-gray-700">{demande.quantite}</TableCell>
                                  <TableCell className="text-gray-700">
                                    {demande.dateApprouvee ? formatDate(demande.dateApprouvee) : "Non défini"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-center py-4 text-gray-500">
                            Aucune demande approuvée pour ce produit
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="commandes">
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-800">Historique des commandes livrées</CardTitle>
                        <CardDescription className="text-gray-600">
                          Liste des commandes livrées pour ce produit
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingDetails ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full rounded-lg" />
                            ))}
                          </div>
                        ) : commandesLivrees.length > 0 ? (
                          <Table>
                            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                              <TableRow>
                                <TableHead className="text-gray-700 font-semibold">Fournisseur</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Quantité</TableHead>
                                <TableHead className="text-gray-700 font-semibold">Date de livraison</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {commandesLivrees.map((commande) => (
                                <TableRow
                                  key={commande.id}
                                  className="hover:bg-blue-50 transition-colors duration-200"
                                >
                                  <TableCell className="text-gray-700">
                                    {commande.fournisseur?.nom || "Fournisseur inconnu"}
                                  </TableCell>
                                  <TableCell className="text-gray-700">{commande.quantite}</TableCell>
                                  <TableCell className="text-gray-700">
                                    {commande.dateLivraison ? formatDate(commande.dateLivraison) : "Non défini"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-center py-4 text-gray-500">
                            Aucune commande livrée pour ce produit
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-100"
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataProdProduitsTable;