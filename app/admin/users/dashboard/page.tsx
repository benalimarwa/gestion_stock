"use client";

import { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";
import { toast } from "sonner";
import { Cercle } from "@/components/admin/Cercle";
import { Histogramme } from "@/components/admin/Histogramme";
import UserCard from "@/components/admin/UserCard";
import Wrapper from "@/components/admin/Wrapper";
import { CommandesParFournisseurChart } from "@/components/admin/CommandesParFournisseurChart";
import { CommandesDemandesChart } from "@/components/admin/CommandesDemandesChart";
import { CommandesLivreesMensuel } from "@/components/admin/CommandesLivreesMensuel";
import { CommandesDemandeProd } from "@/components/admin/CommandeDemandeProd";
import { CategoryProductChart } from "@/components/admin/CategoryProductChart";
import { QuantitéEntreSort } from "@/components/admin/quantite-entre-sortie";
import { MouvementStock } from "@/components/admin/MouvementStock";
import { X, Maximize2, ChevronUp, ChevronDown,ChevronLeft,ChevronRight } from "lucide-react";
import {
  DashboardData,
  CommandesParMois,
  CommandesDemandesParMois,
  CommandesParFournisseur,
  CommandesDemandesParProduit,
} from "@/app/types";
import { DemandesParDemandeur } from "@/components/admin/DemandesParDemandeur";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import QuantitéEntreSortTroisAns from "@/components/admin/Quantit├®EntreSortTroisAns";

// Interfaces
interface UsageByCategory {
  category: string;
  enAttente: number;
  livree: number;
  enRetour: number;
  annulee: number;
}

interface Product {
  id: string;
  nom: string;
  category?: string;
}

interface StockItem {
  category: string;
  stock: number;
}

interface CommandeParFournisseur {
  fournisseur: string;
  commandes: number;
}

interface OrderStatsData {
  month: string;
  approved: number;
  delivered: number;
  quantitySortie: number;
  quantityEntree: number;
}

interface StockMovementData {
  month: string;
  approved: number;
  delivered: number;
}

interface StockMovement {
  month: string;
  [product: string]: number | string;
}

interface DemandeurData {
  month?: string;
  Demandeur?: string;
  Nombre?: number;
  [key: string]: number | string | undefined;
}

interface UpdatedDashboardData extends DashboardData {
  stock: any;
  usage: any;
}

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

// ExpandableChart component
const ExpandableChart = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const scrollUp = () => {
    if (contentRef.current) {
      contentRef.current.scrollBy({ top: -100, behavior: "smooth" });
      setScrollPosition({ ...scrollPosition, top: contentRef.current.scrollTop });
    }
  };

  const scrollDown = () => {
    if (contentRef.current) {
      contentRef.current.scrollBy({ top: 100, behavior: "smooth" });
      setScrollPosition({ ...scrollPosition, top: contentRef.current.scrollTop });
    }
  };

  const scrollLeft = () => {
    if (contentRef.current) {
      contentRef.current.scrollBy({ left: -100, behavior: "smooth" });
      setScrollPosition({ ...scrollPosition, left: contentRef.current.scrollLeft });
    }
  };

  const scrollRight = () => {
    if (contentRef.current) {
      contentRef.current.scrollBy({ left: 100, behavior: "smooth" });
      setScrollPosition({ ...scrollPosition, left: contentRef.current.scrollLeft });
    }
  };

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={toggleExpand}
      >
        <div
          className="bg-blue-900/60 backdrop-blur-md rounded-xl shadow-2xl max-w-[90%] max-h-[90%] w-full p-6 relative border border-blue-800/60 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-200 font-[Inter,sans-serif]">{title}</h2>
            <button
              onClick={toggleExpand}
              className="text-blue-300 hover:text-blue-100"
            >
              <X size={24} />
            </button>
          </div>
          <div className="relative flex-1 flex flex-col">
            <div
              ref={contentRef}
              className="w-full h-full overflow-x-auto overflow-y-auto scrollbar-thin rounded-md scrollbar-thumb-blue-700 scrollbar-track-blue-900/50"
            >
              <div className="min-w-[1200px] min-h-full">{children}</div>
            </div>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
              <button
                onClick={scrollUp}
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
                aria-label="Scroll up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={scrollDown}
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
                aria-label="Scroll down"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button
                onClick={scrollLeft}
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={scrollRight}
                className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-900/60 backdrop-blur-md rounded-xl shadow-md p-4 relative border border-blue-800/60 transition-all duration-300 hover:shadow-xl hover:scale-101">
      <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-xl"></div>
      <div className="relative flex flex-col">
        <h2 className="text-lg font-semibold text-blue-200 mb-2 font-[Inter,sans-serif]">{title}</h2>
        <div
          ref={contentRef}
          className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-900/50"
        >
          <div className="min-w-[1200px]">{children}</div>
        </div>
        <div className="flex justify-center mt-2 space-x-2">
          <button
            onClick={scrollLeft}
            className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={scrollRight}
            className="bg-blue-500 text-white p-1 rounded-full hover:bg-blue-400 transition duration-200"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <button
        onClick={toggleExpand}
        className="absolute top-2 right-2 text-blue-300 hover:text-blue-100"
      >
        <Maximize2 size={20} />
      </button>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useUser();
  const userId = user?.id;

  const [data, setData] = useState<UpdatedDashboardData | null>(null);
  const [commandesParMois, setCommandesParMois] = useState<CommandesParMois[]>([]);
  const [commandesDemandesParMois, setCommandesDemandesParMois] = useState<CommandesDemandesParMois[]>([]);
  const [commandesParFournisseur, setCommandesParFournisseur] = useState<CommandesParFournisseur[]>([]);
  const [commandesDemandesParProduit, setCommandesDemandesParProduit] = useState<CommandesDemandesParProduit[]>([]);
  const [usageByCategory, setUsageByCategory] = useState<UsageByCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [orderStats, setOrderStats] = useState<{ [productId: string]: OrderStatsData[] }>({});
  const [stockMovements, setStockMovements] = useState<{ [productId: string]: StockMovementData[] }>({});
  const [stockMouvement, setStockMouvement] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const createReportingEntry = async (reportType: string) => {
    if (!userId) {
      console.warn("No user ID available for reporting entry");
      toast.warning("Utilisateur non authentifié. Le rapport sera généré, mais l'action ne sera pas enregistrée.");
      return;
    }

    console.log("Sending userId to /api/reporting:", userId);

    try {
      const response = await fetch("/api/reporting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: reportType,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create reporting entry:", errorData);
        toast.warning(`Erreur lors de l'enregistrement de l'action: ${errorData.error || "Erreur inconnue"}. Le rapport sera généré.`);
        return;
      }

      console.log(`Reporting entry created for ${reportType}`);
    } catch (error) {
      console.error("Error creating reporting entry:", error);
      toast.warning(`Erreur lors de l'enregistrement de l'action: ${error instanceof Error ? error.message : "Erreur inconnue"}. Le rapport sera généré.`);
    }
  };

  const fetchDashboardData = async (timeRange?: string) => {
    try {
      const query = timeRange ? `?timeRange=${timeRange}` : "";
      const [
        statsResponse,
        stockResponse,
        usageResponse,
        commandesParMoisResponse,
        demandesParMoisResponse,
        commandesParFournisseurResponse,
        commandesDemandesParProduitResponse,
        productsResponse,
        demandesParDemandeurResponse,
      ] = await Promise.all([
        fetch(`/api/dashboard/stats${query}`),
        fetch(`/api/dashboard/stock${query}`),
        fetch(`/api/dashboard/usage${query}`),
        fetch(`/api/dashboard/commandespar-mois${query}`),
        fetch(`/api/dashboard/demandes-par-mois${query}`),
        fetch(`/api/dashboard/commandes-par-fournisseur${query}`),
        fetch(`/api/dashboard/commandes-par-produit${query}`),
        fetch(`/api/dashboard/liste-product${query}`),
        fetch(`/api/dashboard/demandes-par-demandeur${query}`),
      ]);

      if (!statsResponse.ok) throw new Error(`Erreur API stats: ${statsResponse.statusText}`);
      if (!stockResponse.ok) throw new Error(`Erreur API stock: ${statsResponse.statusText}`);
      if (!usageResponse.ok) throw new Error(`Erreur API usage: ${statsResponse.statusText}`);
      if (!commandesParMoisResponse.ok) throw new Error(`Erreur API commandespar-mois: ${commandesParMoisResponse.statusText}`);
      if (!demandesParMoisResponse.ok) throw new Error(`Erreur API demandes-par-mois: ${demandesParMoisResponse.statusText}`);
      if (!commandesParFournisseurResponse.ok) throw new Error(`Erreur API commandes-par-fournisseur: ${commandesParFournisseurResponse.statusText}`);
      if (!commandesDemandesParProduitResponse.ok) throw new Error(`Erreur API commandes-par-produit: ${commandesDemandesParProduitResponse.statusText}`);
      if (!productsResponse.ok) throw new Error(`Erreur API produits: ${productsResponse.statusText}`);
      if (!demandesParDemandeurResponse.ok) throw new Error(`Erreur API demandes-par-demandeur: ${demandesParDemandeurResponse.statusText}`);

      const stats = await statsResponse.json();
      const stock = await stockResponse.json();
      const usage = await usageResponse.json();
      const commandesParMoisData = await commandesParMoisResponse.json();
      const demandesParMoisData = await demandesParMoisResponse.json();
      const commandesParFournisseurData = await commandesParFournisseurResponse.json();
      const commandesDemandesParProduitData = await commandesDemandesParProduitResponse.json();
      const productsData = await productsResponse.json();
      const demandesParDemandeurData = await demandesParDemandeurResponse.json();

      console.log("API Responses for timeRange=", timeRange, ":", {
        stats,
        stock,
        usage,
        commandesParMoisData,
        demandesParMoisData,
        commandesParFournisseurData,
        commandesDemandesParProduitData,
        productsData,
        demandesParDemandeurData,
      });

      const normalizeMonthName = (month: string) => {
        const monthMap: { [key: string]: string } = {
          january: "January",
          february: "February",
          march: "March",
          april: "April",
          may: "May",
          june: "June",
          july: "July",
          august: "August",
          september: "September",
          october: "October",
          november: "November",
          december: "December",
          jan: "January",
          feb: "February",
          mar: "March",
          apr: "April",
          jun: "June",
          jul: "July",
          aug: "August",
          sep: "September",
          sept: "September",
          oct: "October",
          nov: "November",
          dec: "December",
        };
        return monthMap[month.toLowerCase()] || month;
      };

      const normalizedCommandesParMois = commandesParMoisData.map((item: any) => ({
        ...item,
        month: normalizeMonthName(item.month),
      }));
      const normalizedDemandesParMois = demandesParMoisData.map((item: any) => ({
        ...item,
        month: normalizeMonthName(item.month),
      }));

      const allMonths = new Set([
        ...normalizedCommandesParMois.map((c: any) => c.month),
        ...normalizedDemandesParMois.map((d: any) => d.month),
      ]);
      const mergedCommandesDemandes = Array.from(allMonths).map((month) => ({
        month,
        commandes: normalizedCommandesParMois.find((c: any) => c.month === month)?.commandes || 0,
        demandes: normalizedDemandesParMois.find((d: any) => d.month === month)?.demandes || 0,
      }));

      const allOrderStats: { [productId: string]: OrderStatsData[] } = {};
      await Promise.all(
        productsData.map(async (product: Product) => {
          const orderStatsResponse = await fetch(`/api/admin/dashboard/commandes-par-produit-mois?productId=${product.id}${query}`);
          if (orderStatsResponse.ok) {
            allOrderStats[product.id] = await orderStatsResponse.json();
            console.log(`Order stats for ${product.nom} (${product.id}) (timeRange=${timeRange}):`, allOrderStats[product.id]);
          } else {
            console.warn(`Failed to fetch order stats for product ${product.nom} (${product.id}): ${orderStatsResponse.statusText}`);
            allOrderStats[product.id] = [];
          }
        })
      );

      const categoryStats: { [category: string]: UsageByCategory } = {};
      const categories = productsData.every((p: Product) => !p.category)
        ? stock.map((item: any) => item.category)
        : [...new Set(productsData.map((p: Product) => p?.category))];

      categories.forEach((category: any) => {
        if (category && !categoryStats[category]) {
          categoryStats[category] = {
            category,
            enAttente: 0,
            livree: 0,
            enRetour: 0,
            annulee: 0,
          };
        }
      });

      commandesDemandesParProduitData.forEach((order: any) => {
        const product = productsData.find((p: Product) => p.id === order.productId);
        let category: string | undefined;

        if (product) {
          if (product.category) {
            category = product.category;
          } else {
            console.warn(`Product ${product.nom} (ID: ${product.id}) has no category. Skipping.`);
            return;
          }
        } else {
          console.warn(`No product found for order with productId: ${order.productId}`);
          return;
        }

        if (category && categoryStats[category]) {
          const status = order.status ? order.status.toLowerCase() : "";
          if (status.includes("attente") || status.includes("pending")) {
            categoryStats[category].enAttente += 1;
          } else if (status.includes("livrée") || status.includes("delivered")) {
            categoryStats[category].livree += 1;
          } else if (status.includes("retour") || status.includes("returned")) {
            categoryStats[category].enRetour += 1;
          } else if (status.includes("annulée") || status.includes("canceled")) {
            categoryStats[category].annulee += 1;
          } else {
            console.warn(`Unknown status "${status}" for order with productId: ${order.productId}`);
          }
        }
      });

      const computedUsageByCategory = Object.values(categoryStats).filter(
        (item) => item.enAttente > 0 || item.livree > 0 || item.enRetour > 0 || item.annulee > 0
      );

      const updatedData = {
        stats: {
          ordersCount: stats?.ordersCount || 0,
          usersCount: stats?.usersCount || 0,
          suppliersCount: stats?.suppliersCount || 0,
          acceptedDemandsCount: stats?.acceptedDemandsCount || 0,
        },
        stock: stock || [],
        usage: usage || [],
      };

      return {
        data: updatedData,
        commandesParMois: normalizedCommandesParMois,
        commandesDemandesParMois: mergedCommandesDemandes,
        commandesParFournisseur: commandesParFournisseurData,
        commandesDemandesParProduit: commandesDemandesParProduitData,
        products: productsData,
        orderStats: allOrderStats,
        usageByCategory: computedUsageByCategory,
        demandesParDemandeur: demandesParDemandeurData,
      };
    } catch (err) {
      console.error("Error in fetchDashboardData:", err);
      throw err instanceof Error ? err : new Error("Erreur inconnue lors de la récupération des données");
    }
  };

  const fetchProductStats = async (productId: string, timeRange?: string) => {
    try {
      const query = timeRange ? `?productId=${productId}&timeRange=${timeRange}` : `?productId=${productId}`;
      const orderStatsResponse = await fetch(`/api/admin/dashboard/commandes-par-produit-mois${query}`);
      const stockMovementsResponse = await fetch(`/api/admin/dashboard/qte-prod-entre-sort${query}`);
      if (!orderStatsResponse.ok) throw new Error("Erreur lors de la récupération des statistiques des commandes");
      if (!stockMovementsResponse.ok) throw new Error("Erreur lors de la récupération des mouvements de stock");
      const orderStatsData = await orderStatsResponse.json();
      const stockMovementsData = await stockMovementsResponse.json();
      console.log(`Product stats for ${productId} (timeRange=${timeRange}):`, { orderStatsData, stockMovementsData });
      setOrderStats((prev) => ({ ...prev, [productId]: orderStatsData }));
      setStockMovements((prev) => ({ ...prev, [productId]: stockMovementsData }));
    } catch (err) {
      console.error("Erreur lors de la récupération des stats produit :", err);
    }
  };

  const exportReportToPDF = async () => {
    toast.info("Génération du rapport annuel...");
    try {
      await createReportingEntry("ANNUAL_REPORT");

      const {
        data,
        commandesParMois,
        commandesDemandesParMois,
        commandesParFournisseur,
        commandesDemandesParProduit,
        products,
        orderStats,
        demandesParDemandeur,
      } = await fetchDashboardData();

      // Fetch MouvementStock data
      const stockMouvementResponse = await fetch(`/api/admin/dashboard/stock-mouvement`);
      if (!stockMouvementResponse.ok) throw new Error(`Erreur API stock-mouvement: ${stockMouvementResponse.statusText}`);
      const stockMouvement: StockMovement[] = await stockMouvementResponse.json();

      console.log("Full Report Data:", {
        data,
        commandesParMois,
        commandesDemandesParMois,
        commandesParFournisseur,
        commandesDemandesParProduit,
        products,
        orderStats,
        demandesParDemandeur,
        stockMouvement,
      });

      if (!data || !products.length) {
        console.error("No data or products available for PDF export");
        toast.error("Aucune donnée disponible pour l'exportation.");
        return;
      }

      const updatedOrderStats: { [productId: string]: OrderStatsData[] } = { ...orderStats };
      await Promise.all(
        products.map(async (product: Product) => {
          if (!updatedOrderStats[product.id] || updatedOrderStats[product.id].length === 0) {
            try {
              const response = await fetch(`/api/admin/dashboard/commandes-par-produit-mois?productId=${product.id}`);
              if (response.ok) {
                updatedOrderStats[product.id] = await response.json();
                console.log(`Fetched order stats for ${product.nom} (${product.id}):`, updatedOrderStats[product.id]);
              } else {
                console.warn(`Failed to fetch order stats for ${product.nom} (${product.id}): ${response.statusText}`);
                updatedOrderStats[product.id] = [];
              }
            } catch (error) {
              console.error(`Error fetching order stats for ${product.nom} (${product.id}):`, error);
              updatedOrderStats[product.id] = [];
            }
          }
        })
      );

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 10;

      let logoBase64: string | null = null;
      try {
        const response = await fetch("/essths.png");
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error fetching logo:", error);
      }

      if (logoBase64) {
        const logoWidth = 40;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, y, logoWidth, logoHeight);
        y += logoHeight + 10;
      }

      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      const period = `${startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} - ${endDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;

      doc.setFontSize(18);
      doc.setTextColor(30, 144, 255);
      doc.text("Rapport Annuel - Gestion des Stocks et Commandes", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Date du Rapport : ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth / 2, y, { align: "center" });
      doc.text(`Période Analysée : ${period}`, pageWidth / 2, y + 5, { align: "center" });
      y += 15;

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("1. Résumé Général", 10, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Description", "Valeur"]],
        body: [
          ["Nombre Total de Commandes", data.stats.ordersCount || 0],
          ["Nombre d'Utilisateurs", data.stats.usersCount || 0],
          ["Nombre de Fournisseurs", data.stats.suppliersCount || 0],
          ["Demandes Acceptées", data.stats.acceptedDemandsCount || 0],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("2. Analyse des Stocks", 10, y);
      y += 10;
      const totalStock = data.stock.reduce((acc: number, curr: StockItem) => acc + (curr.stock || 0), 0) || 1;

      autoTable(doc, {
        startY: y,
        head: [["Catégorie", "Stock", "Pourcentage"]],
        body: data.stock.length > 0
          ? data.stock.map((item: StockItem) => [
              item.category || "Inconnue",
              item.stock || 0,
              `${((item.stock / totalStock) * 100).toFixed(1)}%`,
            ])
          : [["Aucune catégorie", "0", "0%"]],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("3. Commandes par Fournisseur", 10, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Fournisseur", "Commandes"]],
        body: commandesParFournisseur.length > 0
          ? commandesParFournisseur.map((item: CommandeParFournisseur) => [item.fournisseur || "Inconnu", item.commandes || 0])
          : [["Aucun fournisseur", "0"]],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("4. Quantité Entrée et Sortie par Produit", 10, y);
      y += 10;

      for (const product of products) {
        let productOrderStats = updatedOrderStats[product.id] || [];
        console.log(`Order stats for ${product.nom} (${product.id}) in full report:`, productOrderStats);

        doc.setFontSize(12);
        doc.text(`Produit : ${product.nom}`, 10, y);
        y += 7;

        if (!productOrderStats.length) {
          console.warn(`No order stats for product: ${product.nom} (${product.id})`);
          autoTable(doc, {
            startY: y,
            head: [["Mois", "Quantité Sortie", "Quantité Entrée"]],
            body: [["N/A", "0", "0"]],
            theme: "grid",
            headStyles: { fillColor: [30, 144, 255], textColor: 255 },
            styles: { fontSize: 10 },
          });
        } else {
          autoTable(doc, {
            startY: y,
            head: [["Mois", "Quantité Sortie", "Quantité Entrée"]],
            body: productOrderStats.map((stat: OrderStatsData) => [
              stat.month || "N/A",
              stat.quantitySortie || 0,
              stat.quantityEntree || 0,
            ]),
            theme: "grid",
            headStyles: { fillColor: [30, 144, 255], textColor: 255 },
            styles: { fontSize: 10 },
          });
        }

        y = (doc as any).lastAutoTable.finalY + 10;

        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      }

      doc.setFontSize(14);
      doc.text("5. Mouvement de Stock", 10, y);
      y += 10;

      if (stockMouvement.length > 0) {
        const productNames = [...new Set(stockMouvement.flatMap((item) => Object.keys(item).filter((key) => key !== "month")))];
        autoTable(doc, {
          startY: y,
          head: [["Mois", ...productNames]],
          body: stockMouvement.map((item) => [
            item.month,
            ...productNames.map((product) => item[product] || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      } else {
        autoTable(doc, {
          startY: y,
          head: [["Mois", "Statut"]],
          body: [["N/A", "Aucune donnée de stock"]],
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      }

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.save(`rapport-annuel-${new Date().getFullYear()}.pdf`);
      toast.success("Rapport généré avec succès!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du rapport.");
    }
  };

  const exportWeeklyReportToPDF = async () => {
    toast.info("Génération du rapport hebdomadaire...");
    try {
      await createReportingEntry("WEEKLY_REPORT");

      const {
        data,
        commandesParMois,
        commandesDemandesParMois,
        commandesParFournisseur,
        commandesDemandesParProduit,
        products,
        orderStats,
        demandesParDemandeur,
      } = await fetchDashboardData("7d");

      // Fetch MouvementStock data
      const stockMouvementResponse = await fetch(`/api/admin/dashboard/stock-mouvement?timeRange=7d`);
      if (!stockMouvementResponse.ok) throw new Error(`Erreur API stock-mouvement: ${stockMouvementResponse.statusText}`);
      const stockMouvement: StockMovement[] = await stockMouvementResponse.json();

      console.log("Weekly Report Data:", {
        data,
        commandesParMois,
        commandesDemandesParMois,
        commandesParFournisseur,
        commandesDemandesParProduit,
        products,
        orderStats,
        demandesParDemandeur,
        stockMouvement,
      });

      if (!data || !products.length) {
        console.error("No data or products available for weekly PDF export");
        toast.error("Aucune donnée disponible pour l'exportation hebdomadaire.");
        return;
      }

      const updatedOrderStats: { [productId: string]: OrderStatsData[] } = { ...orderStats };
      await Promise.all(
        products.map(async (product: Product) => {
          if (!updatedOrderStats[product.id] || updatedOrderStats[product.id].length === 0) {
            try {
              const response = await fetch(`/api/admin/dashboard/commandes-par-produit-mois?productId=${product.id}&timeRange=7d`);
              if (response.ok) {
                updatedOrderStats[product.id] = await response.json();
                console.log(`Fetched order stats for ${product.nom} (${product.id}) (weekly):`, updatedOrderStats[product.id]);
              } else {
                console.warn(`Failed to fetch order stats for ${product.nom} (${product.id}): ${response.statusText}`);
                updatedOrderStats[product.id] = [];
              }
            } catch (error) {
              console.error(`Error fetching order stats for ${product.nom} (${product.id}):`, error);
              updatedOrderStats[product.id] = [];
            }
          }
        })
      );

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 10;

      let logoBase64: string | null = null;
      try {
        const response = await fetch("/essths.png");
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error fetching logo:", error);
      }

      if (logoBase64) {
        const logoWidth = 40;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, y, logoWidth, logoHeight);
        y += logoHeight + 10;
      }

      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      const period = `${startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} - ${endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

      doc.setFontSize(18);
      doc.setTextColor(30, 144, 255);
      doc.text("Rapport Hebdomadaire - Gestion des Stocks et Commandes", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Date du Rapport : ${endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth / 2, y, { align: "center" });
      doc.text(`Période Analysée : ${period}`, pageWidth / 2, y + 5, { align: "center" });
      y += 15;

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("1. Résumé Général", 10, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Description", "Valeur"]],
        body: [
          ["Nombre Total de Commandes", data.stats.ordersCount || 0],
          ["Nombre d'Utilisateurs", data.stats.usersCount || 0],
          ["Nombre de Fournisseurs", data.stats.suppliersCount || 0],
          ["Demandes Acceptées", data.stats.acceptedDemandsCount || 0],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("2. Analyse des Stocks", 10, y);
      y += 10;
      const totalStock = data.stock.reduce((acc: number, curr: { stock: number }) => acc + (curr.stock || 0), 0) || 1;

      autoTable(doc, {
        startY: y,
        head: [["Catégorie", "Stock", "Pourcentage"]],
        body: data.stock.length > 0
          ? data.stock.map((item: { category: string; stock: number }) => [
              item.category || "Inconnue",
              item.stock || 0,
              `${((item.stock / totalStock) * 100).toFixed(1)}%`,
            ])
          : [["Aucune catégorie", "0", "0%"]],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("3. Commandes par Fournisseur", 10, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [["Fournisseur", "Commandes"]],
        body: commandesParFournisseur.length > 0
          ? commandesParFournisseur.map((item: any) => [item.fournisseur || "Inconnu", item.commandes || 0])
          : [["Aucun fournisseur", "0"]],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("4. Quantité Entrée et Sortie par Produit", 10, y);
      y += 10;

      for (const product of products) {
        let productOrderStats = updatedOrderStats[product.id] || [];
        console.log(`Order stats for ${product.nom} (${product.id}) in weekly report:`, productOrderStats);

        doc.setFontSize(12);
        doc.text(`Produit : ${product.nom}`, 10, y);
        y += 7;

        if (!productOrderStats.length) {
          console.warn(`No order stats for product: ${product.nom} (${product.id})`);
          autoTable(doc, {
            startY: y,
            head: [["Période", "Quantité Sortie", "Quantité Entrée"]],
            body: [[period, "0", "0"]],
            theme: "grid",
            headStyles: { fillColor: [30, 144, 255], textColor: 255 },
            styles: { fontSize: 10 },
          });
        } else {
          const totalApproved = productOrderStats.reduce((sum: number, item: any) => sum + (item.approved || 0), 0);
          const totalDelivered = productOrderStats.reduce((sum: number, item: any) => sum + (item.delivered || 0), 0);

          autoTable(doc, {
            startY: y,
            head: [["Période", "Quantité Sortie", "Quantité Entrée"]],
            body: [[period, totalApproved, totalDelivered]],
            theme: "grid",
            headStyles: { fillColor: [30, 144, 255], textColor: 255 },
            styles: { fontSize: 10 },
          });
        }
        y = (doc as any).lastAutoTable.finalY + 10;

        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      }

      doc.setFontSize(14);
      doc.text("5. Commandes et Demandes", 10, y);
      y += 10;
      const totalCommandes = commandesDemandesParMois.reduce((sum: number, item: any) => sum + (item.commandes || 0), 0) || 0;
      const totalDemandes = commandesDemandesParMois.reduce((sum: number, item: any) => sum + (item.demandes || 0), 0) || 0;

      autoTable(doc, {
        startY: y,
        head: [["Période", "Commandes", "Demandes"]],
        body: [
          ["Total", totalCommandes, totalDemandes],
          [period, totalCommandes, totalDemandes],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 144, 255], textColor: 255 },
        styles: { fontSize: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("6. Demandes par Demandeur", 10, y);
      y += 10;

      let demandesData: DemandeurData[] = demandesParDemandeur || [];
      console.log("Demandes par Demandeur:", JSON.stringify(demandesData, null, 2));

      if (!demandesData?.length || !demandesData.some((item) => Object.keys(item).length > 0)) {
        console.warn("Empty or invalid demandesParDemandeur. Attempting fallback fetch.");
        try {
          const response = await fetch(`/api/dashboard/demandes-par-demandeur?timeRange=7d`);
          if (!response.ok) throw new Error(`Erreur HTTP ${response.status}: ${await response.text()}`);
          demandesData = await response.json();
          console.log("Fallback fetch for demandes-par-demandeur:", JSON.stringify(demandesData, null, 2));
        } catch (error) {
          console.error("Error in fallback fetch:", error);
          demandesData = [];
          toast.warning("Impossible de récupérer les données des demandes par demandeur.");
        }
      }

      const isMonthBasedFormat = demandesData.length > 0 && demandesData.every((item) => "month" in item);

      let demandeurTotals: [string, number][] = [];
      if (isMonthBasedFormat) {
        const demandeurs = [...new Set(demandesData.flatMap((item) => Object.keys(item).filter((key) => key !== "month" && typeof item[key] === "number")))];
        console.log("Demandeurs extracted:", demandeurs);

        if (demandeurs.length > 0) {
          demandeurTotals = demandeurs.map((demandeur: string) => [
            demandeur,
            demandesData.reduce((sum: number, item) => sum + (typeof item[demandeur] === "number" ? item[demandeur] : 0), 0),
          ]);
        }
      } else {
        const demandeursMap: { [key: string]: number } = {};
        demandesData.forEach((item) => {
          const demandeur = item.Demandeur || "Unknown";
          const count = Number(item.Nombre) || 0;
          if (demandeur && demandeur !== "Unknown") {
            demandeursMap[demandeur] = (demandeursMap[demandeur] || 0) + count;
          }
        });
        demandeurTotals = Object.entries(demandeursMap);
      }

      if (demandeurTotals.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Demandeur", "Nombre de Demandes"]],
          body: demandeurTotals,
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      } else {
        console.warn("No valid demandeurs found:", demandesData);
        autoTable(doc, {
          startY: y,
          head: [["Demandeur", "Statut"]],
          body: [["N/A", "Aucun demandeur valide trouvé"]],
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      }

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("7. Mouvement de Stock", 10, y);
      y += 10;

      if (stockMouvement.length > 0) {
        const productNames = [...new Set(stockMouvement.flatMap((item) => Object.keys(item).filter((key) => key !== "month")))];
        autoTable(doc, {
          startY: y,
          head: [["Période", ...productNames]],
          body: stockMouvement.map((item) => [
            item.month,
            ...productNames.map((product) => item[product] || 0),
          ]),
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      } else {
        autoTable(doc, {
          startY: y,
          head: [["Période", "Statut"]],
          body: [[period, "Aucune donnée de stock"]],
          theme: "grid",
          headStyles: { fillColor: [30, 144, 255], textColor: 255 },
          styles: { fontSize: 10 },
        });
      }

      y = (doc as any).lastAutoTable.finalY + 10;

      const filename = `Rapport_Hebdomadaire_${endDate
        .toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
        .replace(/ /g, "_")}.pdf`;
      doc.save(filename);
      toast.success("Rapport hebdomadaire généré avec succès!");
    } catch (error) {
      console.error("Error generating weekly PDF:", error);
      toast.error(`Erreur lors de la génération du rapport hebdomadaire: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }
  };

  useEffect(() => {
    fetchDashboardData()
      .then(({ data, commandesParMois, commandesDemandesParMois, commandesParFournisseur, commandesDemandesParProduit, products, orderStats, usageByCategory }) => {
        setData(data);
        setCommandesParMois(commandesParMois);
        setCommandesDemandesParMois(commandesDemandesParMois);
        setCommandesParFournisseur(commandesParFournisseur);
        setCommandesDemandesParProduit(commandesDemandesParProduit);
        setProducts(products);
        setOrderStats(orderStats);
        setUsageByCategory(usageByCategory);
        if (products.length > 0) setSelectedProduct(products[0].id);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur inconnue lors de la récupération des données");
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedProduct) fetchProductStats(selectedProduct);
  }, [selectedProduct]);

  if (loading) {
    return (
      <Wrapper>
        <div className="p-8 bg-gradient-to-br from-blue-950 to-purple-950 min-h-screen flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif] mb-6 text-center"
          >
            Dashboard
          </motion.h1>
          <div className="text-center text-blue-200">Chargement...</div>
        </div>
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper>
        <div className="p-8 bg-gradient-to-br from-blue-950 to-purple-950 min-h-screen flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif] mb-6 text-center"
          >
            Dashboard
          </motion.h1>
          <div className="text-center text-red-400">Erreur : {error}</div>
        </div>
      </Wrapper>
    );
  }

  if (!data) return null;

  return (
    <Wrapper>
      <div
        ref={dashboardRef}
        className="bg-gradient-to-br from-gray-250 to-blue-650 min-h-screen flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center w-full max-w-5xl mb-6"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif]">
            Dashboard
          </h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={exportReportToPDF}
              className="bg-blue-800/80 text-blue-100 px-4 py-2 rounded-lg shadow hover:bg-blue-700/80 transition backdrop-blur-md"
            >
              Exporter le Rapport (PDF)
            </button>
            <button
              onClick={exportWeeklyReportToPDF}
              className="bg-blue-800/80 text-blue-100 px-4 py-2 rounded-lg shadow hover:bg-blue-700/80 transition backdrop-blur-md"
            >
              Exporter le Rapport Par Semaine (PDF)
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-3xl mb-6"
        >
          <UserCard
            ordersCount={data.stats.ordersCount}
            usersCount={data.stats.usersCount}
            suppliersCount={data.stats.suppliersCount}
            acceptedDemandsCount={data.stats.acceptedDemandsCount}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="col-span-1"
          >
            <Cercle chartData={data.stock} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="col-span-1"
          >
            <CategoryProductChart />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Commandes par Category">
              <Histogramme />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Commandes par Fournisseur">
              <CommandesParFournisseurChart />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Commandes et Demandes">
              <CommandesDemandeProd />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Quantité Entrée/Sortie">
              <QuantitéEntreSort />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Quantité Entrée/Sortie (3 Ans)">
              <QuantitéEntreSortTroisAns />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.6 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Demandes par Demandeur">
              <DemandesParDemandeur />
            </ExpandableChart>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.8 }}
            className="lg:col-span-3"
          >
            <ExpandableChart title="Mouvement de Stock">
              <MouvementStock />
            </ExpandableChart>
          </motion.div>
        </div>
      </div>
    </Wrapper>
  );
}