'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateUTC } from '@/lib/date-utils'

interface PayPeriod {
  id: string
  startDate: string
  endDate: string
  _count: { payrolls: number }
}

export default function PayPeriodsPage() {
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ startDate: '', endDate: '' })

  useEffect(() => {
    fetchPayPeriods()
  }, [])

  async function fetchPayPeriods() {
    try {
      const res = await fetch('/api/payperiods')
      const data = await res.json()
      setPayPeriods(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Payroll: Error fetching pay periods:', error)
      setPayPeriods([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/payperiods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({ startDate: '', endDate: '' })
        fetchPayPeriods()
      }
    } catch (error) {
      console.error('Error creating pay period:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este período de pago?')) return

    try {
      const res = await fetch(`/api/payperiods/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPayPeriods()
      }
    } catch (error) {
      console.error('Error deleting pay period:', error)
    }
  }

  async function handleRunPayroll(payPeriodId: string) {
    if (!confirm('¿Ejecutar nómina para este período? Esto recalculará todas las nóminas.')) return

    try {
      const res = await fetch('/api/payroll/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payPeriodId }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(`¡Nómina completada! ${data.summary.totalPayrolls} registros creados. Total: $${data.summary.totalEarned.toFixed(2)}`)
        fetchPayPeriods()
      } else {
        alert(data.error || 'Error al ejecutar la nómina. Por favor intenta de nuevo.')
      }
    } catch (error) {
      console.error('Payroll: Error ejecutando nómina:', error)
      alert('Error de conexión. Por favor verifica tu conexión e intenta de nuevo.')
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Períodos de Pago</h1>
          <p className="text-muted-foreground">Gestiona períodos de pago quincenales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData({ startDate: '', endDate: '' })}>
              Agregar Período de Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Período de Pago</DialogTitle>
              <DialogDescription>
                Crea un nuevo período de pago para el cálculo de nómina
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de Inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Fecha de Fin *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Crear</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Períodos de Pago</CardTitle>
          <CardDescription>Lista de todos los períodos de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha de Inicio</TableHead>
                <TableHead>Fecha de Fin</TableHead>
                <TableHead>Nóminas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payPeriods.map((period) => {
                // Format dates using UTC to avoid timezone issues
                const startDateStr = formatDateUTC(new Date(period.startDate)).split('-').reverse().join('/')
                const endDateStr = formatDateUTC(new Date(period.endDate)).split('-').reverse().join('/')
                return (
                  <TableRow key={period.id}>
                    <TableCell>{startDateStr}</TableCell>
                    <TableCell>{endDateStr}</TableCell>
                    <TableCell>{period._count.payrolls}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRunPayroll(period.id)}
                      className="mr-2"
                    >
                      Ejecutar Nómina
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(period.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

