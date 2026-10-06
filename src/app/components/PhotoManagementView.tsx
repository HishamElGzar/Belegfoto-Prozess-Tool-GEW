import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { Search, ListFilter as Filter, X, Camera } from 'lucide-react'
import { toast } from "sonner"
import {
  getOrders,
  updateOrder,
  updatePhotoStatus,
} from '../utils/api'
import { OrderPhotoCard } from './OrderPhotoCard'

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
  // Fotoanzahl pro Region
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
  // Foto-Termine
  fotowunschTermin?: string
  fotoDurch?: string
  fotoTermin?: string
  fotografFirma?: string
  fotografName?: string
  dateCreated: string
  dateModified: string
}

interface PhotoManagementViewProps {
  onViewOrder: (orderId: string) => void
}


export function PhotoManagementView({ onViewOrder }: PhotoManagementViewProps) {
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

  // Editing state
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, number>>>({})
  const [editingSujets, setEditingSujets] = useState<Record<string, number>>({})
  const [editingGesamtfotos, setEditingGesamtfotos] = useState<Record<string, number>>({})

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await getOrders()

      // Only orders in photo_management status
      const filtered = (data.orders || []).filter(
        (o: PhotoOrder) => o.photoStatus === 'photo_management'
      )
      setOrders(filtered)
      
      // Initialize editing values
      const initialEditingValues: Record<string, Record<string, number>> = {}
      const initialSujets: Record<string, number> = {}
      const initialGesamtfotos: Record<string, number> = {}

      filtered.forEach((order: PhotoOrder) => {
        initialEditingValues[order.id] = { ...order.photosPerRegion }
        initialSujets[order.id] = order.sujetCount
        initialGesamtfotos[order.id] = order.photoCount
      })
      
      setEditingValues(initialEditingValues)
      setEditingSujets(initialSujets)
      setEditingGesamtfotos(initialGesamtfotos)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Fehler beim Laden der Aufträge')
    } finally {
      setLoading(false)
    }
  }

  const updateRegionPhotoCount = (orderId: string, region: string, value: number) => {
    setEditingValues(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [region]: value
      }
    }))
  }

  const savePhotoCount = async (orderId: string) => {
    try {
      console.log('Saving photo count for order:', orderId, editingValues[orderId])

      await updateOrder(orderId, {
        photosPerRegion: editingValues[orderId]
      })

      console.log('✓ Photo count saved successfully')

      toast.success('Fotoanzahl gespeichert')
      await loadOrders()
    } catch (error) {
      console.error('Error updating photo count:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const saveSujetCount = async (orderId: string) => {
    try {
      await updateOrder(orderId, {
        sujetCount: editingSujets[orderId]
      })

      toast.success('Sujetanzahl gespeichert')
      await loadOrders()
    } catch (error) {
      console.error('Error updating sujet count:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const saveGesamtfotos = async (orderId: string) => {
    try {
      await updateOrder(orderId, {
        photoCount: editingGesamtfotos[orderId]
      })

      toast.success('Gesamtfotoanzahl gespeichert')
      await loadOrders()
    } catch (error) {
      console.error('Error updating total photo count:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const markAsChecked = async (orderId: string) => {
    try {
      await updatePhotoStatus(orderId, 'logistics')

      toast.success('Status auf "Logistik" geändert', {
        description: 'Der Auftrag wurde zur Logistik weitergeleitet.'
      })
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search query
    if (searchQuery && 
        !order.auftrag.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.auftragsnr.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // KW filter
    if (filterKW && !order.startKW.toString().includes(filterKW)) {
      return false
    }

    // Auftraggeber filter
    if (filterAuftraggeber && !order.auftraggeber.toLowerCase().includes(filterAuftraggeber.toLowerCase())) {
      return false
    }

    // Special customer filter
    if (filterSpecialCustomer && !order.isSpecialCustomer) {
      return false
    }

    // Laufzeit Start filter
    if (filterLaufzeitStart && order.laufzeitStart < filterLaufzeitStart) {
      return false
    }

    // Laufzeit End filter
    if (filterLaufzeitEnd && order.laufzeitEnd > filterLaufzeitEnd) {
      return false
    }

    // Produktbilder filter
    if (filterProduktbilder && order.produktbilderNurWien !== filterProduktbilder) {
      return false
    }

    return true
  })

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Fotomanagement</h1>
            <p className="text-sm text-muted-foreground">Fotoanzahlen überprüfen und anpassen</p>
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
          {/* Row 1: Search and KW */}
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

          {/* Row 2: Date range and special customer */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Laufzeit von</label>
              <Input
                type="date"
                value={filterLaufzeitStart}
                onChange={(e) => setFilterLaufzeitStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Laufzeit bis</label>
              <Input
                type="date"
                value={filterLaufzeitEnd}
                onChange={(e) => setFilterLaufzeitEnd(e.target.value)}
              />
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

          {/* Row 3: Produktbilder */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filterProduktbilder}
                onCheckedChange={(checked) => setFilterProduktbilder(checked as boolean)}
              />
              <span className="text-sm font-medium">Produktbilder nur Wien</span>
            </label>
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
          filteredOrders.map((order) => (
            <OrderPhotoCard
              key={order.id}
              order={order}
              editingValues={editingValues[order.id] || {}}
              editingSujet={editingSujets[order.id] ?? order.sujetCount}
              editingGesamt={editingGesamtfotos[order.id] ?? order.photoCount}
              onUpdateRegion={(region, value) => updateRegionPhotoCount(order.id, region, value)}
              onUpdateSujet={(value) => setEditingSujets(prev => ({ ...prev, [order.id]: value }))}
              onUpdateGesamt={(value) => setEditingGesamtfotos(prev => ({ ...prev, [order.id]: value }))}
              onSaveRegions={() => savePhotoCount(order.id)}
              onSaveSujet={() => saveSujetCount(order.id)}
              onSaveGesamt={() => saveGesamtfotos(order.id)}
              onMarkChecked={() => markAsChecked(order.id)}
              onViewOrder={() => onViewOrder(order.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
