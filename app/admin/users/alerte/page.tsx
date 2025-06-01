"use client";

import { useEffect, useState } from "react";
import { ReactElement } from "react"; // Add this import
import Wrapper from "@/components/admin/Wrapper";
import { FiShoppingCart, FiAlertTriangle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Produit {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale: number;
  categorieId: string;
  remarque: string | null;
  statut: string;
}

interface Alerte {
  id: string;
  date: string;
  produit: Produit | null;
  produitId?: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

interface AlerteStyle {
  icon: ReactElement; // Changed from JSX.Element to ReactElement
  bgColor: string;
  borderColor: string;
  titleColor: string;
  textColor: string;
  type: string;
  filter: string;
}

const AlertesPage = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastAlertCount, setLastAlertCount] = useState<number>(0);

  // Load readStatus from localStorage after component mounts on the client
  useEffect(() => {
    if (isLoaded && user?.id && typeof window !== "undefined") {
      const savedReadStatus = localStorage.getItem(`alertes-read-${user.id}`);
      if (savedReadStatus) {
        try {
          setReadStatus(JSON.parse(savedReadStatus));
        } catch (error) {
          console.error("Erreur lors du parsing du readStatus:", error);
          localStorage.removeItem(`alertes-read-${user.id}`);
        }
      }
    }
  }, [isLoaded, user?.id]);

  // Save readStatus to localStorage whenever it changes
  useEffect(() => {
    if (user?.id && typeof window !== "undefined") {
      try {
        localStorage.setItem(`alertes-read-${user.id}`, JSON.stringify(readStatus));
      } catch (error) {
        console.error("Erreur lors de la sauvegarde du readStatus:", error);
      }
    }
  }, [readStatus, user?.id]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const interval = setInterval(() => fetchAlertes(), 30000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn]);

  const addToast = (message: string, type: "success" | "error" | "warning") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const fetchAlertes = async () => {
    if (!isSignedIn || !user?.primaryEmailAddress?.emailAddress) {
      addToast("Vous devez être connecté pour voir les alertes.", "warning");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/notifications/alerte?email=${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`,
        {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

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

      if (data.alertes && Array.isArray(data.alertes)) {
        setAlertes(data.alertes);
        setLastAlertCount(data.alertes.length);
      } else {
        console.error("Format de données inattendu:", data);
        addToast("Erreur: Format de données inattendu", "error");
        setAlertes([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des alertes:", error);
      addToast(
        `Erreur lors de la récupération: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/alerte?id=${id}`, {
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

      setAlertes((prev) => prev.filter((alerte) => alerte.id !== id));
      setReadStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[id];
        return newStatus;
      });
      addToast("Alerte supprimée avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      addToast(
        `Échec de la suppression: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        "error"
      );
    }
  };

  const handleMarkAsRead = (id: string) => {
    setReadStatus((prev) => ({
      ...prev,
      [id]: true,
    }));
    addToast("Alerte marquée comme lue", "success");
  };

  const getAlerteStyle = (alerte: Alerte): AlerteStyle => {
    const produit = alerte.produit;
    const isRead = readStatus[alerte.id] || false;
    let type = "INCONNU";

    if (produit) {
      if (produit.quantite === 0) {
        type = "RUPTURE";
      } else if (produit.quantite <= produit.quantiteMinimale) {
        type = "CRITIQUE";
      }
    }

    if (isRead) {
      return {
        icon: <FiAlertTriangle className="text-gray-400 h-4 w-4" />,
        bgColor: "bg-gray-900/60",
        borderColor: "border-gray-700/60",
        titleColor: "text-gray-400",
        textColor: "text-gray-400",
        type,
        filter: "grayscale(100%)",
      };
    }

    if (type === "CRITIQUE") {
      return {
        icon: <FiAlertTriangle className="text-yellow-300 h-4 w-4" />,
        bgColor: "bg-yellow-900/60",
        borderColor: "border-yellow-700/60",
        titleColor: "text-yellow-300",
        textColor: "text-yellow-200",
        type: "CRITIQUE",
        filter: "none",
      };
    } else if (type === "RUPTURE") {
      return {
        icon: <FiShoppingCart className="text-red-300 h-4 w-4" />,
        bgColor: "bg-red-900/60",
        borderColor: "border-red-700/60",
        titleColor: "text-red-300",
        textColor: "text-red-200",
        type: "RUPTURE",
        filter: "none",
      };
    }

    return {
      icon: <FiAlertTriangle className="text-blue-300 h-4 w-4" />,
      bgColor: "bg-blue-900/60",
      borderColor: "border-blue-700/60",
      titleColor: "text-blue-300",
      textColor: "text-blue-200",
      type,
      filter: "none",
    };
  };

  const unreadCount = alertes.filter((alerte) => !readStatus[alerte.id]).length;

  if (!isLoaded) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-blue-900/60 backdrop-blur-md p-4 rounded-lg shadow-md border border-blue-800/60 text-blue-200 text-sm font-[Inter,sans-serif] animate-pulse"
          >
            <svg className="animate-spin h-8 w-8 text-blue-200 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z" />
            </svg>
            <p className="mt-2">Chargement de l'utilisateur...</p>
          </motion.div>
        </div>
      </Wrapper>
    );
  }

  if (!isSignedIn) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-gradient-to-br from-blue-950 to-purple-950 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-blue-900/60 backdrop-blur-md p-4 rounded-lg shadow-md border border-blue-800/60 text-blue-200 text-sm font-[Inter,sans-serif]"
          >
            Veuillez vous connecter pour voir les alertes.
          </motion.div>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="min-h-screen py-6">
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center p-3 rounded-md shadow-lg max-w-[90vw] text-sm font-[Inter,sans-serif] ${
                  toast.type === "success"
                    ? "bg-blue-800/80 text-blue-100"
                    : toast.type === "error"
                    ? "bg-red-900/60 text-red-300"
                    : "bg-yellow-900/60 text-yellow-300"
                }`}
              >
                <span className="mr-2">
                  {toast.type === "success" && "✅"}
                  {toast.type === "error" && "❌"}
                  {toast.type === "warning" && "⚠️"}
                </span>
                <span>{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
            <div className="relative flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif] text-center md:text-left">
                  Alertes de Stock
                </h1>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-900/60 text-red-300 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            {loading && alertes.length === 0 ? (
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
                {alertes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-8 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md border border-blue-800/60"
                  >
                    <p className="text-blue-200 text-sm font-medium font-[Inter,sans-serif]">
                      Aucune alerte pour le moment
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {alertes.map((alerte, index) => {
                      const isRead = readStatus[alerte.id] || false;
                      const { icon, bgColor, borderColor, titleColor, textColor, type, filter } =
                        getAlerteStyle(alerte);
                      const message = alerte.produit
                        ? alerte.produit.quantite === 0
                          ? `Le produit ${alerte.produit.nom} est en rupture de stock.`
                          : alerte.produit.quantite <= alerte.produit.quantiteMinimale
                          ? `Stock critique pour ${alerte.produit.nom}: ${alerte.produit.quantite} unités restantes.`
                          : "Information indisponible"
                        : "Information indisponible";

                      return (
                        <motion.div
                          key={alerte.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-4 flex flex-col border-l-4 ${borderColor} transition-all duration-200 hover:bg-blue-800/70 relative`}
                          style={{ filter }}
                        >
                          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
                          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-start space-x-3">
                              <div className={`p-1.5 rounded-full ${bgColor}`}>{icon}</div>
                              <div>
                                <p className={`font-semibold ${titleColor} text-base`}>{message}</p>
                                <p className={`text-xs ${textColor} mt-1`}>
                                  {new Date(alerte.date).toLocaleDateString("fr-FR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                <p className={`text-xs ${textColor} mt-1 italic`}>
                                  Type: {type}
                                  {alerte.produit?.nom && ` | Produit: ${alerte.produit.nom}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {!isRead && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <button
                                    onClick={() => handleMarkAsRead(alerte.id)}
                                    className="bg-blue-800/80 hover:bg-blue-700/80 text-blue-100 px-3 py-1 rounded-md text-xs transition-all duration-200"
                                  >
                                    Marquer comme lu
                                  </button>
                                </motion.div>
                              )}
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <button
                                  onClick={() => handleDismiss(alerte.id)}
                                  className="bg-blue-800/80 hover:bg-blue-700/80 text-blue-100 px-3 py-1 rounded-md text-xs transition-all duration-200"
                                >
                                  Supprimer
                                </button>
                              </motion.div>
                            </div>
                          </div>
                          {isRead && (
                            <div className={`mt-2 text-xs ${textColor} italic`}>
                              Cette alerte a été lue
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

export default AlertesPage;