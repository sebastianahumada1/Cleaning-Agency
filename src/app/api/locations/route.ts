import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(locations)
  } catch (error) {
    console.error('Payroll: Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      pricePerDay, 
      pricePerWeek, 
      hoursPerDay, 
      priceMonday,
      priceTuesday,
      priceWednesday,
      priceThursday,
      priceFriday,
      priceSaturday,
      priceSunday,
      notes 
    } = body

    if (!name || !pricePerDay) {
      return NextResponse.json(
        { error: 'Name and pricePerDay are required' },
        { status: 400 }
      )
    }

    const location = await prisma.location.create({
      data: {
        name,
        pricePerDay: parseFloat(pricePerDay),
        pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
        hoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : null,
        priceMonday: priceMonday ? parseFloat(priceMonday) : null,
        priceTuesday: priceTuesday ? parseFloat(priceTuesday) : null,
        priceWednesday: priceWednesday ? parseFloat(priceWednesday) : null,
        priceThursday: priceThursday ? parseFloat(priceThursday) : null,
        priceFriday: priceFriday ? parseFloat(priceFriday) : null,
        priceSaturday: priceSaturday ? parseFloat(priceSaturday) : null,
        priceSunday: priceSunday ? parseFloat(priceSunday) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Payroll: Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}

