"use client"

import { ColumnDef } from "@tanstack/react-table"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Payment = {
  id: string,
  produit: string,
  beneficiaire: string,
  quantite: number,
  date: string,
  raison: string,
}

export const columns: ColumnDef<Payment>[] = [
  {
    header: "Produit",
    accessorKey: "produit",
  },
  {
    header: "Bénéficiaire",
    accessorKey: "beneficiaire",
  },
  {
    header: "Quantité",
    accessorKey: "quantite",
  },
  {
    header: "Date",
    accessorKey: "date",
  },
  {
    header: "Raison",
    accessorKey: "raison",
  },
]
