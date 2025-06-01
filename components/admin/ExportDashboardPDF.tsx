"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button"; // Assuming this is now fixed

interface ExportDashboardPDFProps {
  data: any;
  commandesParMois: any[];
  commandesDemandesParMois: any[];
  commandesParFournisseur: any[];
  commandesDemandesParProduit: any[];
  usageByCategory: any[];
  demandesParProduit: any[];
  dashboardRef: React.RefObject<HTMLDivElement>;
}

export function ExportDashboardPDF({
  data,
  commandesParMois,
  commandesDemandesParMois,
  commandesParFournisseur,
  commandesDemandesParProduit,
  usageByCategory,
  demandesParProduit,
  dashboardRef,
}: ExportDashboardPDFProps) {
  const exportPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Helper function to add a new page if needed
      const checkPageHeight = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Title of the Report
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport du Tableau de Bord - Gestion de Stock", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      // Add a subtitle with the date
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Généré le: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      // Section 1: User Statistics
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Statistiques Utilisateur", margin, yPosition);
      yPosition += 6;

      const userStatsData = [
        ["Nombre de Commandes", data?.stats?.ordersCount?.toString() || "0"],
        ["Nombre d'Utilisateurs", data?.stats?.usersCount?.toString() || "0"],
        ["Nombre de Fournisseurs", data?.stats?.suppliersCount?.toString() || "0"],
        ["Demandes Acceptées", data?.stats?.acceptedDemandsCount?.toString() || "0"],
      ];

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Métrique", "Valeur"]],
        body: userStatsData,
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 2: Stock Data
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Données de Stock", margin, yPosition);
      yPosition += 6;

      console.log("Stock Data for PDF:", data?.stock);

      const stockData = Array.isArray(data?.stock) && data.stock.length > 0
        ? data.stock.map((item: any) => {
            console.log("Processing Stock Item:", item);
            const productName = item?.name || item?.productName || item?.product || item?.nom || "Produit inconnu";
            const quantity = item?.quantity ?? item?.value ?? item?.quantite ?? 0;
            return [productName, quantity.toString()];
          })
        : [["Aucune donnée de stock disponible", "0"]];

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Produit", "Quantité"]],
        body: stockData,
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 3: Usage by Category
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Utilisation par Catégorie", margin, yPosition);
      yPosition += 6;

      const usageData = (usageByCategory || []).map((item: any) => [
        item?.category || "Inconnu",
        item?.enAttente != null ? item.enAttente.toString() : "0",
        item?.livree != null ? item.livree.toString() : "0",
        item?.enRetour != null ? item.enRetour.toString() : "0",
        item?.annulee != null ? item.annulee.toString() : "0",
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Catégorie", "En Attente", "Livrée", "En Retour", "Annulée"]],
        body: usageData.length > 0 ? usageData : [["Aucune donnée", "0", "0", "0", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 4: Commandes par Fournisseur
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Commandes par Fournisseur", margin, yPosition);
      yPosition += 6;

      const commandesParFournisseurData = (commandesParFournisseur || []).map((item: any) => [
        item?.fournisseur || "Inconnu",
        item?.commandes != null ? item.commandes.toString() : "0",
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Fournisseur", "Nombre de Commandes"]],
        body: commandesParFournisseurData.length > 0 ? commandesParFournisseurData : [["Aucune donnée", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 5: Commandes et Demandes par Produit
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Commandes et Demandes par Produit", margin, yPosition);
      yPosition += 6;

      const commandesDemandesParProduitData = (commandesDemandesParProduit || []).map((item: any) => [
        item?.produit || "Inconnu",
        item?.demandesAcceptees != null ? item.demandesAcceptees.toString() : "0",
        item?.commandesLivrees != null ? item.commandesLivrees.toString() : "0",
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Produit", "Demandes Acceptées", "Commandes Livrées"]],
        body: commandesDemandesParProduitData.length > 0 ? commandesDemandesParProduitData : [["Aucune donnée", "0", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 6: Commandes Livrées par Produit
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Commandes Livrées par Produit", margin, yPosition);
      yPosition += 6;

      console.log("Commandes Demandes Par Produit for PDF:", commandesDemandesParProduit);

      const commandesLivreesParProduitData = (commandesDemandesParProduit || []).map((item: any) => [
        item?.produit || "Inconnu",
        item?.commandesLivrees != null ? item.commandesLivrees.toString() : "0",
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Produit", "Nombre de Commandes Livrées"]],
        body: commandesLivreesParProduitData.length > 0 ? commandesLivreesParProduitData : [["Aucune donnée", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 7: Demandes Acceptées par Produit
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Demandes Acceptées par Produit", margin, yPosition);
      yPosition += 6;

      console.log("Demandes Par Produit for PDF:", demandesParProduit);

      const demandesParProduitData = (demandesParProduit || []).map((item: any) => [
        item?.produit || "Inconnu",
        item?.demandesAcceptees != null ? item.demandesAcceptees.toString() : "0",
      ]);

      (doc as any).autoTable({
        startY: yPosition,
        head: [["Produit", "Nombre de Demandes Acceptées"]],
        body: demandesParProduitData.length > 0 ? demandesParProduitData : [["Aucune donnée", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Section 8: Mouvement de Stock
      checkPageHeight(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Mouvement de Stock", margin, yPosition);
      yPosition += 6;

      console.log("Commandes Par Mois for PDF:", commandesParMois);

      const mouvementStockData: string[][] = [];
      (commandesParMois || []).forEach((monthData: any) => {
        if (!monthData || !monthData.month) return;
        const row: string[] = [monthData.month];
        Object.keys(monthData).forEach((key) => {
          if (key !== "month") {
            const value = monthData[key] != null ? monthData[key].toString() : "0";
            row.push(value);
          }
        });
        mouvementStockData.push(row);
      });

      const mouvementStockHeaders = ["Mois", ...Object.keys(commandesParMois[0] || {}).filter((key) => key !== "month")];

      (doc as any).autoTable({
        startY: yPosition,
        head: [mouvementStockHeaders],
        body: mouvementStockData.length > 0 ? mouvementStockData : [["Aucune donnée", "0"]],
        theme: "striped",
        headStyles: { fillColor: [30, 144, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      // Save the PDF
      doc.save("dashboard-report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF. Veuillez vérifier la console pour plus de détails.");
    }
  };

  return (
    <Button onClick={exportPDF} className="bg-[#1e90ff] hover:bg-[#1c86ee] text-white">
      <Download className="mr-2 h-4 w-4" />
      Exporter en PDF
    </Button>
  );
}