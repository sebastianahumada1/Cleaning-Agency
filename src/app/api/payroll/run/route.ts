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

    // Get all workdays in the period
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: payPeriod.startDate,
          lte: payPeriod.endDate,
        },
        attended: true,
      },
      include: {
        location: true,
      },
    })

    // Helper function to get price for a specific day
    function getPriceForDay(location: any, date: Date): number {
      const weekday = date.getDay() === 0 ? 7 : date.getDay() // 1=Mon, 7=Sun
      
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
  } catch (error) {
    console.error('Payroll: Error running payroll:', error)
    return NextResponse.json(
      { error: 'Failed to run payroll' },
      { status: 500 }
    )
  }
}

