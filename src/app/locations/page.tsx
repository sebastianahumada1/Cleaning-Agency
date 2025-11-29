'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Location {
  id: string
  name: string
  pricePerDay: number
  pricePerWeek: number | null
  hoursPerDay: number | null
  priceMonday?: number | null
  priceTuesday?: number | null
  priceWednesday?: number | null
  priceThursday?: number | null
  priceFriday?: number | null
  priceSaturday?: number | null
  priceSunday?: number | null
  notes: string | null
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    pricePerDay: '',
    pricePerWeek: '',
    hoursPerDay: '',
    priceMonday: '',
    priceTuesday: '',
    priceWednesday: '',
    priceThursday: '',
    priceFriday: '',
    priceSaturday: '',
    priceSunday: '',
    notes: '',
  })

  useEffect(() => {
    fetchLocations()
  }, [])

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations')
      const data = await res.json()
      setLocations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Payroll: Error fetching locations:', error)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingLocation ? `/api/locations/${editingLocation.id}` : '/api/locations'
      const method = editingLocation ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          pricePerDay: formData.pricePerDay,
          pricePerWeek: formData.pricePerWeek || null,
          hoursPerDay: formData.hoursPerDay || null,
          priceMonday: formData.priceMonday || null,
          priceTuesday: formData.priceTuesday || null,
          priceWednesday: formData.priceWednesday || null,
          priceThursday: formData.priceThursday || null,
          priceFriday: formData.priceFriday || null,
          priceSaturday: formData.priceSaturday || null,
          priceSunday: formData.priceSunday || null,
          notes: formData.notes || null,
        }),
      })

      if (res.ok) {
        setDialogOpen(false)
        setEditingLocation(null)
        setFormData({ 
          name: '', 
          pricePerDay: '', 
          pricePerWeek: '', 
          hoursPerDay: '', 
          priceMonday: '',
          priceTuesday: '',
          priceWednesday: '',
          priceThursday: '',
          priceFriday: '',
          priceSaturday: '',
          priceSunday: '',
          notes: '' 
        })
        fetchLocations()
      }
    } catch (error) {
      console.error('Error saving location:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ubicación?')) return

    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchLocations()
      }
    } catch (error) {
      console.error('Error deleting location:', error)
    }
  }

  function handleEdit(location: Location) {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      pricePerDay: location.pricePerDay.toString(),
      pricePerWeek: location.pricePerWeek?.toString() || '',
      hoursPerDay: location.hoursPerDay?.toString() || '',
      priceMonday: location.priceMonday?.toString() || '',
      priceTuesday: location.priceTuesday?.toString() || '',
      priceWednesday: location.priceWednesday?.toString() || '',
      priceThursday: location.priceThursday?.toString() || '',
      priceFriday: location.priceFriday?.toString() || '',
      priceSaturday: location.priceSaturday?.toString() || '',
      priceSunday: location.priceSunday?.toString() || '',
      notes: location.notes || '',
    })
    setDialogOpen(true)
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">Ubicaciones</h1>
          <p className="text-muted-foreground">Gestiona las ubicaciones de limpieza</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLocation(null)
              setFormData({ 
                name: '', 
                pricePerDay: '', 
                pricePerWeek: '', 
                hoursPerDay: '', 
                priceMonday: '',
                priceTuesday: '',
                priceWednesday: '',
                priceThursday: '',
                priceFriday: '',
                priceSaturday: '',
                priceSunday: '',
                notes: '' 
              })
            }}>
              Agregar Ubicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLocation ? 'Editar' : 'Agregar'} Ubicación</DialogTitle>
              <DialogDescription>
                {editingLocation ? 'Actualiza la información de la ubicación' : 'Agrega una nueva ubicación de limpieza'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="pricePerDay">Precio por Día ($) *</Label>
                   <Input
                     id="pricePerDay"
                     type="number"
                     step="0.01"
                     value={formData.pricePerDay}
                     onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                     required
                   />
                 </div>
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm font-semibold">Precios por Día de la Semana (Opcional)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Si no especificas un precio para un día, se usará el "Precio por Día" por defecto
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="priceMonday" className="text-xs">Lunes ($)</Label>
                      <Input
                        id="priceMonday"
                        type="number"
                        step="0.01"
                        value={formData.priceMonday}
                        onChange={(e) => setFormData({ ...formData, priceMonday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceTuesday" className="text-xs">Martes ($)</Label>
                      <Input
                        id="priceTuesday"
                        type="number"
                        step="0.01"
                        value={formData.priceTuesday}
                        onChange={(e) => setFormData({ ...formData, priceTuesday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceWednesday" className="text-xs">Miércoles ($)</Label>
                      <Input
                        id="priceWednesday"
                        type="number"
                        step="0.01"
                        value={formData.priceWednesday}
                        onChange={(e) => setFormData({ ...formData, priceWednesday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceThursday" className="text-xs">Jueves ($)</Label>
                      <Input
                        id="priceThursday"
                        type="number"
                        step="0.01"
                        value={formData.priceThursday}
                        onChange={(e) => setFormData({ ...formData, priceThursday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceFriday" className="text-xs">Viernes ($)</Label>
                      <Input
                        id="priceFriday"
                        type="number"
                        step="0.01"
                        value={formData.priceFriday}
                        onChange={(e) => setFormData({ ...formData, priceFriday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceSaturday" className="text-xs">Sábado ($)</Label>
                      <Input
                        id="priceSaturday"
                        type="number"
                        step="0.01"
                        value={formData.priceSaturday}
                        onChange={(e) => setFormData({ ...formData, priceSaturday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceSunday" className="text-xs">Domingo ($)</Label>
                      <Input
                        id="priceSunday"
                        type="number"
                        step="0.01"
                        value={formData.priceSunday}
                        onChange={(e) => setFormData({ ...formData, priceSunday: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingLocation ? 'Actualizar' : 'Crear'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Ubicaciones</CardTitle>
          <CardDescription>Lista de todas las ubicaciones de limpieza con precios diarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Por Defecto</TableHead>
                  <TableHead className="text-center">Lun</TableHead>
                  <TableHead className="text-center">Mar</TableHead>
                  <TableHead className="text-center">Mié</TableHead>
                  <TableHead className="text-center">Jue</TableHead>
                  <TableHead className="text-center">Vie</TableHead>
                  <TableHead className="text-center">Sáb</TableHead>
                  <TableHead className="text-center">Dom</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>${Number(location.pricePerDay).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {location.priceMonday 
                        ? `$${Number(location.priceMonday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceTuesday 
                        ? `$${Number(location.priceTuesday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceWednesday 
                        ? `$${Number(location.priceWednesday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceThursday 
                        ? `$${Number(location.priceThursday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceFriday 
                        ? `$${Number(location.priceFriday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceSaturday 
                        ? `$${Number(location.priceSaturday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.priceSunday 
                        ? `$${Number(location.priceSunday).toFixed(2)}` 
                        : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(location)}
                        className="mr-2"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(location.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

