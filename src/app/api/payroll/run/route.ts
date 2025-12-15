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
    // Prisma returns Date objects, but we need to extract UTC components to avoid timezone issues
    // Use normalizeDateToUTC to ensure we get the correct date regardless of time component
    const payPeriodStartNormalized = normalizeDateToUTC(payPeriod.startDate)
    const payPeriodEndNormalized = normalizeDateToUTC(payPeriod.endDate)
    
    // Log original dates from database and normalized versions
    console.log(`Payroll: Pay period from DB - Start: ${new Date(payPeriod.startDate).toISOString()}, End: ${new Date(payPeriod.endDate).toISOString()}`)
    console.log(`Payroll: Pay period normalized - Start: ${payPeriodStartNormalized.toISOString()}, End: ${payPeriodEndNormalized.toISOString()}`)
    console.log(`Payroll: Pay period UTC components - Start: ${payPeriodStartNormalized.getUTCFullYear()}-${String(payPeriodStartNormalized.getUTCMonth() + 1).padStart(2, '0')}-${String(payPeriodStartNormalized.getUTCDate()).padStart(2, '0')}, End: ${payPeriodEndNormalized.getUTCFullYear()}-${String(payPeriodEndNormalized.getUTCMonth() + 1).padStart(2, '0')}-${String(payPeriodEndNormalized.getUTCDate()).padStart(2, '0')}`)
    
    const { start: startDate, end: endDate } = createDateRange(payPeriodStartNormalized, payPeriodEndNormalized)

    console.log(`Payroll: Processing period from ${startDate.toISOString()} to ${endDate.toISOString()}`)
    console.log(`Payroll: Date range for query - gte: ${startDate.toISOString()}, lt: ${endDate.toISOString()}`)

    // Get all workdays in the period
    // Use lt (less than) since endDate is now exclusive (start of next day)
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
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
    
    // Log detailed workday information for debugging
    if (workdays.length > 0) {
      console.log(`Payroll: Workdays found (first 10):`)
      workdays.slice(0, 10).forEach(w => {
        const dateUTC = `${w.date.getUTCFullYear()}-${String(w.date.getUTCMonth() + 1).padStart(2, '0')}-${String(w.date.getUTCDate()).padStart(2, '0')}`
        console.log(`  - Date: ${w.date.toISOString()} (UTC: ${dateUTC}), Employee: ${w.employee.name}, Location: ${w.location.name}`)
      })
      
      // Group by employee and location to see counts
      const workdayMap = new Map<string, number>()
      workdays.forEach(w => {
        const key = `${w.employee.name}-${w.location.name}`
        workdayMap.set(key, (workdayMap.get(key) || 0) + 1)
      })
      console.log(`Payroll: Workdays by employee-location:`, Array.from(workdayMap.entries()))
    } else {
      console.log(`Payroll: WARNING - No workdays found for this period!`)
    }
    
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
      
      // Debug: log weekday calculation for Saturday dates
      const dateStr = date.toISOString().split('T')[0]
      if (weekday === 6 || weekday === 7) {
        const weekdayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        console.log(`Payroll: Date ${dateStr} -> Weekday: ${weekday} (${weekdayNames[weekday]})`)
      }
      
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

