import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Fetch categories with their product count
    const categoriesWithProductCount = await prisma.categorie.findMany({
      include: {
        _count: {
          select: { produits: true }
        }
      }
    })

    // Transform data for the pie chart
    const chartData = categoriesWithProductCount.map((category, index) => ({
      category: category.nom,
      products: category._count.produits,
      fill: `var(--color-chart-${index + 1})` // Use dynamic color assignment
    }))

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching category product counts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch category product counts' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}