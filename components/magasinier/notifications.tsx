"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, RefreshCw, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Type pour les notifications
type Notification = {
  id: string;
  message: string;
  dateEnvoi: string;
  type: "DEMANDE_APPROUVEE" | "COMMANDE_VALIDEE";
  source: string;
  demandeId?: string;
  commandeId?: string;
  user: { email: string; name: string } | null;
  produits: { produit: { nom: string; marque: string }; quantite: number }[];
  isRead: boolean;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "approved" | "validated">("all");

  useEffect(() => {
    fetchNotifications();

    // Actualiser les notifications toutes les 30 secondes
    const intervalId = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const timestamp = new Date().getTime();
      const response = await fetch(`/api/magasinier/notification?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erreur ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("API Response Data:", data);
      console.log("Response Status:", response.status);

      if (!Array.isArray(data)) {
        console.error("Format de données inattendu:", data);
        throw new Error("Format de données inattendu");
      }

      setNotifications(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des notifications:", err);
      if (!silent) {
        setError(err instanceof Error ? err.message : "Impossible de charger les notifications");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const refreshNotifications = () => {
    setRefreshing(true);
    fetchNotifications();
    toast.success("Actualisation des notifications...");
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    toast.success("Notification marquée comme lue");
  };

  const markAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => !n.isRead && isVisible(n));

    if (unreadNotifications.length === 0) {
      toast.info("Aucune notification non lue");
      return;
    }

    setNotifications(
      notifications.map(notif => ({ ...notif, isRead: true }))
    );

    toast.success(`${unreadNotifications.length} notification(s) marquée(s) comme lue(s)`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isApprovedDemand = (notification: Notification) => notification.type === "DEMANDE_APPROUVEE";
  const isValidatedCommande = (notification: Notification) => notification.type === "COMMANDE_VALIDEE";
  const isVisible = (notification: Notification) => {
    if (filter === "all") return true;
    if (filter === "approved") return isApprovedDemand(notification);
    if (filter === "validated") return isValidatedCommande(notification);
    return false;
  };

  const getNotificationStyle = (notification: Notification) => {
    if (isApprovedDemand(notification)) {
      return {
        borderColor: "border-l-green-500",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        iconText: "✔",
        iconColor: "text-green-500",
      };
    }
    if (isValidatedCommande(notification)) {
      return {
        borderColor: "border-l-blue-500",
        icon: <Package className="h-5 w-5 text-blue-500" />,
        iconText: "📦",
        iconColor: "text-blue-500",
      };
    }
    return {
      borderColor: "border-l-gray-200",
      icon: <Bell className="h-5 w-5 text-gray-500" />,
      iconText: "🔔",
      iconColor: "text-gray-500",
    };
  };

  const filteredNotifications = notifications.filter(isVisible);
  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Vos Notifications</h1>
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-32" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p className="font-medium mb-2">Erreur:</p>
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => fetchNotifications()}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vos Notifications</h1>
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "approved" | "validated")}
            className="border rounded p-2"
          >
            <option value="all">Toutes</option>
            <option value="approved">Demandes Approuvées</option>
            <option value="validated">Commandes Validées</option>
          </select>
          <Button 
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Tout marquer comme lu
            </Button>
          )}
          <div className="flex items-center bg-blue-50 text-blue-800 px-3 py-1 rounded-full">
            <Bell size={16} className="mr-2" />
            <span>{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Bell size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Aucune notification pour le moment</h3>
          <p className="text-gray-400 mt-2">
            Les notifications apparaîtront ici lorsque des demandes seront approuvées 
            ou des commandes validées.
          </p>
          <div className="mt-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={refreshNotifications}
              disabled={refreshing}
            >
              Vérifier les nouvelles notifications
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const { borderColor, icon, iconText, iconColor } = getNotificationStyle(notification);
            return (
              <Card 
                key={notification.id} 
                className={`border-l-4 ${notification.isRead ? "border-l-gray-200" : borderColor}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg flex items-center">
                      {notification.isRead ? "Lu" : "Non lu"}
                      <span className={`ml-2 ${iconColor}`}>{iconText}</span>
                    </CardTitle>
                    <span className="text-sm text-gray-500">
                      {formatDate(notification.dateEnvoi)}
                    </span>
                  </div>
                  <CardDescription>
                    Source: {notification.source}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-800">{notification.message}</p>
                  {notification.produits.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Produits :</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {notification.produits.map((produit, index) => (
                          <li key={index}>
                            {produit.produit.nom} ({produit.produit.marque}) - Quantité : {produit.quantite}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {!notification.isRead && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="flex items-center"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Marquer comme lu
                    </Button>
                  )}
                  {notification.isRead && (
                    <span className="flex items-center text-sm text-gray-500">
                      <CheckCircle2 size={16} className="mr-2 text-green-500" />
                      Marqué comme lu
                    </span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}