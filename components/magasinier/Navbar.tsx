"use client";

import { UserButton } from '@clerk/nextjs';
import { Bell, Layers } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useUser } from "@clerk/nextjs";




const Navbar = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;


 



  return (
    <div className='border-b border-base-300 px-5 md:px-[10%] py-4'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center'>
          <div className='bg-accent-content text-accent rounded-full p-2'>
            <Layers className='h-6 w-6'/>
          </div>
          <span className='ml-3 font-bold text-2xl italic'>
            <Link href="/">Gestion  <span className='text-accent'>de stock</span></Link>
          </span>
        </div>
        <div className='flex gap-4 items-center'>
          <div className="relative">

              <Bell className='mr-6 mt-2'/>



          </div>
          <UserButton/>
        </div>
      </div>
    </div>
  );
};

export default Navbar;