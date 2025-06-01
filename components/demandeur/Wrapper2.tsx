import React from 'react'

import { CustomTrigger } from '@/components/admin/CustomTrigger'
import { SidebarProvider } from '../ui/sidebar'
import { AppSidebar2 } from './app-sidebar2'
import Navbar from '@/components/admin/Navbar'


type WrapperProps = {
    children : React.ReactNode
}

const Wrapper = ({children}: WrapperProps) => {
  return (
    <SidebarProvider>
      <AppSidebar2/>

   <div className='w-full'>

    <Navbar/>
    <CustomTrigger/>
     <div className='px-3 md:px-[1%] mt-8 mb-10'>

        {children}

    </div>

   </div>

   </SidebarProvider>
  )
}

export default Wrapper