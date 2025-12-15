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
    const format = searchParams.get('format') || 'json'

    const where: any = {}
    
    if (payPeriodId) {
      where.payPeriodId = payPeriodId
    }
    
    // Filtro por fechas personalizado (si no hay payPeriodId)
    if (!payPeriodId && (startDate || endDate)) {
      const dateFilter: any = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.payperiod = {
        OR: [
          { startDate: dateFilter },
          { endDate: dateFilter },
          {
            AND: [
              { startDate: { lte: endDate ? new Date(endDate) : undefined } },
              { endDate: { gte: startDate ? new Date(startDate) : undefined } }
            ]
          }
        ]
      }
    } else if (!payPeriodId && !startDate && !endDate) {
      return NextResponse.json(
        { error: 'payPeriodId or date range (startDate, endDate) is required' },
        { status: 400 }
      )
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

    if (format === 'csv') {
      const csvHeader = 'Employee,Location,Days Worked,Total Earned\n'
      const csvRows = payrolls.map(
        (p) =>
          `"${p.employee.name}","${p.location.name}",${p.daysWorked},${p.totalEarned}`
      )
      const csv = csvHeader + csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-${payPeriodId}.csv"`,
        },
      })
    }

    return NextResponse.json(payrolls)
  } catch (error) {
    console.error('Payroll: Error exporting payroll:', error)
    return NextResponse.json(
      { error: 'Failed to export payroll' },
      { status: 500 }
    )
  }
}

