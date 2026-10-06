import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Calendar, MapPin, Camera, Save, SquareCheck as CheckSquare, Square, X, ChevronDown, ChevronUp, Eye, Download } from 'lucide-react'
import { getPhotographers, getOrder, updateOrder } from '../utils/api'
import { toast } from "sonner"
import * as XLSX from 'xlsx'

interface SelectedLocation {
  periodId: string
  periodDates: string
  locationId: string
  bundesland: string
  gemeinde: string
  plz: string
  standortnummer: string
  adresse: string
}

interface Order {
  id: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  startKW: number
  laufzeitStart: string
  laufzeitEnd: string
  selectedLocations?: SelectedLocation[]
  photoStatus: string
  photographerAssignments?: any[]
}

interface Photographer {
  id: string
  name: string
  email: string
  phone: string
  active: boolean
}

interface LocationWithOrder extends SelectedLocation {
  orderId: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  periodStartDate: string
  periodEndDate: string
  periodDates: string
}

interface PhotographerAssignmentProps {
  orders: Order[]
  onRefresh: () => void
}

// Helper function to determine Bundesland from PLZ
function getBundeslandFromPLZ(plz: string): string {
  const plzNum = parseInt(plz)
  if (plzNum >= 1000 && plzNum <= 1999) return 'Wien'
  if ((plzNum >= 2000 && plzNum <= 2999) || (plzNum >= 3000 && plzNum <= 3999)) return 'Niederösterreich'
  if (plzNum >= 4000 && plzNum <= 4999) return 'Oberösterreich'
  if (plzNum >= 5000 && plzNum <= 5999) return 'Salzburg'
  if (plzNum >= 6000 && plzNum <= 6999) return 'Tirol'
  if (plzNum >= 7000 && plzNum <= 7999) return 'Burgenland'
  if (plzNum >= 8000 && plzNum <= 8999) return 'Steiermark'
  if (plzNum >= 9000 && plzNum <= 9999) return 'Kärnten'
  return 'Unbekannt'
}

// Helper to get Monday of a given week
function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setDate(jan4.getDate() - (jan4.getDay() + 6) % 7)
  const targetMonday = new Date(mondayOfWeek1)
  targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7)
  return targetMonday
}

