"use client";

import { ChevronDown, Package, Users, Bell, Settings, LayoutDashboardIcon, ChartColumnStacked, Command } from "lucide-react";
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

const items = [
  {
    title: "Produits",
    icon: Package,
    url: "/magasinier/produits",
  },{
    title: "Catégorie",
    icon: ChartColumnStacked,
    url: "/magasinier/categorie",
  },
  {
    title: "Les commandes",
    icon: Command,
    subItems: [
      { title: "Mes commandes", url: "/magasinier/commandes/mescommandes" },
      { title: "En cours", url: "/magasinier/commandes/Encours" },
      { title: "En retours", url: "/magasinier/commandes/Enretour" },
      { title: "Livrées", url: "/magasinier/commandes/livre" },
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    url: "/magasinier/notifications",
  },
  {
    title: "Demandes",
    icon: Command,
    subItems: [
      { title: "Demandes acceptées", url: "/magasinier/demandes/demandeApprouvee" },
      { title: "Demandes Exceptionnelles", url: "/magasinier/demandes/exceptionnelles" },]},
  
  {
    title: "Profil",
    icon: Users,
    url: "/magasinier/profil",
  },
  {
    title: "Fournisseurs",
    icon: LayoutDashboardIcon,
    url: "/magasinier/fournisseur",
  }
];

export function AppSidebar3() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newOpenMenus: Set<string> = new Set();
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
                          pathname === item.url ? "bg-blue-800 text-blue-400 shadow-lg" : ""
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar3;