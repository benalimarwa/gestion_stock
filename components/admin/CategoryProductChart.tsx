"use client"
import { useState, useEffect } from 'react'
import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Define the type for our chart data
interface CategoryProductData {
  category: string
  products: number
  fill: string
}

// Color palette generator
function generateUniqueColors(count: number): string[] {
  const baseColors = [
    '#81657C', // Pink
    '#B384A7', // Blue
    '#DC98BD', // Yellow
    '#FFD5BA', // Teal
    '#7DC2A5', // Purple
    '#9FCDA8', // Orange
    '#E3EBD0', // Salmon
    '#F1F1D3', // Jade Green
    '#FFDFDB', // Indigo
    '#F79F95', // Crimson
    '#F38071', // Coral
    '#F0604D', // Teal
    '#CBB5AC', // Slate Blue
    '#EFE9AE', // Light Sea Green
    '#7E7E7E'  // Light Coral
  ]

  // If we need more colors than in our base palette, we'll generate additional ones
  const colors = baseColors.slice(0, Math.max(count, baseColors.length))
  
  // Shuffle the colors to make distribution more random
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  return colors.slice(0, count)
}

export function CategoryProductChart() {
  const [chartData, setChartData] = useState<CategoryProductData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategoryProducts() {
      try {
        const response = await fetch('/api/admin/dashboard/catparprod')
        if (!response.ok) {
          throw new Error('Failed to fetch category product data')
        }
        const data = await response.json()
        
        // Generate unique colors for each category
        const colors = generateUniqueColors(data.length)
        const coloredData = data.map((item: Omit<CategoryProductData, 'fill'>, index: number) => ({
          ...item,
          fill: colors[index]
        }))

        setChartData(coloredData)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        setIsLoading(false)
      }
    }

    fetchCategoryProducts()
  }, [])

  // Dynamically generate chart config based on fetched data
  const chartConfig: ChartConfig = {
    ...Object.fromEntries(
      chartData.map((item) => [
        item.category,
        {
          label: item.category,
          color: item.fill
        }
      ])
    ),
    products: { label: "Products" }
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col items-center justify-center">
        <CardHeader>
          <CardTitle>Loading Categories</CardTitle>
        </CardHeader>
        <CardContent>Loading product distribution...</CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center">
        <CardHeader>
          <CardTitle>Error Loading Chart</CardTitle>
        </CardHeader>
        <CardContent>Error: {error}</CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Products per Category</CardTitle>
        <CardDescription>Distribution of Products</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="products"
              nameKey="category"
              stroke="0"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Product Distribution <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex flex-wrap gap-3 leading-none text-muted-foreground">
          {chartData.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.fill }}
              />
              <span>{item.category}: {item.products}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Total Categories: {chartData.length}
        </div>
      </CardFooter>
    </Card>
  )
}