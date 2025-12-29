import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeDateToUTC } from '@/lib/date-utils'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const payPeriods = await prisma.payPeriod.findMany({
      include: {
        _count: {
          select: { payrolls: true },
        },
        agencies: {
          include: {
            agency: true,
          },
        },
        employees: {
          include: {
            employee: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(payPeriods)
  } catch (error) {
    console.error('Payroll: Error fetching pay periods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pay periods' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, startDate, endDate, employeeIds, agencyIds } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const normalizedStartDate = normalizeDateToUTC(startDate)
    const normalizedEndDate = normalizeDateToUTC(endDate)
    
    console.log(`PayPeriod: Creating period - Name: ${name || 'N/A'}, Input: ${startDate} -> ${endDate}, Normalized: ${normalizedStartDate.toISOString()} -> ${normalizedEndDate.toISOString()}`)
    console.log(`PayPeriod: Agency IDs: ${JSON.stringify(agencyIds)}, Employee IDs: ${JSON.stringify(employeeIds)}`)
    
    // Build the data object conditionally
    const createData: any = {
      name: name && name.trim() ? name.trim() : null,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    }
    
    // Only add agencies relation if there are agency IDs
    if (agencyIds && Array.isArray(agencyIds) && agencyIds.length > 0) {
      createData.agencies = {
        create: agencyIds.map((agencyId: string) => ({
          agencyId: String(agencyId),
        })),
      }
    }
    
    // Only add employees relation if there are employee IDs
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      createData.employees = {
        create: employeeIds.map((employeeId: string) => ({
          employeeId: String(employeeId),
        })),
      }
    }
    
    console.log(`PayPeriod: Create data:`, JSON.stringify(createData, null, 2))
    
    // Create pay period with related agencies and employees
    const payPeriod = await prisma.payPeriod.create({
      data: createData,
      include: {
        agencies: {
          include: {
            agency: true,
          },
        },
        employees: {
          include: {
            employee: true,
          },
        },
      },
    })

    console.log(`PayPeriod: Created - Stored: ${payPeriod.startDate.toISOString()} -> ${payPeriod.endDate.toISOString()}`)
    return NextResponse.json(payPeriod, { status: 201 })
  } catch (error: any) {
    console.error('Payroll: Error creating pay period:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create pay period'
    if (error.code === 'P2002') {
      errorMessage = 'A pay period with this name already exists'
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid agency or employee ID provided'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.code || 'UNKNOWN_ERROR' },
      { status: 500 }
    )
  }
}

