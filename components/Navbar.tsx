"use client";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { Bell, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    setIsDarkMode(theme === "dark");
  }, []);

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <nav className="items-center top-0 left-0 w-full backdrop-blur-md bg-white/80 dark:bg-gray-900/80 shadow-md px-6 md:px-[10%] py-4 transition-all duration-300 border-b border-gray-300 dark:border-gray-700">
    
      <div className="flex justify-between items-center">
        {/* Logo et titre */}
        <div className="flex items-center gap-4">
          <Image src="/essths.png" width={50} height={50} alt="ESSTHS Logo" className="hover:scale-105 transition-transform duration-300" />
          <h1 className="text-2xl font-bold italic text-gray-900 dark:text-white">
            <Link href="/" className="hover:text-blue-500 dark:hover:text-purple-400 transition duration-300">
              Gestion <span className="text-blue-500 dark:text-purple-400">de stock</span>
            </Link>
          </h1>
        </div>

        </div>
     
    </nav>
  );
};

export default Navbar;