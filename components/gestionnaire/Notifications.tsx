"use client";

import { motion } from "framer-motion";
import { Box, Truck, Users, XCircle } from "lucide-react";

// Props du composant
interface NotificationProps {
  type: "stock" | "commandes" | "fournisseurs";
  message: string;
  time: string;
  onDismiss: () => void;
}

const Notification = ({ type, message, time, onDismiss }: NotificationProps) => {
  // Icône en fonction du type de notification
  const icon = {
    stock: <Box className="h-6 w-6 text-blue-500" />,
    commandes: <Truck className="h-6 w-6 text-green-500" />,
    fournisseurs: <Users className="h-6 w-6 text-purple-500" />,
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-start space-x-4"
    >
      {/* Icône */}
      <div className="flex-shrink-0">{icon}</div>

      {/* Contenu de la notification */}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>

      {/* Bouton pour supprimer la notification */}
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-red-500 transition"
      >
        <XCircle className="h-5 w-5" />
      </button>
    </motion.div>
  );
};

export default Notification;