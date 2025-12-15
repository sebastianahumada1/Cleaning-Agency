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
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const normalizedStartDate = normalizeDateToUTC(startDate)
    const normalizedEndDate = normalizeDateToUTC(endDate)
    
    console.log(`PayPeriod: Creating period - Input: ${startDate} -> ${endDate}, Normalized: ${normalizedStartDate.toISOString()} -> ${normalizedEndDate.toISOString()}`)
    
    const payPeriod = await prisma.payPeriod.create({
      data: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      },
    })

    console.log(`PayPeriod: Created - Stored: ${payPeriod.startDate.toISOString()} -> ${payPeriod.endDate.toISOString()}`)
    return NextResponse.json(payPeriod, { status: 201 })
  } catch (error) {
    console.error('Payroll: Error creating pay period:', error)
    return NextResponse.json(
      { error: 'Failed to create pay period' },
      { status: 500 }
    )
  }
}

