import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payPeriodId = searchParams.get('payPeriodId')
    const format = searchParams.get('format') || 'json'

    if (!payPeriodId) {
      return NextResponse.json(
        { error: 'payPeriodId is required' },
        { status: 400 }
      )
    }

    const payrolls = await prisma.payroll.findMany({
      where: { payPeriodId },
      include: {
        employee: true,
        location: true,
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

