import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'CARENIT',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'JACKIE',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'JEAN',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'JOSE',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'LESLYE',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'LUIS',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'MARIA LUISA',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'SIMONE',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'STEVE',
        status: 'active',
      },
    }),
    prisma.employee.create({
      data: {
        name: 'YASMI',
        status: 'active',
      },
    }),
  ])

  console.log(`Created ${employees.length} employees:`, employees.map(e => e.name).join(', '))

  // Create locations
  const location1 = await prisma.location.create({
    data: {
      name: 'Office Building A',
      pricePerDay: 150.0,
      pricePerWeek: 750.0,
      hoursPerDay: 8.0,
      notes: 'Main office building, 5 floors',
    },
  })

  const location2 = await prisma.location.create({
    data: {
      name: 'Retail Store B',
      pricePerDay: 100.0,
      pricePerWeek: 500.0,
      hoursPerDay: 6.0,
      notes: 'Small retail store',
    },
  })

  const location3 = await prisma.location.create({
    data: {
      name: 'Warehouse C',
      pricePerDay: 200.0,
      pricePerWeek: 1000.0,
      hoursPerDay: 8.0,
      notes: 'Large warehouse facility',
    },
  })

  console.log('Created locations:', { location1, location2, location3 })

  // Create schedules
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  // Create sample schedules (opcional - puedes comentar esto si no quieres schedules de ejemplo)
  // const schedule1 = await prisma.schedule.create({
  //   data: {
  //     employeeId: employees[0].id,
  //     locationId: location1.id,
  //     weekday: 1, // Monday
  //     startDate: today,
  //     endDate: null,
  //   },
  // })

  console.log('Schedules can be created later through the UI')

  // Create some sample workdays
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  // Workdays will be generated automatically by the cron job
  console.log('Workdays will be generated automatically from schedules')

  // Create a pay period
  const payPeriodStart = new Date(today)
  payPeriodStart.setDate(payPeriodStart.getDate() - 14)
  const payPeriodEnd = new Date(today)
  payPeriodEnd.setDate(payPeriodEnd.getDate() - 1)

  const payPeriod = await prisma.payPeriod.create({
    data: {
      startDate: payPeriodStart,
      endDate: payPeriodEnd,
    },
  })

  console.log('Created pay period:', payPeriod)

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

