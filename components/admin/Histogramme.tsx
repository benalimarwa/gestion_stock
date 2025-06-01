"use client";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
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
  category: string;
  enAttente: number;
  livree: number;
  enRetour: number;
  annulee: number;
}

const chartConfig: ChartConfig = {
  enAttente: {
    label: "En attente",
    color: "hsl(210, 70%, 50%)", // Bleu
  },
  livree: {
    label: "Livrée",
    color: "hsl(188, 53.40%, 37.10%)", // Vert
  },
  enRetour: {
    label: "En retour",
    color: "hsl(202, 66.30%, 33.70%)", // Orange
  },
  annulee: {
    label: "Annulée",
    color: "hsl(64, 38.10%, 44.30%)", // Rose
  },
};

export function Histogramme() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const response = await fetch("/api/admin/dashboard/usage");
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const data = await response.json();
        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchChartData();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statut des commandes par catégorie</CardTitle>
          <CardDescription>Quantités par statut et catégorie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Aucune donnée disponible</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-9">
      <CardHeader >
        <CardTitle>Statut des commandes par catégorie</CardTitle>
        <CardDescription>Quantités par statut et catégorie</CardDescription>
      </CardHeader>
      <CardContent className="p-9">
        <ChartContainer className="p-9" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            width={70}
            height={50}
            margin={{ top: 50, right: 50, left: 50, bottom: 100 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis />
            <Tooltip content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="enAttente" fill={chartConfig.enAttente.color} radius={4} />
            <Bar dataKey="livree" fill={chartConfig.livree.color} radius={4} />
            <Bar dataKey="enRetour" fill={chartConfig.enRetour.color} radius={4} />
            <Bar dataKey="annulee" fill={chartConfig.annulee.color} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Données en temps réel <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Quantités des commandes par statut et catégorie
        </div>
      </CardFooter>
    </Card>
  );
}