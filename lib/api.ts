// lib/api.ts
/**
 * Ce module gère les appels API pour récupérer les données depuis votre base de données
 */

// Définir les types pour nos données de tableau de bord
export interface DashboardData {
    ordersCount: number;
    usersCount: number;
    suppliersCount: number;
    equipmentUsage: EquipmentUsageData[];
    equipmentStock: EquipmentStockData[];
  }
  
  export interface EquipmentUsageData {
    category: string;
    value: number;
    fill: string;
  }
  
  export interface EquipmentStockData {
    category: string;
    stock: number;
    fill: string;
  }
  
  /**
   * Récupère toutes les données du tableau de bord depuis la base de données
   * @returns {Promise<DashboardData>} Les données du tableau de bord
   */
  export async function fetchDashboardData(): Promise<DashboardData> {
    try {
      // Remplacez cette URL par votre point de terminaison API réel
      const response = await fetch('/api/dashboard');
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données du tableau de bord:', error);
      throw error;
    }
  }
  
  /**
   * Implémentation alternative avec des appels API séparés
   * Utilisez ceci si vous préférez faire des appels API séparés pour différents composants
   */
  export async function fetchCardData() {
    const response = await fetch('/api/dashboard/cards');
    if (!response.ok) throw new Error('Échec de la récupération des données des cartes');
    return await response.json();
  }
  
  export async function fetchEquipmentUsage() {
    const response = await fetch('/api/dashboard/equipment-usage');
    if (!response.ok) throw new Error("Échec de la récupération des données d'utilisation des équipements");
    return await response.json();
  }
  
  export async function fetchEquipmentStock() {
    const response = await fetch('/api/dashboard/equipment-stock');
    if (!response.ok) throw new Error('Échec de la récupération des données de stock des équipements');
    return await response.json();
  }