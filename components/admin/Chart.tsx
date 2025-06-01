import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

// Define the data
const data = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 500 }
];

// Correct chartConfig definition
const chartConfig = {
  value: {
    label: "Value", // This labels the data key "value"
    color: "#8884d8"
  }
} satisfies Record<string, { label: string; color: string }>; // Type assertion for TypeScript

export function MyChart() {
  return (
    <ChartContainer config={chartConfig}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <Bar dataKey="value" fill={chartConfig.value.color} />
          <Tooltip content={<ChartTooltipContent />} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}