import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDateRange, normalizeDateToUTC, getWeekdayUTC } from '@/lib/date-utils'

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

    // Normalize pay period dates to ensure we include all workdays using UTC
    const { start: startDate, end: endDate } = createDateRange(payPeriod.startDate, payPeriod.endDate)

    console.log(`Payroll: Processing period from ${startDate.toISOString()} to ${endDate.toISOString()}`)
    console.log(`Payroll: Pay period dates - Start: ${new Date(payPeriod.startDate).toISOString()}, End: ${new Date(payPeriod.endDate).toISOString()}`)

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
    
    // Log workdays count by employee and location for debugging
    const workdayCounts = new Map<string, number>()
    for (const workday of workdays) {
      const key = `${workday.employee.name} @ ${workday.location.name}`
      workdayCounts.set(key, (workdayCounts.get(key) || 0) + 1)
    }
    for (const [key, count] of workdayCounts.entries()) {
      console.log(`Payroll: ${key}: ${count} workdays`)
    }

    // Helper function to get price for a specific day using UTC
    function getPriceForDay(location: any, date: Date): number {
      // Use UTC weekday calculation
      const weekday = getWeekdayUTC(date)
      
      const dateStr = date.toISOString().split('T')[0]
      const weekdayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      
      // Helper to safely convert Decimal to number, checking for null/undefined
      const safeNumber = (value: any): number | null => {
        if (value === null || value === undefined) return null
        const num = Number(value)
        return isNaN(num) ? null : num
      }
      
      // Check if there's a specific price for this weekday
      let price: number | null = null
      switch (weekday) {
        case 1: // Monday
          price = safeNumber(location.priceMonday)
          break
        case 2: // Tuesday
          price = safeNumber(location.priceTuesday)
          break
        case 3: // Wednesday
          price = safeNumber(location.priceWednesday)
          break
        case 4: // Thursday
          price = safeNumber(location.priceThursday)
          break
        case 5: // Friday
          price = safeNumber(location.priceFriday)
          break
        case 6: // Saturday
          price = safeNumber(location.priceSaturday)
          break
        case 7: // Sunday
          price = safeNumber(location.priceSunday)
          break
      }
      
      const basePrice = Number(location.pricePerDay)
      const finalPrice = price !== null ? price : basePrice
      
      // Debug logging for Saturday dates to verify pricing
      if (weekday === 6) {
        console.log(`Payroll: ${dateStr} (${weekdayNames[weekday]}) - ${location.name}:`)
        console.log(`  priceSaturday raw:`, location.priceSaturday)
        console.log(`  priceSaturday converted:`, price)
        console.log(`  pricePerDay:`, basePrice)
        console.log(`  Final price used:`, finalPrice)
      }
      
      // Use specific price if available, otherwise use default pricePerDay
      return finalPrice
    }

    // Group by employee and location, tracking total earned (not just days)
    const payrollMap = new Map<string, { employeeId: string; locationId: string; daysWorked: number; totalEarned: number; workdayDetails: string[] }>()

    for (const workday of workdays) {
      const key = `${workday.employeeId}-${workday.locationId}`
      const existing = payrollMap.get(key)
      
      const workdayDate = new Date(workday.date)
      const priceForDay = getPriceForDay(workday.location, workdayDate)
      
      // Normalize date for logging
      const dateStr = workdayDate.toISOString().split('T')[0]
      const weekday = getWeekdayUTC(workdayDate)
      const weekdayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const weekdayStr = weekdayNames[weekday]
      
      // Log all workdays
      console.log(`Payroll: Workday ${dateStr} (${weekdayStr}) - ${workday.employee.name} @ ${workday.location.name} - Price: $${priceForDay.toFixed(2)}`)

      if (existing) {
        existing.daysWorked += 1
        existing.totalEarned += priceForDay
        existing.workdayDetails.push(`${dateStr}: $${priceForDay.toFixed(2)}`)
      } else {
        payrollMap.set(key, {
          employeeId: workday.employeeId,
          locationId: workday.locationId,
          daysWorked: 1,
          totalEarned: priceForDay,
          workdayDetails: [`${dateStr}: $${priceForDay.toFixed(2)}`],
        })
      }
    }
    
    console.log(`Payroll: Grouped into ${payrollMap.size} payroll entries`)
    
    // Log detailed breakdown for each payroll entry
    for (const [key, data] of payrollMap.entries()) {
      const employee = workdays.find(w => `${w.employeeId}-${w.locationId}` === key)?.employee
      const location = workdays.find(w => `${w.employeeId}-${w.locationId}` === key)?.location
      console.log(`Payroll Entry: ${employee?.name} @ ${location?.name} - Days: ${data.daysWorked}, Total: $${data.totalEarned.toFixed(2)}`)
      console.log(`  Details: ${data.workdayDetails.join(', ')}`)
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

