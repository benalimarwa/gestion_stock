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

interface ChartData {
  month: string;
  [demandeur: string]: number | string; // Allow string for month, number for demand counts
}

interface CustomChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

export function DemandesParDemandeur() {
  const [timeRange, setTimeRange] = React.useState("12m");
  const [chartData, setChartData] = React.useState<ChartData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [chartConfig, setChartConfig] = React.useState<CustomChartConfig>({
    demands: { label: "Demandes" },
  });

  const demandeurColors = [
    "hsl(310, 55.70%, 38.00%)",
    "hsl(229, 87.40%, 49.60%)",
    "hsl(301, 45.20%, 75.70%)",
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
          `/api/admin/dashboard/demandes-par-demandeur?timeRange=${timeRange}`
        );
        console.log("Response status:", response.status);
        const text = await response.text();
        console.log("Raw response:", text);

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${text}`);
        }

        let data: ChartData[];
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          throw new Error("Réponse non-JSON reçue: " + text.slice(0, 100));
        }

        if (!Array.isArray(data)) {
          throw new Error("Données invalides: la réponse n'est pas un tableau");
        }

        const demandeurs = [
          ...new Set(
            data.flatMap((item: ChartData) =>
              Object.keys(item).filter((key) => key !== "month")
            )
          ),
        ] as string[];

        const updatedConfig: CustomChartConfig = {
          demands: { label: "Demandes" },
        };
        demandeurs.forEach((demandeur: string, index: number) => {
          updatedConfig[demandeur] = {
            label: demandeur,
            color: demandeurColors[index % demandeurColors.length],
          };
        });

        setChartConfig(updatedConfig);
        setChartData(data);
      } catch (error) {
        console.error("Erreur:", error);
        setError(error instanceof Error ? error.message : "Une erreur inconnue est survenue");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeRange]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Chargement...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500 text-center">Erreur : {error}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Demandes par Demandeur - Suivi des Demandes</CardTitle>
          <CardDescription>Nombre de demandes par demandeur chaque mois</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Sélectionner une période"
          >
            <SelectValue placeholder="Derniers 12 mois" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="12m" className="rounded-lg">
              Derniers 12 mois
            </SelectItem>
            <SelectItem value="6m" className="rounded-lg">
              Derniers 6 mois
            </SelectItem>
            <SelectItem value="3m" className="rounded-lg">
              Derniers 3 mois
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
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              {(Object.keys(chartConfig) as string[])
                .filter((key) => key !== "demands")
                .map((demandeur) => (
                  <Bar
                    key={demandeur}
                    dataKey={demandeur}
                    fill={chartConfig[demandeur].color}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
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