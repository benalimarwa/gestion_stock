"use client";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}
interface StockMovement {
  month: string;
  [product: string]: number | string; // Allow string for month, number for product quantities
}
export function MouvementStock() {
  const [timeRange, setTimeRange] = React.useState("12m");
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [chartConfig, setChartConfig] = React.useState<CustomChartConfig>({
    stock: { label: "Stock" },
  });

  const productColors = [
    "hsl(120, 100%, 40%)",
    "hsl(0, 100%, 50%)",
    "hsl(240, 100%, 50%)",
    "hsl(60, 100%, 50%)",
    "hsl(300, 100%, 50%)",
    "hsl(180, 100%, 40%)",
    "hsl(30, 100%, 50%)",
    "hsl(270, 100%, 50%)",
    "hsl(150, 100%, 40%)",
    "hsl(210, 100%, 50%)",
    "hsl(90, 100%, 40%)",
  ];

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/dashboard/stock-mouvement?timeRange=${timeRange}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `${errorData.error || "Erreur lors de la récupération des données"}${
              errorData.details ? `: ${errorData.details}` : ""
            }`
          );
        }
        const data = await response.json();
        console.log(
          `Frontend: Stock movement data for timeRange=${timeRange}:`,
          JSON.stringify(data, null, 2)
        );

        // Determine the expected number of months
        const expectedMonths = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;

        // Filter data to ensure only the expected number of months
        const filteredData = data.slice(-expectedMonths);

        // Get unique products
        const products = Array.from(
          new Set(
            filteredData.flatMap((item: { [key: string]: number }) =>
              Object.keys(item).filter((key) => key !== "month")
            )
          )
        ) as string[];

        // Update chart config
        const updatedConfig: CustomChartConfig = {
          stock: { label: "Stock" },
        };
        products.forEach((product, index) => {
          updatedConfig[product] = {
            label: product,
            color: productColors[index % productColors.length],
          };
        });

        setChartConfig(updatedConfig);
        setChartData(filteredData);
      } catch (error) {
        console.error("Frontend Error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de la récupération des données"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Mouvement de Stock</CardTitle>
            <CardDescription>Quantité de produits reçus par mois</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Mouvement de Stock</CardTitle>
            <CardDescription>Quantité de produits reçus par mois</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px] bg-red-50 rounded-lg">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0 || chartData.every(item => Object.keys(item).every(key => key === "month" || item[key] === 0))) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Mouvement de Stock</CardTitle>
            <CardDescription>Quantité de produits reçus par mois</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[160px] rounded-lg sm:ml-auto"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Last 12 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="12m" className="rounded-lg">
                Last 12 months
              </SelectItem>
              <SelectItem value="6m" className="rounded-lg">
                Last 6 months
              </SelectItem>
              <SelectItem value="3m" className="rounded-lg">
                Last 3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-gray-500">
              Aucune quantité de produit disponible pour cette période. Vérifiez les commandes livrées.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Mouvement de Stock</CardTitle>
          <CardDescription>Quantité de produits reçus par mois</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a time range"
          >
            <SelectValue placeholder="Last 12 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="12m" className="rounded-lg">
              Last 12 months
            </SelectItem>
            <SelectItem value="6m" className="rounded-lg">
              Last 6 months
            </SelectItem>
            <SelectItem value="3m" className="rounded-lg">
              Last 3 months
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="overflow-x-auto w-full" style={{ scrollbarWidth: "thin" }}>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px]"
            style={{ minWidth: `${chartData.length * 80}px` }}
          >
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              {(Object.keys(chartConfig) as string[])
                .filter((key) => key !== "stock")
                .map((product) => (
                  <Bar
                    key={product}
                    dataKey={product}
                    fill={chartConfig[product].color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}