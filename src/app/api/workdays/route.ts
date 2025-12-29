import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDateRange, normalizeDateToUTC } from '@/lib/date-utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeIds = searchParams.get('employeeIds')
    const agencyIds = searchParams.get('agencyIds')
    const locationId = searchParams.get('locationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    
    // Filtro por múltiples empleados
    if (employeeIds) {
      const ids = employeeIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        where.employeeId = { in: ids }
      }
    }
    
    // Filtro por ubicación y/o agencias
    if (locationId && agencyIds) {
      // Si hay ambos filtros, usar AND para combinar
      const ids = agencyIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        where.location = {
          AND: [
            { id: locationId },
            { agencyId: { in: ids } }
          ]
        }
      } else {
        where.locationId = locationId
      }
    } else if (locationId) {
      where.locationId = locationId
    } else if (agencyIds) {
      const ids = agencyIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        where.location = {
          agencyId: { in: ids }
        }
      }
    }
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

    // Log first few workdays to debug date filtering
    if (workdays.length > 0) {
      console.log(`Workdays: Found ${workdays.length} workdays. First 3 dates:`, 
        workdays.slice(0, 3).map(w => ({
          date: w.date.toISOString(),
          dateStr: w.date.toISOString().split('T')[0],
          employee: w.employee.name,
          location: w.location.name
        }))
      )
    }

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

    const normalizedDate = normalizeDateToUTC(date)
    console.log(`Workdays API: Creating workday - Input date: ${date}, Normalized: ${normalizedDate.toISOString()}, UTC Date: ${normalizedDate.getUTCFullYear()}-${String(normalizedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getUTCDate()).padStart(2, '0')}`)
    
    const workday = await prisma.workday.create({
      data: {
        date: normalizedDate,
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

    console.log(`Workdays API: Created workday - Stored date: ${workday.date.toISOString()}, ID: ${workday.id}`)
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

