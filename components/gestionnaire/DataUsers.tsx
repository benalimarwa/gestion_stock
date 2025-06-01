"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "DEMANDEUR" | "MAGASINNAIRE";
  createdAt: string;
  demandeur?: { type: "ENSEIGNANT" | "EMPLOYE" } | null;
};

type Commande = {
  id: string;
  statut: string;
  date: string;
  createdAt: string;
  produits: { produit: { nom: string }; quantite: number }[];
};

type Demande = {
  id: string;
  statut: string;
  createdAt: string;
  produits: { produit: { nom: string }; quantite: number }[];
};

type UserDetails = {
  commandes?: Commande[];
  demandes?: Demande[];
  acceptedDemandes?: Demande[];
};

export function DataUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [searchEmail, setSearchEmail] = useState<string>(""); 
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update filteredUsers whenever users, selectedRole, or searchEmail changes
  useEffect(() => {
    let result = users;

    // Filter by role
    if (selectedRole !== "ALL") {
      result = result.filter((user) => user.role === selectedRole);
    }

    // Filter by email (case-insensitive)
    if (searchEmail.trim()) {
      result = result.filter((user) =>
        user.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    setFilteredUsers(result);
  }, [users, selectedRole, searchEmail]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      const text = await response.text();
      let data: User[];
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }
      if (!response.ok) throw new Error( "Erreur lors de la récupération des utilisateurs");
      setUsers(data);
      // Initial filteredUsers will be set by useEffect
    } catch (err) {
      console.error("Erreur dans fetchUsers:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
  };

  const handleEmailSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value);
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setDetailsLoading(true);
    setIsDetailsOpen(true);

    try {
      const response = await fetch(`/api/users/${user.id}/details`);
      const text = await response.text();
      let data: UserDetails;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Response is not JSON:", text);
        throw new Error("Réponse invalide du serveur");
      }
      if (!response.ok) throw new Error( "Erreur lors de la récupération des détails");
      setUserDetails(data);
    } catch (err) {
      console.error("Erreur dans handleViewDetails:", err);
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      setUserDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRoleDisplay = (user: User) => {
    switch (user.role) {
      case "ADMIN":
        return "Admin";
      case "MAGASINNAIRE":
        return "Gestionnaire";
      case "DEMANDEUR":
        return user.demandeur?.type === "ENSEIGNANT" ? "Enseignant" : user.demandeur?.type === "EMPLOYE" ? "Employé" : "Demandeur";
      default:
        return user.role;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "EN_COURS":
      case "EN_ATTENTE":
        return "bg-yellow-100 text-yellow-800";
      case "LIVREE":
      case "APPROUVEE":
        return "bg-green-100 text-green-800";
      case "ANNULEE":
      case "REJETEE":
        return "bg-red-100 text-red-800";
      case "EN_RETOUR":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-indigo-600 animate-pulse">
        Chargement des utilisateurs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 bg-red-50 rounded-lg">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-extrabold text-indigo-700 tracking-tight">
          Liste des Utilisateurs
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="email-filter" className="text-sm font-semibold text-indigo-600">
              Rechercher par email :
            </Label>
            <Input
              id="email-filter"
              value={searchEmail}
              onChange={handleEmailSearch}
              placeholder="Entrez un email..."
              className="w-[250px] border-indigo-300 bg-white text-indigo-700 focus:ring-indigo-500 transition-all duration-200 hover:bg-indigo-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="role-filter" className="text-sm font-semibold text-indigo-600">
              Filtrer par rôle :
            </Label>
            <Select value={selectedRole} onValueChange={handleRoleFilter}>
              <SelectTrigger
                id="role-filter"
                className="w-[180px] border-indigo-300 bg-white text-indigo-700 focus:ring-indigo-500 transition-all duration-200 hover:bg-indigo-50"
              >
                <SelectValue placeholder="Sélectionnez un rôle" />
              </SelectTrigger>
              <SelectContent className="bg-white border-indigo-200 shadow-lg">
                <SelectItem value="ALL" className="text-indigo-600 hover:bg-indigo-100">Tous</SelectItem>
                <SelectItem value="ADMIN" className="text-indigo-600 hover:bg-indigo-100">Admin</SelectItem>
                <SelectItem value="DEMANDEUR" className="text-indigo-600 hover:bg-indigo-100">Demandeur</SelectItem>
                <SelectItem value="MAGASINNAIRE" className="text-indigo-600 hover:bg-indigo-100">Gestionnaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Table className="bg-white rounded-lg shadow-md">
        <TableCaption className="text-indigo-600 font-medium">
          Liste des utilisateurs enregistrés dans le système.
        </TableCaption>
        <TableHeader className="bg-indigo-100">
          <TableRow>
            <TableHead className="w-[250px] text-indigo-700 font-semibold">Email</TableHead>
            <TableHead className="text-indigo-700 font-semibold">Nom</TableHead>
            <TableHead className="text-indigo-700 font-semibold">Rôle</TableHead>
            <TableHead className="text-indigo-700 font-semibold">Créé le</TableHead>
            <TableHead className="text-indigo-700 font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow
              key={user.id}
              className="hover:bg-indigo-50 transition-all duration-200"
            >
              <TableCell className="font-medium text-gray-900">{user.email}</TableCell>
              <TableCell className="text-gray-700">{user.name || "-"}</TableCell>
              <TableCell className="text-indigo-600 font-medium">{getRoleDisplay(user)}</TableCell>
              <TableCell className="text-gray-600">{formatDate(user.createdAt)}</TableCell>
              <TableCell className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(user)}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-100 transition-all duration-200 hover:scale-105"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-indigo-50">
          <TableRow>
            <TableCell colSpan={5} className="text-indigo-700 font-semibold">
              Total: {filteredUsers.length} utilisateurs
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-2xl p-6 transition-all duration-300 max-h-[80vh] overflow-y-auto border border-indigo-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-indigo-800 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
              Détails de {selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="text-center py-6">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-2 text-indigo-600 font-medium animate-pulse">Chargement...</p>
            </div>
          ) : !userDetails ? (
            <div className="text-center py-6 text-red-500 bg-red-50 rounded-lg shadow-inner">
              Erreur lors du chargement des détails
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-indigo-500 transform transition-all duration-300 hover:scale-102 hover:shadow-lg">
                <h3 className="text-lg font-semibold text-indigo-700 mb-3">Informations Générales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-indigo-600">ID</Label>
                    <p className="text-gray-800 text-sm bg-indigo-50 p-2 rounded-md mt-1">{selectedUser?.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-indigo-600">Nom</Label>
                    <p className="text-gray-800 text-sm bg-indigo-50 p-2 rounded-md mt-1">{selectedUser?.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-indigo-600">Rôle</Label>
                    <p className={`text-sm font-semibold p-2 rounded-md mt-1 ${getRoleDisplay(selectedUser!) === "Admin" ? "bg-purple-100 text-purple-800" : getRoleDisplay(selectedUser!) === "Gestionnaire" ? "bg-indigo-100 text-indigo-800" : "bg-blue-100 text-blue-800"}`}>
                      {getRoleDisplay(selectedUser!)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-indigo-600">Créé le</Label>
                    <p className="text-gray-800 text-sm bg-indigo-50 p-2 rounded-md mt-1">{formatDate(selectedUser!.createdAt)}</p>
                  </div>
                </div>
              </div>

              {selectedUser?.role === "ADMIN" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-700 bg-indigo-100 p-2 rounded-t-lg">Commandes Transmises</h3>
                  {userDetails.commandes?.length ? (
                    <ul className="space-y-3">
                      {userDetails.commandes.map((commande) => (
                        <li
                          key={commande.id}
                          className="bg-white p-4 rounded-lg shadow-md border border-indigo-100 transform transition-all duration-300 hover:scale-101 hover:shadow-xl animate-slide-up"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-800 font-medium">Commande #{commande.id.slice(0, 8)}</p>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(commande.statut)}`}>
                              {commande.statut}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Produits: {commande.produits.map((p) => `${p.produit.nom} (${p.quantite})`).join(", ")}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Date: {formatDate(commande.date)} | Créée le {formatDate(commande.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 italic bg-indigo-50 p-3 rounded-b-lg">Aucune commande transmise</p>
                  )}
                </div>
              )}

              {selectedUser?.role === "DEMANDEUR" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-700 bg-indigo-100 p-2 rounded-t-lg">Demandes Transmises</h3>
                  {userDetails.demandes?.length ? (
                    <ul className="space-y-3">
                      {userDetails.demandes.map((demande) => (
                        <li
                          key={demande.id}
                          className="bg-white p-4 rounded-lg shadow-md border border-indigo-100 transform transition-all duration-300 hover:scale-101 hover:shadow-xl animate-slide-up"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-800 font-medium">Demande #{demande.id.slice(0, 8)}</p>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(demande.statut)}`}>
                              {demande.statut}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Produits: {demande.produits.map((p) => `${p.produit.nom} (${p.quantite})`).join(", ")}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">Créée le {formatDate(demande.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 italic bg-indigo-50 p-3 rounded-b-lg">Aucune demande transmise</p>
                  )}
                </div>
              )}

              {selectedUser?.role === "MAGASINNAIRE" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-700 bg-indigo-100 p-2 rounded-t-lg">Demandes Acceptées</h3>
                  {userDetails.acceptedDemandes?.length ? (
                    <ul className="space-y-3">
                      {userDetails.acceptedDemandes.map((demande) => (
                        <li
                          key={demande.id}
                          className="bg-white p-4 rounded-lg shadow-md border border-indigo-100 transform transition-all duration-300 hover:scale-101 hover:shadow-xl animate-slide-up"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-800 font-medium">Demande #{demande.id.slice(0, 8)}</p>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(demande.statut)}`}>
                              {demande.statut}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Produits: {demande.produits.map((p) => `${p.produit.nom} (${p.quantite})`).join(", ")}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">Créée le {formatDate(demande.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 italic bg-indigo-50 p-3 rounded-b-lg">Aucune demande acceptée</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end mt-6">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-md"
              >
                Fermer
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DataUsers;