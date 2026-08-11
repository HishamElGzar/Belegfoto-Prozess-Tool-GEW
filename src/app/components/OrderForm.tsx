import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Save, X, Calendar } from 'lucide-react'
import { ImageUpload } from './ImageUpload'

interface ImageData {
  id: string
  name: string
  url: string
  storagePath?: string
  uploadedAt: string
}

interface Order {
  id?: string
  auftrag: string
  auftraggeber: string
  wt: string
  marke: string
  sujet: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW?: number
  photoCount?: number
  infos: string
  isNormalCustomer: boolean
  isSpecialCustomer: boolean
  produktbilderNurWien: boolean
  regions: {
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
  osaIds: string[]
  images?: ImageData[]
  selectedLocations?: any[]
  photoStatus?: string
  salesforceId?: string
  sharelink?: string
  dateCreated?: string
  dateModified?: string
}

interface OrderFormProps {
  order?: Order | null
  onSave: (order: Partial<Order>) => void
  onCancel: () => void
  onPhotoStatusChange?: (orderId: string, status: string) => void
  readOnly?: boolean
}

const defaultRegions = {
  wien: false,
  no: false,
  bgld: false,
  ooUsp: false,
  ooWbr: false,
  ooDgWels: false,
  stmkAnkuender: false,
  sProgressSalzburg: false,
  tProgressTirol: false,
  tSwg: false,
  tHwt: false,
  kPsg: false,
  vVorarlberg: false,
  kartnig: false,
}

export function OrderForm({ order, onSave, onCancel, onPhotoStatusChange, readOnly = false }: OrderFormProps) {
  const [formData, setFormData] = useState<Partial<Order>>({
    auftrag: '',
    auftraggeber: '',
    wt: '',
    marke: '',
    sujet: '',
    auftragsnr: '',
    laufzeitStart: '',
    laufzeitEnd: '',
    infos: '',
    isNormalCustomer: true,
    isSpecialCustomer: false,
    produktbilderNurWien: false,
    regions: defaultRegions,
    osaIds: [],
    images: [],
    selectedLocations: [],
    photoStatus: 'pending',
    ...order,
  })

  const [osaIdInput, setOsaIdInput] = useState('')

  const handleImageChange = (images: ImageData[]) => {
    setFormData(prev => ({ ...prev, images }))
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleRegionChange = (region: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      regions: { ...prev.regions!, [region]: checked }
    }))
  }

  const addOsaId = () => {
    if (osaIdInput.trim()) {
      setFormData(prev => ({
        ...prev,
        osaIds: [...(prev.osaIds || []), osaIdInput.trim()]
      }))
      setOsaIdInput('')
    }
  }

  const removeOsaId = (index: number) => {
    setFormData(prev => ({
      ...prev,
      osaIds: prev.osaIds?.filter((_, i) => i !== index) || []
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2>{order ? (readOnly ? 'Auftragsdetails' : 'Auftrag bearbeiten') : 'Neuer Auftrag'}</h2>
          {order && (
            <p className="text-sm text-muted-foreground">
              Erstellt: {new Date(order.dateCreated || '').toLocaleString('de-DE')} | 
              Geändert: {new Date(order.dateModified || '').toLocaleString('de-DE')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          {!readOnly && (
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          )}
        </div>
      </div>

      {/* Photo Status Display - Only in View Mode */}
      {readOnly && order && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Foto-Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Aktueller Status:</p>
              {getStatusBadge(formData.photoStatus || 'pending')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* V2000 Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>V2000 Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="auftrag">Auftrag (Kampagne) *</Label>
              <Input
                id="auftrag"
                value={formData.auftrag}
                onChange={(e) => handleChange('auftrag', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="auftraggeber">Auftraggeber (Inhaber) *</Label>
              <Input
                id="auftraggeber"
                value={formData.auftraggeber}
                onChange={(e) => handleChange('auftraggeber', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="wt">Werbeträger (WT) *</Label>
              <Input
                id="wt"
                value={formData.wt}
                onChange={(e) => handleChange('wt', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="marke">Marke *</Label>
              <Input
                id="marke"
                value={formData.marke}
                onChange={(e) => handleChange('marke', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>

            <div>
              <Label htmlFor="sujet">Sujet</Label>
              <Input
                id="sujet"
                value={formData.sujet}
                onChange={(e) => handleChange('sujet', e.target.value)}
                disabled={readOnly}
                placeholder="z.B. Sommer Spar"
              />
            </div>

            <div>
              <Label htmlFor="auftragsnr">Auftragsnummer *</Label>
              <Input
                id="auftragsnr"
                value={formData.auftragsnr}
                onChange={(e) => handleChange('auftragsnr', e.target.value)}
                disabled={readOnly}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="laufzeitStart">Laufzeit Start *</Label>
              <div className="relative">
                <Input
                  id="laufzeitStart"
                  type="date"
                  value={formData.laufzeitStart}
                  onChange={(e) => handleChange('laufzeitStart', e.target.value)}
                  disabled={readOnly}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="laufzeitEnd">Laufzeit Ende *</Label>
              <div className="relative">
                <Input
                  id="laufzeitEnd"
                  type="date"
                  value={formData.laufzeitEnd}
                  onChange={(e) => handleChange('laufzeitEnd', e.target.value)}
                  disabled={readOnly}
                  required
                />
              </div>
            </div>
          </div>

          {formData.startKW && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Calendar className="h-4 w-4" />
              <span>Start Kalenderwoche: <strong>KW {formData.startKW}</strong></span>
            </div>
          )}

          <Separator className="my-4" />

          <div>
            <h3 className="text-sm font-semibold mb-3">Regionale Zuordnung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Wien */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wien"
                  checked={formData.regions?.wien}
                  onCheckedChange={(checked) => handleRegionChange('wien', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="wien" className="cursor-pointer">Wien</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Niederösterreich */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no"
                  checked={formData.regions?.no}
                  onCheckedChange={(checked) => handleRegionChange('no', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="no" className="cursor-pointer">NÖ</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Burgenland */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bgld"
                  checked={formData.regions?.bgld}
                  onCheckedChange={(checked) => handleRegionChange('bgld', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="bgld" className="cursor-pointer">BGLD</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Oberösterreich */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ooUsp"
                  checked={formData.regions?.ooUsp}
                  onCheckedChange={(checked) => handleRegionChange('ooUsp', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="ooUsp" className="cursor-pointer">OÖ USP</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ooWbr"
                  checked={formData.regions?.ooWbr}
                  onCheckedChange={(checked) => handleRegionChange('ooWbr', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="ooWbr" className="cursor-pointer">OÖ WBR</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ooDgWels"
                  checked={formData.regions?.ooDgWels}
                  onCheckedChange={(checked) => handleRegionChange('ooDgWels', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="ooDgWels" className="cursor-pointer">OÖ inkl DG Wels</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Steiermark */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stmkAnkuender"
                  checked={formData.regions?.stmkAnkuender}
                  onCheckedChange={(checked) => handleRegionChange('stmkAnkuender', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="stmkAnkuender" className="cursor-pointer">STMK Ankünder</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Salzburg */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sProgressSalzburg"
                  checked={formData.regions?.sProgressSalzburg}
                  onCheckedChange={(checked) => handleRegionChange('sProgressSalzburg', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="sProgressSalzburg" className="cursor-pointer">S-Progress-Salzburg</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Tirol */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tProgressTirol"
                  checked={formData.regions?.tProgressTirol}
                  onCheckedChange={(checked) => handleRegionChange('tProgressTirol', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="tProgressTirol" className="cursor-pointer">T-Progress-Tirol</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tSwg"
                  checked={formData.regions?.tSwg}
                  onCheckedChange={(checked) => handleRegionChange('tSwg', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="tSwg" className="cursor-pointer">T-SWG</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tHwt"
                  checked={formData.regions?.tHwt}
                  onCheckedChange={(checked) => handleRegionChange('tHwt', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="tHwt" className="cursor-pointer">T-HWT</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Kärnten */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kPsg"
                  checked={formData.regions?.kPsg}
                  onCheckedChange={(checked) => handleRegionChange('kPsg', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="kPsg" className="cursor-pointer">K-PSG</Label>
              </div>

              {/* Separator */}
              <div className="md:col-span-2 lg:col-span-3"><Separator /></div>

              {/* Vorarlberg */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vVorarlberg"
                  checked={formData.regions?.vVorarlberg}
                  onCheckedChange={(checked) => handleRegionChange('vVorarlberg', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="vVorarlberg" className="cursor-pointer">V-Vorarlberg</Label>
              </div>

              {/* Kartnig */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kartnig"
                  checked={formData.regions?.kartnig}
                  onCheckedChange={(checked) => handleRegionChange('kartnig', checked as boolean)}
                  disabled={readOnly}
                />
                <Label htmlFor="kartnig" className="cursor-pointer">Kartnig</Label>
              </div>

              {/* Empty cell for alignment */}
              <div></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Type & Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Kundentyp & Anforderungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isSpecialCustomer"
              checked={formData.isSpecialCustomer}
              onCheckedChange={(checked) => handleChange('isSpecialCustomer', checked)}
              disabled={readOnly}
            />
            <Label htmlFor="isSpecialCustomer" className="cursor-pointer">
              Spezialkunde
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="produktbilderNurWien"
              checked={formData.produktbilderNurWien}
              onCheckedChange={(checked) => handleChange('produktbilderNurWien', checked)}
              disabled={readOnly}
            />
            <Label htmlFor="produktbilderNurWien" className="cursor-pointer">
              Produktbilder nur Wien
            </Label>
          </div>

          {(formData.selectedLocations?.length || formData.photoCount !== undefined) && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              {formData.selectedLocations && formData.selectedLocations.length > 0 && (
                <Badge variant="secondary">Sujet Anzahl: {formData.selectedLocations.length}</Badge>
              )}
              {formData.photoCount !== undefined && (
                <Badge variant="secondary">Gesamt Fotos: {formData.photoCount}</Badge>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="infos">Infos / Besondere Anforderungen</Label>
            <Textarea
              id="infos"
              value={formData.infos}
              onChange={(e) => handleChange('infos', e.target.value)}
              disabled={readOnly}
              rows={4}
              placeholder="Spezielle Anforderungen, Hinweise, etc..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Sharelink for Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Sharelink für Verkauf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sharelink">Sharelink</Label>
            <Input
              id="sharelink"
              value={formData.sharelink || ''}
              onChange={(e) => handleChange('sharelink', e.target.value)}
              disabled={readOnly}
              placeholder="https://..."
            />
            {formData.salesforceId && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 Dieser Link gilt für alle verknüpften Aufträge mit derselben Salesforce ID
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Upload */}
      <ImageUpload
        orderId={order?.id}
        images={formData.images || []}
        onChange={handleImageChange}
        readOnly={readOnly}
      />
    </form>
  )
}