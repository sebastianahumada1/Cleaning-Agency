'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus, CalendarX } from 'lucide-react'
import { getWeekdayUTC, formatDateUTC, formatDateUTCSpanish } from '@/lib/date-utils'

interface Workday {
  id: string
  date: string
  employeeId: string
  locationId: string
  attended: boolean
  hoursWorked: number | null
  notes: string | null
  employee: { name: string }
  location: {
    name: string
    pricePerDay: number
    priceMonday?: number | null
    priceTuesday?: number | null
    priceWednesday?: number | null
    priceThursday?: number | null
    priceFriday?: number | null
    priceSaturday?: number | null
    priceSunday?: number | null
  }
}

interface Employee {
  id: string
  name: string
}

interface Location {
  id: string
  name: string
}

export default function WorkdaysPage() {
  const [workdays, setWorkdays] = useState<Workday[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [editingWorkday, setEditingWorkday] = useState<Workday | null>(null)
  const [notesText, setNotesText] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workdayToDelete, setWorkdayToDelete] = useState<Workday | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newWorkdayDate, setNewWorkdayDate] = useState(new Date().toISOString().split('T')[0])
  const [newWorkdayEmployeeId, setNewWorkdayEmployeeId] = useState<string>('')
  const [newWorkdayLocationId, setNewWorkdayLocationId] = useState<string>('')
  const [newWorkdayAttended, setNewWorkdayAttended] = useState(true)
  const [newWorkdayHoursWorked, setNewWorkdayHoursWorked] = useState<string>('')
  const [newWorkdayNotes, setNewWorkdayNotes] = useState('')
  const [creatingWorkday, setCreatingWorkday] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteStartDate, setBulkDeleteStartDate] = useState('')
  const [bulkDeleteEndDate, setBulkDeleteEndDate] = useState('')
  const [bulkDeleteEmployeeId, setBulkDeleteEmployeeId] = useState<string>('')
  const [bulkDeleteLocationId, setBulkDeleteLocationId] = useState<string>('')
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [bulkDeleteCount, setBulkDeleteCount] = useState<number | null>(null)
  const [countingBulk, setCountingBulk] = useState(false)

  useEffect(() => {
    fetchEmployeesAndLocations()
  }, [])

  useEffect(() => {
    fetchWorkdays()
  }, [startDate, endDate, selectedEmployeeId, selectedLocationId])

  async function fetchEmployeesAndLocations() {
    try {
      const [employeesRes, locationsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/locations'),
      ])
      const employeesData = await employeesRes.json()
      const locationsData = await locationsRes.json()
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      setLocations(Array.isArray(locationsData) ? locationsData : [])
    } catch (error) {
      console.error('Payroll: Error fetching employees and locations:', error)
      setEmployees([])
      setLocations([])
    }
  }

  async function fetchWorkdays() {
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (selectedEmployeeId) params.append('employeeId', selectedEmployeeId)
      if (selectedLocationId) params.append('locationId', selectedLocationId)

      const url = `/api/workdays?${params.toString()}`
      const res = await fetch(url)
      const data = await res.json()
      let workdaysArray = Array.isArray(data) ? data : []
      
      // Additional client-side filtering to ensure dates match the filter
      // This handles cases where dates in DB might have timezone issues
      if (startDate || endDate) {
        workdaysArray = workdaysArray.filter((workday: Workday) => {
          const workdayDateStr = new Date(workday.date).toISOString().split('T')[0]
          
          if (startDate && endDate) {
            return workdayDateStr >= startDate && workdayDateStr <= endDate
          } else if (startDate) {
            return workdayDateStr >= startDate
          } else if (endDate) {
            return workdayDateStr <= endDate
          }
          return true
        })
      }
      
      setWorkdays(workdaysArray)
    } catch (error) {
      console.error('Payroll: Error fetching workdays:', error)
      setWorkdays([])
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAttendance(id: string, currentAttended: boolean) {
    try {
      const res = await fetch(`/api/workdays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: !currentAttended }),
      })

      if (res.ok) {
        fetchWorkdays()
      }
    } catch (error) {
      console.error('Payroll: Error updating workday:', error)
    }
  }

  function openNotesDialog(workday: Workday) {
    setEditingWorkday(workday)
    setNotesText(workday.notes || '')
    setNotesDialogOpen(true)
  }

  async function handleSaveNotes() {
    if (!editingWorkday) return

    try {
      const res = await fetch(`/api/workdays/${editingWorkday.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText || null }),
      })

      if (res.ok) {
        setNotesDialogOpen(false)
        setEditingWorkday(null)
        setNotesText('')
        fetchWorkdays()
      }
    } catch (error) {
      console.error('Payroll: Error updating notes:', error)
      alert('Error al guardar las notas')
    }
  }

  function openDeleteDialog(workday: Workday) {
    setWorkdayToDelete(workday)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteWorkday() {
    if (!workdayToDelete) return

    try {
      const res = await fetch(`/api/workdays/${workdayToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        setWorkdayToDelete(null)
        fetchWorkdays()
      } else {
        alert('Error al eliminar el día de trabajo')
      }
    } catch (error) {
      console.error('Payroll: Error deleting workday:', error)
      alert('Error al eliminar el día de trabajo')
    }
  }

  async function handleCountBulkDelete() {
    if (!bulkDeleteStartDate || !bulkDeleteEndDate) {
      alert('Por favor selecciona ambas fechas')
      return
    }

    setCountingBulk(true)
    try {
      const params = new URLSearchParams()
      params.append('startDate', bulkDeleteStartDate)
      params.append('endDate', bulkDeleteEndDate)
      if (bulkDeleteEmployeeId) params.append('employeeId', bulkDeleteEmployeeId)
      if (bulkDeleteLocationId) params.append('locationId', bulkDeleteLocationId)

      // Primero contar los registros que coinciden
      const countRes = await fetch(`/api/workdays?${params.toString()}`)
      const workdaysData = await countRes.json()
      const workdaysArray = Array.isArray(workdaysData) ? workdaysData : []
      setBulkDeleteCount(workdaysArray.length)

      if (workdaysArray.length === 0) {
        alert('No se encontraron días de trabajo en el rango especificado')
      }
    } catch (error) {
      console.error('Payroll: Error counting workdays:', error)
      alert('Error al contar los días de trabajo')
    } finally {
      setCountingBulk(false)
    }
  }

  async function handleBulkDelete() {
    if (!bulkDeleteStartDate || !bulkDeleteEndDate) {
      alert('Por favor selecciona ambas fechas')
      return
    }

    if (bulkDeleteCount === null || bulkDeleteCount === 0) {
      alert('No hay días de trabajo para eliminar en el rango especificado')
      return
    }

    const confirmMessage = `¿Estás seguro de que deseas eliminar ${bulkDeleteCount} día(s) de trabajo?\n\n` +
      `Rango: ${new Date(bulkDeleteStartDate).toLocaleDateString('es-ES')} - ${new Date(bulkDeleteEndDate).toLocaleDateString('es-ES')}\n` +
      (bulkDeleteEmployeeId ? `Empleado: ${employees.find(e => e.id === bulkDeleteEmployeeId)?.name || 'Filtrado'}\n` : '') +
      (bulkDeleteLocationId ? `Ubicación: ${locations.find(l => l.id === bulkDeleteLocationId)?.name || 'Filtrado'}\n` : '') +
      `\nEsta acción no se puede deshacer.`

    if (!confirm(confirmMessage)) return

    setDeletingBulk(true)
    try {
      const params = new URLSearchParams()
      params.append('startDate', bulkDeleteStartDate)
      params.append('endDate', bulkDeleteEndDate)
      if (bulkDeleteEmployeeId) params.append('employeeId', bulkDeleteEmployeeId)
      if (bulkDeleteLocationId) params.append('locationId', bulkDeleteLocationId)

      const res = await fetch(`/api/workdays/bulk-delete?${params.toString()}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✓ ${data.message}`)
        setBulkDeleteDialogOpen(false)
        setBulkDeleteStartDate('')
        setBulkDeleteEndDate('')
        setBulkDeleteEmployeeId('')
        setBulkDeleteLocationId('')
        setBulkDeleteCount(null)
        fetchWorkdays()
      } else {
        alert(data.error || 'Error al eliminar los días de trabajo')
      }
    } catch (error) {
      console.error('Payroll: Error deleting workdays:', error)
      alert('Error al eliminar los días de trabajo')
    } finally {
      setDeletingBulk(false)
    }
  }

  function openBulkDeleteDialog() {
    setBulkDeleteStartDate(startDate)
    setBulkDeleteEndDate(endDate)
    setBulkDeleteEmployeeId(selectedEmployeeId)
    setBulkDeleteLocationId(selectedLocationId)
    setBulkDeleteCount(null)
    setBulkDeleteDialogOpen(true)
  }

  function openAddDialog() {
    setNewWorkdayDate(new Date().toISOString().split('T')[0])
    setNewWorkdayEmployeeId('')
    setNewWorkdayLocationId('')
    setNewWorkdayAttended(true)
    setNewWorkdayHoursWorked('')
    setNewWorkdayNotes('')
    setAddDialogOpen(true)
  }

  async function handleCreateWorkday() {
    if (!newWorkdayEmployeeId || !newWorkdayLocationId || !newWorkdayDate) {
      alert('Por favor completa todos los campos requeridos (Fecha, Empleado, Ubicación)')
      return
    }

    setCreatingWorkday(true)
    try {
      const res = await fetch('/api/workdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newWorkdayDate,
          employeeId: newWorkdayEmployeeId,
          locationId: newWorkdayLocationId,
          attended: newWorkdayAttended,
          hoursWorked: newWorkdayHoursWorked ? parseFloat(newWorkdayHoursWorked) : null,
          notes: newWorkdayNotes || null,
        }),
      })

      if (res.ok) {
        setAddDialogOpen(false)
        setNewWorkdayDate(new Date().toISOString().split('T')[0])
        setNewWorkdayEmployeeId('')
        setNewWorkdayLocationId('')
        setNewWorkdayAttended(true)
        setNewWorkdayHoursWorked('')
        setNewWorkdayNotes('')
        fetchWorkdays()
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Error al crear el día de trabajo')
      }
    } catch (error) {
      console.error('Payroll: Error creating workday:', error)
      alert('Error al crear el día de trabajo')
    } finally {
      setCreatingWorkday(false)
    }
  }

  function getPriceForDay(location: Workday['location'], date: string): number {
    // Use UTC weekday calculation
    const weekday = getWeekdayUTC(date)
    
    // Check if there's a specific price for this weekday
    let price: number | null = null
    switch (weekday) {
      case 1: // Monday
        price = location.priceMonday ? Number(location.priceMonday) : null
        break
      case 2: // Tuesday
        price = location.priceTuesday ? Number(location.priceTuesday) : null
        break
      case 3: // Wednesday
        price = location.priceWednesday ? Number(location.priceWednesday) : null
        break
      case 4: // Thursday
        price = location.priceThursday ? Number(location.priceThursday) : null
        break
      case 5: // Friday
        price = location.priceFriday ? Number(location.priceFriday) : null
        break
      case 6: // Saturday
        price = location.priceSaturday ? Number(location.priceSaturday) : null
        break
      case 7: // Sunday
        price = location.priceSunday ? Number(location.priceSunday) : null
        break
    }
    
    // Use specific price if available, otherwise use default pricePerDay
    return price !== null ? price : Number(location.pricePerDay)
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">Días Trabajados</h1>
        <p className="text-muted-foreground">Rastrea la asistencia diaria de trabajo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona filtros para ver los días trabajados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(value) => setSelectedEmployeeId(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(value) => setSelectedLocationId(value === 'all' ? '' : value)}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder="Todas las ubicaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ubicaciones</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Días Trabajados ({workdays.length})</CardTitle>
              <CardDescription>Registros diarios de trabajo</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={openAddDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Día Trabajado
              </Button>
              <Button 
                onClick={openBulkDeleteDialog} 
                variant="destructive" 
                className="flex items-center gap-2"
              >
                <CalendarX className="h-4 w-4" />
                Eliminar Rango
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workdays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay días de trabajo en el rango de fechas seleccionado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Asistió</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workdays.map((workday) => (
                  <TableRow key={workday.id}>
                    <TableCell>{formatDateUTCSpanish(new Date(workday.date))}</TableCell>
                    <TableCell className="font-medium">{workday.employee.name}</TableCell>
                    <TableCell>{workday.location.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${getPriceForDay(workday.location, workday.date).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={workday.attended ? 'default' : 'destructive'}
                        size="sm"
                        onClick={() => handleToggleAttendance(workday.id, workday.attended)}
                        className="min-w-[70px]"
                      >
                        {workday.attended ? '✓ Sí' : '✗ No'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={workday.notes || ''}>
                        {workday.notes || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openNotesDialog(workday)}
                          className="h-8 w-8 p-0"
                          title="Editar notas"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(workday)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Notas</DialogTitle>
            <DialogDescription>
              {editingWorkday && (
                <>
                  {editingWorkday.employee.name} - {editingWorkday.location.name} -{' '}
                  {formatDateUTC(new Date(editingWorkday.date)).split('-').reverse().join('/')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Agregar notas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotes}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Día de Trabajo</DialogTitle>
            <DialogDescription>
              {workdayToDelete && (
                <>
                  ¿Estás seguro de que deseas eliminar el día de trabajo de{' '}
                  <strong>{workdayToDelete.employee.name}</strong> en{' '}
                  <strong>{workdayToDelete.location.name}</strong> del{' '}
                  <strong>
                    {formatDateUTC(new Date(workdayToDelete.date)).split('-').reverse().join('/')}
                  </strong>
                  ? Esta acción no se puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkday}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Día de Trabajo</DialogTitle>
            <DialogDescription>
              Agrega un nuevo día de trabajo manualmente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDate">Fecha *</Label>
              <Input
                id="newDate"
                type="date"
                value={newWorkdayDate}
                onChange={(e) => setNewWorkdayDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmployee">Empleado *</Label>
              <Select
                value={newWorkdayEmployeeId}
                onValueChange={setNewWorkdayEmployeeId}
              >
                <SelectTrigger id="newEmployee">
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newLocation">Ubicación *</Label>
              <Select
                value={newWorkdayLocationId}
                onValueChange={setNewWorkdayLocationId}
              >
                <SelectTrigger id="newLocation">
                  <SelectValue placeholder="Selecciona una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="newAttended"
                checked={newWorkdayAttended}
                onChange={(e) => setNewWorkdayAttended(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="newAttended">Asistió</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newHoursWorked">Horas Trabajadas (opcional)</Label>
              <Input
                id="newHoursWorked"
                type="number"
                step="0.5"
                min="0"
                value={newWorkdayHoursWorked}
                onChange={(e) => setNewWorkdayHoursWorked(e.target.value)}
                placeholder="Ej: 8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newNotes">Notas (opcional)</Label>
              <Input
                id="newNotes"
                value={newWorkdayNotes}
                onChange={(e) => setNewWorkdayNotes(e.target.value)}
                placeholder="Agregar notas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkday} disabled={creatingWorkday}>
              {creatingWorkday ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Rango de Fechas</DialogTitle>
            <DialogDescription>
              Elimina múltiples días de trabajo dentro de un rango de fechas. Puedes filtrar por empleado y ubicación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkDeleteStartDate">Fecha Inicio *</Label>
                <Input
                  id="bulkDeleteStartDate"
                  type="date"
                  value={bulkDeleteStartDate}
                  onChange={(e) => {
                    setBulkDeleteStartDate(e.target.value)
                    setBulkDeleteCount(null)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkDeleteEndDate">Fecha Fin *</Label>
                <Input
                  id="bulkDeleteEndDate"
                  type="date"
                  value={bulkDeleteEndDate}
                  onChange={(e) => {
                    setBulkDeleteEndDate(e.target.value)
                    setBulkDeleteCount(null)
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulkDeleteEmployee">Empleado (opcional)</Label>
                <Select
                  value={bulkDeleteEmployeeId || "all"}
                  onValueChange={(value) => {
                    setBulkDeleteEmployeeId(value === "all" ? "" : value)
                    setBulkDeleteCount(null)
                  }}
                >
                  <SelectTrigger id="bulkDeleteEmployee">
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkDeleteLocation">Ubicación (opcional)</Label>
                <Select
                  value={bulkDeleteLocationId || "all"}
                  onValueChange={(value) => {
                    setBulkDeleteLocationId(value === "all" ? "" : value)
                    setBulkDeleteCount(null)
                  }}
                >
                  <SelectTrigger id="bulkDeleteLocation">
                    <SelectValue placeholder="Todas las ubicaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {bulkDeleteCount !== null && (
              <div className={`p-3 rounded-md ${bulkDeleteCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <p className="text-sm font-medium">
                  {bulkDeleteCount > 0 
                    ? `⚠️ Se eliminarán ${bulkDeleteCount} día(s) de trabajo`
                    : 'No se encontraron días de trabajo en el rango especificado'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleCountBulkDelete}
              disabled={!bulkDeleteStartDate || !bulkDeleteEndDate || countingBulk}
            >
              {countingBulk ? 'Contando...' : 'Contar Registros'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={!bulkDeleteStartDate || !bulkDeleteEndDate || deletingBulk || bulkDeleteCount === null || bulkDeleteCount === 0}
              >
                {deletingBulk ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

