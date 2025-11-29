import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payPeriod = await prisma.payPeriod.findUnique({
      where: { id },
      include: {
        payrolls: {
          include: {
            employee: true,
            location: true,
          },
        },
      },
    })

    if (!payPeriod) {
      return NextResponse.json(
        { error: 'Pay period not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(payPeriod)
  } catch (error) {
    console.error('Payroll: Error fetching pay period:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pay period' },
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
    await prisma.payPeriod.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payroll: Error deleting pay period:', error)
    return NextResponse.json(
      { error: 'Failed to delete pay period' },
      { status: 500 }
    )
  }
}

