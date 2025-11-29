'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'

interface Payroll {
  id: string
  employeeId: string
  locationId: string
  payPeriodId: string
  daysWorked: number
  totalEarned: number
  employee: { name: string }
  location: { name: string }
  payperiod: { startDate: string; endDate: string }
}

interface PayPeriod {
  id: string
  startDate: string
  endDate: string
}

interface Employee {
  id: string
  name: string
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exportingImages, setExportingImages] = useState(false)

  useEffect(() => {
    fetchPayPeriods()
    fetchEmployees()
  }, [])

  useEffect(() => {
    fetchPayrolls(selectedPeriod, selectedEmployeeId)
  }, [selectedPeriod, selectedEmployeeId])

  async function fetchPayPeriods() {
    try {
      const res = await fetch('/api/payperiods')
      const data = await res.json()
      const payPeriodsArray = Array.isArray(data) ? data : []
      setPayPeriods(payPeriodsArray)
      if (payPeriodsArray.length > 0 && !selectedPeriod) {
        setSelectedPeriod(payPeriodsArray[0].id)
      }
    } catch (error) {
      console.error('Payroll: Error fetching pay periods:', error)
      setPayPeriods([])
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

  async function fetchPayrolls(payPeriodId?: string, employeeId?: string) {
    try {
      const params = new URLSearchParams()
      if (payPeriodId) params.append('payPeriodId', payPeriodId)
      if (employeeId) params.append('employeeId', employeeId)

      const url = params.toString() ? `/api/payroll?${params.toString()}` : '/api/payroll'
      const res = await fetch(url)
      const data = await res.json()
      setPayrolls(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Payroll: Error fetching payrolls:', error)
      setPayrolls([])
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!selectedPeriod) {
      alert('Por favor selecciona un período de pago primero')
      return
    }

    try {
      const res = await fetch(`/api/payroll/export?payPeriodId=${selectedPeriod}&format=csv`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${selectedPeriod}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting payroll:', error)
    }
  }

  async function handleExportImages() {
    if (!selectedPeriod) {
      alert('Por favor selecciona un período de pago primero')
      return
    }

    if (payrollsArray.length === 0) {
      alert('No hay datos de nómina para exportar')
      return
    }

    setExportingImages(true)
    try {
      const zip = new JSZip()
      const selectedPeriodData = payPeriods.find(p => p.id === selectedPeriod)
      // Simple period label for folder name
      const periodLabel = selectedPeriodData
        ? `${new Date(selectedPeriodData.startDate).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}_${new Date(selectedPeriodData.endDate).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}`
        : selectedPeriod

      // Group payrolls by employee
      const payrollsByEmployee = payrollsArray.reduce((acc, payroll) => {
        const employeeName = payroll.employee.name
        if (!acc[employeeName]) {
          acc[employeeName] = []
        }
        acc[employeeName].push(payroll)
        return acc
      }, {} as Record<string, Payroll[]>)

      // Generate image for each employee
      const imagePromises = Object.entries(payrollsByEmployee).map(async ([employeeName, employeePayrolls]) => {
        const totalDays = employeePayrolls.reduce((sum, p) => sum + p.daysWorked, 0)
        const totalEarned = employeePayrolls.reduce((sum, p) => sum + Number(p.totalEarned), 0)

        // Create HTML for employee payroll
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                font-family: Arial, sans-serif;
                background: white;
                width: 800px;
                margin: 0;
                padding: 0;
                overflow: visible;
              }
              body {
                padding: 12px 40px 12px 40px;
                min-height: auto;
              }
              .header {
                text-align: center;
                border-bottom: 3px solid #000;
                padding-bottom: 8px;
                margin-bottom: 10px;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
              }
              .header h2 {
                margin: 3px 0 0 0;
                font-size: 16px;
                font-weight: normal;
              }
              .info-section {
                margin-bottom: 10px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 3px 0;
                border-bottom: 1px solid #ddd;
              }
              .info-label {
                font-weight: bold;
              }
              .table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              .table th, .table td {
                border: 1px solid #000;
                padding: 6px;
                text-align: left;
              }
              .table th {
                background-color: #f0f0f0;
                font-weight: bold;
                font-size: 14px;
              }
              .table td {
                background-color: white;
                font-size: 14px;
              }
              .total-section {
                margin-top: 10px;
                padding-top: 8px;
                border-top: 2px solid #000;
                margin-bottom: 0;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 16px;
                font-weight: bold;
                padding: 4px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>NÓMINA DE PAGO</h1>
              <h2>Período: ${selectedPeriodData ? `${new Date(selectedPeriodData.startDate).toLocaleDateString('es-ES')} - ${new Date(selectedPeriodData.endDate).toLocaleDateString('es-ES')}` : 'N/A'}</h2>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Empleado:</span>
                <span>${employeeName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Período:</span>
                <span>${selectedPeriodData ? `${new Date(selectedPeriodData.startDate).toLocaleDateString('es-ES')} - ${new Date(selectedPeriodData.endDate).toLocaleDateString('es-ES')}` : 'N/A'}</span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Ubicación</th>
                  <th>Días Trabajados</th>
                  <th>Total Ganado</th>
                </tr>
              </thead>
              <tbody>
                ${employeePayrolls.map(p => `
                  <tr>
                    <td>${p.location.name}</td>
                    <td>${p.daysWorked}</td>
                    <td>$${Number(p.totalEarned).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <span>Total Días Trabajados:</span>
                <span>${totalDays}</span>
              </div>
              <div class="total-row">
                <span>Total Ganado:</span>
                <span>$${totalEarned.toFixed(2)}</span>
              </div>
            </div>
          </body>
          </html>
        `

        // Create a temporary iframe to render the HTML
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.left = '-9999px'
        iframe.style.width = '800px'
        iframe.style.height = '2000px' // Initial height, will be adjusted
        iframe.style.border = 'none'
        document.body.appendChild(iframe)

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) {
          document.body.removeChild(iframe)
          return
        }

        iframeDoc.open()
        iframeDoc.write(htmlContent)
        iframeDoc.close()

        // Wait for content to load and images to render
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Get the actual content height - use body for more accurate measurement
        const body = iframeDoc.body
        const html = iframeDoc.documentElement
        
        // Ensure no extra margins/padding from defaults
        html.style.margin = '0'
        html.style.padding = '0'
        html.style.height = 'auto'
        body.style.margin = '0'
        body.style.height = 'auto'
        body.style.overflow = 'visible'
        
        // Wait for layout to recalculate
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Get precise content height using getBoundingClientRect for accurate measurement
        const bodyRect = body.getBoundingClientRect()
        const lastChild = body.lastElementChild
        const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : null
        
        // Calculate height from first pixel to last element's bottom
        const contentHeight = lastChildRect 
          ? Math.ceil(lastChildRect.bottom - bodyRect.top)
          : Math.ceil(body.scrollHeight)

        // Adjust iframe and body height to match content exactly - no extra space
        iframe.style.height = `${contentHeight}px`
        body.style.height = `${contentHeight}px`
        body.style.overflow = 'hidden'

        // Wait a bit more for layout to settle
        await new Promise(resolve => setTimeout(resolve, 200))

        // Convert to canvas - use exact calculated height
        const canvas = await html2canvas(body, {
          width: 800,
          height: contentHeight,
          useCORS: true,
          background: '#ffffff',
          logging: false,
          allowTaint: true,
        })

        // Convert canvas to blob and add to zip (directly in root, no subfolders)
        return new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              // Simple filename: just employee name, no period in filename since it's in the ZIP name
              const fileName = `${employeeName.replace(/[^a-z0-9áéíóúñü]/gi, '_')}.png`
              zip.file(fileName, blob)
            }
            // Clean up
            document.body.removeChild(iframe)
            resolve()
          }, 'image/png')
        })
      })

      // Wait for all images to be generated
      await Promise.all(imagePromises)

      // Generate ZIP file (all images in root, no subfolders)
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      // Simple ZIP name based on period
      a.download = `Nominas_${periodLabel}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert(`¡Exportación completada!\n\nSe generó 1 carpeta ZIP con ${Object.keys(payrollsByEmployee).length} imágenes de nómina.\n\nNombre: Nominas_${periodLabel}.zip`)
    } catch (error) {
      console.error('Payroll: Error exporting images:', error)
      alert('Error al exportar las imágenes. Por favor intenta de nuevo.')
    } finally {
      setExportingImages(false)
    }
  }

  const payrollsArray = Array.isArray(payrolls) ? payrolls : []
  const totalEarned = payrollsArray.reduce((sum, p) => sum + Number(p.totalEarned || 0), 0)
  const totalDays = payrollsArray.reduce((sum, p) => sum + (p.daysWorked || 0), 0)

  // Group by employee
  const byEmployee = payrollsArray.reduce((acc, p) => {
    const employeeName = p.employee?.name || 'Unknown'
    if (!acc[employeeName]) {
      acc[employeeName] = { days: 0, earned: 0 }
    }
    acc[employeeName].days += p.daysWorked || 0
    acc[employeeName].earned += Number(p.totalEarned || 0)
    return acc
  }, {} as Record<string, { days: number; earned: number }>)

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Nómina</h1>
        <p className="text-muted-foreground">Ver y exportar reportes de nómina</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el período de pago y empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payPeriod">Período de Pago</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="payPeriod">
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  {payPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {new Date(period.startDate).toLocaleDateString('es-ES')} - {new Date(period.endDate).toLocaleDateString('es-ES')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2 flex items-end gap-2">
              <Button onClick={handleExport} disabled={!selectedPeriod} className="flex-1">
                Exportar CSV
              </Button>
              <Button 
                onClick={handleExportImages} 
                disabled={!selectedPeriod || exportingImages || payrollsArray.length === 0} 
                variant="outline"
                className="flex-1"
              >
                {exportingImages ? 'Generando...' : 'Exportar Imágenes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Nóminas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollsArray.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Ganado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen por Empleado</CardTitle>
          <CardDescription>Total de días y ganancias por empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Días Trabajados</TableHead>
                <TableHead className="text-right">Total Ganado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byEmployee).map(([name, data]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{data.days}</TableCell>
                  <TableCell className="text-right">${data.earned.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nómina Detallada</CardTitle>
          <CardDescription>Desglose por empleado y ubicación</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Días Trabajados</TableHead>
                <TableHead className="text-right">Total Ganado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollsArray.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell className="font-medium">{payroll.employee.name}</TableCell>
                  <TableCell>{payroll.location.name}</TableCell>
                  <TableCell>{payroll.daysWorked}</TableCell>
                  <TableCell className="text-right">${Number(payroll.totalEarned).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

