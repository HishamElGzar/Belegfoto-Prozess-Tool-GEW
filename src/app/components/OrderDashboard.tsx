import { Plus, Download, Eye, Pencil, Link2 } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { LinkedOrdersDialog } from './LinkedOrdersDialog'
import { toast } from "sonner"
import { projectId, publicAnonKey } from '../utils/supabase/info'

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
  wt: string
  marke: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoCount: number
  infos: string
  isSpecialCustomer: boolean
  produktbilderNurWien: boolean
  selectedLocations?: SelectedLocation[]
  photoStatus: string
  salesforceId?: string
  dateCreated: string
  dateModified: string
}

interface OrderDashboardProps {
  orders: Order[]
  onCreateNew: () => void
  onViewOrder: (order: Order) => void
  onEditOrder: (order: Order) => void
  onDeleteOrder: (orderId: string) => void
  onExport: () => void
  onPhotoStatusChange: (orderId: string, status: string) => void
  onRefreshOrders?: () => void
}

export function OrderDashboard({
  orders,
  onCreateNew,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  onExport,
  onPhotoStatusChange,
  onRefreshOrders,
}: OrderDashboardProps) {
  // Separate search fields - persist in state
  const [searchAuftragsnr, setSearchAuftragsnr] = useState('')
  const [searchAuftrag, setSearchAuftrag] = useState('')
  const [searchLaufzeit, setSearchLaufzeit] = useState('')
  const [searchWT, setSearchWT] = useState('')
  const [searchAuftraggeber, setSearchAuftraggeber] = useState('')
  
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProduktbilder, setFilterProduktbilder] = useState<string>('normal') // Changed to string: 'normal' | 'produktbilder' | 'all'
  const [sortBy, setSortBy] = useState<string>('dateCreated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Salesforce ID link dialog
  const [showLinkedOrdersDialog, setShowLinkedOrdersDialog] = useState(false)
  const [selectedSalesforceId, setSelectedSalesforceId] = useState<string>('')

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`
  
  // Handle status change without losing filters
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`${serverUrl}/orders/${orderId}/photo-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoStatus: newStatus }),
      })

      if (response.ok) {
        toast.success('Status erfolgreich aktualisiert')
        onPhotoStatusChange(orderId, newStatus)
        // Filters remain unchanged - no navigation or reset
      } else {
        const error = await response.json()
        toast.error(`Fehler: ${error.error || 'Status konnte nicht aktualisiert werden'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Netzwerkfehler beim Aktualisieren des Status')
    }
  }

  const getStatusLabel = (status: string): string => {
    switch(status) {
      case 'no_photos': return 'Keine Fotos'
      case 'pending': return 'Ausstehend'
      case 'photo_management': return 'Fotomanagement'
      case 'logistics': return 'Logistik'
      case 'tour_assignment': return 'Tourenzuweisung'
      case 'photographer': return 'Fotograph'
      case 'post_processing': return 'Nachbearbeitung'
      case 'approved': return 'Freigegeben'
      case 'completed': return 'Abgeschlossen'
      default: return status
    }
  }

  const workflow = [
    'pending',
    'photo_management',
    'logistics',
    'tour_assignment',
    'photographer',
    'post_processing',
    'approved',
    'completed'
  ]

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = workflow.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex === workflow.length - 1) return null
    return workflow[currentIndex + 1]
  }

  const getPreviousStatus = (currentStatus: string): string | null => {
    // Special case: allow going back from 'no_photos' to 'pending'
    if (currentStatus === 'no_photos') {
      return 'pending'
    }
    
    const currentIndex = workflow.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex === 0) return null
    return workflow[currentIndex - 1]
  }

  const getNextStatusLabel = (currentStatus: string): string | null => {
    const nextStatus = getNextStatus(currentStatus)
    if (!nextStatus) return null
    return getStatusLabel(nextStatus)
  }

  const getPreviousStatusLabel = (currentStatus: string): string | null => {
    const prevStatus = getPreviousStatus(currentStatus)
    if (!prevStatus) return null
    return getStatusLabel(prevStatus)
  }
  
  // Clear all search filters
  const clearFilters = () => {
    setSearchAuftragsnr('')
    setSearchAuftrag('')
    setSearchLaufzeit('')
    setSearchWT('')
    setSearchAuftraggeber('')
  }
  
  // Check if any filters are active
  const hasActiveFilters = searchAuftragsnr || searchAuftrag || searchLaufzeit || searchWT || searchAuftraggeber

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Auftragsnummer filter
    if (searchAuftragsnr && !order.auftragsnr?.toLowerCase().includes(searchAuftragsnr.toLowerCase())) {
      return false
    }
    
    // Auftrag filter
    if (searchAuftrag && !order.auftrag?.toLowerCase().includes(searchAuftrag.toLowerCase())) {
      return false
    }
    
    // Laufzeit filter (searches both start and end date)
    if (searchLaufzeit && 
        !order.laufzeitStart?.includes(searchLaufzeit) && 
        !order.laufzeitEnd?.includes(searchLaufzeit)) {
      return false
    }
    
    // WT filter
    if (searchWT && !order.wt?.toLowerCase().includes(searchWT.toLowerCase())) {
      return false
    }
    
    // Auftraggeber filter
    if (searchAuftraggeber && !order.auftraggeber?.toLowerCase().includes(searchAuftraggeber.toLowerCase())) {
      return false
    }
    
    const matchesStatus = filterStatus === 'all' || order.photoStatus === filterStatus
    
    // Produktbilder filter
    // Standardmäßig werden Kampagnen mit Produktbildern ausgeblendet
    // Nur wenn der Filter aktiviert ist, werden sie angezeigt
    if (filterProduktbilder === 'normal' && order.produktbilderNurWien) {
      return false
    }
    
    // Wenn Filter aktiviert ist, zeige NUR Produktbilder-Kampagnen
    if (filterProduktbilder === 'produktbilder' && !order.produktbilderNurWien) {
      return false
    }
    
    return matchesStatus
  })

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aVal = a[sortBy as keyof Order]
    let bVal = b[sortBy as keyof Order]
    
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1>Fotomanager</h1>
          <p className="text-muted-foreground">
            Verwaltung aller Aufträge und Anforderungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Auftrag
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Suche & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Fields Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Auftragsnummer</label>
              <Input
                placeholder="Auftragsnr..."
                value={searchAuftragsnr}
                onChange={(e) => setSearchAuftragsnr(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Auftrag</label>
              <Input
                placeholder="Auftrag..."
                value={searchAuftrag}
                onChange={(e) => setSearchAuftrag(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Laufzeit</label>
              <Input
                placeholder="2026-01..."
                value={searchLaufzeit}
                onChange={(e) => setSearchLaufzeit(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">WT</label>
              <Input
                placeholder="WT..."
                value={searchWT}
                onChange={(e) => setSearchWT(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Auftraggeber</label>
              <Input
                placeholder="Auftraggeber..."
                value={searchAuftraggeber}
                onChange={(e) => setSearchAuftraggeber(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          
          {/* Filter Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="photo_management">Fotomanagement</SelectItem>
                <SelectItem value="no_photos">Keine Fotos</SelectItem>
                <SelectItem value="logistics">Logistik</SelectItem>
                <SelectItem value="tour_assignment">Tourenzuweisung</SelectItem>
                <SelectItem value="photographer">Fotograph</SelectItem>
                <SelectItem value="post_processing">Nachbearbeitung</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterProduktbilder} onValueChange={setFilterProduktbilder}>
              <SelectTrigger>
                <SelectValue placeholder="Produktbilder filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normale Kampagnen</SelectItem>
                <SelectItem value="produktbilder">Nur Produktbilder</SelectItem>
                <SelectItem value="all">Alle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sortieren nach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateCreated">Erstellungsdatum</SelectItem>
                <SelectItem value="dateModified">Änderungsdatum</SelectItem>
                <SelectItem value="auftrag">Auftrag</SelectItem>
                <SelectItem value="startKW">Start KW</SelectItem>
                <SelectItem value="auftraggeber">Auftraggeber</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Filter zurücksetzen
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              {sortedOrders.length} von {orders.length} Aufträgen
              {hasActiveFilters && <span className="text-orange-600 ml-2">(gefiltert)</span>}
            </p>
            <Button variant="outline" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Liste
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Link Dialog */}
      <LinkedOrdersDialog
        open={showLinkedOrdersDialog}
        onOpenChange={(open) => {
          setShowLinkedOrdersDialog(open)
          if (!open) {
            setSelectedSalesforceId('')
          }
        }}
        linkGroupId={selectedSalesforceId}
        linkGroupName={`Salesforce ID: ${selectedSalesforceId}`}
        onSuccess={() => {
          onRefreshOrders?.()
        }}
      />
      
      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('auftrag')}
                  >
                    Auftrag {sortBy === 'auftrag' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('auftraggeber')}
                  >
                    Auftraggeber {sortBy === 'auftraggeber' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('wt')}
                  >
                    WT {sortBy === 'wt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('auftragsnr')}
                  >
                    Auftragsnr. {sortBy === 'auftragsnr' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('laufzeitStart')}
                  >
                    Laufzeit {sortBy === 'laufzeitStart' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('startKW')}
                  >
                    Start KW {sortBy === 'startKW' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('photoCount')}
                  >
                    Fotoanzahl {sortBy === 'photoCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('photoStatus')}
                  >
                    Foto-Status {sortBy === 'photoStatus' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('isSpecialCustomer')}
                  >
                    Typ {sortBy === 'isSpecialCustomer' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Keine Aufträge gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => {
                    const getStatusBadge = (status: string) => {
                      switch(status) {
                        case 'pending':
                          return <Badge variant="outline">Ausstehend</Badge>
                        case 'no_photos':
                          return <Badge variant="secondary">Keine Fotos</Badge>
                        case 'photo_management':
                          return <Badge className="bg-green-600">Fotomanagement</Badge>
                        case 'logistics':
                          return <Badge className="bg-blue-600">Logistik</Badge>
                        case 'tour_assignment':
                          return <Badge className="bg-purple-600">Tourenzuweisung</Badge>
                        case 'photographer':
                          return <Badge className="bg-orange-600">Fotograph</Badge>
                        case 'post_processing':
                          return <Badge className="bg-yellow-600">Nachbearbeitung</Badge>
                        case 'approved':
                          return <Badge className="bg-gray-700">Freigegeben</Badge>
                        case 'completed':
                          return <Badge className="bg-gray-700">Abgeschlossen</Badge>
                        default:
                          return <Badge variant="outline">{status}</Badge>
                      }
                    }

                    const isDisabled = order.photoStatus === 'no_photos' || order.photoStatus === 'completed'
                    const nextStatus = getNextStatus(order.photoStatus)
                    const nextStatusLabel = getNextStatusLabel(order.photoStatus)
                    const prevStatus = getPreviousStatus(order.photoStatus)
                    const prevStatusLabel = getPreviousStatusLabel(order.photoStatus)
                    
                    return (
                      <TableRow key={order.id} className={isDisabled ? 'opacity-50' : ''}>
                        <TableCell>{order.auftrag}</TableCell>
                        <TableCell className="text-left font-normal">
                          {order.auftraggeber}
                          {order.salesforceId && (
                            <div className="mt-1">
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-blue-50 text-blue-700 border-blue-300 cursor-pointer hover:bg-blue-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSalesforceId(order.salesforceId!)
                                  setShowLinkedOrdersDialog(true)
                                }}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                {order.salesforceId}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{order.wt}</TableCell>
                        <TableCell>{order.auftragsnr}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {order.laufzeitStart && order.laufzeitEnd
                            ? `${new Date(order.laufzeitStart).toLocaleDateString('de-DE')} - ${new Date(order.laufzeitEnd).toLocaleDateString('de-DE')}`
                            : '-'}
                        </TableCell>
                        <TableCell>{order.startKW || '-'}</TableCell>
                        <TableCell>{order.photoCount}</TableCell>
                        <TableCell>
                          {getStatusBadge(order.photoStatus)}
                        </TableCell>
                        <TableCell>
                          {order.isSpecialCustomer && (
                            <Badge variant="secondary">Spezialkunde</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end flex-wrap">
                            {/* Zurück Button - für alle Status außer pending */}
                            {prevStatus && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(order.id, prevStatus)
                                }}
                                title={`Zurück zu: ${prevStatusLabel}`}
                              >
                                ← {prevStatusLabel}
                              </Button>
                            )}

                            {/* Keine Fotos Button */}
                            {order.photoStatus === 'pending' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(order.id, 'no_photos')
                                }}
                              >
                                Keine Fotos
                              </Button>
                            )}

                            {/* Fotos anfordern Button - nur bei pending */}
                            {order.photoStatus === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(order.id, 'photo_management')
                                }}
                              >
                                Fotos anfordern
                              </Button>
                            )}

                            {/* Nächster Status Button - für alle außer pending, not_needed und completed */}
                            {nextStatus && order.photoStatus !== 'pending' && order.photoStatus !== 'no_photos' && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(order.id, nextStatus)
                                }}
                              >
                                {nextStatusLabel} →
                              </Button>
                            )}

                            {/* Bearbeiten Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditOrder(order)
                              }}
                              title="Bearbeiten"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            {/* Ansehen Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewOrder(order)
                              }}
                              title="Ansehen"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}