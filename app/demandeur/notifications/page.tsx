"use client";

import { useEffect, useState } from "react";
import Wrapper from "@/components/demandeur/Wrapper2";
import { FiCheckCircle, FiTruck } from "react-icons/fi";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Produit {
  produit: { nom: string; marque: string };
  quantite: number;
}

interface Demande {
  id: string;
  type: "DEMANDE" | "DEMANDE_EXCEPTIONNELLE";
  dateApprouvee: string | null;
  createdAt: string;
  produits: Produit[];
}

const AcceptedDemandsPage = () => {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcceptedDemands();
  }, []);

  const fetchAcceptedDemands = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/demandeurUser/notifications", {
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          throw new Error(`Erreur HTTP ${response.status}: ${text || "Erreur inconnue"}`);
        }
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Réponse vide du serveur");
      }

      let data: Demande[];
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }

      setDemandes(data);
      toast.success("Demandes récupérées", {
        description: `${data.length} demande(s) récupérée(s)`,
        className:
          "bg-blue-800/80 text-blue-100 border border-blue-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } catch (error) {
      console.error("Erreur dans fetchAcceptedDemands:", error);
      toast.error("Erreur", {
        description:
          error instanceof Error ? error.message : "Impossible de récupérer les demandes",
        className:
          "bg-red-900/60 text-red-300 border border-red-700/60 p-3 rounded-md text-sm font-[Inter,sans-serif]",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDemandStyle = (type: Demande["type"]) => {
    if (type === "DEMANDE_EXCEPTIONNELLE") {
      return {
        icon: <FiTruck className="text-orange-300 h-4 w-4" />,
        bgColor: "bg-orange-900/60",
        borderColor: "border-orange-700/60",
        titleColor: "text-orange-300",
        textColor: "text-orange-200",
        label: "Demande exceptionnelle livrée",
      };
    }
    return {
      icon: <FiCheckCircle className="text-blue-300 h-4 w-4" />,
      bgColor: "bg-blue-900/60",
      borderColor: "border-blue-700/60",
      titleColor: "text-blue-300",
      textColor: "text-blue-200",
      label: "Demande approuvée",
    };
  };

  return (
    <Wrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-gray-200 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-6 border border-blue-800/60 relative font-[Inter,sans-serif]"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
            <div className="relative">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent text-center">
                Mes Demandes Acceptées et Livrées
              </h1>
            </div>
            {loading ? (
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
                {demandes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-8 bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md border border-blue-800/60"
                  >
                    <p className="text-blue-200 text-sm font-medium">
                      Aucune demande acceptée ou livrée pour le moment
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {demandes.map((demande, index) => {
                      const { icon, bgColor, borderColor, titleColor, textColor, label } = getDemandStyle(demande.type);
                      return (
                        <motion.div
                          key={demande.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className={`bg-blue-900/60 backdrop-blur-md rounded-lg shadow-md p-4 flex flex-col border-l-4 ${borderColor} transition-all duration-200 hover:bg-blue-800/70 hover:shadow-xl relative`}
                        >
                          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-lg"></div>
                          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`p-1.5 rounded-full ${bgColor}`}>
                                {icon}
                              </div>
                              <div className="flex-1">
                                <p className={`font-semibold ${titleColor} text-base`}>
                                  {label} #{demande.id.slice(0, 8)}
                                </p>
                                <p className={`text-xs ${textColor} mt-1`}>
                                  {demande.type === "DEMANDE_EXCEPTIONNELLE" ? "Livrée le" : "Approuvée le"} :{" "}
                                  {demande.dateApprouvee
                                    ? new Date(demande.dateApprouvee).toLocaleDateString("fr-FR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "Date non disponible"}
                                </p>
                                <p className={`text-xs ${textColor} mt-1`}>
                                  Créée le :{" "}
                                  {new Date(demande.createdAt).toLocaleDateString("fr-FR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {demande.produits && demande.produits.length > 0 && (
                                  <div className="mt-2 bg-blue-900/50 p-2 rounded-lg">
                                    <p className={`text-xs font-medium ${textColor}`}>Produits :</p>
                                    <ul className={`list-disc list-inside text-xs ${textColor} space-y-1`}>
                                      {demande.produits.map((produit, index) => (
                                        <li key={index}>
                                          {produit.produit.nom} ({produit.produit.marque}) - Quantité :{" "}
                                          {produit.quantite}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
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

export default AcceptedDemandsPage;