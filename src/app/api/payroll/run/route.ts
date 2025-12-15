import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { payPeriodId } = body

    if (!payPeriodId) {
      return NextResponse.json(
        { error: 'payPeriodId is required' },
        { status: 400 }
      )
    }

    // Fetch pay period
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id: payPeriodId },
    })

    if (!payPeriod) {
      return NextResponse.json(
        { error: 'Pay period not found' },
        { status: 404 }
      )
    }

    // Delete existing payrolls for this period
    await prisma.payroll.deleteMany({
      where: { payPeriodId },
    })

    // Normalize pay period dates to ensure we include all workdays
    // Set startDate to beginning of day (00:00:00)
    const startDate = new Date(payPeriod.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    // Set endDate to end of day (23:59:59.999) to include all workdays on the last day
    const endDate = new Date(payPeriod.endDate)
    endDate.setHours(23, 59, 59, 999)

    console.log(`Payroll: Processing period from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Get all workdays in the period
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        attended: true,
      },
      include: {
        location: true,
        employee: true,
      },
      orderBy: [
        { employee: { name: 'asc' } },
        { location: { name: 'asc' } },
        { date: 'asc' },
      ],
    })

    console.log(`Payroll: Found ${workdays.length} workdays for period`)

    // Helper function to normalize date to local timezone (midnight) to avoid timezone issues
    function normalizeDate(date: Date): Date {
      // Create a new date using the year, month, and day in local timezone
      const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      return normalized
    }

    // Helper function to get price for a specific day
    function getPriceForDay(location: any, date: Date): number {
      // Normalize date to avoid timezone issues
      const normalizedDate = normalizeDate(date)
      const weekday = normalizedDate.getDay() === 0 ? 7 : normalizedDate.getDay() // 1=Mon, 7=Sun
      
      // Check if there's a specific price for this weekday
      let price: number | null = null
      switch (weekday) {
        case 1: // Monday
          price = location.priceMonday ? Number(location.priceMonday) : null
          break
        case 2: // Tuesday
          price = location.priceTuesday ? Number(location.priceTuesday) : null
          break
        case 3: // Wednesday
          price = location.priceWednesday ? Number(location.priceWednesday) : null
          break
        case 4: // Thursday
          price = location.priceThursday ? Number(location.priceThursday) : null
          break
        case 5: // Friday
          price = location.priceFriday ? Number(location.priceFriday) : null
          break
        case 6: // Saturday
          price = location.priceSaturday ? Number(location.priceSaturday) : null
          break
        case 7: // Sunday
          price = location.priceSunday ? Number(location.priceSunday) : null
          break
      }
      
      // Use specific price if available, otherwise use default pricePerDay
      return price !== null ? price : Number(location.pricePerDay)
    }

    // Group by employee and location, tracking total earned (not just days)
    const payrollMap = new Map<string, { employeeId: string; locationId: string; daysWorked: number; totalEarned: number }>()

    for (const workday of workdays) {
      const key = `${workday.employeeId}-${workday.locationId}`
      const existing = payrollMap.get(key)
      
      const workdayDate = new Date(workday.date)
      const priceForDay = getPriceForDay(workday.location, workdayDate)
      
      // Debug logging for first few workdays
      if (workdays.indexOf(workday) < 10) {
        console.log(`Payroll: Workday ${workdayDate.toISOString().split('T')[0]} - ${workday.employee.name} @ ${workday.location.name} - Price: $${priceForDay}`)
      }

      if (existing) {
        existing.daysWorked += 1
        existing.totalEarned += priceForDay
      } else {
        payrollMap.set(key, {
          employeeId: workday.employeeId,
          locationId: workday.locationId,
          daysWorked: 1,
          totalEarned: priceForDay,
        })
      }
    }
    
    console.log(`Payroll: Grouped into ${payrollMap.size} payroll entries`)

    // Create payroll records
    const payrolls = []
    for (const [key, data] of payrollMap.entries()) {
      const totalEarned = data.totalEarned

      const payroll = await prisma.payroll.create({
        data: {
          employeeId: data.employeeId,
          locationId: data.locationId,
          payPeriodId,
          daysWorked: data.daysWorked,
          totalEarned,
        },
        include: {
          employee: true,
          location: true,
        },
      })

      payrolls.push(payroll)
    }

    // Calculate summary
    const totalEarned = payrolls.reduce(
      (sum, p) => sum + Number(p.totalEarned),
      0
    )
    const totalDays = payrolls.reduce((sum, p) => sum + p.daysWorked, 0)

    return NextResponse.json({
      success: true,
      payPeriodId,
      summary: {
        totalPayrolls: payrolls.length,
        totalDays,
        totalEarned,
      },
      payrolls,
    })
  } catch (error: any) {
    console.error('Payroll: Error running payroll:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to run payroll' },
      { status: 500 }
    )
  }
}

