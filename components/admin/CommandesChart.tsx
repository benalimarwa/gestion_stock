"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartData {
  month: string;
  commandes: number;
}

export function CommandesChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/admin/dashboard/commandespar-mois");
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
    "hsl(210, 80%, 55%)", // Bleu ciel vibrant
    "hsl(150, 70%, 45%)", // Vert émeraude
    "hsl(300, 60%, 50%)", // Violet créatif
    "hsl(30, 90%, 55%)",  // Orange chaleureux
    "hsl(260, 70%, 60%)", // Indigo doux
  ];

  return (
    <Card className="shadow-xl border-none bg-gradient-to-br from-white to-gray-50 rounded-2xl overflow-hidden max-w-[450px] mx-auto transition-all hover:shadow-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-gray-900 tracking-wide">
          Commandes par Mois
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={{
            commandes: {
              label: "Commandes",
              color: "hsl(210, 80%, 55%)",
            },
          }}
        >
          <BarChart
            data={chartData}
            width={400} // Taille réduite
            height={200} // Taille réduite
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#d4d4d8" opacity={0.6} />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#9ca3af" }}
              tick={{ fill: "#4b5563" }}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#9ca3af" }}
              tick={{ fill: "#4b5563" }}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
            />
            <Bar
              dataKey="commandes"
              radius={[8, 8, 0, 0]} // Coins arrondis en haut
              barSize={28} // Largeur des barres réduite
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