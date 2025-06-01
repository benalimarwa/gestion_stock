"use client";

import {
  Bell,
  Package,
  Settings,
  ChevronDown,
  UserRoundPenIcon,
  Users2Icon,
  LayoutDashboardIcon,
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
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Définir une interface pour les éléments du tableau items
interface SidebarItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  subItems?: { title: string; url: string }[];
}

const items: SidebarItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboardIcon,
    url: "/gestionnaire/dashboard",
  },
  {
    title: "Produits",
    icon: Package,
    subItems: [
      { title: "Catégories", url: "/gestionnaire/categories" },
      { title: "Produits", url: "/gestionnaire/produits" },
    ],
  },
  {
    title: "Fournisseurs",
    icon: Users2Icon,
    subItems: [{ title: "Fournisseurs", url: "/gestionnaire/fournisseur" }],
  },
  {
    title: "Commandes",
    icon: Package,
    subItems: [
      { title: "Validée", url: "/gestionnaire/commandes/annule" },
      { title: "Livrée", url: "/gestionnaire/commandes/livre" },
      { title: "En retour", url: "/gestionnaire/commandes/enretour" },
      { title: "En Attente", url: "/gestionnaire/commandes/encours" },
    ],
  },
  {
    title: "Demandes Exceptionnelles",
    icon: Package,
    subItems: [
      { title: "Acceptées", url: "/gestionnaire/demandes/exceptionnelle" },]},
  {
    title: "Notifications",
    icon: Bell,
    url: "/gestionnaire/notification",
  },
  {
    title: "Paramètres",
    icon: Settings,
    subItems: [{ title: "Profil", url: "/gestionnaire/profil" }],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpenMenus((prev) => {
      const newOpenMenus = new Set(prev);
      let changed = false;

      items.forEach((item) => {
        if (item.subItems?.some((subItem) => subItem.url === pathname)) {
          if (!newOpenMenus.has(item.title)) {
            newOpenMenus.add(item.title);
            changed = true;
          }
        }
      });

      return changed ? newOpenMenus : prev;
    });
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
      className="bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-blue-100 shadow-2xl w-65 min-h-screen p-2 flex flex-col transition-all duration-300 hover:shadow-xl"
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

                return item.subItems ? (
                  <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={() => toggleMenu(item.title)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="flex items-center w-full text-blue-500 hover:bg-opacity-80 hover:bg-blue-600 rounded-lg p-3 transition-all duration-300 hover:scale-105 group"
                        >
                          <item.icon className="h-6 w-6 text-blue-900 group-hover:text-white transition-colors duration-200" />
                          <span className="ml-3 font-semibold">{item.title}</span>
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
                                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 hover:bg-blue-700 hover:text-blue-600 ${
                                  pathname === subItem.url
                                    ? "bg-blue-800 text-yellow-400 shadow-md"
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
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a
                        href={item.url}
                        className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300 hover:bg-blue-700 hover:text-blue-300 ${
                          pathname === item.url
                            ? "bg-blue-800 text-yellow-400 shadow-lg"
                            : ""
                        }`}
                      >
                        <item.icon className="h-6 w-6 text-blue-300" />
                        <span className="font-semibold">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}