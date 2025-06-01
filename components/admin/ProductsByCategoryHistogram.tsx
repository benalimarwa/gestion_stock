"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
} from "@/components/ui/chart";

interface ChartData {
  category: string;
  productCount: number;
  products: { name: string; quantity: number }[];
}

const chartConfig: ChartConfig = {
  productCount: {
    label: "Nombre de produits",
    color: "#4F46E5", // Bleu foncé pour une meilleure visibilité
  },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartData;
    return (
      <div className="bg-white p-2 border rounded shadow-md text-sm">
        <p className="font-bold text-indigo-600">{data.category}</p>
        <ul className="mt-1 space-y-1">
          {data.products.map((product) => (
            <li key={product.name} className="text-gray-700">
              {product.name}: <span className="font-semibold">{product.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};

export function ProductsByCategoryHistogram() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const response = await fetch("/api/admin/dashboard/products-by-category");
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
          <CardTitle>Produits par catégorie</CardTitle>
          <CardDescription>Nombre de produits par catégorie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Aucune donnée disponible</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle>Produits par catégorie</CardTitle>
        <CardDescription>Nombre de produits par catégorie</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300" />
              <XAxis
                dataKey="category"
                tickLine={false}
                tickMargin={5}
                axisLine={false}
                className="text-sm text-gray-600"
              />
              <YAxis className="text-sm text-gray-600" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar
                dataKey="productCount"
                fill={chartConfig.productCount.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Données en temps réel <TrendingUp className="h-4 w-4 text-indigo-600" />
        </div>
        <div className="leading-none text-muted-foreground">
          Nombre de produits par catégorie avec détails au survol
        </div>
      </CardFooter>
    </Card>
  );
}
