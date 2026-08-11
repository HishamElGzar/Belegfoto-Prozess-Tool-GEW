import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'

import {
  Search,
  CheckCircle2,
  Eye,
  Filter,
  X,
  Camera,
  PackageCheck,
} from 'lucide-react'
import { toast } from "sonner"
import {
  projectId,
  publicAnonKey,
} from '../utils/supabase/info'

interface PhotoOrder {
  id: string
  auftrag: string
  auftraggeber: string
  wt: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoStatus: string
  isSpecialCustomer: boolean
  photoCount: number
  sujetCount: number
  infos: string
  produktbilderNurWien: boolean
  photosPerRegion: {
    wien: number
    no: number
    bgld: number
    ooUsp: number
    ooWbr: number
    ooDgWels: number
    stmkAnkuender: number
    sProgressSalzburg: number
    tProgressTirol: number
    tSwg: number
    tHwt: number
    kPsg: number
    vVorarlberg: number
    kartnig: number
  }
  photosArrivedPerRegion?: {
    wien: boolean
    no: boolean
    bgld: boolean
    ooUsp: boolean
    ooWbr: boolean
    ooDgWels: boolean
    stmkAnkuender: boolean
    sProgressSalzburg: boolean
    tProgressTirol: boolean
    tSwg: boolean
    tHwt: boolean
    kPsg: boolean
    vVorarlberg: boolean
    kartnig: boolean
  }
  dateCreated: string
  dateModified: string
}

interface PhotoArrivalCheckViewProps {
  onViewOrder: (orderId: string) => void
}

const REGIONEN = [
  { key: 'wien', label: 'Wien' },
  { key: 'no', label: 'NÖ' },
  { key: 'bgld', label: 'BGLD' },
  { key: 'ooUsp', label: 'OÖ USP' },
  { key: 'ooWbr', label: 'OÖ WBR' },
  { key: 'ooDgWels', label: 'OÖ mit DG Wels' },
  { key: 'stmkAnkuender', label: 'STMK Ankünder' },
  { key: 'sProgressSalzburg', label: 'S Progress Salzburg' },
  { key: 'tProgressTirol', label: 'T Progress Tirol' },
  { key: 'tSwg', label: 'T SWG' },
  { key: 'tHwt', label: 'T HWT' },
  { key: 'kPsg', label: 'K PSG' },
  { key: 'vVorarlberg', label: 'V Vorarlberg' },
  { key: 'kartnig', label: 'Kartnig' },
]

const DEFAULT_ARRIVED: Record<string, boolean> = Object.fromEntries(
  REGIONEN.map(r => [r.key, false])
)

