"use client";

import { useEffect, useState } from "react";
import Wrapper from "@/components/admin/Wrapper";
import { FiBox, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactElement } from "react";

// Types
interface Produit {
  produit: { nom: string; marque: string };
  quantite: number;
}

interface Notification {
  id: string;
  message: string;
  dateEnvoi: string;
  type: string;
  source?: string;
  demandeId?: string;
  demandeExceptionnelleId?: string;
  user?: { email: string };
  produits: Produit[];
}

interface NotificationStyle {
  icon: ReactElement;
  bgColor: string;
  borderColor: string;
  titleColor: string;
  textColor: string;
  type: string;
  needsAction: boolean;
  filter: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<number>(30);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const timerInterval = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, []);

  useEffect(() => {
    if (filterType === "ALL") {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter((n) => n.type === filterType));
    }
  }, [notifications, filterType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications/notif");
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP ${response.status}: ${text || "Erreur inconnue"}`);
      }

      setNotifications(data);
      setFilteredNotifications(filterType === "ALL" ? data : data.filter((n: Notification) => n.type === filterType));
      setRefreshTimer(30);

      toast.success("Notifications actualisées", {
        description: `${data.length} notification(s) récupérée(s)`,
        className:
          "bg-blue-800/80 text-blue-100 border border-blue-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } catch (error) {
      console.error("Erreur dans fetchNotifications:", error);
      toast.error("Erreur", {
        description: "Impossible de récupérer les notifications",
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = (id: string) => {
    setReadStatus((prev) => ({ ...prev, [id]: true }));
    toast.success("Notification marquée comme lue", {
      className:
        "bg-blue-800/80 text-blue-100 border border-blue-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
    });
  };

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/notif?id=${id}`, {
        method: "DELETE",
        credentials: "include",
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
        throw new Error(data.error || "Échec de la suppression");
      }

      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      setReadStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[id];
        return newStatus;
      });
      toast.success("Notification supprimée avec succès", {
        className:
          "bg-blue-800/80 text-blue-100 border border-blue-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur", {
        description: `Échec de la suppression: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    }
  };

  const getNotificationStyle = (notification: Notification, isRead: boolean): NotificationStyle => {
    const { type } = notification;

    if (isRead) {
      return {
        icon: <FiBox className="text-gray-400 h-4 w-4" />,
        bgColor: "bg-gray-900/60",
        borderColor: "border-gray-700/60",
        titleColor: "text-gray-400",
        textColor: "text-gray-400",
        type: notification.type,
        needsAction: false,
        filter: "grayscale(80%) opacity(0.7)",
      };
    }

    if (type === "DEMANDE") {
      return {
        icon: <FiBox className="text-blue-300 h-4 w-4" />,
        bgColor: "bg-blue-900/60",
        borderColor: "border-blue-700/60",
        titleColor: "text-blue-300",
        textColor: "text-blue-200",
        type: "Demande",
        needsAction: false,
        filter: "none",
      };
    } else if (type === "DEMANDE_EXCEPTIONNELLE") {
      return {
        icon: <FiAlertCircle className="text-orange-300 h-4 w-4" />,
        bgColor: "bg-orange-900/60",
        borderColor: "border-orange-700/60",
        titleColor: "text-orange-300",
        textColor: "text-orange-200",
        type: "Demande exceptionnelle",
        needsAction: false,
        filter: "none",
      };
    }

    return {
      icon: <FiBox className="text-gray-300 h-4 w-4" />,
      bgColor: "bg-gray-900/60",
      borderColor: "border-gray-700/60",
      titleColor: "text-gray-300",
      textColor: "text-gray-200",
      type: "Autre",
      needsAction: false,
      filter: "none",
    };
  };

  const unreadCount = notifications.filter((n) => !readStatus[n.id]).length;

  return (
    <Wrapper>
      <div className="min-h-screen bg-gradient-to-br from-P-250 to-gray-350 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative font-[Inter,sans-serif]"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
            <div className="relative flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent text-center md:text-left">
                  Centre de Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-900/60 text-red-300 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-300">Filtrer par type :</span>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 bg-blue-900/60 border-blue-800/60 text-blue-100 focus:ring-blue-700/60 hover:bg-blue-800/70 transition-all duration-200 text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-900/80 border-blue-800/60 text-blue-100 text-sm">
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="DEMANDE">Demande</SelectItem>
                      <SelectItem value="DEMANDE_EXCEPTIONNELLE">Demande exceptionnelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <div className="relative">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 36 36">
                        <path
                          className="text-blue-600"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${(refreshTimer / 30) * 100}, 100`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-blue-200">
                        {refreshTimer}s
                      </span>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={fetchNotifications}
                      disabled={loading}
                      className={`bg-blue-800/80 text-blue-100 hover:bg-blue-700/80 transition-all duration-200 flex items-center gap-2 h-9 px-4 text-sm rounded-md ${
                        loading ? "bg-gray-800/50 text-gray-400 cursor-not-allowed" : ""
                      }`}
                    >
                      {loading ? (
                        <>
                          <FiRefreshCw className="animate-spin h-4 w-4" />
                          <span>Chargement...</span>
                        </>
                      ) : (
                        <>
                          <FiRefreshCw className="h-4 w-4" />
                          <span>Rafraîchir</span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
            {loading && filteredNotifications.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-20 w-full rounded-md bg-blue-800/50 border border-blue-700/60"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-8 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md border border-blue-800/60"
                  >
                    <p className="text-blue-200 text-sm font-medium">
                      Aucune notification pour le moment
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {filteredNotifications.map((notification, index) => {
                      const isRead = readStatus[notification.id] || false;
                      const { icon, bgColor, borderColor, titleColor, textColor, type, filter } =
                        getNotificationStyle(notification, isRead);

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-4 flex flex-col border-l-4 ${borderColor} transition-all duration-200 hover:bg-blue-800/70 hover:shadow-xl relative`}
                          style={{ filter }}
                        >
                          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
                          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`p-1.5 rounded-full ${bgColor}`}>{icon}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`font-semibold ${titleColor} text-base`}>{notification.message}</p>
                                  {isRead && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900/60 text-gray-400">
                                      Lu
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs ${textColor} mt-1`}>
                                  {new Date(notification.dateEnvoi).toLocaleDateString("fr-FR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <p className={`text-xs ${textColor} mt-1 italic`}>
                                  Type: {type}
                                  {notification.source && ` | Source: ${notification.source}`}
                                </p>
                                {notification.produits && notification.produits.length > 0 && (
                                  <div className="mt-2 bg-blue-900/50 p-2 rounded-lg">
                                    <p className={`text-xs font-medium ${textColor}`}>Produits :</p>
                                    <ul className={`list-disc list-inside text-xs ${textColor} space-y-1`}>
                                      {notification.produits.map((produit, index) => (
                                        <li key={index}>
                                          {produit.produit.nom} ({produit.produit.marque}) - Quantité : {produit.quantite}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {!isRead && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          onClick={() => handleMarkAsRead(notification.id)}
                                          className="bg-blue-800/80 hover:bg-blue-700/80 text-blue-100 h-8 px-3 rounded-md text-xs transition-all duration-200"
                                        >
                                          Marquer comme lu
                                        </Button>
                                      </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-blue-900/80 text-blue-100 border-blue-800/60">
                                      Marquer cette notification comme lue
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button
                                        onClick={() => handleDismiss(notification.id)}
                                        className="bg-blue-800/80 hover:bg-blue-700/80 text-blue-100 h-8 px-3 rounded-md text-xs transition-all duration-200"
                                      >
                                        Supprimer
                                      </Button>
                                    </motion.div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-blue-900/80 text-blue-100 border-blue-800/60">
                                    Supprimer cette notification
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          {isRead && (
                            <div className={`mt-2 text-xs ${textColor} italic`}>
                              Cette notification a été lue
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Wrapper>
  );
};

export default NotificationsPage;