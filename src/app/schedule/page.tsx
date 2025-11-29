'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Schedule {
  id: string
  employeeId: string
  locationId: string
  weekday: number
  startDate: string
  endDate: string | null
  employee: { name: string }
  location: { name: string }
}

interface Employee {
  id: string
  name: string
}

interface Location {
  id: string
  name: string
}

const weekdays = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
]

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; weekday: number } | null>(null)
  const [formData, setFormData] = useState({
    locationId: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [schedulesRes, employeesRes, locationsRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/employees'),
        fetch('/api/locations'),
      ])

      const schedulesData = await schedulesRes.json()
      const employeesData = await employeesRes.json()
      const locationsData = await locationsRes.json()

      setSchedules(Array.isArray(schedulesData) ? schedulesData : [])
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      setLocations(Array.isArray(locationsData) ? locationsData : [])
    } catch (error) {
      console.error('Payroll: Error fetching data:', error)
      setSchedules([])
      setEmployees([])
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  function getSchedulesForCell(employeeId: string, weekday: number): Schedule[] {
    return schedules.filter(s => 
      s.employeeId === employeeId && 
      s.weekday === weekday
    )
  }

  function handleCellClick(employeeId: string, weekday: number) {
    setSelectedCell({ employeeId, weekday })
    setFormData({
      locationId: '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCell || !formData.locationId) return

    try {
      // Check if this location is already assigned
      const existingSchedules = getSchedulesForCell(selectedCell.employeeId, selectedCell.weekday)
      const alreadyExists = existingSchedules.some(s => s.locationId === formData.locationId)

      if (alreadyExists) {
        alert('Esta ubicación ya está asignada para este día')
        return
      }

      // Create new schedule
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedCell.employeeId,
          locationId: formData.locationId,
          weekday: selectedCell.weekday,
        }),
      })

      if (res.ok) {
        setFormData({
          locationId: '',
        })
        fetchData()
      }
    } catch (error) {
      console.error('Payroll: Error saving schedule:', error)
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta asignación?')) return

    try {
      const res = await fetch(`/api/schedule/${scheduleId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Payroll: Error deleting schedule:', error)
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  const selectedEmployee = selectedCell ? employees.find(e => e.id === selectedCell.employeeId) : null
  const selectedWeekday = selectedCell ? weekdays.find(d => d.value === selectedCell.weekday) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">Agenda Semanal</h1>
        <p className="text-muted-foreground">Asigna empleados a ubicaciones por día de la semana</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horarios por Empleado</CardTitle>
          <CardDescription>
            Haz clic en una celda para asignar o editar la ubicación de un empleado para ese día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Empleado</TableHead>
                  {weekdays.map((day) => (
                    <TableHead key={day.value} className="text-center min-w-[120px]">
                      {day.short}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      {employee.name}
                    </TableCell>
                    {weekdays.map((day) => {
                      const cellSchedules = getSchedulesForCell(employee.id, day.value)
                      return (
                        <TableCell
                          key={day.value}
                          className="text-center cursor-pointer hover:bg-muted/50 transition-colors p-2"
                          onClick={() => handleCellClick(employee.id, day.value)}
                        >
                          {cellSchedules.length > 0 ? (
                            <div className="space-y-1">
                              {cellSchedules.map((schedule) => (
                                <div key={schedule.id} className="text-xs font-medium bg-primary/10 rounded px-1 py-0.5">
                                  {schedule.location.name}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee && selectedWeekday 
                ? `Ubicaciones - ${selectedEmployee.name} (${selectedWeekday.label})`
                : 'Asignar Ubicación'}
            </DialogTitle>
            <DialogDescription>
              Gestiona las ubicaciones asignadas para este empleado en este día
            </DialogDescription>
          </DialogHeader>
          
          {selectedCell && (
            <div className="space-y-4 py-4">
              {/* Lista de ubicaciones asignadas */}
              {getSchedulesForCell(selectedCell.employeeId, selectedCell.weekday).length > 0 && (
                <div className="space-y-2">
                  <Label>Ubicaciones Asignadas</Label>
                  <div className="space-y-2 border rounded-lg p-3">
                    {getSchedulesForCell(selectedCell.employeeId, selectedCell.weekday).map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                        <div className="font-medium">{schedule.location.name}</div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario para agregar nueva ubicación */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Agregar Nueva Ubicación</Label>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="locationId">Ubicación *</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una ubicación" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations
                          .filter(loc => 
                            !getSchedulesForCell(selectedCell.employeeId, selectedCell.weekday)
                              .some(s => s.locationId === loc.id)
                          )
                          .map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">Agregar Ubicación</Button>
                </form>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
