"use client";

import { useEffect, useState, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle, X, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Skeleton } from "@/components/ui/skeleton";

// Utility to convert image to base64
const getImageBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
};

type Commande = {
  id: string;
  fournisseur: {
    nom: string;
  };
  statut: "EN_COURS" | "ANNULEE" | "EN_RETOUR" | "LIVREE" | "VALIDE";
  date: string;
  datePrevu: string;
  createdAt: string;
  updatedAt: string;
  produits: {
    produit: {
      nom: string;
    };
    quantite: number;
  }[];
};

type Produit = {
  id: string;
  nom: string;
};

type FormData = {
  produits: { produitId: string; quantite: number }[];
};

// Status color function updated to include VALIDE
const getStatusColor = (statut: string) => {
  switch (statut) {
    case "EN_COURS":
    case "EN_ATTENTE":
      return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
    case "LIVREE":
    case "APPROUVEE":
      return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
    case "ANNULEE":
    case "REJETEE":
      return "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300";
    case "EN_RETOUR":
      return "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300";
    case "VALIDE":
      return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
    case "NON_VALIDE":
      return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
    default:
      return "bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300";
  }
};

export function DataCommand() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [formData, setFormData] = useState<FormData>({
    produits: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const addDialogRef = useRef<HTMLDivElement>(null);
  const detailsDialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    async function initializeData() {
      try {
        setLoading(true);
        setLiveRegionMessage("Chargement des commandes...");

        const [commandesResponse, produitsResponse] = await Promise.all([
          fetch("/api/admin/commande"),
          fetch("/api/admin/produit"),
        ]);

        const [commandesText, produitsText] = await Promise.all([
          commandesResponse.text(),
          produitsResponse.text(),
        ]);

        let commandesData: Commande[], produitsData: Produit[];
        try {
          commandesData = JSON.parse(commandesText);
          produitsData = JSON.parse(produitsText);
        } catch {
          console.error("Invalid JSON:", { commandesText, produitsText });
          throw new Error("Réponse invalide du serveur");
        }

        if (!commandesResponse.ok) {
          throw new Error("Erreur lors de la récupération des commandes");
        }
        if (!produitsResponse.ok) {
          throw new Error("Erreur lors de la récupération des produits");
        }

        const filteredCommandes = commandesData.filter((commande: Commande) =>
          ["LIVREE", "ANNULEE", "EN_RETOUR", "EN_COURS", "VALIDE"].includes(commande.statut)
        );

        setCommandes(filteredCommandes);
        setProduits(produitsData);
        setLiveRegionMessage("Commandes chargées avec succès.");
      } catch (err) {
        console.error("Erreur:", err);
        const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        toast.error(errorMessage, {
          style: { background: "#FEE2E2", color: "#7F1D1D" },
        });
        setLiveRegionMessage(`Erreur : ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    initializeData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setLiveRegionMessage("Ajout de la commande...");

    const { produits } = formData;

    if (produits.length === 0) {
      setFormError("Au moins un produit est requis");
      setLiveRegionMessage("Erreur : aucun produit sélectionné.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "VALIDE",
          produits,
        }),
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
        throw new Error(data.error || "Échec de la création de la commande");
      }

      if (["LIVREE", "ANNULEE", "EN_RETOUR", "EN_COURS", "VALIDE"].includes(data.statut)) {
        setCommandes((prev) => [...prev, data]);
      }

      setFormData({
        produits: [],
      });
      setIsOpen(false);
      toast.success("Commande ajoutée avec succès", {
        style: { background: "#E0E7FF", color: "#1E3A8A" },
      });
      setLiveRegionMessage("Commande ajoutée avec succès.");
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setFormError(errorMessage);
      toast.error(errorMessage, {
        style: { background: "#FEE2E2", color: "#7F1D1D" },
      });
      setLiveRegionMessage(`Erreur : ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProduitChange = (
    index: number,
    field: "produitId" | "quantite",
    value: string | number
  ) => {
    const updatedProduits = [...formData.produits];
    updatedProduits[index] = { ...updatedProduits[index], [field]: value };
    setFormData((prev: FormData) => ({ ...prev, produits: updatedProduits }));
    setFormError(null);
  };

  const addProduit = () => {
    setFormData((prev: FormData) => ({
      ...prev,
      produits: [...prev.produits, { produitId: produits[0]?.id || "", quantite: 1 }],
    }));
  };

  const removeProduit = (index: number) => {
    setFormData((prev: FormData) => ({
      ...prev,
      produits: prev.produits.filter((_, i) => i !== index),
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

  const checkDelay = (_datePrevu: string, _date: string, statut: string) => {
    return statut === "EN_COURS" ? "En attente" : "N/A";
  };

  const handleOpenDetails = (
    commande: Commande,
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    lastFocusedElement.current = event.currentTarget as HTMLElement;
    setSelectedCommande(commande);
    setIsDetailsOpen(true);
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

  const exportToPDF = async (commande: Commande) => {
    const doc = new jsPDF();
    try {
      const logoBase64 = await getImageBase64("/essths.png");
      doc.addImage(logoBase64, "PNG", 20, 10, 40, 40);
    } catch (error) {
      console.error("Failed to load logo:", error);
      doc.text("Logo non disponible", 20, 20);
    }
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138); // #1E3A8A
    const requestText = `À l'attention de ${commande.fournisseur.nom}, nous vous prions de bien vouloir nous fournir les produits listés ci-dessous dans les plus brefs délais.`;
    const splitText = doc.splitTextToSize(requestText, 170);
    doc.text(splitText, 20, 60);
    doc.setFontSize(18);
    doc.text("Détails de la commande", 20, 80);
    doc.setFontSize(12);
    doc.setTextColor(75, 94, 170); // #4B5EAA
    doc.text(`Fournisseur: ${commande.fournisseur.nom}`, 20, 100);
    doc.text(`Date de commande: ${formatDate(commande.date)}`, 20, 110);
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // #1E3A8A
    doc.text("Liste des produits:", 20, 130);
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55); // #1F2937
    let yPosition = 140;
    commande.produits.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.produit.nom} - Quantité: ${item.quantite}`, 20, yPosition);
      yPosition += 10;
    });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 20, yPosition + 20);
    doc.save(`commande-${commande.id}.pdf`);
  };

  if (!isClient) {
    return null;
  }

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
        <h3 className="font-bold text-red-700 dark:text-red-200 title-hover">Erreur de Chargement</h3>
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
            Gestion des Commandes
          </h2>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open && lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                aria-label="Ajouter une nouvelle commande"
              >
                <PlusCircle className="h-5 w-5" />
                Ajouter une commande
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700"
              ref={addDialogRef}
              aria-labelledby="add-commande-title"
              aria-describedby="add-commande-description"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                  Ajouter une nouvelle commande
                </DialogTitle>
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  aria-label="Fermer le dialogue"
                >
                  
                </button>
                <VisuallyHidden>
                  <DialogDescription id="add-commande-description">
                    Formulaire pour ajouter une nouvelle commande avec produits et quantités.
                  </DialogDescription>
                </VisuallyHidden>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-6">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-red-600 dark:text-red-300">
                      Erreur : {formError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Produits <span className="text-red-400">*</span>
                  </Label>
                  {formData.produits.map((produit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={produit.produitId}
                        onValueChange={(value) => handleProduitChange(index, "produitId", value)}
                      >
                        <SelectTrigger className="flex-1 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200">
                          <SelectValue placeholder="Produit" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100">
                          {produits.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              className="text-gray-800 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-700"
                            >
                              {p.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={produit.quantite}
                        onChange={(e) => handleProduitChange(index, "quantite", Number(e.target.value))}
                        placeholder="Qté"
                        className="w-20 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:ring-blue-500 dark:focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProduit(index)}
                        type="button"
                        className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-800 text-white hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addProduit}
                    className="mt-2 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                  >
                    Ajouter un produit
                  </Button>
                </div>
                <div className="flex justify-end gap-3">
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
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-700 dark:hover:to-indigo-900 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    {isSubmitting ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <span className="sr-only">{liveRegionMessage}</span>

        <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <Table className="w-full text-sm">
            <TableCaption className="text-gray-600 dark:text-gray-300">
              Liste des commandes enregistrées dans le système.
            </TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
              <TableRow>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Fournisseur</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Statut</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date de Livraison</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">Date Prévue</TableHead>
                <TableHead className="text-blue-700 dark:text-gray-200 font-semibold">État</TableHead>
                <TableHead className="text-right text-blue-700 dark:text-gray-200 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-gray-500 dark:text-gray-400">
                    Aucune commande trouvée
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {commandes.map((commande, index) => (
                    <motion.tr
                      key={commande.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200"
                    >
                      <TableCell className="font-medium text-blue-600 dark:text-blue-300">
                        {commande.fournisseur.nom}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(commande.statut)}`}>
                          {commande.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(commande.date)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {formatDate(commande.datePrevu)}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-200">
                        {checkDelay(commande.datePrevu, commande.date, commande.statut)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                            onClick={(e) => handleOpenDetails(commande, e)}
                            onKeyDown={(e) => handleKeyDown(e, (ev) => handleOpenDetails(commande, ev))}
                            aria-label={`Voir les détails de la commande ${commande.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 w-8 p-0 border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700 ${
                              commande.statut !== "EN_COURS" ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            onClick={() => exportToPDF(commande)}
                            disabled={commande.statut !== "EN_COURS"}
                            aria-label={`Exporter la commande ${commande.id} en PDF`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
            <TableFooter className="bg-gray-50 dark:bg-gray-700">
              <TableRow>
                <TableCell colSpan={5} className="text-gray-700 dark:text-gray-200 font-medium">
                  Total Commandes
                </TableCell>
                <TableCell className="text-right text-gray-700 dark:text-gray-200 font-medium">
                  {commandes?.length || 0}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) {
              setSelectedCommande(null);
              if (lastFocusedElement.current) {
                lastFocusedElement.current.focus();
                lastFocusedElement.current = null;
              }
            }
          }}
        >
          <DialogContent
            className="sm:max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
            ref={detailsDialogRef}
            aria-labelledby="details-commande-title"
            aria-describedby="details-commande-description"
          >
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 title-hover">
                Détails de la commande #{selectedCommande?.id.slice(0, 8)}
              </DialogTitle>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                aria-label="Fermer le dialogue"
              >
               
              </button>
              <VisuallyHidden>
                <DialogDescription id="details-commande-description">
                  Détails de la commande sélectionnée, incluant le fournisseur, les produits et les dates.
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            {selectedCommande && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 mt-4"
              >
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 title-hover mb-3">
                    Informations Générales
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-300">Fournisseur</Label>
                      <p className="text-gray-800 dark:text-gray-100 text-sm mt-1">{selectedCommande.fournisseur.nom}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-300">Statut</Label>
                      <p className={`text-sm font-semibold mt-1 px-2 py-1 rounded-full ${getStatusColor(selectedCommande.statut)}`}>
                        {selectedCommande.statut}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-300">Date de commande</Label>
                      <p className="text-gray-800 dark:text-gray-100 text-sm mt-1">{formatDate(selectedCommande.date)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600 dark:text-gray-300">Date prévue</Label>
                      <p className="text-gray-800 dark:text-gray-100 text-sm mt-1">{formatDate(selectedCommande.datePrevu)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 title-hover bg-gray-50 dark:bg-gray-700 p-3 rounded-t-lg">
                    Détails de la Commande
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-b-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-gray-800 dark:text-gray-100 text-sm font-semibold">
                        Commande #{selectedCommande.id.slice(0, 8)}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(selectedCommande.statut)}`}>
                        {selectedCommande.statut}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedCommande.produits.length > 0 ? (
                        selectedCommande.produits.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-600 rounded text-sm"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-medium">{item.produit.nom}</span>
                            <span className="text-gray-700 dark:text-gray-200">Quantité: {item.quantite}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Aucun produit dans cette commande.</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Date: {formatDate(selectedCommande.date)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Date prévue: {formatDate(selectedCommande.datePrevu)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button
                      className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-700"
                      variant="outline"
                    >
                      Fermer
                    </Button>
                  </DialogClose>
                </div>
              </motion.div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>

      <style jsx>{`
        .title-hover {
          position: relative;
          transition: all 0.2s ease;
        }
        .title-hover:hover {
          transform: scale(1.05);
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
        .title-hover:hover::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(to right, #2563eb, #4f46e5);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
export default DataCommand;