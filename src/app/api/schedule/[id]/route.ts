import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeDateToUTC } from '@/lib/date-utils'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { employeeId, locationId, weekday, startDate, endDate } = body

    const updateData: any = {}
    if (employeeId) updateData.employeeId = employeeId
    if (locationId) updateData.locationId = locationId
    if (weekday) updateData.weekday = parseInt(weekday)
    if (startDate) updateData.startDate = normalizeDateToUTC(startDate)
    if (endDate !== undefined)
      updateData.endDate = endDate ? normalizeDateToUTC(endDate) : null

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
      include: {
        employee: true,
        location: true,
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Payroll: Error updating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.schedule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payroll: Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}

