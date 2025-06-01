"use client";

import { useEffect, useState } from "react";
import Wrapper from "@/components/gestionnaire/Wrapper";
import { FiShoppingCart, FiBox, FiAlertTriangle, FiPackage, FiCheckCircle, FiXCircle, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface CustomNotification {
  id: string;
  message: string;
  dateEnvoi: string;
  type: string;
  produitNom?: string;
  source?: string;
  demandeId?: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<CustomNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<number>(30);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gestionnaire/notifications");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText || "Erreur inconnue"}`);
      }
      
      const data = await response.json();
      console.log("Notifications récupérées:", data);
      setNotifications(data);
      setRefreshTimer(30);
      toast.success("Notifications actualisées", {
        description: `${data.length} notification(s) récupérée(s)`
      });
    } catch (error) {
      console.error("Erreur dans fetchNotifications:", error);
      toast.error("Erreur", {
        description: "Impossible de récupérer les notifications"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    // Timer de décompte pour le rafraîchissement
    const timerInterval = setInterval(() => {
      setRefreshTimer(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/gestionnaire/notifications?id=${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Échec de la suppression");
      }
      
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      toast.success("Notification supprimée", {
        description: "La notification a été supprimée avec succès"
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur", {
        description: "Impossible de supprimer la notification"
      });
    }
  };

  const getNotificationStyle = (notif: CustomNotification) => {
    const { message, type, source } = notif;

    // Notifications provenant de la table Notification
    if (source === "notification") {
      if (message.includes("Demande en attente")) {
        return {
          icon: <FiPackage className="text-xl text-indigo-600" />,
          bg: "border-indigo-200",
          borderColor: "border-indigo-600",
          bgColor: "bg-indigo-50",
          titleColor: "text-indigo-700",
          type: "demande",
        };
      } else if (message.includes("Demande approuvée")) {
        return {
          icon: <FiCheckCircle className="text-xl text-green-600" />,
          bg: "border-green-200",
          borderColor: "border-green-600",
          bgColor: "bg-green-50",
          titleColor: "text-green-700",
          type: "demande_approuvee",
        };
      } else if (message.includes("Demande rejetée")) {
        return {
          icon: <FiXCircle className="text-xl text-red-600" />,
          bg: "border-red-200",
          borderColor: "border-red-600",
          bgColor: "bg-red-50",
          titleColor: "text-red-700",
          type: "demande_rejetee",
        };
      } else if (message.includes("Stock critique")) {
        return {
          icon: <FiAlertTriangle className="text-xl text-yellow-600" />,
          bg: "border-yellow-200",
          borderColor: "border-yellow-600",
          bgColor: "bg-yellow-50",
          titleColor: "text-yellow-700",
          type: "stock_critique",
        };
      } else if (message.includes("rupture de stock")) {
        return {
          icon: <FiShoppingCart className="text-xl text-red-600" />,
          bg: "border-red-200",
          borderColor: "border-red-600",
          bgColor: "bg-red-50",
          titleColor: "text-red-700",
          type: "rupture",
        };
      } else if (message.includes("Nouvelle commande en cours")) {
        return {
          icon: <FiBox className="text-xl text-purple-600" />,
          bg: "border-purple-200",
          borderColor: "border-purple-600",
          bgColor: "bg-purple-50",
          titleColor: "text-purple-700",
          type: "commande_en_cours",
        };
      } else if (message.includes("Commande validée")) {
        return {
          icon: <FiCheckCircle className="text-xl text-teal-600" />,
          bg: "border-teal-200",
          borderColor: "border-teal-600",
          bgColor: "bg-teal-50",
          titleColor: "text-teal-700",
          type: "commande_validee",
        };
      } else if (message.includes("Demande exceptionnelle acceptée")) {
        return {
          icon: <FiPackage className="text-xl text-blue-600" />,
          bg: "border-blue-200",
          borderColor: "border-blue-600",
          bgColor: "bg-blue-50",
          titleColor: "text-blue-700",
          type: "demande_exceptionnelle_acceptee",
        };
      }
      return {
        icon: <FiBox className="text-xl text-blue-600" />,
        bg: "border-blue-200",
        borderColor: "border-blue-600",
        bgColor: "bg-blue-50",
        titleColor: "text-blue-700",
        type: "notification",
      };
    }

    // Style par défaut pour les cas non couverts
    return {
      icon: <FiBox className="text-xl text-blue-600" />,
      bg: "border-blue-200",
      borderColor: "border-blue-600",
      bgColor: "bg-blue-50",
      titleColor: "text-blue-700",
      type: "autre",
    };
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-extrabold text-indigo-900 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
              Notifications Importantes
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Rafraîchissement dans: <span className="font-semibold">{refreshTimer}s</span>
              </div>
              <Button
                onClick={fetchNotifications}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    <span>Chargement...</span>
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    <span>Rafraîchir</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {loading && notifications.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg p-5 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-md">
                  <p className="text-gray-500 text-lg font-medium animate-fade-in">
                    Aucune notification pour le moment
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const { icon, bgColor, borderColor, titleColor, type } = getNotificationStyle(notif);
                  
                  return (
                    <div
                      key={notif.id}
                      className={`bg-white rounded-lg shadow-lg p-5 flex flex-col border-l-4 ${borderColor} transform transition-all duration-300 hover:shadow-xl animate-slide-up`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-full ${bgColor}`}>{icon}</div>
                          <div>
                            <p className={`font-semibold ${titleColor} text-lg`}>{notif.message}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(notif.dateEnvoi).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Type: {notif.type || type}
                              {notif.source && ` | Source: ${notif.source}`}
                              {notif.produitNom && ` | Produit: ${notif.produitNom}`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDismiss(notif.id)}
                          className="text-gray-500 hover:text-red-600 transition-colors duration-200 text-lg font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default NotificationsPage;