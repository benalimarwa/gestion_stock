"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts"; // Importez Cell
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ChartData {
  fournisseur: string;
  commandes: number;
}

export function CommandesParFournisseurChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/admin/dashboard/commandes-par-fournisseur");
      const data = await response.json();
      setChartData(data);
      setIsLoading(false);
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

  // Palette de couleurs modernes pour les barres
  const colors = [
    "hsl(316, 72.80%, 40.40%)", // Bleu vif
    "hsl(250, 86.60%, 62.00%)", // Vert teal
    "hsl(203, 75.70%, 48.40%)", // Rose moderne
  ];

  return (
    <Card className="shadow-lg border-none bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden max-w-[450px] mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-800 tracking-tight">
          Commandes par Fournisseur
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={{
            commandes: {
              label: "Commandes",
              color: "hsl(220, 70%, 50%)",
            },
          }}
        >
          <BarChart
            data={chartData}
            width={400} // Taille réduite
            height={200} // Taille réduite
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="fournisseur"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#d1d5db" }}
              tick={{ fill: "#6b7280" }}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#d1d5db" }}
              tick={{ fill: "#6b7280" }}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
            />
            <Bar
              dataKey="commandes"
              radius={[6, 6, 0, 0]} // Coins arrondis en haut
              barSize={30} // Largeur des barres réduite
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}