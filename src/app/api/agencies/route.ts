import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const agencies = await prisma.agency.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(agencies)
  } catch (error) {
    console.error('Payroll: Error fetching agencies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const agency = await prisma.agency.create({
      data: {
        name,
      },
    })

    return NextResponse.json(agency, { status: 201 })
  } catch (error: any) {
    console.error('Payroll: Error creating agency:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Agency with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create agency' },
      { status: 500 }
    )
  }
}

