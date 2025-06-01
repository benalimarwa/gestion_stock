import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const products = await prisma.produit.findMany({
      select: {
        id: true,
        nom: true,
        quantite: true,
        statut: true,
        categorie: {
          select: {
            nom: true
          }
        }
      },
      orderBy: {
        nom: 'asc'
      }
    })
    
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}