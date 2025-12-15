import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDateRange } from '@/lib/date-utils'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')
    const locationId = searchParams.get('locationId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const { start, end } = createDateRange(startDate, endDate)

    const where: any = {
      date: {
        gte: start,
        lte: end,
      },
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (locationId) {
      where.locationId = locationId
    }

    // Primero contar cuántos registros se eliminarán
    const count = await prisma.workday.count({ where })

    if (count === 0) {
      return NextResponse.json(
        { error: 'No se encontraron días de trabajo para eliminar en el rango especificado' },
        { status: 404 }
      )
    }

    // Eliminar los workdays
    const result = await prisma.workday.deleteMany({ where })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Se eliminaron ${result.count} día(s) de trabajo`,
    })
  } catch (error: any) {
    console.error('Payroll: Error deleting workdays:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete workdays' },
      { status: 500 }
    )
  }
}

