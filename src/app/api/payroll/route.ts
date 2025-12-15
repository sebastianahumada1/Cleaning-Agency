import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payPeriodId = searchParams.get('payPeriodId')
    const employeeIds = searchParams.get('employeeIds')
    const agencyIds = searchParams.get('agencyIds')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    
    if (payPeriodId) {
      where.payPeriodId = payPeriodId
    }
    
    // Filtro por fechas personalizado (si no hay payPeriodId)
    if (!payPeriodId && (startDate || endDate)) {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'Both startDate and endDate are required for custom date range' },
          { status: 400 }
        )
      }
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Buscar períodos que se solapen con el rango de fechas
      where.payperiod = {
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } }
        ]
      }
    }

    // Filtro por múltiples empleados
    if (employeeIds) {
      const ids = employeeIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        where.employeeId = { in: ids }
      }
    }

    // Filtro por múltiples agencias
    if (agencyIds) {
      const ids = agencyIds.split(',').filter(id => id.trim())
      if (ids.length > 0) {
        where.location = {
          agencyId: { in: ids }
        }
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true,
        location: {
          include: {
            agency: true,
          },
        },
        payperiod: true,
      },
      orderBy: [{ employee: { name: 'asc' } }, { location: { name: 'asc' } }],
    })

    return NextResponse.json(payrolls)
  } catch (error) {
    console.error('Payroll: Error fetching payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payrolls' },
      { status: 500 }
    )
  }
}

