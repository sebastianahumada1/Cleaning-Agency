import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeDateToUTC, getWeekdayUTC } from '@/lib/date-utils'

export const runtime = 'nodejs'

async function handleRequest(request: Request) {
  // Verify cron secret if needed
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get tomorrow's date in UTC
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const tomorrowNormalized = normalizeDateToUTC(tomorrow)

    // Get weekday (1 = Monday, 7 = Sunday) using UTC
    const weekday = getWeekdayUTC(tomorrowNormalized)

    // Find all active schedules for tomorrow's weekday
    const schedules = await prisma.schedule.findMany({
      where: {
        weekday,
        startDate: { lte: tomorrowNormalized },
        OR: [
          { endDate: null },
          { endDate: { gte: tomorrowNormalized } },
        ],
      },
      include: {
        employee: true,
        location: true,
      },
    })

    const created = []
    const skipped = []

    for (const schedule of schedules) {
      // Check if workday already exists (idempotent)
      const existing = await prisma.workday.findUnique({
        where: {
          date_employeeId_locationId: {
            date: tomorrowNormalized,
            employeeId: schedule.employeeId,
            locationId: schedule.locationId,
          },
        },
      })

      if (existing) {
        skipped.push({
          employee: schedule.employee.name,
          location: schedule.location.name,
          date: tomorrowNormalized.toISOString(),
        })
        continue
      }

      // Create workday
      const workday = await prisma.workday.create({
        data: {
          date: tomorrowNormalized,
          employeeId: schedule.employeeId,
          locationId: schedule.locationId,
          attended: true,
        },
      })

      created.push({
        employee: schedule.employee.name,
        location: schedule.location.name,
        date: tomorrowNormalized.toISOString(),
        workdayId: workday.id,
      })
    }

    return NextResponse.json({
      success: true,
      date: tomorrowNormalized.toISOString(),
      weekday,
      created: created.length,
      skipped: skipped.length,
      details: {
        created,
        skipped,
      },
    })
  } catch (error) {
    console.error('Payroll: Error generating workdays:', error)
    return NextResponse.json(
      { error: 'Failed to generate workdays' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}

