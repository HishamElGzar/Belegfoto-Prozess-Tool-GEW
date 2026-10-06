import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Badge } from './ui/badge'
import { Search, MapPin, Calendar, ListFilter as Filter, X, CircleCheck as CheckCircle2 } from 'lucide-react'
import { toast } from "sonner"
import {
  getMasterLocations,
  getOccupancyPeriods,
  getCampaigns,
  updateOrder,
} from '../utils/api'

interface MasterLocation {
  id: string
  standortnummer: string
  bundesland: string
  gemeinde: string
  plz: string
  adresse: string
  unternehmen: string
  region: string
  isBelegbildTauglich: boolean
  tafelnummer?: string
  haendler?: string
  buchungsformat?: string
  wtr?: string
  tour?: string
}

interface Campaign {
  id: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoStatus: string
  selectedLocations?: any[]
  dateCreated: string
  dateModified: string
  wt?: string
  produktbilderNurWien?: boolean
  infos?: string
  sujetCount?: number
  photoCount?: number
  photosPerRegion?: {
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
}

interface OccupancyPeriod {
  id: string
  name: string
  dates: string
  bundesland: string
  gemeinde: string
  unternehmen: string
  handlers: string[]
}

export function CampaignLocationSelection() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [masterLocations, setMasterLocations] = useState<MasterLocation[]>([])
  const [occupancyPeriods, setOccupancyPeriods] = useState<OccupancyPeriod[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBundesland, setFilterBundesland] = useState('')
  const [filterPLZ, setFilterPLZ] = useState('')
  const [filterGemeinde, setFilterGemeinde] = useState('')
  const [filterAdresse, setFilterAdresse] = useState('')
  const [filterStandortnummer, setFilterStandortnummer] = useState('')
  const [filterTafelnummer, setFilterTafelnummer] = useState('')
  const [filterHandler, setFilterHandler] = useState('')
  const [filterBuchungsformat, setFilterBuchungsformat] = useState('')
  const [filterWTR, setFilterWTR] = useState('')
  
  // Campaign filters
  const [filterCampaignKW, setFilterCampaignKW] = useState('')
  const [filterCampaignWT, setFilterCampaignWT] = useState('')
  const [filterCampaignAuftragsnr, setFilterCampaignAuftragsnr] = useState('')
  const [filterCampaignAuftrag, setFilterCampaignAuftrag] = useState('')
  const [filterCampaignStatus, setFilterCampaignStatus] = useState('logistics_or_tour') // Zeige beide Status an
  const [filterProduktbilder, setFilterProduktbilder] = useState<boolean>(false)
  
  // Selected locations for current campaign
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchMasterLocations(),
        fetchOccupancyPeriods(),
        fetchCampaigns()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterLocations = async () => {
    try {
      const data = await getMasterLocations()
      console.log('Fetched master locations:', data.locations?.length || 0)
      setMasterLocations(data.locations || [])
    } catch (error) {
      console.error('Error fetching master locations:', error)
      toast.error('Fehler beim Laden der Standorte', {
        description: String(error)
      })
      throw error
    }
  }

  const fetchOccupancyPeriods = async () => {
    try {
      const data = await getOccupancyPeriods()
      console.log('Fetched occupancy periods:', data.periods?.length || 0)
      setOccupancyPeriods(data.periods || [])
    } catch (error) {
      console.error('Error fetching occupancy periods:', error)
      toast.error('Fehler beim Laden der Belegungszeiträume', {
        description: String(error)
      })
      throw error
    }
  }

