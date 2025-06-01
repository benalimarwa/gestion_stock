"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartData {
  produit: string;
  demandesAcceptees: number;
  commandesLivrees: number;
}

const chartConfig = {
  demandesAcceptees: {
    label: "Demandes Acceptées",
    color: "hsl(316, 74.00%, 40.80%)",
  },
  commandesLivrees: {
    label: "Commandes Livrées",
    color: "hsl(205, 46.30%, 45.30%)",
  },
} satisfies ChartConfig;

export function CommandesDemandeProd() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [commandesResponse, demandesResponse] = await Promise.all([
          fetch("/api/admin/dashboard/commandes-par-produit"),
          fetch("/api/admin/dashboard/demandes-par-produit"),
        ]);

        if (!commandesResponse.ok) {
          const errorData = await commandesResponse.json();
          throw new Error(`${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`);
        }
        if (!demandesResponse.ok) {
          const errorData = await demandesResponse.json();
          throw new Error(`${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`);
        }

        const commandesData = await commandesResponse.json();
        const demandesData = await demandesResponse.json();

        // Fusionner les données par produit
        const allProduits = new Set([
          ...commandesData.map((c: { produit: string }) => c.produit),
          ...demandesData.map((d: { produit: string }) => d.produit),
        ]);

        const mergedData = Array.from(allProduits).map((produit) => {
          const commande = commandesData.find((c: { produit: string }) => c.produit === produit) || { commandesLivrees: 0 };
          const demande = demandesData.find((d: { produit: string }) => d.produit === produit) || { demandesAcceptees: 0 };
          return {
            produit,
            commandesLivrees: commande.commandesLivrees || 0,
            demandesAcceptees: demande.demandesAcceptees || 0,
          };
        });

        setChartData(mergedData);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-lg border-none bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-800 tracking-tight">
            Commandes Livrées et Demandes Acceptées par Produit
          </CardTitle>
          <CardDescription className="text-gray-600">
            Données par produit (2025)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32 text-gray-500">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-none bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-800 tracking-tight">
            Commandes Livrées et Demandes Acceptées par Produit
          </CardTitle>
          <CardDescription className="text-gray-600">
            Données par produit (2025)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-800 tracking-tight">
          Commandes Livrées et Demandes Acceptées par Produit
        </CardTitle>
        <CardDescription className="text-gray-600">
          Données par produit (2025)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-9">
        <ChartContainer className="p-9" config={chartConfig}>
          <BarChart className="p-9" accessibilityLayer data={chartData}>
            <CartesianGrid  className="p-9"  vertical={false} stroke="#d1d5db" strokeDasharray="3 3" />
            <XAxis
              dataKey="produit"
              tickLine={false}
              tickMargin={(1)}
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              interval={0}
              angle={-35}
              textAnchor="end"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: "#6b7280", fontSize: 10 }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="demandesAcceptees"
              fill={chartConfig.demandesAcceptees.color}
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="commandesLivrees"
              fill={chartConfig.commandesLivrees.color}
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="p-9 flex-col items-start gap-2 text-xsm">
        <div className="p-9 flex gap-2 font-medium leading-none text-gray-700">
          Tendance en hausse de 5.2% ce mois-ci <TrendingUp className="h-4 w-4 text-teal-500" />
        </div>
        <div className="p-9 leading-none text-gray-500">
          Affichage des commandes livrées et demandes acceptées par produit
        </div>
      </CardFooter>
    </Card>
  );
}