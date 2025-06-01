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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";
import { Check, Package, Eye, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth, useUser } from '@clerk/clerk-react';

// Types based on Prisma schema
type Produit = {
  id: string;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  statut: "CRITIQUE" | "RUPTURE" | "NORMALE" | string;
};

type DemandeProduit = {
  id: string;
  produit: Produit;
  quantite: number;
};

type Demandeur = {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  type: "EMPLOYE" | "ENSEIGNANT";
};

type Demande = {
  id: string;
  demandeurId: string;
  adminId: string | null;
  statut: "APPROUVEE" | "PRISE";
  dateApprouvee: string | null;
  raisonRefus: string | null;
  createdAt: string;
  updatedAt: string;
  demandeur: Demandeur;
  produits: DemandeProduit[];
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MAGASINNIER";
  clerkUserId?: string;
};

export function ApprovedDemandesTable() {
  const [approvedDemandes, setApprovedDemandes] = useState<Demande[]>([]);
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNames, setAdminNames] = useState<{ [key: string]: string | null }>({});
  const [adminLoading, setAdminLoading] = useState<{ [key: string]: boolean }>({});
  const [adminErrors, setAdminErrors] = useState<{ [key: string]: string | null }>({});
  const { userId, getToken } = useAuth();
  const { isLoaded, user } = useUser();

  const fetchApprovedDemandes = async () => {
    if (!isLoaded || !userId) {
      setError("Accès non autorisé. Veuillez vous connecter.");
      toast.error("Accès non autorisé. Veuillez vous connecter.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/magasinier/demandes", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
      });

      if (!response.ok) {
        let responseBody = "";
        let errorData: { message?: string } = {};
        try {
          responseBody = await response.text();
          if (responseBody) {
            errorData = JSON.parse(responseBody);
          } else {
            throw new Error(`Empty response body (HTTP ${response.status})`);
          }
        } catch (jsonError) {
          throw new Error(
            `Invalid response format (HTTP ${response.status}): ${responseBody || "No content"}`
          );
        }
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseBody = await response.text();
        throw new Error("Received non-JSON response from server");
      }

      const data = await response.json();
      setApprovedDemandes(data);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load approved demands";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminName = async (demandId: string) => {
    if (!isLoaded || !userId) {
      setAdminErrors((prev) => ({ ...prev, [demandId]: "Accès non autorisé" }));
      setAdminNames((prev) => ({ ...prev, [demandId]: "Non attribué" }));
      return;
    }

    try {
      setAdminLoading((prev) => ({ ...prev, [demandId]: true }));
      setAdminErrors((prev) => ({ ...prev, [demandId]: null }));

      const response = await fetch(`/api/magasinier/demandes/${demandId}/admin`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch admin name");
      }

      const data = await response.json();
      setAdminNames((prev) => ({ ...prev, [demandId]: data.adminName }));
    } catch (err: any) {
      setAdminErrors((prev) => ({ ...prev, [demandId]: err.message || "Failed to load admin" }));
      setAdminNames((prev) => ({ ...prev, [demandId]: "Non attribué" }));
    } finally {
      setAdminLoading((prev) => ({ ...prev, [demandId]: false }));
    }
  };

  const logRegistryAction = async (productIds: string[], actionType: "DEMANDE_PRISE", description: string) => {
    if (!isLoaded || !userId) {
      toast.error("Accès non autorisé. Veuillez vous connecter.");
      return;
    }

    try {
      const response = await fetch("/api/magasinier/registre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          productIds,
          actionType,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'enregistrement dans le registre");
      }
    } catch (error) {
      toast.warning("Demande marquée comme prise, mais échec de l'enregistrement dans le registre");
    }
  };

  const handleMarkAsTaken = async (demandeId: string) => {
  if (!isLoaded || !userId) {
    toast.error("Accès non autorisé. Veuillez vous connecter.");
    return;
  }

  if (!demandeId || typeof demandeId !== "string") {
    toast.error("Invalid demand ID provided");
    return;
  }

  try {
    setProcessingId(demandeId);
    const response = await fetch(`/api/magasinier/demandes/${demandeId}/prise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getToken()}`,
      },
    });

    if (!response.ok) {
      let responseBody = "";
      let errorData: { message?: string } = {};
      try {
        responseBody = await response.text();
        if (responseBody) {
          errorData = JSON.parse(responseBody);
        } else {
          throw new Error(`Empty response body (HTTP ${response.status})`);
        }
      } catch (jsonError) {
        throw new Error(
          `Invalid response format (HTTP ${response.status}): ${responseBody || "No content"}`
        );
      }
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseBody = await response.text();
      throw new Error("Received non-JSON response from server");
    }

    await response.json(); // Process response, though it only contains success/message

    const demande = approvedDemandes.find((d) => d.id === demandeId);
    if (!demande || !demande.produits || demande.produits.length === 0) {
      throw new Error("No products found for this demand");
    }

    const productIds = demande.produits.map((item) => item.produit.id);
    const description = `Demande ${demande.id.substring(0, 8)}... marquée comme prise. Produits: ${demande.produits
      .map((item) => `${item.produit.nom} (Quantité: ${item.quantite})`)
      .join(", ")}`;
    await logRegistryAction(productIds, "DEMANDE_PRISE", description);

    // Update local state
    setApprovedDemandes((prevDemandes) =>
      prevDemandes.map((d) =>
        d.id === demandeId ? { ...d, statut: "PRISE" } : d
      )
    );

    // Fetch updated product statuses using the new API
    let lowStockProducts: Produit[] = [];
    let ruptureProducts: Produit[] = [];
    try {
      const productResponse = await fetch("/api/magasinier/email/produit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ demandeId }),
      });

      if (!productResponse.ok) {
        const errorData = await productResponse.json();
        throw new Error(errorData.message || `Erreur HTTP ${productResponse.status}`);
      }

      const products = await productResponse.json();
      lowStockProducts = products.filter((p: Produit) => p.statut === "CRITIQUE");
      ruptureProducts = products.filter((p: Produit) => p.statut === "RUPTURE");
    } catch (productErr) {
      console.error("Error fetching product statuses:", productErr);
      toast.warning("Demande traitée, mais échec de la vérification des statuts des produits.", {
        style: { background: "#7F1D1D", color: "#FEE2E2" },
      });
    }

    const criticalOrRuptureProducts = [...lowStockProducts, ...ruptureProducts];
    if (criticalOrRuptureProducts.length > 0) {
      try {
        // Fetch admin and magasinier users
        const usersResponse = await fetch("/api/emails/admin/users", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getToken()}`,
          },
        });

        if (!usersResponse.ok) {
          throw new Error(`Erreur HTTP ${usersResponse.status}`);
        }

        const users = await usersResponse.json();
        const recipientEmails = users
          .filter((user: User) => ["ADMIN", "MAGASINNIER"].includes(user.role))
          .map((user: User) => user.email);

        if (recipientEmails.length > 0) {
          // Send email for each critical or rupture product
          await Promise.all(
            criticalOrRuptureProducts.map(async (product) => {
              const emailResponse = await fetch("/api/emails/admin/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await getToken()}`,
                },
                body: JSON.stringify({
                  produitId: product.id,
                  produitNom: product.nom,
                  statut: product.statut,
                  quantite: product.quantite,
                  quantiteMinimale: product.quantiteMinimale,
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
                toast.warning(
                  `Demande traitée, mais échec de l'envoi de l'email d'alerte pour ${product.nom}: ${emailError}`,
                  {
                    style: { background: "#7F1D1D", color: "#FEE2E2" },
                  }
                );
              } 
            })
          );
          toast.success(
            `Notifications envoyées pour les produits en stock critique ou rupture: ${criticalOrRuptureProducts
              .map((p) => p.nom)
              .join(", ")}`,
            {
              style: { background: "#1E3A8A", color: "#E0E7FF" },
            }
          );
        } else {
          toast.warning("Aucun administrateur ou magasinier trouvé pour recevoir les notifications.");
        }
      } catch (emailErr) {
        const errorMessage = emailErr instanceof Error ? emailErr.message : "Erreur lors de l'envoi des emails d'alerte";
        toast.warning(`Demande traitée, mais échec de l'envoi des emails d'alerte: ${errorMessage}`, {
          style: { background: "#7F1D1D", color: "#FEE2E2" },
        });
      }
    }

    // Stock alert messages for toast
    const lowStockMessages = lowStockProducts.length
      ? `Stock critique pour: ${lowStockProducts
          .map((p) => `${p.nom} (${p.quantite}/${p.quantiteMinimale})`)
          .join(", ")}.`
      : "";
    const ruptureMessages = ruptureProducts.length
      ? `Rupture de stock pour: ${ruptureProducts.map((p) => p.nom).join(", ")}.`
      : "";
    const alertMessage = [lowStockMessages, ruptureMessages].filter(Boolean).join(" ");

    toast.success(
      `Demande traitée avec succès. Stocks mis à jour.${alertMessage ? ` ${alertMessage}` : ""}`, {
        style: { background: "#1E3A8A", color: "#E0E7FF" },
      }
    );

    setSelectedDemande(null);
  } catch (err: any) {
    console.error("Mark as Taken Error:", err);
    const errorMessage = err.message || "Une erreur est survenue lors du traitement de la demande";
    toast.error(errorMessage);
  } finally {
    setProcessingId(null);
  }
};
  useEffect(() => {
    fetchApprovedDemandes();
  }, [isLoaded, userId]);

  useEffect(() => {
    if (approvedDemandes.length > 0) {
      approvedDemandes.forEach((demande) => {
        if (demande.adminId && !adminNames[demande.id] && !adminLoading[demande.id]) {
          fetchAdminName(demande.id);
        }
      });
    }
  }, [approvedDemandes]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getProductsList = (demande: Demande) => {
    if (!demande.produits || demande.produits.length === 0) return "Aucun produit";
    if (demande.produits.length === 1) {
      return `${demande.produits[0].produit.nom} (${demande.produits[0].quantite})`;
    }
    return `${demande.produits[0].produit.nom} (${demande.produits[0].quantite}) +${demande.produits.length - 1}`;
  };

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
        <h3 className="font-bold text-red-700">Loading Error</h3>
        <p className="mt-2">{error}</p>
        <Button
          onClick={fetchApprovedDemandes}
          variant="outline"
          className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-100"
        >
          Retry
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
        <h2 className="text-2xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Demandes Acceptées
        </h2>
        <div className="relative overflow-x-auto rounded-lg border border-gray-200">
          <Table className="w-full text-sm">
            <TableCaption>Liste des demandes acceptées.</TableCaption>
            <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">Demand ID</TableHead>
                <TableHead className="text-gray-700 font-semibold">Demandeur</TableHead>
                <TableHead className="text-gray-700 font-semibold">Acceptée par</TableHead>
                <TableHead className="text-gray-700 font-semibold">Produits</TableHead>
                <TableHead className="text-gray-700 font-semibold">Date d'acceptation</TableHead>
                <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedDemandes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No approved demands found
                  </TableCell>
                </TableRow>
              ) : (
                approvedDemandes.map((demande, index) => (
                  <motion.tr
                    key={demande.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-blue-600">
                      {demande.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {demande.demandeur?.user?.name || demande.demandeur?.user?.email || "Unknown user"}
                    </TableCell>
                    <TableCell>
                      {adminLoading[demande.id] ? (
                        <Skeleton className="h-4 w-20 rounded" />
                      ) : adminErrors[demande.id] ? (
                        <span className="text-red-500">{adminNames[demande.id] || "Non attribué"}</span>
                      ) : (
                        adminNames[demande.id] || "Non attribué"
                      )}
                    </TableCell>
                    <TableCell>{getProductsList(demande)}</TableCell>
                    <TableCell>{formatDate(demande.dateApprouvee)}</TableCell>
                    <TableCell>
                      {demande.statut === "PRISE" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" /> Taken
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Approved
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                          onClick={() => setSelectedDemande(demande)}
                          aria-label={`View details of demand ${demande.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {demande.statut !== "PRISE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                            onClick={() => handleMarkAsTaken(demande.id)}
                            disabled={!!processingId}
                            aria-label={`Mark demand ${demande.id} as taken`}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
            <TableFooter className="bg-gray-50">
              <TableRow>
                <TableCell colSpan={6} className="text-gray-700 font-medium">
                  Total des demandes
                </TableCell>
                <TableCell className="text-right text-gray-700 font-medium">
                  {approvedDemandes.length}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <Dialog open={!!selectedDemande} onOpenChange={() => setSelectedDemande(null)}>
          <DialogContent
            className="sm:max-w-[600px] bg-white rounded-xl shadow-2xl border border-blue-100"
            aria-labelledby="demande-details-title"
            aria-describedby="demande-details-description"
          >
            <VisuallyHidden>
              <DialogTitle id="demande-details-title">Demand Details</DialogTitle>
              <DialogDescription id="demande-details-description">
                Displays detailed information about an approved demand, including the requester, requested products, and status.
              </DialogDescription>
            </VisuallyHidden>
            <button
              onClick={() => setSelectedDemande(null)}
              className="absolute top-2 right-2 p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-800">Demand Details</DialogTitle>
            </DialogHeader>
            
            {selectedDemande && (
              <div className="grid gap-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>Demand ID:</strong> {selectedDemande.id}
                  </p>
                  <p className="text-gray-700">
                    <strong>Requester:</strong>{" "}
                    {selectedDemande.demandeur?.user?.name || "Not specified"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Email:</strong>{" "}
                    {selectedDemande.demandeur?.user?.email || "Not specified"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Requester Type:</strong>{" "}
                    {selectedDemande.demandeur?.type === "EMPLOYE" ? "Employee" : "Teacher"}
                  </p>
                  <p className="text-gray-700">
                    <strong>Approved By:</strong>{" "}
                    {adminLoading[selectedDemande.id] ? (
                      "Loading..."
                    ) : adminErrors[selectedDemande.id] ? (
                      <span className="text-red-500">{adminNames[selectedDemande.id] || "Non attribué"}</span>
                    ) : (
                      adminNames[selectedDemande.id] || "Non attribué"
                    )}
                  </p>
                  <p className="text-gray-700">
                    <strong>Approval Date:</strong>{" "}
                    {formatDate(selectedDemande.dateApprouvee)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Creation Date:</strong> {formatDate(selectedDemande.createdAt)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Status:</strong>{" "}
                    {selectedDemande.statut === "PRISE" ? "Taken" : "Approved"}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="font-medium text-gray-700 mb-2">Requested Products:</p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left text-gray-700">Product</th>
                          <th className="p-2 text-left text-gray-700">Brand</th>
                          <th className="p-2 text-right text-gray-700">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDemande.produits.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-2 text-center text-gray-500">
                              No products
                            </td>
                          </tr>
                        ) : (
                          selectedDemande.produits.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2 text-gray-700">{item.produit.nom}</td>
                              <td className="p-2 text-gray-700">{item.produit.marque}</td>
                              <td className="p-2 text-right text-gray-700">{item.quantite}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-100"
                    >
                      Close
                    </Button>
                  </DialogClose>
                  {selectedDemande.statut !== "PRISE" && (
                    <Button
                      onClick={() => {
                        handleMarkAsTaken(selectedDemande.id);
                        setSelectedDemande(null);
                      }}
                      disabled={!!processingId}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                    >
                      {processingId === selectedDemande.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          Take this demand
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}