'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  employees: number
  locations: number
  workdaysThisWeek: number
  totalPayroll: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    employees: 0,
    locations: 0,
    workdaysThisWeek: 0,
    totalPayroll: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [employeesRes, locationsRes, workdaysRes, payrollRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/locations'),
          fetch('/api/workdays?startDate=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          fetch('/api/payroll'),
        ])

        const employees = await employeesRes.json()
        const locations = await locationsRes.json()
        const workdays = await workdaysRes.json()
        const payrolls = await payrollRes.json()

        // Validate that responses are arrays
        const employeesArray = Array.isArray(employees) ? employees : []
        const locationsArray = Array.isArray(locations) ? locations : []
        const workdaysArray = Array.isArray(workdays) ? workdays : []
        const payrollsArray = Array.isArray(payrolls) ? payrolls : []

        const totalPayroll = payrollsArray.reduce((sum: number, p: any) => sum + Number(p.totalEarned || 0), 0)

        setStats({
          employees: employeesArray.length,
          locations: locationsArray.length,
          workdaysThisWeek: workdaysArray.length,
          totalPayroll,
        })
      } catch (error) {
        console.error('Payroll: Error fetching stats:', error)
        // Set default values on error
        setStats({
          employees: 0,
          locations: 0,
          workdaysThisWeek: 0,
          totalPayroll: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Panel</h1>
        <p className="text-muted-foreground">Vista general de tu agencia de limpieza</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.employees}</div>
            <p className="text-xs text-muted-foreground">Empleados activos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Ubicaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.locations}</div>
            <p className="text-xs text-muted-foreground">Total de ubicaciones</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Días Trabajados (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.workdaysThisWeek}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Nómina Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">${stats.totalPayroll.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Todo el tiempo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

