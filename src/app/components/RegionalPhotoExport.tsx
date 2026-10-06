import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Download, Calendar } from 'lucide-react'
import { toast } from "sonner"
import { getMasterLocations } from '../utils/api'
import * as XLSX from 'xlsx'

interface Order {
  id: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoCount: number
  selectedLocations?: SelectedLocation[]
  photoStatus: string
  photosPerRegion?: {
    wien?: number
    no?: number
    bgld?: number
    ooUsp?: number
    ooWbr?: number
    ooDgWels?: number
    stmkAnkuender?: number
    sProgressSalzburg?: number
    tProgressTirol?: number
    tSwg?: number
    tHwt?: number
    kPsg?: number
    kartnig?: number
    vVorarlberg?: number
  }
}

interface SelectedLocation {
  periodId: string
  periodDates: string
  locationId: string
  bundesland: string
  gemeinde: string
  plz: string
  standortnummer: string
  adresse: string
  regionalCode?: string
}

interface RegionalPhotoExportProps {
  orders: Order[]
}

// Regional codes by Bundesland
const REGIONAL_CODES = {
  'Wien': ['GEW'],
  'Niederösterreich': ['GEW', 'USP', 'WBR'],
  'Burgenland': ['GEW', 'ANK'],
  'Steiermark': ['ANK', 'CLA', 'USP'],
  'Kärnten': ['PSG'],
  'Oberösterreich': ['USP', 'WBR', 'DGO'],
  'Salzburg': ['PSB'],
  'Tirol': ['PSG', 'PSB', 'HWT', 'SWG'],
  'Vorarlberg': ['PSB', 'HWT', 'SWG']
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

// Helper to determine Bundesland from PLZ
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

export function RegionalPhotoExport({ orders }: RegionalPhotoExportProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-02')
  const [loading, setLoading] = useState(false)
  const [masterLocations, setMasterLocations] = useState<any[]>([])

  useEffect(() => {
    fetchMasterLocations()
  }, [])

  const fetchMasterLocations = async () => {
    try {
      const data = await getMasterLocations()
      if (data.locations) {
        setMasterLocations(data.locations)
      }
    } catch (error) {
      console.error('Error fetching master locations:', error)
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

  // Get regional code for a location
  const getRegionalCodeForLocation = (location: SelectedLocation): string => {
    // First check if location has explicit regionalCode
    if (location.regionalCode) {
      return location.regionalCode
    }

    // Try to find in master locations
    const masterLoc = masterLocations.find(
      ml => ml.standortnummer === location.standortnummer
    )
    
    if (masterLoc?.regionalCode) {
      return masterLoc.regionalCode
    }

    // Fallback to bundesland-based regional code
    const bundesland = getBundeslandFromPLZ(location.plz)
    const codes = REGIONAL_CODES[bundesland as keyof typeof REGIONAL_CODES]
    
    // For Wien, NÖ, BGLD - return the primary code (GEW)
    if (['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)) {
      return 'GEW'
    }
    
    // For others, return first available code
    return codes?.[0] || 'UNKNOWN'
  }

  const handleExportRegionalPhotos = () => {
    setLoading(true)
    try {
      const [year, week] = selectedWeek.split('-').map(Number)
      const weekStart = getMondayOfWeek(year, week)
      const weekEnd = getSundayOfWeek(year, week)

      // Filter orders that overlap with selected week
      const relevantOrders = orders.filter(order => {
        if (!order.laufzeitStart || !order.laufzeitEnd) return false
        
        const orderStart = new Date(order.laufzeitStart)
        const orderEnd = new Date(order.laufzeitEnd)
        
        return orderStart <= weekEnd && orderEnd >= weekStart
      })

      // Group by regional code
      // For Wien/NÖ/Burgenland: Include location details from selectedLocations
      // For other Bundesländer: Use photosPerRegion data (order info + photo count)
      const regionalData: Record<string, {
        withLocations: Array<{
          auftrag: string
          auftraggeber: string
          auftragsnr: string
          bundesland: string
          plz: string
          gemeinde: string
          standortnummer: string
          adresse: string
          photoCount: number
          unternehmen?: string
          region?: string
          tafelnummer?: string
          haendler?: string
          buchungsformat?: string
          wtr?: string
          tour?: string
          isBelegbildTauglich?: boolean
        }>
        withoutLocations: Array<{
          auftrag: string
          auftraggeber: string
          auftragsnr: string
          photoCount: number
          bundesland: string
        }>
      }> = {}

      relevantOrders.forEach(order => {
        // PART 1: Handle Wien/NÖ/Burgenland locations (selectedLocations)
        if (order.selectedLocations && order.selectedLocations.length > 0) {
          // Group locations by regional code
          const locationsByRegion: Record<string, SelectedLocation[]> = {}
          
          order.selectedLocations.forEach(loc => {
            const bundesland = getBundeslandFromPLZ(loc.plz)
            
            // Only process Wien, NÖ, Burgenland locations
            if (['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)) {
              const regionalCode = getRegionalCodeForLocation(loc)
              if (!locationsByRegion[regionalCode]) {
                locationsByRegion[regionalCode] = []
              }
              locationsByRegion[regionalCode].push(loc)
            }
          })

          // Add detailed location data to regional exports
          Object.entries(locationsByRegion).forEach(([regionalCode, locations]) => {
            if (!regionalData[regionalCode]) {
              regionalData[regionalCode] = {
                withLocations: [],
                withoutLocations: []
              }
            }

            // Calculate photos per location based on Wien/NÖ/BGLD photo counts
            const wienNoBlgdPhotoCount = 
              (order.photosPerRegion?.wien || 0) + 
              (order.photosPerRegion?.no || 0) + 
              (order.photosPerRegion?.bgld || 0)
            
            const photosPerLocation = wienNoBlgdPhotoCount > 0 && order.selectedLocations 
              ? Math.ceil(wienNoBlgdPhotoCount / order.selectedLocations.length)
              : 1

            locations.forEach(loc => {
              const bundesland = getBundeslandFromPLZ(loc.plz)
              // Enrich with master location data
              const masterLoc = masterLocations.find(
                ml => ml.standortnummer === loc.standortnummer
              )
              regionalData[regionalCode].withLocations.push({
                auftrag: order.auftrag,
                auftraggeber: order.auftraggeber,
                auftragsnr: order.auftragsnr,
                bundesland: bundesland,
                plz: loc.plz,
                gemeinde: loc.gemeinde,
                standortnummer: loc.standortnummer,
                adresse: loc.adresse,
                photoCount: photosPerLocation,
                unternehmen: masterLoc?.unternehmen || '',
                region: masterLoc?.region || '',
                tafelnummer: masterLoc?.tafelnummer || '',
                haendler: masterLoc?.haendler || '',
                buchungsformat: masterLoc?.buchungsformat || '',
                wtr: masterLoc?.wtr || '',
                tour: masterLoc?.tour || '',
                isBelegbildTauglich: masterLoc?.isBelegbildTauglich ?? false,
              })
            })
          })
        }

        // PART 2: Handle other Bundesländer (from photosPerRegion)
        if (order.photosPerRegion) {
          // Map photosPerRegion fields to regional codes and bundesländer
          const regionMapping = [
            { field: 'ooUsp', code: 'USP', bundesland: 'Oberösterreich' },
            { field: 'ooWbr', code: 'WBR', bundesland: 'Oberösterreich' },
            { field: 'ooDgWels', code: 'DGO', bundesland: 'Oberösterreich' },
            { field: 'stmkAnkuender', code: 'ANK', bundesland: 'Steiermark' },
            { field: 'sProgressSalzburg', code: 'PSB', bundesland: 'Salzburg' },
            { field: 'tProgressTirol', code: 'PSG', bundesland: 'Tirol' },
            { field: 'tSwg', code: 'SWG', bundesland: 'Tirol' },
            { field: 'tHwt', code: 'HWT', bundesland: 'Tirol' },
            { field: 'kPsg', code: 'PSG', bundesland: 'Kärnten' },
            { field: 'kartnig', code: 'CLA', bundesland: 'Kärnten' },
            { field: 'vVorarlberg', code: 'PSB', bundesland: 'Vorarlberg' }
          ]

          regionMapping.forEach(({ field, code, bundesland }) => {
            const photoCount = order.photosPerRegion?.[field as keyof typeof order.photosPerRegion] || 0
            
            if (photoCount > 0) {
              if (!regionalData[code]) {
                regionalData[code] = {
                  withLocations: [],
                  withoutLocations: []
                }
              }

              // Check if order already exists in this regional code's withoutLocations
              const existingOrder = regionalData[code].withoutLocations.find(
                o => o.auftragsnr === order.auftragsnr && o.bundesland === bundesland
              )
              
              if (existingOrder) {
                existingOrder.photoCount += photoCount
              } else {
                regionalData[code].withoutLocations.push({
                  auftrag: order.auftrag,
                  auftraggeber: order.auftraggeber,
                  auftragsnr: order.auftragsnr,
                  photoCount: photoCount,
                  bundesland: bundesland
                })
              }
            }
          })
        }
      })

      // Export each regional code as separate Excel file
      Object.entries(regionalData).forEach(([regionalCode, data]) => {
        const wb = XLSX.utils.book_new()

        // Create sheet for locations WITH details (Wien, NÖ, Burgenland)
        if (data.withLocations.length > 0) {
          const locationsData = data.withLocations.map(loc => ({
            'Bundesland': loc.bundesland,
            'PLZ': loc.plz,
            'Gemeinde': loc.gemeinde,
            'Standortnummer': loc.standortnummer,
            'Adresse': loc.adresse,
            'Unternehmen': loc.unternehmen || '',
            'Region': loc.region || '',
            'Tafelnummer': loc.tafelnummer || '',
            'Händler': loc.haendler || '',
            'Buchungsformat': loc.buchungsformat || '',
            'WTR': loc.wtr || '',
            'Tour': loc.tour || '',
            'Belegbild': loc.isBelegbildTauglich ? 'Ja' : 'Nein',
            'Auftrag': loc.auftrag,
            'Auftraggeber': loc.auftraggeber,
            'Auftragsnr': loc.auftragsnr,
            'Anzahl Fotos': loc.photoCount
          }))

          // Add total row
          const totalPhotos = data.withLocations.reduce((sum, loc) => sum + loc.photoCount, 0)
          locationsData.push({
            'Bundesland': '',
            'PLZ': '',
            'Gemeinde': '',
            'Standortnummer': '',
            'Adresse': '',
            'Unternehmen': '',
            'Region': '',
            'Tafelnummer': '',
            'Händler': '',
            'Buchungsformat': '',
            'WTR': '',
            'Tour': '',
            'Belegbild': '',
            'Auftrag': '',
            'Auftraggeber': '',
            'Auftragsnr': 'GESAMT',
            'Anzahl Fotos': totalPhotos
          })

          const wsLocations = XLSX.utils.json_to_sheet(locationsData)
          wsLocations['!cols'] = [
            { wch: 18 }, // Bundesland
            { wch: 8 },  // PLZ
            { wch: 20 }, // Gemeinde
            { wch: 15 }, // Standortnummer
            { wch: 35 }, // Adresse
            { wch: 20 }, // Unternehmen
            { wch: 15 }, // Region
            { wch: 14 }, // Tafelnummer
            { wch: 12 }, // Händler
            { wch: 15 }, // Buchungsformat
            { wch: 10 }, // WTR
            { wch: 12 }, // Tour
            { wch: 12 }, // Belegbild
            { wch: 25 }, // Auftrag
            { wch: 25 }, // Auftraggeber
            { wch: 15 }, // Auftragsnr
            { wch: 15 }  // Anzahl Fotos
          ]
          XLSX.utils.book_append_sheet(wb, wsLocations, 'Standorte Details')
        }

        // Create sheet for orders WITHOUT location details (other Bundesländer)
        if (data.withoutLocations.length > 0) {
          const ordersData = data.withoutLocations.map(order => ({
            'Bundesland': order.bundesland,
            'Auftrag': order.auftrag,
            'Auftraggeber': order.auftraggeber,
            'Auftragsnr': order.auftragsnr,
            'Anzahl Fotos': order.photoCount
          }))

          // Add total row
          const totalPhotos = data.withoutLocations.reduce((sum, order) => sum + order.photoCount, 0)
          ordersData.push({
            'Bundesland': '',
            'Auftrag': '',
            'Auftraggeber': '',
            'Auftragsnr': 'GESAMT',
            'Anzahl Fotos': totalPhotos
          })

          const wsOrders = XLSX.utils.json_to_sheet(ordersData)
          wsOrders['!cols'] = [
            { wch: 18 }, // Bundesland
            { wch: 25 }, // Auftrag
            { wch: 25 }, // Auftraggeber
            { wch: 15 }, // Auftragsnr
            { wch: 15 }  // Anzahl Fotos
          ]
          XLSX.utils.book_append_sheet(wb, wsOrders, 'Aufträge Übersicht')
        }

        // Download file only if there's data
        if (data.withLocations.length > 0 || data.withoutLocations.length > 0) {
          XLSX.writeFile(wb, `Region_${regionalCode}_KW${selectedWeek}.xlsx`)
        }
      })

      const regionCount = Object.keys(regionalData).length
      if (regionCount > 0) {
        toast.success(`${regionCount} regionale Excel-Dateien erfolgreich erstellt`)
      } else {
        toast.info('Keine Aufträge für die ausgewählte KW gefunden')
      }
    } catch (error) {
      console.error('Error exporting regional photos:', error)
      toast.error('Fehler beim Exportieren der Daten')
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics for selected week
  const getWeekStatistics = () => {
    const [year, week] = selectedWeek.split('-').map(Number)
    const weekStart = getMondayOfWeek(year, week)
    const weekEnd = getSundayOfWeek(year, week)

    const relevantOrders = orders.filter(order => {
      if (!order.laufzeitStart || !order.laufzeitEnd) return false
      
      const orderStart = new Date(order.laufzeitStart)
      const orderEnd = new Date(order.laufzeitEnd)
      
      return orderStart <= weekEnd && orderEnd >= weekStart
    })

    const regionalCounts: Record<string, { orders: Set<string>, locations: number, photos: number }> = {}

    relevantOrders.forEach(order => {
      // PART 1: Handle Wien/NÖ/Burgenland locations (selectedLocations)
      if (order.selectedLocations && order.selectedLocations.length > 0) {
        const locationsByRegion: Record<string, number> = {}
        
        order.selectedLocations.forEach(loc => {
          const bundesland = getBundeslandFromPLZ(loc.plz)
          
          // Only process Wien, NÖ, Burgenland locations
          if (['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)) {
            const regionalCode = getRegionalCodeForLocation(loc)
            locationsByRegion[regionalCode] = (locationsByRegion[regionalCode] || 0) + 1
          }
        })

        // Calculate photos based on Wien/NÖ/BGLD photo counts
        const wienNoBlgdPhotoCount = 
          (order.photosPerRegion?.wien || 0) + 
          (order.photosPerRegion?.no || 0) + 
          (order.photosPerRegion?.bgld || 0)
        
        const photosPerLocation = wienNoBlgdPhotoCount > 0 && order.selectedLocations 
          ? Math.ceil(wienNoBlgdPhotoCount / order.selectedLocations.length)
          : 0

        Object.entries(locationsByRegion).forEach(([regionalCode, count]) => {
          if (!regionalCounts[regionalCode]) {
            regionalCounts[regionalCode] = { orders: new Set(), locations: 0, photos: 0 }
          }
          
          regionalCounts[regionalCode].orders.add(order.id)
          regionalCounts[regionalCode].locations += count
          regionalCounts[regionalCode].photos += photosPerLocation * count
        })
      }

      // PART 2: Handle other Bundesländer (from photosPerRegion)
      if (order.photosPerRegion) {
        const regionMapping = [
          { field: 'ooUsp', code: 'USP' },
          { field: 'ooWbr', code: 'WBR' },
          { field: 'ooDgWels', code: 'DGO' },
          { field: 'stmkAnkuender', code: 'ANK' },
          { field: 'sProgressSalzburg', code: 'PSB' },
          { field: 'tProgressTirol', code: 'PSG' },
          { field: 'tSwg', code: 'SWG' },
          { field: 'tHwt', code: 'HWT' },
          { field: 'kPsg', code: 'PSG' },
          { field: 'kartnig', code: 'CLA' },
          { field: 'vVorarlberg', code: 'PSB' }
        ]

        regionMapping.forEach(({ field, code }) => {
          const photoCount = order.photosPerRegion?.[field as keyof typeof order.photosPerRegion] || 0
          
          if (photoCount > 0) {
            if (!regionalCounts[code]) {
              regionalCounts[code] = { orders: new Set(), locations: 0, photos: 0 }
            }
            
            regionalCounts[code].orders.add(order.id)
            regionalCounts[code].photos += photoCount
          }
        })
      }
    })

    // Convert Sets to counts
    const finalCounts: Record<string, { orders: number, locations: number, photos: number }> = {}
    Object.entries(regionalCounts).forEach(([code, data]) => {
      finalCounts[code] = {
        orders: data.orders.size,
        locations: data.locations,
        photos: data.photos
      }
    })

    return { totalOrders: relevantOrders.length, regionalCounts: finalCounts }
  }

  const stats = getWeekStatistics()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Regionaler Foto-Export</h1>
        <p className="text-sm text-muted-foreground">
          Excel-Export pro KW und regionaler Zuordnung
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Week Selection & Export */}
        <Card>
          <CardHeader className="bg-[#003D5C] text-white py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Export-Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold mb-2 block">Kalenderwoche</label>
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
            </div>

            <Button
              onClick={handleExportRegionalPhotos}
              disabled={loading || stats.totalOrders === 0}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exportiere...' : 'Export starten'}
            </Button>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-[#003D5C] text-white py-3">
            <CardTitle className="text-sm">
              Statistik für {getWeekOptions().find(m => m.value === selectedWeek)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm text-muted-foreground">Aufträge gesamt:</span>
                <Badge variant="outline" className="text-base font-semibold">
                  {stats.totalOrders}
                </Badge>
              </div>

              {stats.totalOrders === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Aufträge für die ausgewählte KW
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(stats.regionalCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([regionalCode, counts]) => (
                      <div key={regionalCode} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-[#00A9CE]">{regionalCode}</Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Aufträge:</span>
                            <span className="font-semibold">{counts.orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Standorte:</span>
                            <span className="font-semibold">{counts.locations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fotos:</span>
                            <span className="font-semibold">{counts.photos}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}