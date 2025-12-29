'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'
import { formatDateUTC } from '@/lib/date-utils'

interface PayPeriod {
  id: string
  name?: string | null
  startDate: string
  endDate: string
  _count: { payrolls: number }
}

interface Employee {
  id: string
  name: string
}

interface Agency {
  id: string
  name: string
}

export default function PayPeriodsPage() {
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    name: '', 
    startDate: '', 
    endDate: '',
    employeeIds: [] as string[],
    agencyIds: [] as string[]
  })

  useEffect(() => {
    fetchPayPeriods()
    fetchEmployees()
    fetchAgencies()
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

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Payroll: Error fetching employees:', error)
      setEmployees([])
    }
  }

  async function fetchAgencies() {
    try {
      const res = await fetch('/api/agencies')
      const data = await res.json()
      setAgencies(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Payroll: Error fetching agencies:', error)
      setAgencies([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate) {
      alert('Por favor completa las fechas de inicio y fin')
      return
    }

    setSubmitting(true)
    try {
      console.log('Submitting form data:', formData)
      const res = await fetch('/api/payperiods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      let data
      const contentType = res.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const text = await res.text()
        console.error('Non-JSON response:', text)
        data = { error: 'Invalid response from server' }
      }

      console.log('Response:', res.status, data)

      if (res.ok) {
        setDialogOpen(false)
        setFormData({ name: '', startDate: '', endDate: '', employeeIds: [], agencyIds: [] })
        fetchPayPeriods()
        alert('Período de pago creado exitosamente')
      } else {
        const errorMsg = data?.error || data?.message || 'Error al crear el período de pago. Por favor intenta de nuevo.'
        alert(errorMsg)
        console.error('Error creating pay period:', { status: res.status, data, details: data?.details })
      }
    } catch (error: any) {
      console.error('Error creating pay period:', error)
      const errorMsg = error?.message || 'Error de conexión. Por favor verifica tu conexión e intenta de nuevo.'
      alert(errorMsg)
    } finally {
      setSubmitting(false)
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
            <Button onClick={() => setFormData({ name: '', startDate: '', endDate: '', employeeIds: [], agencyIds: [] })}>
              Agregar Período de Pago
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Período de Pago</DialogTitle>
              <DialogDescription>
                Crea un nuevo período de pago para el cálculo de nómina. Selecciona las agencias y empleados que se incluirán.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Período (opcional)</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Quincena 1 - Diciembre 2025"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Agencias</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {formData.agencyIds.length === 0
                          ? 'Todas las agencias'
                          : `${formData.agencyIds.length} agencia${formData.agencyIds.length > 1 ? 's' : ''} seleccionada${formData.agencyIds.length > 1 ? 's' : ''}`}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 max-h-[400px] overflow-hidden flex flex-col">
                      <div className="p-4 pb-2 flex items-center justify-between border-b">
                        <Label className="font-semibold">Seleccionar agencias</Label>
                        {formData.agencyIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, agencyIds: [] })}
                            className="h-6 px-2 text-xs"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div className="p-4 pt-2 space-y-2 overflow-y-auto flex-1">
                        {agencies.map((agency) => (
                          <div key={agency.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`agency-${agency.id}`}
                              checked={formData.agencyIds.includes(agency.id)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setFormData({ ...formData, agencyIds: [...formData.agencyIds, agency.id] })
                                } else {
                                  setFormData({ ...formData, agencyIds: formData.agencyIds.filter(id => id !== agency.id) })
                                }
                              }}
                            />
                            <Label htmlFor={`agency-${agency.id}`} className="font-normal cursor-pointer flex-1">
                              {agency.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Empleados</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {formData.employeeIds.length === 0
                          ? 'Todos los empleados'
                          : `${formData.employeeIds.length} empleado${formData.employeeIds.length > 1 ? 's' : ''} seleccionado${formData.employeeIds.length > 1 ? 's' : ''}`}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 max-h-[400px] overflow-hidden flex flex-col">
                      <div className="p-4 pb-2 flex items-center justify-between border-b">
                        <Label className="font-semibold">Seleccionar empleados</Label>
                        {formData.employeeIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, employeeIds: [] })}
                            className="h-6 px-2 text-xs"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>
                      <div className="p-4 pt-2 space-y-2 overflow-y-auto flex-1">
                        {employees.map((employee) => (
                          <div key={employee.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`emp-${employee.id}`}
                              checked={formData.employeeIds.includes(employee.id)}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setFormData({ ...formData, employeeIds: [...formData.employeeIds, employee.id] })
                                } else {
                                  setFormData({ ...formData, employeeIds: formData.employeeIds.filter(id => id !== employee.id) })
                                }
                              }}
                            />
                            <Label htmlFor={`emp-${employee.id}`} className="font-normal cursor-pointer flex-1">
                              {employee.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creando...' : 'Crear'}
                </Button>
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
                <TableHead>Nombre</TableHead>
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
                    <TableCell className="font-medium">{period.name || '-'}</TableCell>
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

