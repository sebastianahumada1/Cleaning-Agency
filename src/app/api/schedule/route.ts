import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const locationId = searchParams.get('locationId')

    const schedules = await prisma.schedule.findMany({
      where: {
        ...(employeeId && { employeeId }),
        ...(locationId && { locationId }),
      },
      include: {
        employee: true,
        location: {
          include: {
            agency: true,
          },
        },
      },
      orderBy: [{ weekday: 'asc' }, { startDate: 'asc' }],
    })

    return NextResponse.json(schedules)
  } catch (error: any) {
    console.error('Payroll: Error fetching schedules:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, locationId, weekday } = body

    if (!employeeId || !locationId || !weekday) {
      return NextResponse.json(
        { error: 'employeeId, locationId, and weekday are required' },
        { status: 400 }
      )
    }

    if (weekday < 1 || weekday > 7) {
      return NextResponse.json(
        { error: 'weekday must be between 1 (Monday) and 7 (Sunday)' },
        { status: 400 }
      )
    }

    // Use today as startDate and null as endDate (permanent schedule)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const schedule = await prisma.schedule.create({
      data: {
        employeeId,
        locationId,
        weekday: parseInt(weekday),
        startDate: today,
        endDate: null,
      },
      include: {
        employee: true,
        location: {
          include: {
            agency: true,
          },
        },
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('Payroll: Error creating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}

