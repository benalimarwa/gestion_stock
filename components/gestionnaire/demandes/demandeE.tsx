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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Produit = {
  id: string;
  produitId: string;
  nom: string;
  quantite: number;
};

type PendingRequest = {
  id: string;
  requestId: string;
  demandeurName: string;
  demandeurId: string;
  demandeurEmail?: string;
  produits: Produit[];
  createdAt: string;
};

// Add type for stock errors
type StockError = {
  produitId: string;
  quantiteDisponible: number;
  nom?: string;
};

export function PendingRequestsTable() {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updatedQuantities, setUpdatedQuantities] = useState<{ id: string; quantite: number }[]>([]);
  const [mode, setMode] = useState<"view" | "reject" | "accept" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  // Fix: Use proper type instead of never[]
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);
  const [actionSuccess, setActionSuccess] = useState<{
    type: 'accept' | 'reject', 
    requestId: string,
    message: string
  } | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    setStockErrors([]);
  }, [selectedRequest]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gestionnaire/demandes/demandes-enattente");
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setPendingRequests(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des données:", err);
      setError("Impossible de charger les demandes en attente");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (produitId: string, newQuantity: number) => {
    setUpdatedQuantities(prev => {
      const existing = prev.find(item => item.id === produitId);
      if (existing) {
        return prev.map(item => 
          item.id === produitId ? { ...item, quantite: newQuantity } : item
        );
      } else {
        return [...prev, { id: produitId, quantite: newQuantity }];
      }
    });
    
    setStockErrors([]);
  };

  const sendNotificationEmail = async (
    demandeurEmail: string,
    demandeurName: string,
    requestId: string,
    action: "accept" | "reject",
    produits: Produit[], // Ajouter la liste des produits
    reason?: string
  ) => {
    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandeurEmail,
          demandeurName,
          requestId,
          action,
          reason,
          produits: produits.map(p => ({
            nom: p.nom,
            quantite: action === "accept" ? (updatedQuantities.find(q => q.id === p.id)?.quantite || p.quantite) : p.quantite,
          })), // Inclure les produits (nom et quantité)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'envoi de l'email");
      }

      const data = await response.json();
      console.log(`Email de ${action} envoyé à ${demandeurEmail}`, data);
    } catch (error) {
      console.error(`Erreur lors de l'envoi de l'email de ${action} :`, error);
      toast.error("Erreur lors de l'envoi de la notification par email");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
  
    try {
      setProcessingRequest(selectedRequest.requestId);
      console.log("Rejet - ID envoyé:", selectedRequest.requestId);
      console.log("Rejet - URL:", `/api/gestionnaire/demandes/demandes-enattente/${selectedRequest.requestId}/status`);
      
      const response = await fetch(`/api/gestionnaire/demandes/demandes-enattente/${selectedRequest.requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          statut: "REJETEE", 
          reason: rejectReason 
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur serveur:", errorData);
        throw new Error(`Erreur lors du rejet: ${response.status} - ${errorData.error || "Erreur inconnue"}`);
      }
      
      const data = await response.json();
      console.log("Réponse de l'API après rejet:", data);
  
      // Envoyer un email au demandeur via l'API
      if (data.demandeurEmail) {
        await sendNotificationEmail(
          data.demandeurEmail,
          selectedRequest.demandeurName,
          selectedRequest.requestId,
          "reject",
          selectedRequest.produits, // Passer la liste des produits
          rejectReason
        );
      } else {
        console.warn("Email du demandeur non trouvé dans la réponse de l'API");
        toast.warning("Demande rejetée, mais l'email du demandeur n'a pas pu être envoyé");
      }

      setActionSuccess({
        type: 'reject',
        requestId: selectedRequest.requestId,
        message: `Demande ${selectedRequest.requestId.substring(0, 8)}... rejetée avec succès. Une notification a été envoyée à ${selectedRequest.demandeurName} par email.`,
      });
      
      toast.success("Demande rejetée avec succès");
      setPendingRequests(pendingRequests.filter(req => req.requestId !== selectedRequest.requestId));
      
      setTimeout(() => {
        setSelectedRequest(null);
        setRejectReason("");
        setMode(null);
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Erreur complète:", err);
      toast.error(err instanceof Error ? err.message : "Erreur lors du rejet");
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
  
    try {
      setProcessingRequest(selectedRequest.requestId);
      
      const stockCheckResponse = await fetch(`/api/gestionnaire/demandes/demandes-enattente/produits/check-disponibilite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          produits: updatedQuantities.map(item => {
            const produit = selectedRequest.produits.find(p => p.id === item.id);
            return {
              produitId: produit?.produitId,
              quantite: item.quantite
            };
          })
        }),
      });
      
      const stockCheck = await stockCheckResponse.json();
      
      if (!stockCheckResponse.ok) {
        throw new Error(stockCheck.error || "Erreur lors de la vérification des stocks");
      }
      
      if (stockCheck.produitsIndisponibles && stockCheck.produitsIndisponibles.length > 0) {
        setStockErrors(stockCheck.produitsIndisponibles);
        return;
      }
  
      setStockErrors([]);
  
      const response = await fetch(`/api/gestionnaire/demandes/demandes-enattente/${selectedRequest.requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          statut: "APPROUVEE", 
          updatedQuantities 
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur serveur:", errorData);
        throw new Error(`Erreur lors de l'acceptation: ${response.status} - ${errorData.error}`);
      }
      
      const data = await response.json();
      console.log("Réponse de l'API après acceptation:", data);
      
      // Envoyer un email au demandeur via l'API
      if (data.demandeurEmail) {
        await sendNotificationEmail(
          data.demandeurEmail,
          selectedRequest.demandeurName,
          selectedRequest.requestId,
          "accept",
          selectedRequest.produits, // Passer la liste des produits
        );
      } else {
        console.warn("Email du demandeur non trouvé dans la réponse de l'API");
        toast.warning("Demande approuvée, mais l'email du demandeur n'a pas pu être envoyé");
      }

      setActionSuccess({
        type: 'accept',
        requestId: selectedRequest.requestId,
        message: `Demande ${selectedRequest.requestId.substring(0, 8)}... approuvée avec succès. Une notification a été envoyée à ${selectedRequest.demandeurName} par email.`,
      });
  
      toast.success("Demande approuvée avec succès");
      setPendingRequests(pendingRequests.filter(req => req.requestId !== selectedRequest.requestId));
      
      setTimeout(() => {
        setSelectedRequest(null);
        setUpdatedQuantities([]);
        setMode(null);
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Erreur complète:", err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'acceptation");
    } finally {
      setProcessingRequest(null);
    }
  };

  const getPrimaryProductName = (request: PendingRequest) => {
    if (!request.produits || request.produits.length === 0) return "Aucun produit";
    
    if (request.produits.length === 1) {
      return request.produits[0].nom;
    }
    
    return `${request.produits[0].nom} +${request.produits.length - 1}`;
  };

  const getTotalQuantity = (request: PendingRequest) => {
    if (!request.produits || request.produits.length === 0) return 0;
    
    return request.produits.reduce((total, produit) => total + produit.quantite, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const resetDialog = () => {
    setSelectedRequest(null);
    setRejectReason("");
    setUpdatedQuantities([]);
    setStockErrors([]);
    setActionSuccess(null);
    setMode(null);
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div>
      <Table>
        <TableCaption>Liste des demandes en attente.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID Demande</TableHead>
            <TableHead>Demandeur</TableHead>
            <TableHead>Article(s)</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead className="text-right">Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : pendingRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Aucune demande en attente
              </TableCell>
            </TableRow>
          ) : (
            pendingRequests.map((request) => (
              <TableRow key={request.requestId}>
                <TableCell className="font-medium">{request.requestId.substring(0, 8)}...</TableCell>
                <TableCell>{request.demandeurName}</TableCell>
                <TableCell>{getPrimaryProductName(request)}</TableCell>
                <TableCell>{getTotalQuantity(request)}</TableCell>
                <TableCell className="text-right">{formatDate(request.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { 
                        setSelectedRequest(request); 
                        setMode("view"); 
                      }}
                    >
                      Voir Détail
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700" 
                      onClick={() => { 
                        setSelectedRequest(request); 
                        setMode("reject"); 
                      }}
                      disabled={processingRequest === request.requestId}
                    >
                      Refuser
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={() => { 
                        setSelectedRequest(request); 
                        setMode("accept"); 
                        setUpdatedQuantities(request.produits.map(p => ({ id: p.id, quantite: p.quantite })));
                      }}
                      disabled={processingRequest === request.requestId}
                    >
                      Accepter
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>Total Demandes en Attente</TableCell>
            <TableCell className="text-right">{loading ? '-' : pendingRequests.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Dialog open={!!selectedRequest} onOpenChange={resetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "view" ? "Détails de la Demande" : mode === "reject" ? "Refuser la Demande" : "Accepter la Demande"}
            </DialogTitle>
          </DialogHeader>
          
          {actionSuccess && (
            <div className={`p-4 rounded-md mb-4 ${actionSuccess.type === 'accept' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <p className="font-medium">{actionSuccess.type === 'accept' ? '✓ Demande approuvée' : '✗ Demande rejetée'}</p>
              <p className="text-sm">{actionSuccess.message}</p>
            </div>
          )}
          
          {selectedRequest && mode === "view" && !actionSuccess && (
            <div className="grid gap-3">
              <p><strong>ID Demande :</strong> {selectedRequest.requestId}</p>
              <p><strong>Demandeur :</strong> {selectedRequest.demandeurName}</p>
              <p><strong>Date de création :</strong> {formatDate(selectedRequest.createdAt)}</p>
              
              <div className="mt-4">
                <p className="font-medium mb-2">Liste des produits :</p>
                <ul className="space-y-2">
                  {selectedRequest.produits.map((produit) => (
                    <li key={produit.id} className="border-b pb-2">
                      <p>{produit.nom}</p>
                      <p className="text-sm text-gray-500">
                        Quantité: {produit.quantite}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {selectedRequest && mode === "reject" && !actionSuccess && (
            <div className="grid gap-3">
              <p><strong>ID Demande :</strong> {selectedRequest.requestId}</p>
              <p><strong>Demandeur :</strong> {selectedRequest.demandeurName}</p>
              
              <div className="mt-2">
                <label htmlFor="rejectReason" className="block text-sm font-medium mb-1">
                  Motif du refus
                </label>
                <Input 
                  id="rejectReason"
                  type="text" 
                  placeholder="Motif du refus" 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)} 
                />
              </div>
              
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={processingRequest === selectedRequest.requestId}
              >
                {processingRequest === selectedRequest.requestId ? "Traitement..." : "Confirmer le Refus"}
              </Button>
            </div>
          )}
          
          {selectedRequest && mode === "accept" && !actionSuccess && (
            <div className="grid gap-3">
              <p><strong>ID Demande :</strong> {selectedRequest.requestId}</p>
              <p><strong>Demandeur :</strong> {selectedRequest.demandeurName}</p>
              
              <div className="mt-4">
                <p className="font-medium mb-2">Produits demandés:</p>
                <ul className="space-y-2">
                  {selectedRequest.produits.map((produit) => {
                    const stockError = stockErrors.find(err => err.produitId === produit.produitId);
                    
                    return (
                      <li key={produit.id} className="border-b pb-2">
                        <div className="flex flex-col gap-2">
                          <p>{produit.nom}</p>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <label htmlFor={`quantity-${produit.id}`} className="text-sm text-gray-500">
                                Quantité:
                              </label>
                              <Input 
                                id={`quantity-${produit.id}`}
                                type="number" 
                                className={`w-24 ${stockError ? 'border-red-500' : ''}`}
                                value={updatedQuantities.find(q => q.id === produit.id)?.quantite || produit.quantite} 
                                onChange={(e) => handleQuantityChange(produit.id, parseInt(e.target.value) || 0)}
                                min="1"
                              />
                            </div>
                            
                            {stockError && (
                              <p className="text-red-500 text-sm">
                                Quantité insuffisante en stock. Disponible: {stockError.quantiteDisponible}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              {stockErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mt-2">
                  <p className="font-medium">Quantité insuffisante en stock pour certains produits</p>
                  <p className="text-sm">Veuillez ajuster les quantités avant de confirmer.</p>
                </div>
              )}
              
              <Button 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
                disabled={processingRequest === selectedRequest.requestId || stockErrors.length > 0}
              >
                {processingRequest === selectedRequest.requestId ? "Traitement..." : "Confirmer l'Acceptation"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}