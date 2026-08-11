import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { MapPin, Image as ImageIcon, Save, Search, Plus, Edit, Trash2, RefreshCw, AlertCircle, Database } from 'lucide-react'
import { toast } from "sonner"
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface CompanyLocation {
  id: string
  bundesland: string
  gemeinde: string
  plz: string
  standortnummer: string
  adresse: string
  regionalCode?: string
  gemeindekennzeichen?: string
  tafelnummer?: string
  osaId?: string
  suitableForOccupancyPhoto: boolean
  createdAt: string
  updatedAt?: string
}

const EIGNERCODE: Record<string, string> = {
  GEW: '012', ANK: '061', WBR: '130', HWN: '140', HWT: '160',
  AWS: '180', PER: '210', SWG: '230', WUA: '063', USP: '265', 'USP-008': '008',
  PSG: '026', PWL: '006', PSB: '005', KFM: '030', CLA: '062',
  CEE: '014', RBO: '631', EPA: '020', ISA: '004', ARG: '035',
  GWS: '015', IPA: '007', DGO: '130',
}

const REGIONAL_LABELS: Record<string, string> = {
  'USP-008': 'USP (008)',
}

function buildOsaId(loc: Partial<CompanyLocation>): string {
  const gkz = loc.gemeindekennzeichen?.trim()
  const rc = loc.regionalCode?.trim()
  const snr = loc.standortnummer?.trim()
  const tafel = loc.tafelnummer?.trim()
  if (!gkz || !rc || !snr || !tafel) return ''
  const eignerNum = (EIGNERCODE[rc] || rc).padStart(3, '0')
  const snrPadded = snr.padStart(5, '0')
  const tafelPadded = String(parseInt(tafel) || 0).padStart(3, '0')
  return `${gkz}.${eignerNum}.${snrPadded}_${tafelPadded}`
}

const REGIONAL_MAPPINGS: Record<string, string[]> = {
  'Wien': ['GEW'],
  'Niederösterreich': ['GEW', 'USP', 'USP-008', 'WBR'],
  'Burgenland': ['GEW', 'ANK'],
  'Steiermark': ['ANK', 'CLA', 'USP', 'USP-008'],
  'Kärnten': ['PSG'],
  'Oberösterreich': ['USP', 'USP-008', 'WBR', 'DGO'],
  'Salzburg': ['PSB'],
  'Tirol': ['PSG', 'PSB', 'HWT', 'SWG'],
  'Vorarlberg': ['PSB', 'HWT', 'SWG']
}

