"use client";

import {
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  NotebookText,
  ShoppingBasket,
  CommandIcon,
  Bell,
  Calendar,
  Settings,
  User2Icon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Interface pour les éléments du tableau items
interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  subItems?: { title: string; url: string }[];
}

const items: SidebarItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    subItems: [{ title: "Tableau de bord", url: "/admin/users/dashboard" }],
  },
  {
    title: "Produits",
    icon: ShoppingCart,
    subItems: [
      { title: "Catégories", url: "/admin/users/categories" },
      { title: "Produits", url: "/admin/users/produits" },
    ],
  },
  {
    title: "Users",
    icon: User2Icon,
    subItems: [{ title: "Liste", url: "/admin/users/users" }],
  },
  {
    title: "Demandeurs",
    icon: NotebookText,
    subItems: [{ title: "Liste", url: "/admin/users/employers" }],
  },
  
  
  {
    title: "Fournisseurs",
    icon: ShoppingBasket,
    subItems: [{ title: "Partenaires", url: "/admin/users/founisseurs" }],
  },
  {
    title: "Commandes",
    icon: CommandIcon,
    subItems: [
      { title: "Historique", url: "/admin/users/commande" },
      { title: "Validée et non Validée", url: "/admin/users/valide_nonvalide" },
    ],
  },
  {
    title: "Demandes",
    icon: CommandIcon,
    subItems: [
      { title: "Acceptée", url: "/admin/users/demande_acc" },
      { title: "Exceptionelle", url: "/admin/users/demande_excep" },
      { title: "En_attente", url: "/admin/users/demande_att" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    subItems: [
      { title: "Notifications", url: "/admin/users/notification" },
      { title: "Alertes", url: "/admin/users/alerte" },
    ],
  },
  {
    title: "Calendrier/Registre",
    icon: Calendar,
    subItems: [{ title: "Calendar", url: "/admin/users/calendar" },
    { title: "Registre", url: "/admin/users/registre" } 
    ],
  },
  {
    title: "Paramètres",
    icon: Settings,
    subItems: [{ title: "Profil", url: "/admin/users/profil" }],
  },
];

export function AppSidebar({ users = [], onDelete }: { users?: any[]; onDelete?: (userId: string) => void }) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newOpenMenus = new Set<string>();
    items.forEach((item) => {
      if (item.subItems?.some((subItem) => subItem.url === pathname)) {
        newOpenMenus.add(item.title);
      }
    });
    setOpenMenus(newOpenMenus);
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  return (
    <Sidebar
      className="bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-700 text-blue-800 shadow-2xl w-65 min-h-screen p-1 flex flex-col transition-all duration-300 hover:shadow-xl"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-2xl font-extrabold tracking-widest uppercase text-blue-300 mb-4 animate-pulse">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isOpen = openMenus.has(item.title);

                if (item.subItems) {
                  return (
                    <Collapsible
                      key={item.title}
                      open={isOpen}
                      onOpenChange={() => toggleMenu(item.title)}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="flex items-center w-full text-blue-800 hover:bg-opacity-80 hover:bg-blue-600 rounded-lg p-3 transition-all duration-300 hover:scale-105 group"
                          >
                            <item.icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-200" />
                            <span className="ml-3 font-semibold uppercase">{item.title}</span>
                            <ChevronDown
                              className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </SidebarMenuItem>
                      <CollapsibleContent className="mt-2">
                        <div className="ml-6 space-y-2">
                          {item.subItems.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton asChild>
                                <a
                                  href={subItem.url}
                                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-700 hover:text-blue-800 ${
                                    pathname === subItem.url
                                      ? "bg-blue-800 text-blue-400 shadow-md"
                                      : ""
                                  }`}
                                >
                                  🔹 <span className="ml-2">{subItem.title}</span>
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300 hover:bg-blue-600 hover:text-blue-300 ${
                          pathname === item.url
                            ? "bg-blue-800 text-blue-400 shadow-lg"
                            : ""
                        }`}
                      >
                        <item.icon className="h-6 w-6 text-blue-300" />
                        <span className="font-semibold uppercase">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {users.length > 0 && (
              <div className="mt-4 p-2 bg-blue-700 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-200">Utilisateurs</h3>
                <ul className="mt-2 space-y-1">
                  {users.map((user) => (
                    <li key={user.id} className="flex justify-between items-center text-sm text-blue-100">
                      <span>{user.email}</span>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(user.id)}
                          className="text-red-400 hover:text-red-300 ml-2"
                        >
                          Supprimer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}