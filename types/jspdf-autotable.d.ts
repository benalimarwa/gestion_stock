import { jsPDF } from "jspdf";

interface AutoTableOptions {
  startY?: number;
  head?: string[][];
  body?: (string | number)[][];
  theme?: string;
  headStyles?: {
    fillColor?: [number, number, number];
    textColor?: number;
  };
  styles?: {
    fontSize?: number;
  };
  [key: string]: any; // Allow additional properties
}

interface AutoTable {
  finalY: number;
  [key: string]: any; // Allow additional properties
}

declare module "jspdf" {
  interface jsPDF {
    autoTable(options: AutoTableOptions): jsPDF;
    lastAutoTable: AutoTable;
  }
}