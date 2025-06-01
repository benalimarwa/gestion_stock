"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Wrapper from "@/components/gestionnaire/Wrapper"
import { Payment, columns } from "./columns"
import { DataTable } from "./data-table"

async function getData(): Promise<Payment[]> {
  return [
    {
      id: "s1",
      produit: "Ordinateur Portable",
      beneficiaire: "Département Informatique",
      quantite: 5,
      date: "2025-03-10",
      raison: "Attribution aux enseignants",
    },
    {
      id: "s2",
      produit: "Souris sans fil",
      beneficiaire: "Bureau Administratif",
      quantite: 20,
      date: "2025-03-09",
      raison: "Remplacement du matériel défectueux",
    },
    {
      id: "s3",
      produit: "Bureau en bois",
      beneficiaire: "Salle de réunion",
      quantite: 2,
      date: "2025-03-08",
      raison: "Aménagement de nouveaux bureaux",
    },
    {
      id: "s4",
      produit: "Tapis de yoga",
      beneficiaire: "Club Sportif",
      quantite: 15,
      date: "2025-03-07",
      raison: "Distribution aux adhérents du club",
    },
    {
      id: "s5",
      produit: "Smartphone 5G",
      beneficiaire: "Responsable IT",
      quantite: 3,
      date: "2025-03-06",
      raison: "Acquisition pour tests internes",
    },
    {
      id: "s6",
      produit: "Boisson énergétique",
      beneficiaire: "Événement Universitaire",
      quantite: 100,
      date: "2025-03-05",
      raison: "Distribution aux participants",
    },
    {
      id: "s7",
      produit: "Chaise de bureau",
      beneficiaire: "Nouvelle salle de cours",
      quantite: 10,
      date: "2025-03-04",
      raison: "Équipement de la salle",
    },
  ]
}

export default function DemoPage() {
  const [data, setData] = useState<Payment[]>([])
  const [open, setOpen] = useState(false)  // Gestion de l'état du Dialog

  // Fonction pour ajouter un mouvement
  const onSubmit = (newEntry: Payment) => {
    setData((prevData) => [...prevData, newEntry])
    setOpen(false)  // Ferme le formulaire après soumission
  }

  return (
    <Wrapper>
      <div className="container mx-auto py-10">
        {/* Header avec bouton en haut à droite */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-bold">Mouvements de Sortie</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="default">Ajouter un mouvement de sortie</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un Mouvement de Sortie</DialogTitle>
              </DialogHeader>
              <EntryForm onSubmit={onSubmit} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Table des mouvements */}
        <DataTable columns={columns} data={data} />
      </div>
    </Wrapper>
  )
}

// Composant du formulaire
function EntryForm({ onSubmit }: { onSubmit: (newEntry: Payment) => void }) {
  const [formData, setFormData] = useState({
    produit: "",
    quantite: "",
    beneficiaire: "",
    date: "",
    raison: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const quantite = parseInt(formData.quantite)
    const newEntry: Payment = {
      id: Date.now().toString(),
      produit: formData.produit,
      beneficiaire: formData.beneficiaire,
      quantite: quantite,
      date: formData.date,
      raison: formData.raison,
    }

    // Appeler la fonction onSubmit pour ajouter le produit
    onSubmit(newEntry)

    // Réinitialiser le formulaire
    setFormData({
      produit: "",
      quantite: "",
      beneficiaire: "",
      date: "",
      raison: "",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="produit">Produit</Label>
        <Input id="produit" name="produit" value={formData.produit} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="quantite">Quantité</Label>
        <Input id="quantite" name="quantite" type="number" value={formData.quantite} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="beneficiaire">Bénéficiaire</Label>
        <Input id="beneficiaire" name="beneficiaire" value={formData.beneficiaire} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="raison">Raison</Label>
        <Input id="raison" name="raison" value={formData.raison} onChange={handleChange} required />
      </div>
      <Button type="submit" className="w-full">Ajouter</Button>
    </form>
  )
}
