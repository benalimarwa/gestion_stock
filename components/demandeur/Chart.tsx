"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";

// Define our chart data types
type ChartData = {
  month: string;
  [productName: string]: string | number;
};

export function Component() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});

  // Define distinct color palette for products
  const productColors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
    "#6366F1", // Indigo
    "#84CC16", // Lime
    "#A855F7", // Violet
    "#06B6D4", // Cyan
  ];

  // Define all months of the year
  const allMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch("/api/demandeurUser/dashboard/chart");

        if (!response.ok) {
          throw new Error("Failed to fetch chart data");
        }

        const result = await response.json();

        // Make sure we have data for all months
        const completeData = allMonths.map((month) => {
          // Find the month in the result data or create a new entry
          const existingData = result.data.find((item: ChartData) => item.month === month);

          if (existingData) {
            return existingData;
          } else {
            // Create a new entry with zero values for all products
            const newEntry: ChartData = { month }; // Explicitly type as ChartData
            result.productNames.forEach((product: string) => {
              newEntry[product] = 0;
            });
            return newEntry;
          }
        });

        setChartData(completeData);
        setProductNames(result.productNames);

        // Create chart config with distinct colors for each product
        const newConfig: ChartConfig = {};
        result.productNames.forEach((product: string, index: number) => {
          newConfig[product] = {
            label: product,
            color: productColors[index % productColors.length],
          };
        });

        setChartConfig(newConfig);
        setError(null);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError("Failed to load chart data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get current date for the subtitle
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products Received</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products Received</CardTitle>
          <CardDescription>Error</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Products Received</CardTitle>
        <CardDescription>{currentYear}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Legend />
              {productNames.map((product, index) => (
                <Bar
                  key={product}
                  dataKey={product}
                  name={product}
                  fill={productColors[index % productColors.length]}
                  radius={4}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="p-6 pt-0 text-sm text-muted-foreground">
        Showing products received from approved requests by month
      </CardFooter>
    </Card>
  );
}