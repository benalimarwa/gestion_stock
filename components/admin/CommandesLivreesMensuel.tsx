"use client";

import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter, // Explicitly included
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
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
import { Loader2, Package, ShoppingBag } from "lucide-react";

interface OrderStatsData {
  month: string;
  approved: number;
  delivered: number;
  total: number;
}

interface Product {
  id: string;
  nom: string;
}

const chartConfig = {
  approved: {
    label: "Demandes Approuvées",
    color: "hsl(215, 90%, 60%)",
  },
  delivered: {
    label: "Commandes Livrées",
    color: "hsl(150, 70%, 45%)",
  },
} satisfies ChartConfig;

export function CommandesLivreesMensuel() {
  const [chartData, setChartData] = useState<OrderStatsData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/liste-product');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
        if (data.length > 0) {
          setSelectedProduct(data[0].id);
        }
      } catch (err) {
        setError(`Erreur lors du chargement des produits: `);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;

    const fetchOrderStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/dashboard/commandes-par-produit-mois?productId=${selectedProduct}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${errorData.error || 'Failed to fetch order statistics'}${errorData.details ? `: ${errorData.details}` : ''}`);
        }
        const data = await response.json();
        console.log('Fetched chart data:', data);
        setChartData(data);
      } catch (err) {
        setError(`Erreur lors de la récupération des données: `);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStats();
  }, [selectedProduct]);

  const totalApproved = chartData.reduce((sum, item) => sum + item.approved, 0);
  const totalDelivered = chartData.reduce((sum, item) => sum + item.delivered, 0);

  const selectedProductName = products.find(p => p.id === selectedProduct)?.nom || "";
  const currentYear = new Date().getFullYear(); // 2025

  return (
    <Card className="w-full overflow-hidden border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 pb-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
              Statistiques des Commandes
            </CardTitle>
            <CardDescription className="mt-1 text-slate-600 dark:text-slate-300">
              Suivi des demandes approuvées et commandes livrées de janvier {currentYear} à décembre {currentYear}
            </CardDescription>
          </div>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[220px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <SelectValue placeholder="Sélectionner un produit" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProductName && (
          <div className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-sm font-medium">
            {selectedProductName}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[350px] bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-slate-600 dark:text-slate-300">Chargement des données...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[350px] bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
          </div>
        ) : (
          <div className="h-[350px] bg-white dark:bg-slate-800/20 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                  stroke="#94a3b8"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  stroke="#94a3b8"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(236, 240, 255, 0.3)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Bar 
                  dataKey="approved" 
                  name="Demandes Approuvées" 
                  fill={chartConfig.approved.color} 
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar 
                  dataKey="delivered" 
                  name="Commandes Livrées" 
                  fill={chartConfig.delivered.color} 
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 pt-2 p-6 px-6 bg-slate-50 dark:bg-slate-800/50">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Résumé annuel</h4>
        <div className="grid grid-cols-2 w-full gap-6">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
            <div className="p-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex p-9 flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400">Demandes Approuvées</span>
              <span className="font-semibold text-lg text-slate-800 dark:text-white">{totalApproved}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400">Commandes Livrées</span>
              <span className="font-semibold text-lg text-slate-800 dark:text-white">{totalDelivered}</span>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}