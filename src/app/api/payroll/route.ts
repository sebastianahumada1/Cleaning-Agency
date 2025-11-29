import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payPeriodId = searchParams.get('payPeriodId')
    const employeeId = searchParams.get('employeeId')

    const where: any = {}
    if (payPeriodId) where.payPeriodId = payPeriodId
    if (employeeId) where.employeeId = employeeId

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true,
        location: true,
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

