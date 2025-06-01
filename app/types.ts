export interface DashboardData {
    stats: { ordersCount: number; usersCount: number; suppliersCount: number;acceptedDemandsCount:number };
    stock: { category: string; stock: number; fill: string }[];
    usage: { category: string; value: number; fill: string }[];
  }
  
  export interface CommandesParMois {
    month: string;
    commandes: number;
  }
  
  export interface CommandesDemandesParMois {
    month: string;
    demandes: number;
    commandes: number;
  }
  
  export interface CommandesParFournisseur {
    fournisseur: string;
    commandes: number;
  }
  
  export interface CommandesDemandesParProduit {
    produit: string;
    demandesAcceptees: number;
    commandesLivrees: number;
   
  }