export function PhotoArrivalCheckView({ onViewOrder }: PhotoArrivalCheckViewProps) {
  const [orders, setOrders] = useState<PhotoOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKW, setFilterKW] = useState('')
  const [filterAuftraggeber, setFilterAuftraggeber] = useState('')
  const [filterSpecialCustomer, setFilterSpecialCustomer] = useState(false)
  const [filterLaufzeitStart, setFilterLaufzeitStart] = useState('')
  const [filterLaufzeitEnd, setFilterLaufzeitEnd] = useState('')

  const [filterProduktbilder, setFilterProduktbilder] = useState<boolean>(false)

  // Arrived state per order per region: Record<orderId, Record<regionKey, boolean>>
  const [arrivedValues, setArrivedValues] = useState<Record<string, Record<string, boolean>>>({})

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${serverUrl}/orders`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      })
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()

      // Nur Aufträge im Status "Nachbearbeitung" (post_processing)
      const filtered = (data.orders || []).filter(
        (o: PhotoOrder) => o.photoStatus === 'post_processing'
      )

      // Sicherstellen, dass photosPerRegion vorhanden ist
      const withRegions = filtered.map((order: PhotoOrder) => {
        if (!order.photosPerRegion) {
          const regions = (order as any).regions || {}
          return {
            ...order,
            photosPerRegion: {
              wien: regions.wien ? 3 : 0,
              no: regions.no ? 2 : 0,
              bgld: regions.bgld ? 2 : 0,
              ooUsp: regions.ooUsp ? 2 : 0,
              ooWbr: regions.ooWbr ? 2 : 0,
              ooDgWels: regions.ooDgWels ? 1 : 0,
              stmkAnkuender: regions.stmkAnkuender ? 2 : 0,
              sProgressSalzburg: regions.sProgressSalzburg ? 2 : 0,
              tProgressTirol: regions.tProgressTirol ? 2 : 0,
              tSwg: regions.tSwg ? 2 : 0,
              tHwt: regions.tHwt ? 1 : 0,
              kPsg: regions.kPsg ? 2 : 0,
              vVorarlberg: regions.vVorarlberg ? 2 : 0,
              kartnig: regions.kartnig ? 2 : 0,
            },
          }
        }
        return order
      })

      setOrders(withRegions)

      const initial: Record<string, Record<string, boolean>> = {}
      withRegions.forEach((order: PhotoOrder) => {
        initial[order.id] = { ...DEFAULT_ARRIVED, ...(order.photosArrivedPerRegion || {}) }
      })
      setArrivedValues(initial)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Fehler beim Laden der Aufträge')
    } finally {
      setLoading(false)
    }
  }

  const toggleRegionArrived = (orderId: string, regionKey: string, value: boolean) => {
    setArrivedValues(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], [regionKey]: value },
    }))
  }

  const saveArrivedStatus = async (orderId: string) => {
    try {
      const response = await fetch(`${serverUrl}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photosArrivedPerRegion: arrivedValues[orderId] }),
      })
      if (!response.ok) throw new Error('Failed to save')
      toast.success('Foto-Eingang gespeichert')
      await loadOrders()
    } catch (error) {
      console.error('Error saving arrived status:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const markAsCompleted = async (orderId: string) => {
    try {
      const response = await fetch(`${serverUrl}/orders/${orderId}/photo-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoStatus: 'completed' }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      toast.success('Auftrag als abgeschlossen markiert')
      await loadOrders()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Fehler beim Statuswechsel')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterKW('')
    setFilterAuftraggeber('')
    setFilterSpecialCustomer(false)
    setFilterLaufzeitStart('')
    setFilterLaufzeitEnd('')
    setFilterProduktbilder(false)
  }

  const filteredOrders = orders.filter(order => {
    if (searchQuery &&
      !order.auftrag.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !order.auftragsnr.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterKW && !order.startKW.toString().includes(filterKW)) return false
    if (filterAuftraggeber && !order.auftraggeber.toLowerCase().includes(filterAuftraggeber.toLowerCase())) return false
    if (filterSpecialCustomer && !order.isSpecialCustomer) return false
    if (filterLaufzeitStart && order.laufzeitStart < filterLaufzeitStart) return false
    if (filterLaufzeitEnd && order.laufzeitEnd > filterLaufzeitEnd) return false
    if (filterProduktbilder && order.produktbilderNurWien !== filterProduktbilder) return false
    return true
  })

  // Helper: how many relevant regions (count > 0) are all checked
  const getArrivalProgress = (order: PhotoOrder) => {
    const arrived = arrivedValues[order.id] || {}
    const relevant = REGIONEN.filter(r => (order.photosPerRegion?.[r.key as keyof typeof order.photosPerRegion] || 0) > 0)
    const checkedCount = relevant.filter(r => arrived[r.key]).length
    return { total: relevant.length, checked: checkedCount, allDone: relevant.length > 0 && checkedCount === relevant.length }
  }

  const hasArrivedChanges = (order: PhotoOrder) => {
    const persisted = order.photosArrivedPerRegion || {}
    const current = arrivedValues[order.id] || {}
    return JSON.stringify({ ...DEFAULT_ARRIVED, ...persisted }) !== JSON.stringify({ ...DEFAULT_ARRIVED, ...current })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Fotoaufträge...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PackageCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Foto-Eingang</h1>
            <p className="text-sm text-muted-foreground">
      Aufträge im Status <span className="font-semibold text-yellow-700">Nachbearbeitung</span> – Fotos je Region prüfen
    </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'Auftrag' : 'Aufträge'}
        </Badge>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader className="bg-[#003d5c] text-white py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Auftrag / Auftragsnr. durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              placeholder="KW Woche"
              value={filterKW}
              onChange={(e) => setFilterKW(e.target.value)}
            />
            <Input
              placeholder="Auftraggeber"
              value={filterAuftraggeber}
              onChange={(e) => setFilterAuftraggeber(e.target.value)}
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Laufzeit von</label>
              <Input type="date" value={filterLaufzeitStart} onChange={(e) => setFilterLaufzeitStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Laufzeit bis</label>
              <Input type="date" value={filterLaufzeitEnd} onChange={(e) => setFilterLaufzeitEnd(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filterSpecialCustomer}
                  onCheckedChange={(checked) => setFilterSpecialCustomer(checked as boolean)}
                />
                <span className="text-sm font-medium">Nur Spezialkunden</span>
              </label>
            </div>
            <div className="flex items-end">
              {(searchQuery || filterKW || filterAuftraggeber || filterSpecialCustomer ||
                filterLaufzeitStart || filterLaufzeitEnd) && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filterProduktbilder}
                  onCheckedChange={(checked) => setFilterProduktbilder(checked as boolean)}
                />
                <span className="text-sm font-medium">Produktbilder nur Wien</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Card List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-12 text-center text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Keine Aufträge gefunden</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const progress = getArrivalProgress(order)
            const changed = hasArrivedChanges(order)
            const arrived = arrivedValues[order.id] || {}

            return (
              <Card
                key={order.id}
                className={`overflow-hidden border transition-colors ${
                  progress.allDone
                    ? 'border-green-300 hover:border-green-400'
                    : 'border-gray-200 hover:border-[#003d5c]/40'
                }`}
              >
                {/* Card Header */}
                <div className="bg-[#003d5c] text-white px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold text-sm">
                    {order.auftrag}
                    {order.isSpecialCustomer && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0 bg-yellow-400 text-yellow-900 border-0">SK</Badge>
                    )}
                  </span>
                  <span className="text-white/80 text-xs">{order.auftraggeber}</span>
                  <span className="text-white/60 text-xs">WT: <span className="text-white font-medium">{order.wt}</span></span>
                  <span className="text-white/60 text-xs">Nr: <span className="text-white font-medium">{order.auftragsnr}</span></span>
                  <span className="text-white/60 text-xs">KW: <span className="text-white font-medium">{order.startKW}</span></span>
                  <span className="text-white/60 text-xs">
                    {order.laufzeitStart && new Date(order.laufzeitStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    {' – '}
                    {order.laufzeitEnd && new Date(order.laufzeitEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Progress indicator */}
                    {progress.total > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          progress.allDone
                            ? 'bg-green-100 text-green-700 border-green-400'
                            : 'bg-white/10 text-white border-white/30'
                        }`}
                      >
                        {progress.checked}/{progress.total} Regionen
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${order.produktbilderNurWien ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500 border-gray-300'}`}>
                      Produktbilder: {order.produktbilderNurWien ? 'Ja' : 'Nein'}
                    </Badge>
                  </div>
                </div>

                {/* Infos row */}
                {order.infos && (
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-xs text-amber-800">
                    <span className="font-semibold mr-1">Infos:</span>{order.infos}
                  </div>
                )}

                {/* Card Body */}
                <CardContent className="p-3">
                  {/* Region Grid – checkboxes */}
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-[#003d5c] uppercase tracking-wide mb-1.5">
                      Fotos angekommen je Region
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {REGIONEN.map(region => {
                        const expectedCount = order.photosPerRegion?.[region.key as keyof typeof order.photosPerRegion] || 0
                        const isChecked = arrived[region.key] ?? false
                        const isRelevant = expectedCount > 0
                        const isSpecialRegion = region.key === 'ooDgWels'

                        return (
                          <div
                            key={region.key}
                            onClick={() => {
                              if (isRelevant) toggleRegionArrived(order.id, region.key, !isChecked)
                            }}
                            className={`rounded p-1.5 border transition-colors select-none ${
                              !isRelevant
                                ? 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                                : isChecked
                                ? isSpecialRegion
                                  ? 'bg-green-100 border-green-400 cursor-pointer'
                                  : 'bg-green-100 border-green-400 cursor-pointer'
                                : isSpecialRegion
                                ? 'bg-red-50 border-red-200 cursor-pointer hover:bg-red-100'
                                : 'bg-blue-50 border-blue-100 cursor-pointer hover:bg-blue-100'
                            }`}
                          >
                            <p className={`text-[9px] font-semibold mb-1 leading-tight truncate ${
                              !isRelevant
                                ? 'text-gray-400'
                                : isChecked
                                ? 'text-green-700'
                                : isSpecialRegion
                                ? 'text-red-700'
                                : 'text-[#003d5c]'
                            }`}>
                              {region.label}
                            </p>
                            {/* Expected count */}
                            <p className={`text-[9px] mb-1 ${isRelevant ? 'text-gray-500' : 'text-gray-300'}`}>
                              {expectedCount > 0 ? `${expectedCount} Fotos` : '–'}
                            </p>
                            {/* Checkbox area */}
                            <div className="flex items-center justify-center mt-0.5">
                              {isRelevant ? (
                                isChecked ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white" />
                                )
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-gray-200 bg-gray-100" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    {/* Read-only summary */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] text-gray-400 font-medium">Sujets</p>
                        <div className="min-w-[40px] h-7 flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs font-medium text-gray-600 px-2">
                          {order.sujetCount || 0}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-[10px] text-[#003d5c] font-semibold">Gesamt Fotos</p>
                        <div className="min-w-[48px] h-7 flex items-center justify-center rounded border border-[#003d5c]/20 bg-[#003d5c]/5 text-xs font-bold text-[#003d5c] px-2">
                          {order.photoCount || 0}
                        </div>
                      </div>
                    </div>

                    {/* All-done badge */}
                    {progress.allDone && (
                      <Badge className="bg-green-600 text-white border-0 text-xs px-2 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Alle Fotos angekommen
                      </Badge>
                    )}

                    {/* Actions */}
                    <div className="ml-auto flex items-center gap-2">
                      {changed && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => { e.stopPropagation(); saveArrivedStatus(order.id) }}
                          className="h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700"
                        >
                          ✓ Speichern
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => { e.stopPropagation(); markAsCompleted(order.id) }}
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 px-3"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Abgeschlossen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={(e) => { e.stopPropagation(); onViewOrder(order.id) }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}