export function LocationManagement() {
  const [locations, setLocations] = useState<CompanyLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [computingOsaIds, setComputingOsaIds] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null)
  
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`
  
  const [formData, setFormData] = useState({
    bundesland: '',
    gemeinde: '',
    plz: '',
    standortnummer: '',
    adresse: '',
    regionalCode: '',
    gemeindekennzeichen: '',
    tafelnummer: '',
    suitableForOccupancyPhoto: false,
  })

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${serverUrl}/master-locations`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to load locations')
      }
      
      const data = await response.json()
      console.log('Loaded locations:', data)
      setLocations(data.locations || [])
      
      // Automatically initialize test data if no locations exist
      if (!data.locations || data.locations.length === 0) {
        console.log('No locations found, initializing test data...')
        await initializeTestData()
      }
    } catch (err) {
      console.error('Error loading locations:', err)
      setError((err as Error).message)
      toast.error('Fehler beim Laden der Standorte')
    } finally {
      setLoading(false)
    }
  }

  const initializeTestData = async () => {
    try {
      const response = await fetch(`${serverUrl}/init-master-locations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to initialize test data')
      }
      
      const data = await response.json()
      console.log('Test data initialized:', data)
      toast.success('Testdaten wurden geladen', {
        description: `${data.count} Standorte wurden erstellt.`
      })
      
      // Reload locations after initialization
      const reloadResponse = await fetch(`${serverUrl}/master-locations`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      })
      
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json()
        setLocations(reloadData.locations || [])
      }
    } catch (err) {
      console.error('Error initializing data:', err)
      toast.error('Fehler beim Erstellen der Testdaten')
    }
  }

  const handleSaveLocation = async () => {
    if (!formData.bundesland || !formData.gemeinde || !formData.plz || !formData.standortnummer || !formData.adresse) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setSaving(true)
    try {
      const url = editingLocation 
        ? `${serverUrl}/master-locations/${editingLocation.id}`
        : `${serverUrl}/master-locations`
      
      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save location')
      }
      
      toast.success(editingLocation ? 'Standort aktualisiert' : 'Standort erstellt')
      setShowAddDialog(false)
      setEditingLocation(null)
      resetForm()
      await loadLocations()
    } catch (err) {
      console.error('Error saving location:', err)
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!locationToDelete) return

    try {
      const response = await fetch(`${serverUrl}/master-locations/${locationToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete location')
      }
      
      toast.success('Standort gelöscht')
      await loadLocations()
    } catch (err) {
      console.error('Error deleting location:', err)
      toast.error('Fehler beim Löschen')
    } finally {
      setLocationToDelete(null)
    }
  }

  const handleToggleOccupancyPhoto = async (location: CompanyLocation) => {
    const newValue = !location.suitableForOccupancyPhoto
    // Optimistic update for UI responsiveness
    setLocations(prev => prev.map(loc => 
      loc.id === location.id ? { ...loc, suitableForOccupancyPhoto: newValue } : loc
    ))

    try {
      const response = await fetch(`${serverUrl}/master-locations/${location.id}/toggle-occupancy`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suitableForOccupancyPhoto: newValue }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to toggle occupancy photo')
      }
      
      toast.success(newValue ? 'Als geeignet markiert' : 'Markierung entfernt')
    } catch (err) {
      console.error('Error toggling status:', err)
      toast.error('Fehler beim Aktualisieren')
      // Revert on error
      setLocations(prev => prev.map(loc => 
        loc.id === location.id ? { ...loc, suitableForOccupancyPhoto: !newValue } : loc
      ))
    }
  }

  const handleComputeOsaIds = async () => {
    setComputingOsaIds(true)
    try {
      const response = await fetch(`${serverUrl}/master-locations/compute-osa-ids`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      })
      const data = await response.json()
      toast.success(`${data.message}`)
      await loadLocations()
    } catch (err) {
      toast.error('Fehler beim Berechnen der OSA IDs')
    } finally {
      setComputingOsaIds(false)
    }
  }

  const openAddDialog = () => {
    resetForm()
    setEditingLocation(null)
    setShowAddDialog(true)
  }

  const openEditDialog = (location: CompanyLocation) => {
    setFormData({
      bundesland: location.bundesland || '',
      gemeinde: location.gemeinde || '',
      plz: location.plz || '',
      standortnummer: location.standortnummer || '',
      adresse: location.adresse || '',
      regionalCode: location.regionalCode || '',
      gemeindekennzeichen: location.gemeindekennzeichen || '',
      tafelnummer: location.tafelnummer || '',
      suitableForOccupancyPhoto: location.suitableForOccupancyPhoto || false,
    })
    setEditingLocation(location)
    setShowAddDialog(true)
  }

  const resetForm = () => {
    setFormData({
      bundesland: '',
      gemeinde: '',
      plz: '',
      standortnummer: '',
      adresse: '',
      regionalCode: '',
      gemeindekennzeichen: '',
      tafelnummer: '',
      suitableForOccupancyPhoto: false,
    })
  }

  const filteredLocations = locations.filter(loc => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (loc.bundesland?.toLowerCase().includes(search)) ||
      (loc.gemeinde?.toLowerCase().includes(search)) ||
      (loc.plz?.includes(search)) ||
      (loc.standortnummer?.toLowerCase().includes(search)) ||
      (loc.adresse?.toLowerCase().includes(search)) ||
      (loc.regionalCode?.toLowerCase().includes(search))
    )
  })

  // Get available regional codes based on selected Bundesland
  const availableRegionalCodes = formData.bundesland && REGIONAL_MAPPINGS[formData.bundesland] 
    ? REGIONAL_MAPPINGS[formData.bundesland] 
    : []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Standortverwaltung
              </CardTitle>
              <CardDescription>
                Zentrale Stammdatenverwaltung aller Unternehmensstandorte
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadLocations} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Lädt...' : 'Aktualisieren'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleComputeOsaIds} disabled={computingOsaIds}>
                <RefreshCw className={`h-4 w-4 mr-2 ${computingOsaIds ? 'animate-spin' : ''}`} />
                {computingOsaIds ? 'Berechne...' : 'OSA IDs berechnen'}
              </Button>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Standort hinzufügen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Adresse, PLZ, Standortnr..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground ml-auto">
              {filteredLocations.length} von {locations.length} Standorten
            </div>
          </div>

          {!loading && locations.length === 0 && !error ? (
            <div className="text-center py-12 border rounded-lg bg-slate-50">
              <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-lg">Keine Standorte gefunden</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Die Datenbank enthält noch keine Standorte. Sie können manuell einen neuen Standort erstellen oder Testdaten generieren.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={initializeTestData}>
                  Testdaten generieren
                </Button>
                <Button onClick={openAddDialog}>
                  Ersten Standort anlegen
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Standort Nr.</TableHead>
                    <TableHead>OSA ID</TableHead>
                    <TableHead>Bundesland</TableHead>
                    <TableHead>Reg. Zuordnung</TableHead>
                    <TableHead>Gemeinde / PLZ</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Belegbild
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-mono font-medium">
                          {loc.standortnummer}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {loc.osaId || buildOsaId(loc) || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{loc.bundesland}</Badge>
                        </TableCell>
                         <TableCell>
                          {loc.regionalCode ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">
                              {loc.regionalCode}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {loc.plz} {loc.gemeinde}
                        </TableCell>
                        <TableCell>{loc.adresse}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                             <Checkbox 
                                checked={loc.suitableForOccupancyPhoto} 
                                onCheckedChange={() => handleToggleOccupancyPhoto(loc)}
                                aria-label="Für Belegbild geeignet"
                             />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => openEditDialog(loc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive" 
                              onClick={() => setLocationToDelete(loc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Keine Ergebnisse für "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Standort bearbeiten' : 'Neuer Standort'}</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Standort zu den Stammdaten hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="standortnummer">Standortnummer *</Label>
                <Input
                  id="standortnummer"
                  placeholder="z.B. 5437"
                  value={formData.standortnummer}
                  onChange={(e) => setFormData({ ...formData, standortnummer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plz">PLZ *</Label>
                <Input
                  id="plz"
                  placeholder="z.B. 1010"
                  value={formData.plz}
                  onChange={(e) => setFormData({ ...formData, plz: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bundesland">Bundesland *</Label>
                <Select 
                  value={formData.bundesland} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    bundesland: value,
                    regionalCode: '' // Reset regional code when Bundesland changes
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(REGIONAL_MAPPINGS).map((bland) => (
                      <SelectItem key={bland} value={bland}>{bland}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="regionalCode">Regionale Zuordnung</Label>
                <Select 
                  value={formData.regionalCode} 
                  onValueChange={(value) => setFormData({ ...formData, regionalCode: value })}
                  disabled={!formData.bundesland}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.bundesland ? "Bitte wählen" : "Zuerst Bundesland wählen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegionalCodes.map((code) => (
                      <SelectItem key={code} value={code}>{REGIONAL_LABELS[code] ?? code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gemeinde">Gemeinde *</Label>
                <Input
                  id="gemeinde"
                  placeholder="z.B. Wien"
                  value={formData.gemeinde}
                  onChange={(e) => setFormData({ ...formData, gemeinde: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input
                  id="adresse"
                  placeholder="z.B. Stephansplatz 1"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gemeindekennzeichen">Gemeindekennzeichen</Label>
                <Input
                  id="gemeindekennzeichen"
                  placeholder="z.B. 30401"
                  value={formData.gemeindekennzeichen}
                  onChange={(e) => setFormData({ ...formData, gemeindekennzeichen: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tafelnummer">Tafel ID</Label>
                <Input
                  id="tafelnummer"
                  type="number"
                  placeholder="z.B. 5"
                  value={formData.tafelnummer}
                  onChange={(e) => setFormData({ ...formData, tafelnummer: e.target.value })}
                />
              </div>
            </div>

            {buildOsaId(formData) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-200">
                <span className="text-xs text-blue-600 font-medium">OSA ID (automatisch):</span>
                <span className="text-xs font-mono text-blue-800 font-semibold">{buildOsaId(formData)}</span>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="suitable"
                checked={formData.suitableForOccupancyPhoto}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, suitableForOccupancyPhoto: checked === true })
                }
              />
              <Label htmlFor="suitable" className="font-normal cursor-pointer">
                Dieser Standort ist für <strong>Belegbilder</strong> geeignet
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveLocation} disabled={saving}>
              {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Standort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Der Standort wird aus den Stammdaten entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}