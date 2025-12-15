import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDateRange, normalizeDateToUTC } from '@/lib/date-utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (startDate || endDate) {
      if (startDate && endDate) {
        const { start, end } = createDateRange(startDate, endDate)
        where.startDate = { gte: start }
        where.endDate = { lte: end }
      } else if (startDate) {
        const { start } = createDateRange(startDate, startDate)
        where.startDate = { gte: start }
      } else if (endDate) {
        const { end } = createDateRange(endDate, endDate)
        where.endDate = { lte: end }
      }
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Payroll: Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, reportDate, reportedBy } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const report = await prisma.report.create({
      data: {
        startDate: normalizeDateToUTC(startDate),
        endDate: normalizeDateToUTC(endDate),
        reportDate: reportDate ? normalizeDateToUTC(reportDate) : null,
        reportedBy: reportedBy || null,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Payroll: Error creating report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}

