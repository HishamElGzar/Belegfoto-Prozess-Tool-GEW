import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ChevronDown, ChevronRight, MapPin, Plus, X } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

interface Location {
  id: string
  bundesland: string
  gemeinde: string
  plz: string
  standortnummer: string
  adresse: string
}

interface OccupancyPeriod {
  id: string
  startDate: string
  endDate: string
  locations: Location[]
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
}

interface LocationSelectorProps {
  selectedLocations: SelectedLocation[]
  onChange: (locations: SelectedLocation[]) => void
  readOnly?: boolean
}

// Hard-coded occupancy periods with sample locations
const FALLBACK_PERIODS: OccupancyPeriod[] = [
  {
    id: 'period-1',
    startDate: '2026-01-06',
    endDate: '2026-01-19',
    locations: [
      {
        id: 'loc-1',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1010',
        standortnummer: '5437',
        adresse: 'Stephansplatz 1'
      },
      {
        id: 'loc-2',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1010',
        standortnummer: '5438',
        adresse: 'Graben 21'
      },
      {
        id: 'loc-3',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1020',
        standortnummer: '5439',
        adresse: 'Prater Hauptallee 1'
      },
      {
        id: 'loc-4',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1030',
        standortnummer: '5440',
        adresse: 'Landstraße Hauptstraße 1'
      },
      {
        id: 'loc-5',
        bundesland: 'Niederösterreich',
        gemeinde: 'St. Pölten',
        plz: '3100',
        standortnummer: '3215',
        adresse: 'Rathausplatz 1'
      },
      {
        id: 'loc-6',
        bundesland: 'Niederösterreich',
        gemeinde: 'Wiener Neustadt',
        plz: '2700',
        standortnummer: '3216',
        adresse: 'Hauptplatz 1'
      },
      {
        id: 'loc-7',
        bundesland: 'Niederösterreich',
        gemeinde: 'Baden',
        plz: '2500',
        standortnummer: '3217',
        adresse: 'Hauptplatz 5'
      },
    ]
  },
  {
    id: 'period-2',
    startDate: '2026-01-20',
    endDate: '2026-02-02',
    locations: [
      {
        id: 'loc-8',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1040',
        standortnummer: '5441',
        adresse: 'Wiedner Hauptstraße 1'
      },
      {
        id: 'loc-9',
        bundesland: 'Wien',
        gemeinde: 'Wien',
        plz: '1050',
        standortnummer: '5442',
        adresse: 'Margaretenstraße 1'
      },
      {
        id: 'loc-10',
        bundesland: 'Oberösterreich',
        gemeinde: 'Linz',
        plz: '4020',
        standortnummer: '4128',
        adresse: 'Hauptplatz 1'
      },
      {
        id: 'loc-11',
        bundesland: 'Oberösterreich',
        gemeinde: 'Wels',
        plz: '4600',
        standortnummer: '4129',
        adresse: 'Stadtplatz 1'
      },
      {
        id: 'loc-12',
        bundesland: 'Oberösterreich',
        gemeinde: 'Steyr',
        plz: '4400',
        standortnummer: '4130',
        adresse: 'Stadtplatz 27'
      },
    ]
  },
  {
    id: 'period-3',
    startDate: '2026-02-03',
    endDate: '2026-02-16',
    locations: [
      {
        id: 'loc-13',
        bundesland: 'Steiermark',
        gemeinde: 'Graz',
        plz: '8010',
        standortnummer: '8234',
        adresse: 'Hauptplatz 1'
      },
      {
        id: 'loc-14',
        bundesland: 'Steiermark',
        gemeinde: 'Graz',
        plz: '8020',
        standortnummer: '8235',
        adresse: 'Annenstraße 1'
      },
      {
        id: 'loc-15',
        bundesland: 'Salzburg',
        gemeinde: 'Salzburg',
        plz: '5020',
        standortnummer: '5167',
        adresse: 'Mozartplatz 1'
      },
      {
        id: 'loc-16',
        bundesland: 'Salzburg',
        gemeinde: 'Hallein',
        plz: '5400',
        standortnummer: '5168',
        adresse: 'Kornsteinplatz 1'
      },
      {
        id: 'loc-17',
        bundesland: 'Tirol',
        gemeinde: 'Innsbruck',
        plz: '6020',
        standortnummer: '6001',
        adresse: 'Maria-Theresien-Straße 1'
      },
    ]
  },
  {
    id: 'period-4',
    startDate: '2026-02-17',
    endDate: '2026-03-02',
    locations: [
      {
        id: 'loc-18',
        bundesland: 'Kärnten',
        gemeinde: 'Klagenfurt',
        plz: '9020',
        standortnummer: '7001',
        adresse: 'Neuer Platz 1'
      },
      {
        id: 'loc-19',
        bundesland: 'Kärnten',
        gemeinde: 'Villach',
        plz: '9500',
        standortnummer: '7002',
        adresse: 'Hauptplatz 1'
      },
      {
        id: 'loc-20',
        bundesland: 'Vorarlberg',
        gemeinde: 'Bregenz',
        plz: '6900',
        standortnummer: '8001',
        adresse: 'Kornmarktplatz 1'
      },
    ]
  },
]

