import React from 'react'

import { CustomTrigger } from '@/components/admin/CustomTrigger'
import { SidebarProvider } from '../ui/sidebar'
import Navbar from '@/components/admin/Navbar'
import { AppSidebar3 } from './app-sidebar3'


type WrapperProps = {
    children : React.ReactNode
}

const Wrapper = ({children}: WrapperProps) => {
  return (
    <SidebarProvider>
      <AppSidebar3/>

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