  const fetchCampaigns = async () => {
    try {
      const data = await getCampaigns()
      console.log('Fetched campaigns:', data.campaigns?.length || 0)

      // Debug: Log first campaign to see structure
      if (data.campaigns && data.campaigns.length > 0) {
        console.log('Sample campaign data:', {
          id: data.campaigns[0].id,
          auftrag: data.campaigns[0].auftrag,
          sujetCount: data.campaigns[0].sujetCount,
          photoCount: data.campaigns[0].photoCount,
          photosPerRegion: data.campaigns[0].photosPerRegion
        })
      }

      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Fehler beim Laden der Kampagnen', {
        description: String(error)
      })
      throw error
    }
  }

  const saveCampaignSelections = async () => {
    if (!selectedCampaign) return

    try {
      console.log('Saving campaign with status tour_assignment:', selectedCampaign.id)

      const data = await updateOrder(selectedCampaign.id, {
        selectedLocationIds: Array.from(selectedLocationIds),
        photoStatus: 'tour_assignment' // Status auf Tourenzuweisung setzen
      })

      console.log('Campaign saved successfully:', data)

      toast.success('Standortauswahl gespeichert', {
        description: `${selectedLocationIds.size} Standorte zugewiesen. Status: ${data.order?.photoStatus || 'unbekannt'}`
      })

      await fetchCampaigns()
    } catch (error) {
      console.error('Error saving campaign selections:', error)
      toast.error('Fehler beim Speichern')
    }
  }

  const handleCampaignSelect = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    if (campaign) {
      setSelectedCampaign(campaign)
      setSelectedLocationIds(new Set(campaign.selectedLocationIds || []))
    }
  }

  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocationIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(locationId)) {
        newSet.delete(locationId)
      } else {
        newSet.add(locationId)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterBundesland('')
    setFilterPLZ('')
    setFilterGemeinde('')
    setFilterAdresse('')
    setFilterStandortnummer('')
    setFilterTafelnummer('')
    setFilterHandler('')
    setFilterBuchungsformat('')
    setFilterWTR('')
  }

  const clearCampaignFilters = () => {
    setFilterCampaignKW('')
    setFilterCampaignWT('')
    setFilterCampaignAuftragsnr('')
    setFilterCampaignAuftrag('')
    setFilterCampaignStatus('logistics_or_tour')
    setFilterProduktbilder(false) // Add this line
  }

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    // KW filter
    if (filterCampaignKW && !campaign.startKW.toString().includes(filterCampaignKW)) {
      return false
    }

    // WT filter
    if (filterCampaignWT && !campaign.wt?.toLowerCase().includes(filterCampaignWT.toLowerCase())) {
      return false
    }

    // Auftragsnummer filter
    if (filterCampaignAuftragsnr && !campaign.auftragsnr.toLowerCase().includes(filterCampaignAuftragsnr.toLowerCase())) {
      return false
    }

    // Auftrag filter
    if (filterCampaignAuftrag && !campaign.auftrag.toLowerCase().includes(filterCampaignAuftrag.toLowerCase())) {
      return false
    }

    // Status filter - special handling for logistics_or_tour
    if (filterCampaignStatus && filterCampaignStatus !== 'all') {
      if (filterCampaignStatus === 'logistics_or_tour') {
        // Show both logistics and tour_assignment
        if (campaign.photoStatus !== 'logistics' && campaign.photoStatus !== 'tour_assignment') {
          return false
        }
      } else if (!campaign.photoStatus.toLowerCase().includes(filterCampaignStatus.toLowerCase())) {
        return false
      }
    }

    // Produktbilder filter
    // Standardmäßig werden Kampagnen mit Produktbildern ausgeblendet
    // Nur wenn der Filter aktiviert ist, werden sie angezeigt
    if (!filterProduktbilder && campaign.produktbilderNurWien) {
      return false
    }
    
    // Wenn Filter aktiviert ist, zeige NUR Produktbilder-Kampagnen
    if (filterProduktbilder && !campaign.produktbilderNurWien) {
      return false
    }

    return true
  })

  // Merge masterLocations with selectedCampaign.selectedLocations so already-assigned
  // locations always appear even if masterLocations loaded before they were created.
  const mergedMasterLocations = (() => {
    if (!selectedCampaign?.selectedLocations?.length) return masterLocations
    const knownIds = new Set(masterLocations.map((l) => l.id))
    const extra = (selectedCampaign.selectedLocations as any[]).filter((l) => !knownIds.has(l.id))
    return [...masterLocations, ...extra]
  })()

  // Filter master locations
  const filteredLocations = mergedMasterLocations.filter(location => {

    // Bundesland filter
    if (filterBundesland && !location.bundesland.toLowerCase().includes(filterBundesland.toLowerCase())) {
      return false
    }

    // PLZ filter
    if (filterPLZ && !location.plz.includes(filterPLZ)) {
      return false
    }

    // Gemeinde filter
    if (filterGemeinde && !location.gemeinde.toLowerCase().includes(filterGemeinde.toLowerCase())) {
      return false
    }

    // Adresse filter
    if (filterAdresse && !location.adresse.toLowerCase().includes(filterAdresse.toLowerCase())) {
      return false
    }

    // Standortnummer filter
    if (filterStandortnummer && !location.standortnummer.includes(filterStandortnummer)) {
      return false
    }

    // Tafelnummer filter  
    if (filterTafelnummer && (!location.tafelnummer || !location.tafelnummer.includes(filterTafelnummer))) {
      return false
    }

    // Handler filter
    if (filterHandler && (!location.haendler || !location.haendler.toLowerCase().includes(filterHandler.toLowerCase()))) {
      return false
    }

    // Buchungsformat filter
    if (filterBuchungsformat && (!location.buchungsformat || !location.buchungsformat.toLowerCase().includes(filterBuchungsformat.toLowerCase()))) {
      return false
    }

    // WTR filter
    if (filterWTR && (!location.wtr || !location.wtr.toLowerCase().includes(filterWTR.toLowerCase()))) {
      return false
    }

    return true
  })

  // Get unique filter values
  const bundeslaender = ['Alle', ...Array.from(new Set(masterLocations.map(l => l.bundesland)))]
  const plz = ['Alle', ...Array.from(new Set(masterLocations.map(l => l.plz)))]
  const gemeinden = ['Alle', ...Array.from(new Set(masterLocations.map(l => l.gemeinde)))]
  const unternehmen = ['Alle', ...Array.from(new Set(masterLocations.map(l => l.unternehmen)))]
  const handlers = ['Alle', 'A', 'B', 'C']

  // Group locations by bundesland and gemeinde for display
  const locationsByGroup = Array.from(
    filteredLocations.reduce((map, location) => {
      const key = location.bundesland
      if (!map.has(key)) {
        map.set(key, {
          bundesland: location.bundesland,
          locations: []
        })
      }
      map.get(key)!.locations.push(location)
      return map
    }, new Map<string, { bundesland: string; locations: MasterLocation[] }>())
  ).map(([_, group]) => group)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kampagnen & Standorte auswählen</h1>
        <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-2">
          <span>↻</span> Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Campaign Selection */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-[#003d5c] text-white py-3">
            <CardTitle className="text-base">Kampagnen</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {/* Campaign Search Filters */}
            <div className="space-y-1.5">
              <Input
                placeholder="KW Woche"
                value={filterCampaignKW}
                onChange={(e) => setFilterCampaignKW(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="WT"
                value={filterCampaignWT}
                onChange={(e) => setFilterCampaignWT(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Auftragsnummer"
                value={filterCampaignAuftragsnr}
                onChange={(e) => setFilterCampaignAuftragsnr(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Auftrag"
                value={filterCampaignAuftrag}
                onChange={(e) => setFilterCampaignAuftrag(e.target.value)}
                className="h-8 text-xs"
              />
              <Select
                value={filterCampaignStatus}
                onValueChange={setFilterCampaignStatus}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="no_photos">Keine Fotos</SelectItem>
                  <SelectItem value="photo_management">Fotomanagement</SelectItem>
                  <SelectItem value="logistics">Logistik</SelectItem>
                  <SelectItem value="tour_assignment">Tourenzuweisung</SelectItem>
                  <SelectItem value="photographer">Fotograph</SelectItem>
                  <SelectItem value="post_processing">Nachbearbeitung</SelectItem>
                  <SelectItem value="approved">Freigegeben</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center h-8 px-2 border rounded-md bg-background">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <Checkbox
                    checked={filterProduktbilder}
                    onCheckedChange={(checked) => setFilterProduktbilder(checked as boolean)}
                  />
                  <span className="font-medium">Produktbilder</span>
                </label>
              </div>
              {(filterCampaignKW || filterCampaignWT || filterCampaignAuftragsnr || filterCampaignAuftrag || filterCampaignStatus || filterProduktbilder) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCampaignFilters}
                  className="w-full h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>

            {/* Campaign List */}
            <div className="border-t pt-2 space-y-1.5 max-h-[600px] overflow-y-auto">
              {filteredCampaigns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Keine Kampagnen gefunden</p>
              ) : (
                filteredCampaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    className={`p-2 rounded border cursor-pointer transition-colors relative ${
                      selectedCampaign?.id === campaign.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : campaign.produktbilderNurWien
                        ? 'hover:bg-muted bg-green-50 border-green-300'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleCampaignSelect(campaign.id)}
                  >
                    {/* Produktbilder Indicator */}
                    {campaign.produktbilderNurWien && (
                      <div className="absolute top-1 right-1">
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-400 text-[8px] px-1 py-0 h-4">
                          📸
                        </Badge>
                      </div>
                    )}
                    
                    {/* Auftragsnummer / Auftrag */}
                    <div className="font-semibold text-xs mb-0.5">
                      {campaign.auftragsnr} / {campaign.auftrag}
                    </div>
                    
                    {/* KW-Woche und WT */}
                    <div className="text-xs opacity-80">
                      KW {campaign.startKW}{campaign.wt && ` • ${campaign.wt}`}
                    </div>
                    
                    {selectedCampaign?.id === campaign.id && (
                      <Badge variant="secondary" className="mt-1.5 text-xs h-5">
                        {campaign.selectedLocations?.length || 0} Standorte
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="bg-[#003d5c] text-white py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Standorte der Kampagne
                {selectedCampaign && ` - ${selectedCampaign.auftragsnr} / ${selectedCampaign.auftrag}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Filter Inputs - 3 Rows */}
              <div className="space-y-2">
                {/* Row 1: BL, PLZ, Gemeinde */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="BL"
                    value={filterBundesland}
                    onChange={(e) => setFilterBundesland(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="PLZ"
                    value={filterPLZ}
                    onChange={(e) => setFilterPLZ(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="Gemeinde"
                    value={filterGemeinde}
                    onChange={(e) => setFilterGemeinde(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                {/* Row 2: Adresse, StNr, TafelNr */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Adresse"
                    value={filterAdresse}
                    onChange={(e) => setFilterAdresse(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="StNr"
                    value={filterStandortnummer}
                    onChange={(e) => setFilterStandortnummer(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="TafelNr"
                    value={filterTafelnummer}
                    onChange={(e) => setFilterTafelnummer(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                {/* Row 3: Händler, BuFM, WTR */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Händler"
                    value={filterHandler}
                    onChange={(e) => setFilterHandler(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="BuFM"
                    value={filterBuchungsformat}
                    onChange={(e) => setFilterBuchungsformat(e.target.value)}
                    className="text-xs h-9"
                  />

                  <Input
                    placeholder="WTR"
                    value={filterWTR}
                    onChange={(e) => setFilterWTR(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {(filterBundesland || filterPLZ || filterGemeinde || 
                filterAdresse || filterStandortnummer || filterTafelnummer || filterHandler || 
                filterBuchungsformat || filterWTR) && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Alle Filter zurücksetzen
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Location Groups */}
          {!selectedCampaign ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Bitte wählen Sie eine Kampagne aus, um Standorte zuzuweisen.
                </p>
              </CardContent>
            </Card>
          ) : (selectedCampaign.photoStatus !== 'logistics' && selectedCampaign.photoStatus !== 'tour_assignment') ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="text-orange-600 font-semibold text-lg mb-2">
                    ⚠️ Bearbeitung nicht möglich
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Diese Kampagne muss den Status \"Logistik\" haben, um Standorte zuweisen zu können.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Aktueller Status: <Badge variant="outline">{selectedCampaign.photoStatus}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Ändern Sie den Status im Auftrags-Dashboard auf \"Logistik\".
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {locationsByGroup.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Keine Standorte gefunden. Passen Sie die Filter an.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                locationsByGroup.map(({ bundesland, locations }) => (
                  <Card key={bundesland} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#003d5c] to-[#005580] text-white py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={locations.every(loc => selectedLocationIds.has(loc.id))}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedLocationIds)
                              locations.forEach(loc => {
                                if (checked) {
                                  newSet.add(loc.id)
                                } else {
                                  newSet.delete(loc.id)
                                }
                              })
                              setSelectedLocationIds(newSet)
                            }}
                            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#003d5c]"
                          />
                          <div>
                            <div className="font-semibold text-base">
                              {bundesland}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {locations.filter(loc => selectedLocationIds.has(loc.id)).length} / {locations.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                              <th className="px-3 py-2 text-left w-10"></th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-12">BL</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-20">PLZ</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[120px]">Gemeinde</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[200px]">Adresse</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-24">StNr</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-16">TafelNr</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-20">Händler</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-20">BuFM</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-16">WTR</th>
                              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-20">Tour</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {locations.map((location, index) => {
                              const isSelected = selectedLocationIds.has(location.id)
                              const bundeslandShort = location.bundesland.charAt(0).toUpperCase()
                              
                              // Add dummy data where missing - rotate handlers A, B, C, D
                              const tafelnummer = location.tafelnummer || '1'
                              const handlers = ['A', 'B', 'C', 'D']
                              const haendler = location.haendler || handlers[index % handlers.length]
                              const buchungsformat = location.buchungsformat || '16'
                              const wtr = location.wtr || 'TS'
                              
                              // Generate tour values - rotate between example values
                              const tourValues = ['WCA12', 'W15', 'WCA9', 'W22', 'NCA4', 'N18']
                              const tour = location.tour || tourValues[index % tourValues.length]
                              
                              return (
                                <tr
                                  key={location.id}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-50 hover:bg-blue-100' 
                                      : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => toggleLocationSelection(location.id)}
                                >
                                  <td className="px-3 py-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleLocationSelection(location.id)}
                                    />
                                  </td>
                                  <td className="px-2 py-3 text-xs font-medium text-gray-900">{bundeslandShort}</td>
                                  <td className="px-2 py-3 text-xs text-gray-700">{location.plz}</td>
                                  <td className="px-2 py-3 text-xs text-gray-700">{location.gemeinde}</td>
                                  <td className="px-2 py-3 text-xs text-gray-700">{location.adresse}</td>
                                  <td className="px-2 py-3 text-xs font-mono text-gray-900">{location.standortnummer}</td>
                                  <td className="px-2 py-3 text-xs text-center text-gray-700">{tafelnummer}</td>
                                  <td className="px-2 py-3 text-xs text-center text-gray-700">{haendler}</td>
                                  <td className="px-2 py-3 text-xs text-center text-gray-700">{buchungsformat}</td>
                                  <td className="px-2 py-3 text-xs text-center font-medium text-gray-900">{wtr}</td>
                                  <td className="px-2 py-3 text-xs text-center font-semibold text-blue-600">{tour}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - Selected Locations Summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-[#003d5c] text-white">
            <CardTitle className="text-lg">Ausgewählte Standorte</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedCampaign ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">
                    {selectedCampaign.auftrag}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedCampaign.auftraggeber}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    KW {selectedCampaign.startKW} • {selectedCampaign.auftragsnr}
                  </div>
                  
                  {/* Besondere Anforderungen */}
                  {selectedCampaign.infos && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Besondere Anforderungen:
                      </div>
                      <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                        {selectedCampaign.infos}
                      </div>
                    </div>
                  )}
                  
                  {/* Produktbilder Checkbox */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="produktbilderNurWien"
                        checked={selectedCampaign.produktbilderNurWien || false}
                        disabled={true}
                      />
                      <Label htmlFor="produktbilderNurWien" className="text-xs cursor-default">
                        Produktbilder nur Wien
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Summary by Handler - Always visible */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-sm font-medium mb-1.5">
                    Summe nach Händlern:
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(() => {
                      // Get all unique handlers from ALL master locations, sorted
                      const allHandlers = Array.from(new Set(
                        masterLocations.map((l, idx) => {
                          const handlers = ['A', 'B', 'C', 'D']
                          return l.haendler || handlers[idx % handlers.length]
                        })
                      )).sort()
                      
                      // Count only selected locations
                      const selectedLocations = mergedMasterLocations.filter(loc => selectedLocationIds.has(loc.id))
                      const handlerCounts = selectedLocations.reduce((acc, loc, idx) => {
                        const originalIndex = masterLocations.findIndex(l => l.id === loc.id)
                        const handlers = ['A', 'B', 'C', 'D']
                        const handler = loc.haendler || handlers[originalIndex % handlers.length]
                        acc[handler] = (acc[handler] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                      
                      return allHandlers.map(handler => (
                        <div key={handler} className="flex flex-col items-center text-xs bg-gray-50 p-1 rounded border">
                          <span className="font-semibold text-gray-700 text-[9px]">{handler}</span>
                          <span className="text-[11px] font-bold mt-0.5">{handlerCounts[handler] || 0}</span>
                        </div>
                      ))
                    })()}
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold pt-1.5 border-t">
                    <span>Gesamt:</span>
                    <Badge variant="default">{selectedLocationIds.size}</Badge>
                  </div>
                </div>

                {/* Summary by Bundesland */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-sm font-medium mb-2">
                    Standorte nach Bundesland:
                  </div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {(() => {
                      const selectedLocations = mergedMasterLocations.filter(loc => selectedLocationIds.has(loc.id))
                      const bundeslandCounts = selectedLocations.reduce((acc, loc) => {
                        const bl = loc.bundesland
                        acc[bl] = (acc[bl] || 0) + 1
                        return acc
                      }, {} as Record<string, number>)
                      
                      const sortedBL = Object.entries(bundeslandCounts).sort(([a], [b]) => a.localeCompare(b))
                      
                      if (sortedBL.length === 0) {
                        return <p className="text-xs text-muted-foreground italic text-center py-2">Keine Standorte ausgewählt</p>
                      }
                      
                      return sortedBL.map(([bl, count]) => (
                        <div key={bl} className="flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded">
                          <span className="font-medium">{bl}:</span>
                          <Badge variant="outline" className="text-xs h-5">{count}</Badge>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Compact List of Selected Locations */}
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">
                    Alle Standorte ({selectedLocationIds.size}):
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    <div className="text-[10px] space-y-0.5">
                      {mergedMasterLocations
                        .filter(loc => selectedLocationIds.has(loc.id))
                        .map((location, index) => {
                          const bundeslandShort = location.bundesland.charAt(0).toUpperCase()
                          const originalIndex = mergedMasterLocations.findIndex(l => l.id === location.id)
                          const handlers = ['A', 'B', 'C', 'D']
                          
                          // Add dummy data where missing - same as table
                          const tafelnummer = location.tafelnummer || '1'
                          const haendler = location.haendler || handlers[originalIndex % handlers.length]
                          const buchungsformat = location.buchungsformat || '16'
                          const wtr = location.wtr || 'TS'
                          
                          return (
                            <div 
                              key={location.id}
                              className="flex items-center gap-1 p-1 bg-gray-50 rounded text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 text-[9px]"
                            >
                              <span className="font-medium text-gray-900">{bundeslandShort}</span>
                              <span className="text-gray-500">•</span>
                              <span>{location.plz}</span>
                              <span className="font-medium">{location.gemeinde}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-600 truncate max-w-[80px]" title={location.adresse}>{location.adresse}</span>
                              <span className="text-gray-500">•</span>
                              <span className="font-mono font-semibold text-gray-900">StNr:{location.standortnummer}</span>
                              <span className="text-gray-500">•</span>
                              <span>T:{tafelnummer}</span>
                              <span className="text-gray-500">•</span>
                              <Badge variant="outline" className="text-[8px] h-3.5 px-1">{haendler}</Badge>
                              <span className="text-gray-500">•</span>
                              <span>{buchungsformat}</span>
                              <span className="text-gray-500">•</span>
                              <span className="font-medium text-gray-900">{wtr}</span>
                            </div>
                          )
                        })}
                      {selectedLocationIds.size === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">
                          Wählen Sie Standorte aus der Liste
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">
                    Laufzeit:
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedCampaign.laufzeitStart ? new Date(selectedCampaign.laufzeitStart).toLocaleDateString('de-DE') : '-'} - {selectedCampaign.laufzeitEnd ? new Date(selectedCampaign.laufzeitEnd).toLocaleDateString('de-DE') : '-'}
                  </div>
                </div>

                {/* Sujetanzahl */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sujetanzahl:</span>
                    <Badge variant="outline" className="text-sm">{selectedCampaign.sujetCount || 0}</Badge>
                  </div>
                </div>

                {/* Fotoanzahl je Region (nur W, NÖ, BGLD) */}
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">
                    Fotoanzahl je Region:
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs bg-blue-50 p-1.5 rounded">
                      <span className="font-medium">Wien:</span>
                      <Badge variant="outline" className="text-xs h-5">{selectedCampaign.photosPerRegion?.wien || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-blue-50 p-1.5 rounded">
                      <span className="font-medium">Niederösterreich:</span>
                      <Badge variant="outline" className="text-xs h-5">{selectedCampaign.photosPerRegion?.no || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-blue-50 p-1.5 rounded">
                      <span className="font-medium">Burgenland:</span>
                      <Badge variant="outline" className="text-xs h-5">{selectedCampaign.photosPerRegion?.bgld || 0}</Badge>
                    </div>
                  </div>
                </div>

                {/* Gesamtanzahl der Fotos (nur W, NÖ, BGLD) */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Gesamtanzahl Fotos:</span>
                    <Badge className="bg-red-600 text-sm">
                      {(() => {
                        const wien = selectedCampaign.photosPerRegion?.wien || 0
                        const no = selectedCampaign.photosPerRegion?.no || 0
                        const bgld = selectedCampaign.photosPerRegion?.bgld || 0
                        return wien + no + bgld
                      })()}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    Nur aus Wien, NÖ und Burgenland
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={saveCampaignSelections}
                  disabled={!selectedCampaign}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Auswahl speichern
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine Kampagne ausgewählt
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}