export function LocationSelector({ selectedLocations, onChange, readOnly = false }: LocationSelectorProps) {
  const [periods] = useState<OccupancyPeriod[]>(FALLBACK_PERIODS)
  const [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({})
  const [openBundesland, setOpenBundesland] = useState<Record<string, boolean>>({})
  const [openGemeinde, setOpenGemeinde] = useState<Record<string, boolean>>({})
  const [openPLZ, setOpenPLZ] = useState<Record<string, boolean>>({})

  // Group locations by hierarchy
  const groupLocationsByHierarchy = (locations: Location[]) => {
    const grouped: Record<string, Record<string, Record<string, Location[]>>> = {}
    
    const sortedLocations = [...locations].sort((a, b) => {
      if (a.bundesland !== b.bundesland) return a.bundesland.localeCompare(b.bundesland)
      if (a.gemeinde !== b.gemeinde) return a.gemeinde.localeCompare(b.gemeinde)
      return a.plz.localeCompare(b.plz)
    })
    
    for (const location of sortedLocations) {
      if (!grouped[location.bundesland]) {
        grouped[location.bundesland] = {}
      }
      if (!grouped[location.bundesland][location.gemeinde]) {
        grouped[location.bundesland][location.gemeinde] = {}
      }
      if (!grouped[location.bundesland][location.gemeinde][location.plz]) {
        grouped[location.bundesland][location.gemeinde][location.plz] = []
      }
      grouped[location.bundesland][location.gemeinde][location.plz].push(location)
    }
    
    return grouped
  }

  const togglePeriod = (periodId: string) => {
    setOpenPeriods(prev => ({ ...prev, [periodId]: !prev[periodId] }))
  }

  const toggleBundesland = (key: string) => {
    setOpenBundesland(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleGemeinde = (key: string) => {
    setOpenGemeinde(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const togglePLZ = (key: string) => {
    setOpenPLZ(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isLocationSelected = (periodId: string, locationId: string): boolean => {
    return selectedLocations.some(
      loc => loc.periodId === periodId && loc.locationId === locationId
    )
  }

  const handleLocationToggle = (period: OccupancyPeriod, location: Location) => {
    if (readOnly) return
    
    const periodDates = `${new Date(period.startDate).toLocaleDateString('de-DE')} - ${new Date(period.endDate).toLocaleDateString('de-DE')}`
    const isSelected = isLocationSelected(period.id, location.id)
    
    if (isSelected) {
      onChange(selectedLocations.filter(
        loc => !(loc.periodId === period.id && loc.locationId === location.id)
      ))
    } else {
      onChange([...selectedLocations, {
        periodId: period.id,
        periodDates,
        locationId: location.id,
        bundesland: location.bundesland,
        gemeinde: location.gemeinde,
        plz: location.plz,
        standortnummer: location.standortnummer,
        adresse: location.adresse,
      }])
    }
  }

  const handleSelectAllInPeriod = (period: OccupancyPeriod, select: boolean) => {
    if (readOnly) return
    
    const periodDates = `${new Date(period.startDate).toLocaleDateString('de-DE')} - ${new Date(period.endDate).toLocaleDateString('de-DE')}`
    
    if (select) {
      const newLocations = period.locations.map(location => ({
        periodId: period.id,
        periodDates,
        locationId: location.id,
        bundesland: location.bundesland,
        gemeinde: location.gemeinde,
        plz: location.plz,
        standortnummer: location.standortnummer,
        adresse: location.adresse,
      }))
      
      const filtered = selectedLocations.filter(loc => loc.periodId !== period.id)
      onChange([...filtered, ...newLocations])
    } else {
      onChange(selectedLocations.filter(loc => loc.periodId !== period.id))
    }
  }

  const getSelectedCountForPeriod = (periodId: string): number => {
    return selectedLocations.filter(loc => loc.periodId === periodId).length
  }

  const removeSelectedLocation = (periodId: string, locationId: string) => {
    onChange(selectedLocations.filter(
      loc => !(loc.periodId === periodId && loc.locationId === locationId)
    ))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Belegungszeitraum mit Standortliste
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Hierarchie: Belegungszeitraum → Bundesland → Gemeinde → PLZ → Standort
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {periods.map((period) => {
            const groupedLocations = groupLocationsByHierarchy(period.locations)
            const selectedCount = getSelectedCountForPeriod(period.id)
            const totalCount = period.locations.length
            const allSelected = selectedCount === totalCount && totalCount > 0

            return (
              <Collapsible
                key={period.id}
                open={openPeriods[period.id]}
                onOpenChange={() => togglePeriod(period.id)}
              >
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                        {openPeriods[period.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {new Date(period.startDate).toLocaleDateString('de-DE')} - {new Date(period.endDate).toLocaleDateString('de-DE')}
                        </span>
                      </CollapsibleTrigger>
                      <Badge variant="outline">
                        {selectedCount} / {totalCount} Standorte
                      </Badge>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`period-all-${period.id}`}
                          checked={allSelected}
                          onCheckedChange={(checked) => handleSelectAllInPeriod(period, checked === true)}
                        />
                        <Label htmlFor={`period-all-${period.id}`} className="text-sm cursor-pointer">
                          Alle
                        </Label>
                      </div>
                    )}
                  </div>

                  <CollapsibleContent className="mt-3 space-y-2">
                    {Object.entries(groupedLocations).map(([bundesland, gemeinden]) => {
                      const bundeslandKey = `${period.id}-${bundesland}`
                      
                      return (
                        <Collapsible
                          key={bundeslandKey}
                          open={openBundesland[bundeslandKey]}
                          onOpenChange={() => toggleBundesland(bundeslandKey)}
                        >
                          <div className="ml-4 border-l-2 border-primary/20 pl-3">
                            <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary font-medium text-sm">
                              {openBundesland[bundeslandKey] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {bundesland}
                            </CollapsibleTrigger>

                            <CollapsibleContent className="mt-2 space-y-2">
                              {Object.entries(gemeinden).map(([gemeinde, plzs]) => {
                                const gemeindeKey = `${bundeslandKey}-${gemeinde}`
                                
                                return (
                                  <Collapsible
                                    key={gemeindeKey}
                                    open={openGemeinde[gemeindeKey]}
                                    onOpenChange={() => toggleGemeinde(gemeindeKey)}
                                  >
                                    <div className="ml-4">
                                      <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary text-sm">
                                        {openGemeinde[gemeindeKey] ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                        {gemeinde}
                                      </CollapsibleTrigger>

                                      <CollapsibleContent className="mt-2 space-y-1">
                                        {Object.entries(plzs).map(([plz, locations]) => {
                                          const plzKey = `${gemeindeKey}-${plz}`
                                          
                                          return (
                                            <Collapsible
                                              key={plzKey}
                                              open={openPLZ[plzKey]}
                                              onOpenChange={() => togglePLZ(plzKey)}
                                            >
                                              <div className="ml-4">
                                                <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary text-sm text-muted-foreground">
                                                  {openPLZ[plzKey] ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                  PLZ {plz}
                                                </CollapsibleTrigger>

                                                <CollapsibleContent className="mt-1 ml-4 space-y-1">
                                                  {locations.map((location) => (
                                                    <div
                                                      key={location.id}
                                                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                                                    >
                                                      <Checkbox
                                                        id={`loc-${period.id}-${location.id}`}
                                                        checked={isLocationSelected(period.id, location.id)}
                                                        onCheckedChange={() => handleLocationToggle(period, location)}
                                                        disabled={readOnly}
                                                      />
                                                      <Label
                                                        htmlFor={`loc-${period.id}-${location.id}`}
                                                        className="flex-1 cursor-pointer text-sm"
                                                      >
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                          #{location.standortnummer}
                                                        </span>
                                                        {' '}
                                                        {location.adresse}
                                                      </Label>
                                                    </div>
                                                  ))}
                                                </CollapsibleContent>
                                              </div>
                                            </Collapsible>
                                          )
                                        })}
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                )
                              })}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )
                    })}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>

        {selectedLocations.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Ausgewählte Standorte: {selectedLocations.length}</h4>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange([])}
                >
                  Alle entfernen
                </Button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {selectedLocations.map((loc) => (
                <div
                  key={`${loc.periodId}-${loc.locationId}`}
                  className="flex items-start justify-between gap-2 text-sm bg-background p-2 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-primary mb-1">
                      {loc.periodDates}
                    </div>
                    <div className="text-muted-foreground">
                      {loc.bundesland} › {loc.gemeinde} › PLZ {loc.plz}
                    </div>
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">#{loc.standortnummer}</span>
                      {' '}
                      {loc.adresse}
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => removeSelectedLocation(loc.periodId, loc.locationId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}