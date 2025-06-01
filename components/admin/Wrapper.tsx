import React from 'react'
import Navbar from './Navbar'
import { SidebarProvider } from '../ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { CustomTrigger } from '@/components/admin/CustomTrigger'

type WrapperProps = {
    children : React.ReactNode
}

const Wrapper = ({children}: WrapperProps) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      
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