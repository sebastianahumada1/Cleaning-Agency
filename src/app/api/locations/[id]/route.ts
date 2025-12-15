import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        agency: true,
        schedules: {
          include: { employee: true },
        },
        workdays: {
          include: { employee: true },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Payroll: Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { 
      name, 
      agencyId,
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

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(agencyId !== undefined && { agencyId: agencyId || null }),
        ...(pricePerDay && { pricePerDay: parseFloat(pricePerDay) }),
        ...(pricePerWeek !== undefined && {
          pricePerWeek: pricePerWeek ? parseFloat(pricePerWeek) : null,
        }),
        ...(hoursPerDay !== undefined && {
          hoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : null,
        }),
        ...(priceMonday !== undefined && {
          priceMonday: priceMonday ? parseFloat(priceMonday) : null,
        }),
        ...(priceTuesday !== undefined && {
          priceTuesday: priceTuesday ? parseFloat(priceTuesday) : null,
        }),
        ...(priceWednesday !== undefined && {
          priceWednesday: priceWednesday ? parseFloat(priceWednesday) : null,
        }),
        ...(priceThursday !== undefined && {
          priceThursday: priceThursday ? parseFloat(priceThursday) : null,
        }),
        ...(priceFriday !== undefined && {
          priceFriday: priceFriday ? parseFloat(priceFriday) : null,
        }),
        ...(priceSaturday !== undefined && {
          priceSaturday: priceSaturday ? parseFloat(priceSaturday) : null,
        }),
        ...(priceSunday !== undefined && {
          priceSunday: priceSunday ? parseFloat(priceSunday) : null,
        }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        agency: true,
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Payroll: Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.location.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payroll: Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}

