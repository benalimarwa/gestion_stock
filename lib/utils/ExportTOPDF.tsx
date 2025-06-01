"use client";

import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  DashboardData,
  CommandesParMois,
  CommandesDemandesParMois,
  CommandesParFournisseur,
  CommandesDemandesParProduit,
} from "@/app/types"; // Importez les interfaces

interface ExportDashboardPDFProps {
  data: DashboardData;
  commandesParMois: CommandesParMois[];
  commandesDemandesParMois: CommandesDemandesParMois[];
  commandesParFournisseur: CommandesParFournisseur[];
  commandesDemandesParProduit: CommandesDemandesParProduit[];
}

export function ExportDashboardPDF({
  data,
  commandesParMois,
  commandesDemandesParMois,
  commandesParFournisseur,
  commandesDemandesParProduit,
}: ExportDashboardPDFProps) {
  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    const addText = (text: string, size: number, x: number, yPos: number, options = {}) => {
      doc.setFontSize(size);
      doc.text(text, x, yPos, options);
      return yPos + size * 0.4;
    };

    const checkPageHeight = (currentY: number, additionalHeight: number) => {
      if (currentY + additionalHeight > pageHeight - margin) {
        doc.addPage();
        return margin;
      }
      return currentY;
    };

    doc.setTextColor(0, 102, 204);
    y = addText("Dashboard - Rapport", 20, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.setTextColor(0, 0, 0);
    y = addText("Statistiques Générales", 16, margin, y);
    y = addText(`Nombre de commandes: ${data.stats.ordersCount ?? "Non disponible"}`, 12, margin, y);
    y = addText(`Nombre d'utilisateurs: ${data.stats.usersCount ?? "Non disponible"}`, 12, margin, y);
    y = addText(`Nombre de fournisseurs: ${data.stats.suppliersCount ?? "Non disponible"}`, 12, margin, y);
    y += 5;

    y = checkPageHeight(y, 20 + data.stock.length * 6);
    y = addText("Stock par Catégorie", 16, margin, y);
    data.stock.forEach((item) => {
      y = addText(`${item.category}: ${item.stock ?? "Non disponible"}`, 12, margin, y);
    });
    y += 5;

    y = checkPageHeight(y, 20 + data.usage.length * 6);
    y = addText("Utilisation par Catégorie", 16, margin, y);
    data.usage.forEach((item) => {
      const value = item.value !== undefined && item.value !== null ? item.value : "Non disponible";
      y = addText(`${item.category}: ${value}`, 12, margin, y);
    });
    y += 5;

    y = checkPageHeight(y, 20 + commandesDemandesParMois.length * 6);
    y = addText("Commandes et Demandes par Mois", 16, margin, y);
    commandesDemandesParMois.forEach((item) => {
      const commandes = item.commandes ?? "Non disponible";
      const demandes = item.demandes ?? "Non disponible";
      y = addText(`${item.month}: Commandes=${commandes}, Demandes=${demandes}`, 12, margin, y);
    });
    y += 5;

    y = checkPageHeight(y, 20 + commandesParFournisseur.length * 6);
    y = addText("Commandes par Fournisseur", 16, margin, y);
    commandesParFournisseur.forEach((item) => {
      y = addText(`${item.fournisseur}: ${item.commandes ?? "Non disponible"}`, 12, margin, y);
    });
    y += 5;

    y = checkPageHeight(y, 20 + commandesDemandesParProduit.length * 6);
    y = addText("Commandes Livrées et Demandes Acceptées par Produit", 16, margin, y);
    commandesDemandesParProduit.forEach((item) => {
      const livrees = item.commandesLivrees ?? "Non disponible";
      const acceptees = item.demandesAcceptees ?? "Non disponible";
      y = addText(`${item.produit}: Livrées=${livrees}, Acceptées=${acceptees}`, 12, margin, y);
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin, { align: "right" });
    }

    doc.save("dashboard_rapport_complet.pdf");
  };

  return (
    <Button onClick={exportToPDF} className="bg-blue-600 hover:bg-blue-700 text-white">
      Exporter en PDF
    </Button>
  );
}