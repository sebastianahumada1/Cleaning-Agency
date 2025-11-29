import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const locationId = searchParams.get('locationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (employeeId) where.employeeId = employeeId
    if (locationId) where.locationId = locationId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.date.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    const workdays = await prisma.workday.findMany({
      where,
      include: {
        employee: true,
        location: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(workdays)
  } catch (error) {
    console.error('Payroll: Error fetching workdays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workdays' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, employeeId, locationId, attended, hoursWorked, notes } = body

    if (!date || !employeeId || !locationId) {
      return NextResponse.json(
        { error: 'date, employeeId, and locationId are required' },
        { status: 400 }
      )
    }

    const workday = await prisma.workday.create({
      data: {
        date: new Date(date),
        employeeId,
        locationId,
        attended: attended !== undefined ? attended : true,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        notes: notes || null,
      },
      include: {
        employee: true,
        location: true,
      },
    })

    return NextResponse.json(workday, { status: 201 })
  } catch (error: any) {
    console.error('Payroll: Error creating workday:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Workday already exists for this date, employee, and location' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create workday' },
      { status: 500 }
    )
  }
}

