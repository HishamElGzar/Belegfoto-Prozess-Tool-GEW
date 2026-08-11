import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Label } from './ui/label'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

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

interface ImageData {
  id: string
  name: string
  url: string
  uploadedAt: string
}

interface Order {
  id: string
  auftrag: string
  auftraggeber: string
  wt: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoCount: number
  infos: string
  isSpecialCustomer: boolean
  produktbilderNurWien: boolean
  photoStatus: string
  regions: Record<string, boolean>
  osaIds: string[]
  selectedLocations?: SelectedLocation[]
  images?: ImageData[]
  sharelink?: string
}

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  orders: Order[]
}

export function ExportDialog({ open, onClose, orders }: ExportDialogProps) {
  const [exportType, setExportType] = useState<'fotoliste' | 'montageliste'>('fotoliste')

  const filteredOrders = orders

  const exportToCSV = () => {
    if (exportType === 'fotoliste') {
      exportFotoliste()
    } else {
      exportMontageliste()
    }
  }

  const exportFotoliste = () => {
    const headers = [
      'Auftrag',
      'Auftraggeber',
      'WT',
      'Auftragsnr.',
      'Laufzeit Start',
      'Laufzeit Ende',
      'Start KW',
      'Infos/Besondere Anforderungen',
      'Sharelink für Verkauf',
      'Normalkunde',
      'Spezialkunde',
      'Produktbilder nur Wien',
      'Anzahl Fotos',
      'Wien',
      'N/B',
      'OÖ-USP',
      'OÖ-WBR',
      'OÖ-nur DG Wels',
      'STKM-Ankünder',
      'S-Progress Salzburg',
      'T-Progress Tirol',
      'T-SWG',
      'T-HWT',
      'K-PSG',
      'V-Vorarlberg',
      'Kartnig',
    ]

    const rows = filteredOrders.map(order => [
      order.auftrag,
      order.auftraggeber,
      order.wt,
      order.auftragsnr,
      order.laufzeitStart,
      order.laufzeitEnd,
      order.startKW,
      order.infos,
      order.sharelink || '',
      !order.isSpecialCustomer ? 'X' : '',
      order.isSpecialCustomer ? 'X' : '',
      order.produktbilderNurWien ? 'X' : '',
      order.photoCount,
      order.regions?.wien ? 'X' : '',
      order.regions?.nb ? 'X' : '',
      order.regions?.ooUsp ? 'X' : '',
      order.regions?.ooWbr ? 'X' : '',
      order.regions?.ooDgWels ? 'X' : '',
      order.regions?.stkmAnkuender ? 'X' : '',
      order.regions?.sProgressSalzburg ? 'X' : '',
      order.regions?.tProgressTirol ? 'X' : '',
      order.regions?.tSwg ? 'X' : '',
      order.regions?.tHwt ? 'X' : '',
      order.regions?.kPsg ? 'X' : '',
      order.regions?.vVorarlberg ? 'X' : '',
      order.regions?.kartnig ? 'X' : '',
    ])

    downloadCSV([headers, ...rows], 'Fotoliste')
  }

  const exportMontageliste = () => {
    const headers = [
      'Auftrag',
      'Auftraggeber',
      'Auftragsnr.',
      'Laufzeit Start',
      'Laufzeit Ende',
      'OSA-IDs',
      'Anzahl Standorte',
    ]

    const rows = filteredOrders.map(order => [
      order.auftrag,
      order.auftraggeber,
      order.auftragsnr,
      order.laufzeitStart,
      order.laufzeitEnd,
      order.osaIds?.join(', ') || '',
      order.osaIds?.length || 0,
    ])

    downloadCSV([headers, ...rows], 'Montageliste')
  }

  const downloadCSV = (data: any[][], filename: string) => {
    const csvContent = data
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Listen Export</DialogTitle>
          <DialogDescription>
            Wählen Sie den Exporttyp für den Listenexport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Exporttyp</Label>
              <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fotoliste">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Fotoliste (Foto-Unit)
                    </div>
                  </SelectItem>
                  <SelectItem value="montageliste">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Montageliste (OSA-IDs)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="mb-2">Vorschau</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredOrders.length} Aufträge werden exportiert
            </p>

            {exportType === 'fotoliste' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auftrag</TableHead>
                      <TableHead>Auftraggeber</TableHead>
                      <TableHead>Start KW</TableHead>
                      <TableHead>Fotos</TableHead>
                      <TableHead>Typ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 5).map(order => (
                      <TableRow key={order.id}>
                        <TableCell>{order.auftrag}</TableCell>
                        <TableCell>{order.auftraggeber}</TableCell>
                        <TableCell>KW {order.startKW}</TableCell>
                        <TableCell>{order.photoCount}</TableCell>
                        <TableCell>
                          {order.isSpecialCustomer ? 'Spezialkunde' : 'Normalkunde'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOrders.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    ... und {filteredOrders.length - 5} weitere Aufträge
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auftrag</TableHead>
                      <TableHead>Auftraggeber</TableHead>
                      <TableHead>Laufzeit</TableHead>
                      <TableHead>OSA-IDs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 5).map(order => (
                      <TableRow key={order.id}>
                        <TableCell>{order.auftrag}</TableCell>
                        <TableCell>{order.auftraggeber}</TableCell>
                        <TableCell>
                          {new Date(order.laufzeitStart).toLocaleDateString('de-DE')} - 
                          {new Date(order.laufzeitEnd).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>{order.osaIds?.length || 0} IDs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOrders.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    ... und {filteredOrders.length - 5} weitere Aufträge
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV Exportieren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}