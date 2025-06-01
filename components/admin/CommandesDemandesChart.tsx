"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  month: string;
  demandes: number;
  commandes: number;
}

const chartConfig = {
  demandes: {
    label: "Demandes",
    color: "hsl(207, 77.40%, 75.70%)",
  },
  commandes: {
    label: "Commandes",
    color: "hsl(307, 83.90%, 34.10%)",
  },
} satisfies ChartConfig;

export function CommandesDemandesChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [commandesResponse, demandesResponse] = await Promise.all([
          fetch("/api/admin/dashboard/commandespar-mois"),
          fetch("/api/admin/dashboard/demandes-par-mois"),
        ]);

        if (!commandesResponse.ok || !demandesResponse.ok) {
          throw new Error("Failed to fetch data from one or both APIs");
        }

        const commandesData = await commandesResponse.json();
        const demandesData = await demandesResponse.json();

        // Define the months we want to display (January to March 2025, in French)
        const targetMonths = [
          "janvier 2025",
          "février 2025",
          "mars 2025",
        ];

        // Initialize chartData with 0 for each target month
        const initializedData: ChartData[] = targetMonths.map((month) => ({
          month,
          commandes: 0,
          demandes: 0,
        }));

        // Merge the fetched data into the initialized data
        const mergedData = initializedData.map((entry) => {
          const commande = commandesData.find((c: { month: string }) => c.month === entry.month);
          const demande = demandesData.find((d: { month: string }) => d.month === entry.month);
          return {
            month: entry.month,
            commandes: commande ? commande.commandes : 0,
            demandes: demande ? demande.demandes : 0,
          };
        });

        console.log("Frontend: Merged Chart Data:", mergedData);
        setChartData(mergedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        Chargement...
      </div>
    );
  }

  return (
    <Card className="shadow-lg border-none bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-800 tracking-tight">
          Commandes et Demandes par Mois
        </CardTitle>
        <CardDescription className="text-gray-600">
          Janvier - Mars 2025
        </CardDescription>
      </CardHeader>
      <CardContent className="p-9">
        <ChartContainer className="p-9" config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid className="p-9" vertical={false} stroke="#d1d5db" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => {
                const [month] = value.split(" ");
                return month.slice(0, 3).toLowerCase(); // e.g., "janvier" -> "jan"
              }}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="demandes"
              fill={chartConfig.demandes.color}
              radius={[6, 6, 0, 0]}
              barSize={30}
            />
            <Bar
              dataKey="commandes"
              fill={chartConfig.commandes.color}
              radius={[6, 6, 0, 0]}
              barSize={30}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className=" p-9 flex-col items-start gap-2 text-sm">
        <div className="flex p-9 gap-2 font-medium leading-none text-gray-700">
          Tendance en hausse de 5.2% ce mois-ci <TrendingUp className="h-4 w-4 text-teal-500" />
        </div>
        <div className=" p-9 leading-none text-gray-500">
          Affichage des commandes et demandes pour les derniers mois
        </div>
      </CardFooter>
    </Card>
  );
}