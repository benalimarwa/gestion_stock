"use client";

import { useEffect, useState } from "react";
import { FiPackage, FiShoppingCart } from "react-icons/fi";

interface Demande {
  id: string;
  demandeur: { user: { name: string } };
  produits: { produit: { nom: string }; quantite: number }[];
  createdAt: string;
  statut: string;
}

interface Commande {
  id: string;
  fournisseur: { nom: string };
  produits: { produit: { nom: string }; quantite: number }[];
  createdAt: string;
  statut: string;
}

interface OrdersAndRequestsProps {
  selectedDate: Date;
}

export function OrdersAndRequests({ selectedDate }: OrdersAndRequestsProps) {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const dateStr = selectedDate.toISOString().split("T")[0]; // Format YYYY-MM-DD

        const demandesResponse = await fetch(`/api/admin/calendar/demandes?date=${dateStr}`);
        if (!demandesResponse.ok) throw new Error("Erreur lors de la récupération des demandes");
        const demandesData = await demandesResponse.json();
        setDemandes(demandesData);

        const commandesResponse = await fetch(`/api/admin/commandes?date=${dateStr}`);
        if (!commandesResponse.ok) throw new Error("Erreur lors de la récupération des commandes");
        const commandesData = await commandesResponse.json();
        setCommandes(commandesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  if (loading) {
    return <div className="text-center text-gray-500 py-4">Chargement...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">Erreur : {error}</div>;
  }

  return (
    <div className="mt-6 w-full">
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">
        Activités du {selectedDate.toLocaleDateString("fr-FR")}
      </h2>

      <div className="mb-6">
        <h3 className="text-xl font-medium text-indigo-600 flex items-center gap-2">
          <FiPackage /> Demandes
        </h3>
        {demandes.length === 0 ? (
          <p className="text-gray-500 mt-2">Aucune demande pour ce jour.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {demandes.map((demande) => (
              <li key={demande.id} className="p-3 bg-indigo-50 rounded-lg shadow-sm">
                <p className="text-gray-800">
                  <span className="font-medium">{demande.demandeur.user.name}</span> -{" "}
                  {demande.produits.map(p => `${p.produit.nom} (${p.quantite})`).join(", ")} -{" "}
                  <span className="text-indigo-600">{demande.statut}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xl font-medium text-green-600 flex items-center gap-2">
          <FiShoppingCart /> Commandes
        </h3>
        {commandes.length === 0 ? (
          <p className="text-gray-500 mt-2">Aucune commande pour ce jour.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {commandes.map((commande) => (
              <li key={commande.id} className="p-3 bg-green-50 rounded-lg shadow-sm">
                <p className="text-gray-800">
                  <span className="font-medium">{commande.fournisseur.nom}</span> -{" "}
                  {commande.produits.map(p => `${p.produit.nom} (${p.quantite})`).join(", ")} -{" "}
                  <span className="text-green-600">{commande.statut}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}