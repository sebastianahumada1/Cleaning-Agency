'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'

interface Schedule {
  id: string
  employeeId: string
  locationId: string
  weekday: number
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

interface LocationDay {
  day: number
  date: Date
  weekday: number
  workdayId?: string
  attended?: boolean
}

interface Workday {
  id: string
  date: string
  employeeId: string
  locationId: string
  attended: boolean
}

interface EmployeeReport {
  employeeId: string
  employeeName: string
  locations: {
    locationId: string
    locationName: string
    pricePerDay: number
    days: LocationDay[]
    total: number
  }[]
  total: number
}

interface Employee {
  id: string
  name: string
}

interface Agency {
  id: string
  name: string
}

export default function ReportPage() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [reportedBy, setReportedBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reportData, setReportData] = useState<EmployeeReport[]>([])
  const [workdays, setWorkdays] = useState<Workday[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [locations, setLocations] = useState<{ 
    id: string
    name: string
    pricePerDay: number
    agencyId?: string | null
    agency?: { id: string; name: string } | null
    priceMonday?: number | null
    priceTuesday?: number | null
    priceWednesday?: number | null
    priceThursday?: number | null
    priceFriday?: number | null
    priceSaturday?: number | null
    priceSunday?: number | null
  }[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([])
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<{ employeeId: string; employeeName: string } | null>(null)
  const [newLocationForm, setNewLocationForm] = useState({
    locationId: '',
    day: '',
  })
  
  useEffect(() => {
    Promise.all([
      fetch('/api/schedule').then(res => res.json()),
      fetch('/api/locations').then(res => res.json()),
      fetch('/api/employees').then(res => res.json()),
      fetch('/api/agencies').then(res => res.json())
    ]).then(([schedulesData, locationsData, employeesData, agenciesData]) => {
      setSchedules(Array.isArray(schedulesData) ? schedulesData : [])
      setLocations(Array.isArray(locationsData) ? locationsData : [])
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      setAgencies(Array.isArray(agenciesData) ? agenciesData : [])
    })
  }, [])

  function getDaysInRange(start: string, end: string): { day: number; date: Date; weekday: number }[] {
    // Use UTC to ensure consistent date handling
    const startDate = new Date(start + 'T00:00:00.000Z')
    const endDate = new Date(end + 'T00:00:00.000Z')
    const days: { day: number; date: Date; weekday: number }[] = []
    
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay() // 1=Monday, 7=Sunday
      days.push({
        day: d.getUTCDate(),
        date: new Date(d),
        weekday,
      })
    }
    
    return days
  }

  function getPriceForDay(location: Schedule['location'], weekday: number): number {
    switch (weekday) {
      case 1: return location.priceMonday ? Number(location.priceMonday) : Number(location.pricePerDay)
      case 2: return location.priceTuesday ? Number(location.priceTuesday) : Number(location.pricePerDay)
      case 3: return location.priceWednesday ? Number(location.priceWednesday) : Number(location.pricePerDay)
      case 4: return location.priceThursday ? Number(location.priceThursday) : Number(location.pricePerDay)
      case 5: return location.priceFriday ? Number(location.priceFriday) : Number(location.pricePerDay)
      case 6: return location.priceSaturday ? Number(location.priceSaturday) : Number(location.pricePerDay)
      case 7: return location.priceSunday ? Number(location.priceSunday) : Number(location.pricePerDay)
      default: return Number(location.pricePerDay)
    }
  }

  async function generateReport() {
    if (!startDate || !endDate) {
      alert('Por favor selecciona un rango de fechas')
      return
    }

    setLoading(true)
    try {
      // Fetch schedules and workdays
      const [schedulesRes, workdaysRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch(`/api/workdays?startDate=${startDate}&endDate=${endDate}`)
      ])
      
      const schedulesData = await schedulesRes.json()
      const schedules = Array.isArray(schedulesData) ? schedulesData : []
      
      const workdaysData = await workdaysRes.json()
      const workdaysArray = Array.isArray(workdaysData) ? workdaysData : []
      setWorkdays(workdaysArray)
      
      console.log('Payroll: Found schedules:', schedules.length)
      console.log('Payroll: Found workdays:', workdaysArray.length)

      // Get days in range
      const daysInRange = getDaysInRange(startDate, endDate)

      // Group by employee and location
      const employeeMap = new Map<string, EmployeeReport>()

      schedules.forEach((schedule: Schedule) => {
        if (!employeeMap.has(schedule.employeeId)) {
          employeeMap.set(schedule.employeeId, {
            employeeId: schedule.employeeId,
            employeeName: schedule.employee.name,
            locations: [],
            total: 0,
          })
        }

        const employeeReport = employeeMap.get(schedule.employeeId)!
        let locationReport = employeeReport.locations.find(
          loc => loc.locationId === schedule.locationId
        )

        if (!locationReport) {
          locationReport = {
            locationId: schedule.locationId,
            locationName: schedule.location.name,
            pricePerDay: Number(schedule.location.pricePerDay),
            days: [],
            total: 0,
          }
          employeeReport.locations.push(locationReport)
        }

        // Add days where this schedule applies
        daysInRange.forEach((dayInfo) => {
          if (dayInfo.weekday === schedule.weekday) {
            // Check if there's a workday for this day
            const workday = workdaysArray.find(
              (w: Workday) =>
                w.employeeId === schedule.employeeId &&
                w.locationId === schedule.locationId &&
                new Date(w.date).getDate() === dayInfo.day &&
                new Date(w.date).getMonth() === dayInfo.date.getMonth() &&
                new Date(w.date).getFullYear() === dayInfo.date.getFullYear()
            )
            
            locationReport.days.push({
              ...dayInfo,
              workdayId: workday?.id,
              attended: workday?.attended,
            })
          }
        })
      })

      // Calculate totals (only for approved days)
      employeeMap.forEach((report) => {
        report.locations.forEach((loc) => {
          loc.total = loc.days
            .filter(dayInfo => dayInfo.attended !== false) // Include approved or undefined (pending)
            .reduce((sum, dayInfo) => {
              const schedule = schedules.find(
                (s: Schedule) => 
                  s.employeeId === report.employeeId && 
                  s.locationId === loc.locationId &&
                  s.weekday === dayInfo.weekday
              )
              if (schedule) {
                return sum + getPriceForDay(schedule.location, dayInfo.weekday)
              }
              return sum
            }, 0)
        })
        
        report.total = report.locations.reduce((sum, loc) => sum + loc.total, 0)
      })

      let reportArray = Array.from(employeeMap.values())
      
      // Aplicar filtros de empleados
      if (selectedEmployeeIds.length > 0) {
        reportArray = reportArray.filter(emp => selectedEmployeeIds.includes(emp.employeeId))
      }
      
      // Aplicar filtros de agencias
      if (selectedAgencyIds.length > 0) {
        reportArray = reportArray.map(emp => {
          const filteredLocations = emp.locations.filter(loc => {
            const location = locations.find(l => l.id === loc.locationId)
            return location && location.agencyId && selectedAgencyIds.includes(location.agencyId)
          })
          
          if (filteredLocations.length === 0) return null
          
          const newTotal = filteredLocations.reduce((sum, loc) => sum + loc.total, 0)
          return {
            ...emp,
            locations: filteredLocations,
            total: newTotal
          }
        }).filter((emp): emp is EmployeeReport => emp !== null)
      }
      
      setReportData(reportArray)
      
      if (reportArray.length === 0) {
        alert('No se encontraron horarios (schedules) configurados.\n\nVe a la página Schedule para asignar empleados a ubicaciones.')
      }
    } catch (error) {
      console.error('Payroll: Error generating report:', error)
      alert('Error al generar el reporte. Revisa la consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleDayAttendance(employeeId: string, locationId: string, dayInfo: LocationDay) {
    try {
      const dateStr = dayInfo.date.toISOString().split('T')[0]
      
      // Fetch current schedules if not loaded
      let currentSchedules = schedules
      if (currentSchedules.length === 0) {
        const res = await fetch('/api/schedule')
        const data = await res.json()
        currentSchedules = Array.isArray(data) ? data : []
      }
      
      if (dayInfo.workdayId) {
        // Update existing workday
        const currentAttended = dayInfo.attended !== false
        const res = await fetch(`/api/workdays/${dayInfo.workdayId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attended: !currentAttended }),
        })

        if (res.ok) {
          const updatedWorkday = await res.json()
          setWorkdays(prev => prev.map(w => 
            w.id === dayInfo.workdayId ? { ...w, attended: updatedWorkday.attended } : w
          ))
          
          // Update report data
          setReportData(prev => prev.map(employee => {
            if (employee.employeeId !== employeeId) return employee
            
            const updatedLocations = employee.locations.map(loc => {
              if (loc.locationId !== locationId) return loc
              
              const updatedDays = loc.days.map(d => 
                d.day === dayInfo.day ? { ...d, attended: updatedWorkday.attended } : d
              )
              
              // Recalculate total
              const total = updatedDays
                .filter(d => d.attended !== false)
                .reduce((sum, d) => {
                  const schedule = currentSchedules.find(
                    (s: Schedule) => 
                      s.employeeId === employeeId && 
                      s.locationId === locationId &&
                      s.weekday === d.weekday
                  )
                  if (schedule) {
                    return sum + getPriceForDay(schedule.location, d.weekday)
                  }
                  return sum
                }, 0)
              
              return { ...loc, days: updatedDays, total }
            })
            
            const employeeTotal = updatedLocations.reduce((sum, loc) => sum + loc.total, 0)
            return { ...employee, locations: updatedLocations, total: employeeTotal }
          }))
        }
      } else {
        // Create new workday (approve by default)
        const res = await fetch('/api/workdays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            employeeId,
            locationId,
            attended: true,
          }),
        })

        if (res.ok) {
          const newWorkday = await res.json()
          setWorkdays(prev => [...prev, newWorkday])
          
          // Update report data
          setReportData(prev => prev.map(employee => {
            if (employee.employeeId !== employeeId) return employee
            
            const updatedLocations = employee.locations.map(loc => {
              if (loc.locationId !== locationId) return loc
              
              const updatedDays = loc.days.map(d => 
                d.day === dayInfo.day ? { ...d, workdayId: newWorkday.id, attended: true } : d
              )
              
              // Recalculate total
              const total = updatedDays
                .filter(d => d.attended !== false)
                .reduce((sum, d) => {
                  const schedule = currentSchedules.find(
                    (s: Schedule) => 
                      s.employeeId === employeeId && 
                      s.locationId === locationId &&
                      s.weekday === d.weekday
                  )
                  if (schedule) {
                    return sum + getPriceForDay(schedule.location, d.weekday)
                  }
                  return sum
                }, 0)
              
              return { ...loc, days: updatedDays, total }
            })
            
            const employeeTotal = updatedLocations.reduce((sum, loc) => sum + loc.total, 0)
            return { ...employee, locations: updatedLocations, total: employeeTotal }
          }))
        }
      }
    } catch (error) {
      console.error('Payroll: Error toggling attendance:', error)
      alert('Error al actualizar la asistencia')
    }
  }

  async function handleAddLocation() {
    if (!selectedEmployee || !newLocationForm.locationId || !newLocationForm.day) {
      alert('Por favor completa todos los campos')
      return
    }

    try {
      const dayInfo = daysInRange.find(d => d.day.toString() === newLocationForm.day)
      if (!dayInfo) {
        alert('Día no válido')
        return
      }

      const location = locations.find(l => l.id === newLocationForm.locationId)
      if (!location) {
        alert('Ubicación no encontrada')
        return
      }

      const dateStr = dayInfo.date.toISOString().split('T')[0]

      // Check if workday already exists
      const existingWorkday = workdays.find(
        w => w.employeeId === selectedEmployee.employeeId &&
        w.locationId === newLocationForm.locationId &&
        w.date === dateStr
      )

      if (existingWorkday) {
        alert('Ya existe un registro para este empleado, ubicación y día')
        return
      }

      // Create workday
      const res = await fetch('/api/workdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          employeeId: selectedEmployee.employeeId,
          locationId: newLocationForm.locationId,
          attended: true,
        }),
      })

      if (res.ok) {
        const newWorkday = await res.json()
        setWorkdays(prev => [...prev, newWorkday])

        // Update report data
        setReportData(prev => prev.map(employee => {
          if (employee.employeeId !== selectedEmployee.employeeId) return employee

          // Check if location already exists in report
          let locationReport = employee.locations.find(loc => loc.locationId === newLocationForm.locationId)

          if (!locationReport) {
            // Add new location
            locationReport = {
              locationId: newLocationForm.locationId,
              locationName: location.name,
              pricePerDay: Number(location.pricePerDay),
              days: [],
              total: 0,
            }
            employee.locations.push(locationReport)
          }

          // Add day to location
          if (!locationReport.days.find(d => d.day === dayInfo.day)) {
            locationReport.days.push({
              ...dayInfo,
              workdayId: newWorkday.id,
              attended: true,
            })
          }

          // Recalculate totals
          employee.locations.forEach((loc) => {
            loc.total = loc.days
              .filter(d => d.attended !== false)
              .reduce((sum, d) => {
                const schedule = schedules.find(
                  (s: Schedule) => 
                    s.employeeId === employee.employeeId && 
                    s.locationId === loc.locationId &&
                    s.weekday === d.weekday
                )
                if (schedule) {
                  return sum + getPriceForDay(schedule.location, d.weekday)
                }
                // If no schedule, find location and use its price
                const locData = locations.find(l => l.id === loc.locationId)
                if (locData) {
                  return sum + getPriceForDay(locData as Schedule['location'], d.weekday)
                }
                return sum + loc.pricePerDay
              }, 0)
          })

          employee.total = employee.locations.reduce((sum, loc) => sum + loc.total, 0)

          return employee
        }))

        setAddLocationDialogOpen(false)
        setSelectedEmployee(null)
        setNewLocationForm({ locationId: '', day: '' })
      }
    } catch (error) {
      console.error('Payroll: Error adding location:', error)
      alert('Error al agregar la ubicación')
    }
  }

  function openAddLocationDialog(employee: { employeeId: string; employeeName: string }) {
    setSelectedEmployee(employee)
    setNewLocationForm({ locationId: '', day: '' })
    setAddLocationDialogOpen(true)
  }

  async function handleSaveReport() {
    setSaving(true)
    try {
      // Verify all workdays are saved (only check approved days)
      const allWorkdaysSaved = reportData.every(employee => 
        employee.locations.every(loc => 
          loc.days
            .filter(day => day.attended !== false)
            .every(day => day.workdayId !== undefined)
        )
      )

      if (!allWorkdaysSaved) {
        // Create missing workdays
        const daysInRange = getDaysInRange(startDate, endDate)
        
        for (const employee of reportData) {
          for (const location of employee.locations) {
            for (const dayInfo of location.days) {
              if (!dayInfo.workdayId && (dayInfo.attended === true || dayInfo.attended === undefined)) {
                const dateStr = dayInfo.date.toISOString().split('T')[0]
                try {
                  const res = await fetch('/api/workdays', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      date: dateStr,
                      employeeId: employee.employeeId,
                      locationId: location.locationId,
                      attended: dayInfo.attended === true || dayInfo.attended === undefined,
                    }),
                  })
                  if (res.ok) {
                    const newWorkday = await res.json()
                    // Update local state
                    setWorkdays(prev => [...prev, newWorkday])
                    setReportData(prev => prev.map(emp => {
                      if (emp.employeeId !== employee.employeeId) return emp
                      const updatedLocations = emp.locations.map(loc => {
                        if (loc.locationId !== location.locationId) return loc
                        const updatedDays = loc.days.map(d => 
                          d.day === dayInfo.day ? { ...d, workdayId: newWorkday.id } : d
                        )
                        return { ...loc, days: updatedDays }
                      })
                      return { ...emp, locations: updatedLocations }
                    }))
                  }
                } catch (error) {
                  console.error('Payroll: Error creating workday:', error)
                }
              }
            }
          }
        }
      }

      // Save report metadata
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          reportDate: reportDate || null,
          reportedBy: reportedBy || null,
        }),
      })

      if (res.ok) {
        alert('Reporte guardado exitosamente!\n\nTodos los workdays han sido guardados y están disponibles en la página Workdays.')
      } else {
        alert('Reporte guardado (workdays ya están guardados)')
      }
    } catch (error) {
      console.error('Payroll: Error saving report:', error)
      alert('Error al guardar el reporte. Los workdays individuales ya están guardados.')
    } finally {
      setSaving(false)
    }
  }

  const daysInRange = startDate && endDate ? getDaysInRange(startDate, endDate) : []

  // Calculate progress: total days expected vs days with workdays
  function calculateProgress() {
    if (reportData.length === 0) {
      return { total: 0, loaded: 0, percentage: 0 }
    }

    let totalDays = 0
    let loadedDays = 0

    reportData.forEach(employee => {
      employee.locations.forEach(location => {
        location.days.forEach(day => {
          totalDays++
          if (day.workdayId) {
            loadedDays++
          }
        })
      })
    })

    const percentage = totalDays > 0 ? Math.round((loadedDays / totalDays) * 100) : 0

    return { total: totalDays, loaded: loadedDays, percentage }
  }

  const progress = calculateProgress()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">Reporte de Nómina</h1>
        <p className="text-muted-foreground">Visualiza el trabajo diario por empleado y ubicación basado en horarios</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="bg-amber-100 dark:bg-amber-900/20 p-2 rounded">CAMPOS OBLIGATORIOS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">INICIO CORTE *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">FIN CORTE *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDate">FECHA REPORTE</Label>
              <Input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportedBy">REPORTADO POR:</Label>
              <Input
                id="reportedBy"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Nombre"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Empleados</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedEmployeeIds.length === 0
                      ? 'Todos los empleados'
                      : `${selectedEmployeeIds.length} empleado${selectedEmployeeIds.length > 1 ? 's' : ''} seleccionado${selectedEmployeeIds.length > 1 ? 's' : ''}`}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Seleccionar empleados</Label>
                      {selectedEmployeeIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmployeeIds([])}
                          className="h-6 px-2 text-xs"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`emp-report-${employee.id}`}
                            checked={selectedEmployeeIds.includes(employee.id)}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setSelectedEmployeeIds([...selectedEmployeeIds, employee.id])
                              } else {
                                setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== employee.id))
                              }
                            }}
                          />
                          <Label htmlFor={`emp-report-${employee.id}`} className="font-normal cursor-pointer flex-1">
                            {employee.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Agencias</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedAgencyIds.length === 0
                      ? 'Todas las agencias'
                      : `${selectedAgencyIds.length} agencia${selectedAgencyIds.length > 1 ? 's' : ''} seleccionada${selectedAgencyIds.length > 1 ? 's' : ''}`}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-semibold">Seleccionar agencias</Label>
                      {selectedAgencyIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAgencyIds([])}
                          className="h-6 px-2 text-xs"
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {agencies.map((agency) => (
                        <div key={agency.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`agency-report-${agency.id}`}
                            checked={selectedAgencyIds.includes(agency.id)}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setSelectedAgencyIds([...selectedAgencyIds, agency.id])
                              } else {
                                setSelectedAgencyIds(selectedAgencyIds.filter(id => id !== agency.id))
                              }
                            }}
                          />
                          <Label htmlFor={`agency-report-${agency.id}`} className="font-normal cursor-pointer flex-1">
                            {agency.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Generando...' : 'Generar Reporte'}
            </Button>
            {reportData.length > 0 && (
              <Button 
                onClick={handleSaveReport} 
                disabled={loading || saving}
                variant="default"
              >
                {saving ? 'Guardando...' : 'Guardar Reporte'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso de Workdays Cargados</CardTitle>
            <CardDescription>
              Días de trabajo que ya han sido guardados como workdays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {progress.loaded} de {progress.total} días cargados
                </span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.loaded} max={progress.total} />
              <p className="text-xs text-muted-foreground mt-2">
                Haz clic en los días del reporte para crear los workdays faltantes
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No hay datos para mostrar</p>
              <p className="text-sm">
                No se encontraron horarios configurados
              </p>
              <p className="text-xs mt-4">
                Ve a la página <strong>Schedule</strong> para asignar empleados a ubicaciones por día de la semana
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-amber-100 dark:bg-amber-900/20 sticky left-0 z-10 min-w-[200px]">
                      Empleado / Ubicación
                    </TableHead>
                    <TableHead className="bg-green-100 dark:bg-green-900/20 text-center">#/DAY</TableHead>
                    {daysInRange.map((dayInfo) => (
                      <TableHead key={dayInfo.day} className="text-center min-w-[40px]">
                        {dayInfo.day}
                      </TableHead>
                    ))}
                    <TableHead className="bg-blue-100 dark:bg-blue-900/20 text-right min-w-[100px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((employee) => (
                    <>
                      <TableRow key={employee.employeeId} className="bg-amber-50 dark:bg-amber-900/10">
                        <TableCell className="font-bold sticky left-0 bg-amber-50 dark:bg-amber-900/10 z-10">
                          <div className="flex items-center justify-between">
                            <span>{employee.employeeName}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddLocationDialog({ employeeId: employee.employeeId, employeeName: employee.employeeName })}
                              className="ml-2"
                            >
                              + Ubicación
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="bg-green-50 dark:bg-green-900/10"></TableCell>
                        {daysInRange.map((dayInfo) => (
                          <TableCell key={dayInfo.day} className="text-center"></TableCell>
                        ))}
                        <TableCell className="bg-blue-50 dark:bg-blue-900/10 text-right font-bold">
                          ${employee.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {employee.locations.map((location) => (
                        <TableRow key={`${employee.employeeId}-${location.locationId}`}>
                          <TableCell className="pl-8 sticky left-0 bg-background z-10">
                            {location.locationName} (${location.pricePerDay.toFixed(0)})
                          </TableCell>
                          <TableCell className="bg-green-50 dark:bg-green-900/10 text-center">
                            {location.days
                              .filter(d => d.attended !== false)
                              .map(d => d.day)
                              .sort((a, b) => a - b)
                              .join(', ')}
                          </TableCell>
                          {daysInRange.map((dayInfo) => {
                            const locationDay = location.days.find(d => d.day === dayInfo.day)
                            const hasWork = locationDay !== undefined
                            const isApproved = locationDay?.attended === true
                            const isRejected = locationDay?.attended === false
                            
                            return (
                              <TableCell
                                key={dayInfo.day}
                                className={`text-center cursor-pointer transition-colors ${
                                  isApproved 
                                    ? 'bg-green-200 dark:bg-green-800/30 font-bold hover:bg-green-300' 
                                    : isRejected
                                    ? 'bg-red-200 dark:bg-red-800/30 font-bold hover:bg-red-300'
                                    : hasWork
                                    ? 'bg-yellow-200 dark:bg-yellow-800/30 font-bold hover:bg-yellow-300'
                                    : ''
                                }`}
                                onClick={() => {
                                  if (hasWork) {
                                    toggleDayAttendance(employee.employeeId, location.locationId, locationDay!)
                                  }
                                }}
                                title={hasWork 
                                  ? (isApproved ? 'Aprobado - Clic para denegar' : isRejected ? 'Denegado - Clic para aprobar' : 'Pendiente - Clic para aprobar')
                                  : 'Sin trabajo programado'
                                }
                              >
                                {hasWork ? (
                                  <span className={isApproved ? 'text-green-800 dark:text-green-200' : isRejected ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}>
                                    {isApproved ? '✓' : isRejected ? '✗' : '○'} {dayInfo.day}
                                  </span>
                                ) : ''}
                              </TableCell>
                            )
                          })}
                          <TableCell className="bg-blue-50 dark:bg-blue-900/10 text-right font-medium">
                            ${location.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={addLocationDialogOpen} onOpenChange={setAddLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Ubicación - {selectedEmployee?.employeeName}</DialogTitle>
            <DialogDescription>
              Agrega una ubicación adicional para este empleado (ej: relevo o trabajo extra)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Select
                value={newLocationForm.locationId}
                onValueChange={(value) => setNewLocationForm({ ...newLocationForm, locationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} (${Number(loc.pricePerDay).toFixed(0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="day">Día *</Label>
              <Select
                value={newLocationForm.day}
                onValueChange={(value) => setNewLocationForm({ ...newLocationForm, day: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un día" />
                </SelectTrigger>
                <SelectContent>
                  {daysInRange.map((dayInfo) => (
                    <SelectItem key={dayInfo.day} value={dayInfo.day.toString()}>
                      Día {dayInfo.day} ({dayInfo.date.toLocaleDateString('es-ES', { weekday: 'short' })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddLocation}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
