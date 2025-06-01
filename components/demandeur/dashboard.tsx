"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Wrapper from "@/components/demandeur/Wrapper2";
import { Component } from "./Chart";
import NotificationContainer from "./notification/NotificationContainer";

type Product = {
  id: string;
  nom: string;
  quantite: number;
  categorie: {
    nom: string;
  };
};

export default function UserDashboard() {
  const [loading, setLoading] = useState(true);
  const [approvedItems, setApprovedItems] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const statsRes = await fetch("/api/demandeurUser/dashboard/stats");
        if (!statsRes.ok) throw new Error("Erreur lors du chargement des statistiques");
        const statsData = await statsRes.json();

        setApprovedItems(statsData.approvedItems);
        setPendingRequests(statsData.pendingRequests);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section 1: Statistics Card 1 and Chart */}
        <div className="col-span-1 md:col-span-2">
          <Card className="mb-4  border-2 border-teal-700 shadow-lg hover:shadow-xl hover:shadow-teal-900/40 transition-all duration-300 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-800 to-blue-900" />
            <CardHeader className="bg-gradient-to-r from-teal-900 to-blue-900">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-gray-200">
                Matériel Emprunté
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-gray-700">
                  {approvedItems}{" "}
                  <span className="text-sm font-medium text-teal-900">Articles</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Statistics Card 2 */}
          <Card className="mb-6  border-2 border-coral-700 shadow-lg hover:shadow-xl hover:shadow-coral-900/40 transition-all duration-300 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-800 to-blue-900" />
            <CardHeader className="bg-gradient-to-r from-teal-900 to-blue-900">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-gray-100">
                Demandes en Attente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-coral-700 mx-auto" />
              ) : (
                <p className="text-2xl font-bold text-gray-600">
                  {pendingRequests}{" "}
                  <span className="text-sm font-medium text-coral-400">Demandes</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Chart Component - Now taking up more space */}
          <div className="w-full cursor-pointer transition-all duration-300 hover:opacity-90 h-96">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-800 to-indigo-900 bg-clip-text text-transparent mb-2 relative">
              Statistiques des Demandes
              <span className="absolute bottom-0 left-0 w-16 h-1 bg-gradient-to-r from-purple-800 to-indigo-900 rounded-full" />
            </h3>
            <div className={`w-full h-full ${isExpanded ? "scale-110 z-10" : ""}`}>
              <Component />
            </div>
          </div>
        </div>

       
      </div>
    </>
  );
}