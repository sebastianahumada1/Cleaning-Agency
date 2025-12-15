import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDateRange, normalizeDateToUTC } from '@/lib/date-utils'

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
      if (startDate && endDate) {
        const { start, end } = createDateRange(startDate, endDate)
        // Use gte (greater than or equal) for start and lt (less than) for end
        // This ensures we include all dates from the end date, even if stored with time components
        where.date.gte = start
        where.date.lt = end
        console.log(`Workdays: Filtering dates - Start: ${startDate} (>= ${start.toISOString()}), End: ${endDate} (< ${end.toISOString()})`)
      } else if (startDate) {
        const { start } = createDateRange(startDate, startDate)
        where.date.gte = start
        console.log(`Workdays: Filtering dates - Start: ${startDate} (>= ${start.toISOString()})`)
      } else if (endDate) {
        const { start, end } = createDateRange(endDate, endDate)
        // For end date only, use lt (less than) to include the entire day
        where.date.lt = end
        console.log(`Workdays: Filtering dates - End: ${endDate} (< ${end.toISOString()})`)
      }
    }

    const workdays = await prisma.workday.findMany({
      where,
      include: {
        employee: true,
        location: {
          include: {
            agency: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(workdays)
  } catch (error: any) {
    console.error('Payroll: Error fetching workdays:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
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
        date: normalizeDateToUTC(date),
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