// Helper to get Sunday of a given week
function getSundayOfWeek(year: number, week: number): Date {
  const monday = getMondayOfWeek(year, week)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

export function PhotographerAssignment({ orders, onRefresh }: PhotographerAssignmentProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-02') // Format: "YYYY-WW"
  const [photographers, setPhotographers] = useState<Photographer[]>([])
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // locationKey -> photographerId
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set())
  const [bulkPhotographer, setBulkPhotographer] = useState<string>('')
  const [expandedBundesland, setExpandedBundesland] = useState<string[]>([])
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null)
  const [savedAssignments, setSavedAssignments] = useState<Record<string, string>>({}) // Permanently saved assignments

  // Helper to generate unique location key
  const getLocationKey = (location: LocationWithOrder): string => {
    // Create a truly unique key using multiple fields to ensure no duplicates
    // This is critical because locationId may not always be available
    const uniqueId = location.locationId || 
      `${location.standortnummer}-${location.plz}-${location.adresse.replace(/\s+/g, '_')}-${location.periodId || 'default'}`
    return `${location.orderId}::${uniqueId}`
  }

  useEffect(() => {
    fetchPhotographers()
    loadExistingAssignments()
  }, [selectedWeek, orders])

  const fetchPhotographers = async () => {
    try {
      const data = await getPhotographers()
      if (data.photographers) {
        setPhotographers(data.photographers.filter((p: Photographer) => p.active))
      }
    } catch (error) {
      console.error('Error fetching photographers:', error)
    }
  }

  // Load existing photographer assignments from orders
  const loadExistingAssignments = () => {
    const [year, week] = selectedWeek.split('-').map(Number)
    const existingAssignments: Record<string, string> = {}
    
    orders.forEach(order => {
      if (order.photographerAssignments && order.photographerAssignments.length > 0) {
        order.photographerAssignments.forEach((assignment: any) => {
          // Check if assignment matches the selected week
          if (assignment.week === week && assignment.year === year) {
            // Match locations by locationId or fallback key
            assignment.locationIds?.forEach((locationId: string) => {
              // Find location in this order
              const location = order.selectedLocations?.find(loc => {
                return loc.locationId === locationId || 
                  `${loc.standortnummer}-${loc.plz}-${loc.adresse.replace(/\s+/g, '_')}-${loc.periodId || 'default'}` === locationId
              })
              
              if (location) {
                // Create the proper location key
                const uniqueId = location.locationId || 
                  `${location.standortnummer}-${location.plz}-${location.adresse.replace(/\s+/g, '_')}-${location.periodId || 'default'}`
                const locationKey = `${order.id}::${uniqueId}`
                existingAssignments[locationKey] = assignment.photographerId
              }
            })
          }
        })
      }
    })
    
    setSavedAssignments(existingAssignments)
  }

  // Extract all locations from relevant orders filtered by occupancy period
  // Only for Wien, Niederösterreich, Burgenland
  const getAllLocations = (): LocationWithOrder[] => {
    const locations: LocationWithOrder[] = []
    const [year, week] = selectedWeek.split('-').map(Number)
    const weekStart = getMondayOfWeek(year, week)
    const weekEnd = getSundayOfWeek(year, week)
    
    orders
      .filter(order => 
        order.photoStatus === 'tour_assignment' &&
        order.selectedLocations &&
        order.selectedLocations.length > 0
      )
      .forEach(order => {
        order.selectedLocations?.forEach(loc => {
          const orderStart = order.laufzeitStart ? new Date(order.laufzeitStart) : null
          const orderEnd = order.laufzeitEnd ? new Date(order.laufzeitEnd) : null
          
          if (!orderStart || !orderEnd) return
          
          const overlaps = orderStart <= weekEnd && orderEnd >= weekStart
          
          // Only include locations from Wien, Niederösterreich, Burgenland
          const bundesland = getBundeslandFromPLZ(loc.plz)
          const isRelevantBundesland = ['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)
          
          if (overlaps && isRelevantBundesland) {
            locations.push({
              ...loc,
              orderId: order.id,
              auftrag: order.auftrag,
              auftraggeber: order.auftraggeber,
              auftragsnr: order.auftragsnr,
              periodStartDate: orderStart.toISOString(),
              periodEndDate: orderEnd.toISOString(),
              periodDates: `${orderStart.toLocaleDateString('de-DE')} - ${orderEnd.toLocaleDateString('de-DE')}`
            })
          }
        })
      })
    
    return locations
  }

  // Group locations by Bundesland - SHOW ALL LOCATIONS including assigned ones
  const getGroupedLocations = () => {
    const locations = getAllLocations()
    const grouped: Record<string, LocationWithOrder[]> = {}
    
    locations.forEach(loc => {
      const bundesland = getBundeslandFromPLZ(loc.plz)
      
      if (!grouped[bundesland]) {
        grouped[bundesland] = []
      }
      grouped[bundesland].push(loc)
    })
    
    // Sort locations within each group by PLZ and address
    Object.keys(grouped).forEach(bundesland => {
      grouped[bundesland].sort((a, b) => {
        if (a.plz !== b.plz) return a.plz.localeCompare(b.plz)
        return a.adresse.localeCompare(b.adresse)
      })
    })
    
    return grouped
  }

  const handleAssignPhotographer = (locationKey: string, photographerId: string) => {
    setAssignments(prev => ({ ...prev, [locationKey]: photographerId }))
  }

  const handleToggleLocation = (locationKey: string) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(locationKey)) {
        newSet.delete(locationKey)
      } else {
        newSet.add(locationKey)
      }
      return newSet
    })
  }

  const handleSelectAllInBundesland = (locations: LocationWithOrder[]) => {
    const locationKeys = locations.map(loc => getLocationKey(loc))
    const allSelected = locationKeys.every(key => selectedLocations.has(key))
    
    setSelectedLocations(prev => {
      const newSet = new Set(prev)
      
      if (allSelected) {
        locationKeys.forEach(key => newSet.delete(key))
      } else {
        locationKeys.forEach(key => newSet.add(key))
      }
      return newSet
    })
  }

  const handleBulkAssign = async () => {
    if (!bulkPhotographer || selectedLocations.size === 0) return
    
    setLoading(true)
    try {
      // Group assignments by order
      const orderAssignments: Record<string, string[]> = {}
      const tempAssignments: Record<string, string> = {}
      
      selectedLocations.forEach(locationKey => {
        const [orderId, locationId] = locationKey.split('::')
        if (!orderAssignments[orderId]) {
          orderAssignments[orderId] = []
        }
        orderAssignments[orderId].push(locationId)
        tempAssignments[locationKey] = bulkPhotographer
      })

      const [year, week] = selectedWeek.split('-').map(Number)

      // Save assignments immediately via direct DB access (update order's photographerAssignments)
      let successCount = 0
      for (const [orderId, locationIds] of Object.entries(orderAssignments)) {
        try {
          const { order } = await getOrder(orderId)
          const existing = Array.isArray(order.photographerAssignments) ? order.photographerAssignments : []
          // Remove any existing assignment for this photographer + week, then add the new one
          const filtered = existing.filter((a: any) =>
            !(a.photographerId === bulkPhotographer && a.week === week && a.year === year)
          )
          const newAssignments = [
            ...filtered,
            { photographerId: bulkPhotographer, week, year, locationIds },
          ]
          await updateOrder(orderId, { photographerAssignments: newAssignments })
          successCount++
        } catch (err) {
          console.error('Error saving assignment:', err)
          toast.error(`Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
        }
      }

      if (successCount > 0) {
        // Add to saved assignments so they disappear from the main list
        setSavedAssignments(prev => ({ ...prev, ...tempAssignments }))
        
        const count = selectedLocations.size
        setSelectedLocations(new Set())
        setBulkPhotographer('')
        toast.success(`${count} Standorte erfolgreich zugewiesen und gespeichert!`)
      }
    } catch (error) {
      console.error('Error in bulk assign:', error)
      toast.error('Fehler beim Zuweisen der Standorte')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAssignments = async () => {
    setLoading(true)
    try {
      // Group assignments by order and photographer
      const orderAssignments: Record<string, Record<string, string[]>> = {}
      
      Object.entries(assignments).forEach(([locationKey, photographerId]) => {
        const [orderId, locationId] = locationKey.split('::')
        if (!orderAssignments[orderId]) {
          orderAssignments[orderId] = {}
        }
        if (!orderAssignments[orderId][photographerId]) {
          orderAssignments[orderId][photographerId] = []
        }
        orderAssignments[orderId][photographerId].push(locationId)
      })

      const [year, week] = selectedWeek.split('-').map(Number)

      // Save assignments via direct DB access (update order's photographerAssignments)
      let successCount = 0
      for (const [orderId, photographerLocations] of Object.entries(orderAssignments)) {
        for (const [photographerId, locationIds] of Object.entries(photographerLocations)) {
          try {
            const { order } = await getOrder(orderId)
            const existing = Array.isArray(order.photographerAssignments) ? order.photographerAssignments : []
            const filtered = existing.filter((a: any) =>
              !(a.photographerId === photographerId && a.week === week && a.year === year)
            )
            const newAssignments = [
              ...filtered,
              { photographerId, week, year, locationIds },
            ]
            await updateOrder(orderId, { photographerAssignments: newAssignments })
            successCount++
          } catch (err) {
            console.error('Error saving assignment:', err)
            toast.error(`Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
          }
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} Fotografen-Zuweisungen erfolgreich gespeichert!`)
        setAssignments({})
        // Don't navigate away - just refresh data in background
        // onRefresh() would cause navigation
      }
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast.error('Fehler beim Speichern der Zuweisungen')
    } finally {
      setLoading(false)
    }
  }

  const getWeekOptions = () => {
    const weeks = []
    const year = 2026
    for (let week = 1; week <= 52; week++) {
      const monday = getMondayOfWeek(year, week)
      const sunday = getSundayOfWeek(year, week)
      weeks.push({
        value: `${year}-${week.toString().padStart(2, '0')}`,
        label: `KW ${week} 2026 (${monday.getDate().toString().padStart(2, '0')}.${(monday.getMonth() + 1).toString().padStart(2, '0')}. - ${sunday.getDate().toString().padStart(2, '0')}.${(sunday.getMonth() + 1).toString().padStart(2, '0')}.)`
      })
    }
    return weeks
  }

  const toggleBundesland = (bundesland: string) => {
    setExpandedBundesland(prev => 
      prev.includes(bundesland) 
        ? prev.filter(b => b !== bundesland)
        : [...prev, bundesland]
    )
  }

  const groupedLocations = getGroupedLocations()
  const totalLocations = getAllLocations().length
  
  // Get photographer assignments overview
  const getPhotographerAssignments = () => {
    const allLocations = getAllLocations()
    const photographerMap: Record<string, LocationWithOrder[]> = {}
    
    // Add temp assignments (not yet saved)
    Object.entries(assignments).forEach(([locationKey, photographerId]) => {
      const location = allLocations.find(loc => getLocationKey(loc) === locationKey)
      if (location) {
        if (!photographerMap[photographerId]) {
          photographerMap[photographerId] = []
        }
        photographerMap[photographerId].push(location)
      }
    })
    
    // Add saved assignments
    Object.entries(savedAssignments).forEach(([locationKey, photographerId]) => {
      const location = allLocations.find(loc => getLocationKey(loc) === locationKey)
      if (location) {
        if (!photographerMap[photographerId]) {
          photographerMap[photographerId] = []
        }
        photographerMap[photographerId].push(location)
      }
    })
    
    return photographerMap
  }
  
  const photographerAssignments = getPhotographerAssignments()

  // Get assigned locations for selected photographer
  const getPhotographerLocations = (photographerId: string): LocationWithOrder[] => {
    return photographerAssignments[photographerId] || []
  }

  // Export Excel for selected photographer and week
  const handleExportPhotographer = async (photographerId: string) => {
    const photographer = photographers.find(p => p.id === photographerId)
    if (!photographer) return

    const locations = getPhotographerLocations(photographerId)
    if (locations.length === 0) {
      toast.error('Keine Standorte zum Exportieren')
      return
    }

    // Prepare data for Excel
    const excelData = locations.map(loc => ({
      'Bundesland': getBundeslandFromPLZ(loc.plz),
      'PLZ': loc.plz,
      'Gemeinde': loc.gemeinde,
      'Standortnummer': loc.standortnummer,
      'Adresse': loc.adresse,
      'Auftrag': loc.auftrag,
      'Auftraggeber': loc.auftraggeber,
      'Auftragsnr': loc.auftragsnr,
      'Belegungszeitraum': loc.periodDates
    }))

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // Bundesland
      { wch: 8 },  // PLZ
      { wch: 20 }, // Gemeinde
      { wch: 15 }, // Standortnummer
      { wch: 35 }, // Adresse
      { wch: 25 }, // Auftrag
      { wch: 25 }, // Auftraggeber
      { wch: 15 }, // Auftragsnr
      { wch: 25 }  // Belegungszeitraum
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const [year, week] = selectedWeek.split('-').map(Number)
    XLSX.utils.book_append_sheet(wb, ws, `${photographer.name} - KW${week}`)

    // Download file
    XLSX.writeFile(wb, `Fotograph_${photographer.name}_KW${selectedWeek}.xlsx`)

    toast.success(`Excel-Export für ${photographer.name} erfolgreich erstellt`)
  }

  // Export Excel for all photographers with assignments in selected week
  const handleExportAllPhotographers = async () => {
    const photographersWithLocations = photographers.filter(
      p => photographerAssignments[p.id] && photographerAssignments[p.id].length > 0
    )

    if (photographersWithLocations.length === 0) {
      toast.error('Keine Zuweisungen zum Exportieren')
      return
    }

    // Export each photographer separately
    for (const photographer of photographersWithLocations) {
      await handleExportPhotographer(photographer.id)
    }

    toast.success(`${photographersWithLocations.length} Excel-Dateien erfolgreich erstellt`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fotografen-Zuweisung</h1>
          <p className="text-sm text-muted-foreground">
            Standorte Fotografen zuweisen
          </p>
        </div>
        {Object.keys(assignments).length > 0 && (
          <Button
            onClick={handleSaveAssignments}
            disabled={loading}
            size="lg"
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Speichere...' : `${Object.keys(assignments).length} Zuweisungen speichern`}
          </Button>
        )}
      </div>
      
      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* LEFT SIDEBAR - Week Selection & Stats */}
        <div className="space-y-4">
          {/* Week Selection */}
          <Card>
            <CardHeader className="bg-[#003D5C] text-white py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Kalenderwoche
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getWeekOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Standorte gesamt:</span>
                  <Badge variant="outline" className="font-semibold">{totalLocations}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Zugewiesen:</span>
                  <Badge className="bg-red-600 font-semibold">{Object.keys(assignments).length}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ausgewählt:</span>
                  <Badge className="bg-blue-600 font-semibold">{selectedLocations.size}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Bulk Assignment */}
          {selectedLocations.size > 0 && (
            <Card className="border-red-600 border-2">
              <CardHeader className="bg-red-600 text-white py-2">
                <CardTitle className="text-sm font-semibold">
                  Massenzuweisung
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Ausgewählte Standorte</Label>
                  <div className="text-2xl font-bold text-red-600">{selectedLocations.size}</div>
                </div>
                
                <div>
                  <Label className="text-xs">Fotograf zuweisen</Label>
                  <Select value={bulkPhotographer} onValueChange={setBulkPhotographer}>
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {photographers.map(photographer => (
                        <SelectItem key={photographer.id} value={photographer.id} className="text-xs">
                          {photographer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkAssign}
                    disabled={!bulkPhotographer}
                    className="flex-1 h-9 text-xs bg-red-600 hover:bg-red-700"
                  >
                    Zuweisen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLocations(new Set())}
                    className="h-9 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Photographer List */}
          <Card>
            <CardHeader className="bg-[#003D5C] text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotografen ({photographers.length})
                </CardTitle>
                {Object.keys(photographerAssignments).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportAllPhotographers}
                    className="text-white hover:bg-[#00526B] h-7 text-xs"
                    title="Excel Export für alle Fotografen"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {photographers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Keine Fotografen verfügbar</p>
              ) : (
                <div className="space-y-1.5">
                  {photographers.map(photographer => {
                    const assignedCount = photographerAssignments[photographer.id]?.length || 0
                    const isSelected = selectedPhotographerId === photographer.id
                    
                    return (
                      <div 
                        key={photographer.id} 
                        className={`border rounded p-2 transition-colors cursor-pointer ${
                          isSelected ? 'bg-red-50 border-red-600' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPhotographerId(isSelected ? null : photographer.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs truncate">{photographer.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{photographer.email}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {assignedCount > 0 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleExportPhotographer(photographer.id)
                                  }}
                                  className="h-6 w-6 p-0"
                                  title="Excel Export"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Badge className="bg-red-600 text-xs">
                                  {assignedCount}
                                </Badge>
                              </>
                            )}
                            {isSelected && <Eye className="h-3 w-3 text-red-600" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* MAIN CONTENT - Location Assignment OR Photographer Details */}
        <div className="lg:col-span-3">
          {selectedPhotographerId ? (
            // Show photographer's assigned locations
            <Card>
              <CardHeader className="bg-red-600 text-white py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    {photographers.find(p => p.id === selectedPhotographerId)?.name} - Zugewiesene Standorte
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhotographerId(null)}
                    className="text-white hover:bg-red-700 h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Schließen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {getPhotographerLocations(selectedPhotographerId).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Standorte zugewiesen</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">Bundesland</TableHead>
                          <TableHead className="text-xs">PLZ</TableHead>
                          <TableHead className="text-xs">Gemeinde</TableHead>
                          <TableHead className="text-xs">Standortnr.</TableHead>
                          <TableHead className="text-xs">Adresse</TableHead>
                          <TableHead className="text-xs">Auftrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPhotographerLocations(selectedPhotographerId)
                          .sort((a, b) => {
                            const blA = getBundeslandFromPLZ(a.plz)
                            const blB = getBundeslandFromPLZ(b.plz)
                            if (blA !== blB) return blA.localeCompare(blB)
                            if (a.plz !== b.plz) return a.plz.localeCompare(b.plz)
                            return a.adresse.localeCompare(b.adresse)
                          })
                          .map((location, index) => {
                            const locationKey = `${getLocationKey(location)}-${index}`
                            return (
                              <TableRow key={locationKey}>
                                <TableCell className="text-xs font-medium">
                                  {getBundeslandFromPLZ(location.plz)}
                                </TableCell>
                                <TableCell className="text-xs">{location.plz}</TableCell>
                                <TableCell className="text-xs">{location.gemeinde}</TableCell>
                                <TableCell className="text-xs font-mono">{location.standortnummer}</TableCell>
                                <TableCell className="text-xs">{location.adresse}</TableCell>
                                <TableCell className="text-xs">
                                  <div>
                                    <div className="font-medium">{location.auftrag}</div>
                                    <div className="text-[10px] text-muted-foreground">{location.auftraggeber}</div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : totalLocations === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Standorte für {getWeekOptions().find(m => m.value === selectedWeek)?.label} gefunden</p>
                  <p className="text-sm mt-2">
                    Aufträge müssen den Status "Tourenzuweisung" haben
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="bg-[#003D5C] text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Standorte zuweisen ({totalLocations} Standorte)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {Object.entries(groupedLocations)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([bundesland, locations]) => {
                      const isExpanded = expandedBundesland.includes(bundesland)
                      const locationKeys = locations.map(loc => getLocationKey(loc))
                      const allSelected = locationKeys.every(key => selectedLocations.has(key))
                      const someSelected = locationKeys.some(key => selectedLocations.has(key)) && !allSelected
                      
                      return (
                        <div key={bundesland}>
                          {/* Bundesland Header */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100">
                            <div 
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                              onClick={() => toggleBundesland(bundesland)}
                            >
                              <div className="flex items-center justify-center w-6 h-6">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                              <Badge variant="secondary" className="text-sm font-semibold">
                                {bundesland}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {locations.length} Standorte
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectAllInBundesland(locations)
                              }}
                              className="h-7 text-xs"
                            >
                              {allSelected ? (
                                <><CheckSquare className="h-3 w-3 mr-1" /> Alle abwählen</>
                              ) : someSelected ? (
                                <><Square className="h-3 w-3 mr-1 opacity-50" /> Alle auswählen</>
                              ) : (
                                <><Square className="h-3 w-3 mr-1" /> Alle auswählen</>
                              )}
                            </Button>
                          </div>
                          
                          {/* Locations Table */}
                          {isExpanded && (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead className="text-xs">PLZ</TableHead>
                                    <TableHead className="text-xs">Gemeinde</TableHead>
                                    <TableHead className="text-xs">Standortnr.</TableHead>
                                    <TableHead className="text-xs">Adresse</TableHead>
                                    <TableHead className="text-xs">Auftrag</TableHead>
                                    <TableHead className="text-xs w-48">Fotograf</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {locations.map(location => {
                                    const locationKey = getLocationKey(location)
                                    const isSelected = selectedLocations.has(locationKey)
                                    // Check if location has a saved assignment OR a temp assignment
                                    const assignedPhotographer = assignments[locationKey] || savedAssignments[locationKey]
                                    const isSavedAssignment = !!savedAssignments[locationKey]
                                    
                                    return (
                                      <TableRow 
                                        key={locationKey}
                                        className={`${isSelected ? 'bg-blue-50' : isSavedAssignment ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                                      >
                                        <TableCell 
                                          className="w-12"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleToggleLocation(locationKey)
                                          }}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => handleToggleLocation(locationKey)}
                                          />
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{location.plz}</TableCell>
                                        <TableCell className="text-xs">{location.gemeinde}</TableCell>
                                        <TableCell className="text-xs font-mono">{location.standortnummer}</TableCell>
                                        <TableCell className="text-xs">{location.adresse}</TableCell>
                                        <TableCell className="text-xs">
                                          <div>
                                            <div className="font-medium">{location.auftrag}</div>
                                            <div className="text-[10px] text-muted-foreground">{location.auftraggeber}</div>
                                          </div>
                                        </TableCell>
                                        <TableCell 
                                          className="text-xs w-48"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Select
                                            value={assignedPhotographer || ''}
                                            onValueChange={(value) => handleAssignPhotographer(locationKey, value)}
                                          >
                                            <SelectTrigger className={`h-8 text-xs ${isSavedAssignment ? 'border-green-600' : ''}`}>
                                              <SelectValue placeholder="Wählen..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {photographers.map(p => (
                                                <SelectItem 
                                                  key={p.id} 
                                                  value={p.id}
                                                  className="text-xs"
                                                >
                                                  {p.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}