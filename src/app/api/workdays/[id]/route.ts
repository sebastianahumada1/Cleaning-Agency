import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, employeeId, locationId, attended, hoursWorked, notes } = body

    const updateData: any = {}
    if (date) updateData.date = new Date(date)
    if (employeeId) updateData.employeeId = employeeId
    if (locationId) updateData.locationId = locationId
    if (attended !== undefined) updateData.attended = attended
    if (hoursWorked !== undefined)
      updateData.hoursWorked = hoursWorked ? parseFloat(hoursWorked) : null
    if (notes !== undefined) updateData.notes = notes

    const workday = await prisma.workday.update({
      where: { id },
      data: updateData,
      include: {
        employee: true,
        location: true,
      },
    })

    return NextResponse.json(workday)
  } catch (error: any) {
    console.error('Payroll: Error updating workday:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update workday' },
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
    await prisma.workday.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payroll: Error deleting workday:', error)
    if (error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete workday' },
      { status: 500 }
    )
  }
}

