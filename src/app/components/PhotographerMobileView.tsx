import { useState, useEffect, useRef } from 'react'
import { Badge } from './ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Camera, CircleCheck as CheckCircle2, Circle, ChevronDown, ChevronUp, MapPin, X, Image as ImageIcon, Navigation, Route, Copy, Check, User, LogOut, LocateFixed, Loader as Loader2, CircleAlert as AlertCircle, Compass, List, RefreshCw, ChevronRight, ArrowLeft, Upload, QrCode, Nfc, ScanLine, Search, CircleCheck as CheckCircle, Circle as XCircle, Wifi } from 'lucide-react'
import jsQR from 'jsqr'
import { toast } from "sonner"
import { projectId, publicAnonKey } from '../utils/supabase/info'

// ── PLZ Coordinate Lookup (Austrian postal code approximate centroids) ─────────
const PLZ_COORDS: Record<string, [number, number]> = {
  '1010': [48.2093, 16.3727], '1020': [48.2201, 16.3904], '1030': [48.1974, 16.3908],
  '1040': [48.1937, 16.3676], '1050': [48.1861, 16.3565], '1060': [48.1924, 16.3488],
  '1070': [48.2032, 16.3507], '1080': [48.2085, 16.3503], '1090': [48.2180, 16.3563],
  '1100': [48.1670, 16.3767], '1110': [48.1748, 16.4137], '1120': [48.1770, 16.3291],
  '1130': [48.1738, 16.2877], '1140': [48.2165, 16.2888], '1150': [48.1946, 16.3291],
  '1160': [48.2169, 16.3183], '1170': [48.2330, 16.3180], '1180': [48.2377, 16.3343],
  '1190': [48.2487, 16.3497], '1200': [48.2323, 16.3765], '1210': [48.2620, 16.4078],
  '1220': [48.2285, 16.4755], '1230': [48.1503, 16.3068],
  '2000': [48.1557, 16.2366], '2100': [48.3226, 16.5208], '2130': [48.3748, 16.6219],
  '2200': [48.1271, 16.8436], '2300': [48.0928, 16.3255], '2320': [48.0641, 16.2999],
  '2340': [48.0329, 16.2535], '2400': [47.9971, 16.2356], '2500': [47.9994, 16.2324],
  '2600': [47.8177, 16.2515], '2700': [47.8215, 16.2620], '2800': [47.9423, 15.7333],
  '2900': [48.0929, 15.6153], '3000': [48.2175, 15.6270], '3100': [48.1835, 15.6133],
  '3300': [48.0741, 14.8674], '3400': [48.3044, 15.6049], '3500': [48.4110, 15.5918],
  '3580': [48.6033, 15.4500], '3600': [48.3713, 15.3390], '3700': [48.5033, 15.3500],
  '3800': [48.5939, 15.1708], '4020': [48.3069, 14.2858], '4040': [48.3394, 14.2895],
  '4050': [48.2892, 14.1903], '4060': [48.3113, 14.3561], '4100': [48.2490, 13.9620],
  '4150': [48.4499, 13.8765], '4200': [48.4413, 14.5119], '4300': [48.2117, 14.5154],
  '4400': [48.0145, 14.4810], '4500': [48.0423, 14.2208], '4600': [48.1568, 14.0289],
  '4700': [48.2265, 13.7281], '4800': [47.8627, 13.5832], '4900': [48.2456, 13.5100],
  '5020': [47.8095, 13.0550], '5100': [47.8654, 13.1200], '5110': [47.9073, 12.9613],
  '5300': [47.8213, 13.2265], '5400': [47.7313, 13.0872], '5500': [47.5510, 13.2262],
  '5600': [47.4030, 13.1467], '5700': [47.3318, 12.9166], '5760': [47.2879, 12.7810],
  '5900': [47.3152, 12.8500], '6020': [47.2682, 11.3927], '6060': [47.2887, 11.4671],
  '6100': [47.2977, 11.6105], '6130': [47.2825, 11.6780], '6200': [47.5025, 11.7714],
  '6300': [47.5070, 12.1892], '6330': [47.5872, 12.1903], '6370': [47.4503, 12.1600],
  '6400': [47.3536, 10.8928], '6500': [47.2320, 10.8668], '6600': [47.5022, 10.7235],
  '6700': [47.2276, 9.7400],  '6800': [47.4728, 9.7428],  '6850': [47.3500, 9.7333],
  '6900': [47.5040, 9.7525],  '6920': [47.5472, 9.7450],  '7000': [47.8455, 16.5297],
  '7100': [47.6970, 16.5988], '7200': [47.6152, 16.8283], '7300': [47.5218, 16.8578],
  '7400': [47.3840, 16.7284], '7500': [47.2174, 16.6258], '8010': [47.0753, 15.4614],
  '8020': [47.0785, 15.4337], '8041': [47.0167, 15.4833], '8100': [47.0887, 15.0920],
  '8200': [47.2720, 15.7066], '8230': [47.3900, 15.7667], '8280': [47.3296, 15.9094],
  '8300': [47.2547, 15.3386], '8400': [46.9917, 15.0864], '8500': [46.9300, 15.7200],
  '8600': [47.4297, 14.9625], '8700': [47.3904, 14.9944], '8750': [47.1962, 14.7403],
  '8800': [47.2089, 14.9975], '8900': [47.5822, 14.5375], '8950': [47.5208, 14.1050],
  '9020': [46.6228, 14.3053], '9100': [46.6225, 14.4369], '9170': [46.5820, 14.1470],
  '9200': [46.7342, 14.1108], '9300': [46.8272, 14.2711], '9400': [46.9214, 13.8408],
  '9500': [46.9181, 13.9111], '9520': [46.8111, 13.7569], '9580': [46.8939, 13.4500],
  '9700': [46.9619, 13.2222], '9800': [46.7517, 12.9961], '9900': [46.8300, 12.7700],
}

function getApproxCoords(plz: string): { lat: number; lng: number } | null {
  if (!plz || plz.length < 4) return null
  const n = parseInt(plz)
  if (isNaN(n)) return null
  // Exact match
  if (PLZ_COORDS[plz]) return { lat: PLZ_COORDS[plz][0], lng: PLZ_COORDS[plz][1] }
  // 3-digit prefix match
  const p3 = plz.slice(0, 3)
  for (const [k, v] of Object.entries(PLZ_COORDS)) {
    if (k.startsWith(p3[0]) && k.startsWith(p3.slice(0, 2))) return { lat: v[0], lng: v[1] }
  }
  // Bundesland fallback
  const p1 = plz[0]
  const fallbacks: Record<string, [number, number]> = {
    '1': [48.209, 16.373], '2': [48.2, 15.8], '3': [48.2, 15.6],
    '4': [48.2, 14.2], '5': [47.8, 13.0], '6': [47.3, 11.4],
    '7': [47.8, 16.5], '8': [47.1, 15.4], '9': [46.6, 14.3],
  }
  return fallbacks[p1] ? { lat: fallbacks[p1][0], lng: fallbacks[p1][1] } : null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Route helpers – Google Maps only ─────────────────────────────────────────
interface NextLocation {
  label: string
  address: string
}

function buildRouteUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

/**
 * Builds a Google Maps multi-stop URL.
 * If coords are provided they are used as the starting point (origin).
 * Google Maps will show an "Optimize stops" button after opening.
 */
function buildMultiStopUrl(addresses: string[], coords?: { lat: number; lng: number }): string {
  if (addresses.length === 0) return '#'
  // Max 23 destination stops (plus optional origin = 24 path segments)
  const stops = addresses.slice(0, 23).map(a => encodeURIComponent(a)).join('/')
  if (coords) {
    return `https://www.google.com/maps/dir/${coords.lat},${coords.lng}/${stops}`
  }
  return `https://www.google.com/maps/dir/${stops}`
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Order {
  id: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  laufzeitStart: string
  laufzeitEnd: string
  startKW: number
  photoCount: number
  sujet?: string
  selectedLocations?: SelectedLocation[]
  photoStatus: string
  marke?: string
  infos?: string
  besondereAnforderungen?: string
  photographerAssignments?: PhotographerAssignment[]
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

interface PhotographerAssignment {
  photographerId: string
  week: number
  year: number
  locationIds: string[]
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

interface Photographer {
  id: string
  name: string
  email: string
  phone: string
  active: boolean
}

interface PhotographerMobileViewProps {
  orders: Order[]
  onExit?: () => void
}

interface LocationEntry {
  key: string
  orderId: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  bundesland: string
  plz: string
  gemeinde: string
  standortnummer: string
  adresse: string
  photoCount: number
  marke: string
  unternehmen: string
  region: string
  osaId: string
  tafelnummer: string
  haendler: string
  buchungsformat: string
  konstruktionsformat: string
  wtr: string
  tour: string
  isBelegbildTauglich: boolean
  besondereInfos: string
  laufzeitStart: string
  laufzeitEnd: string
  sujet: string
}

interface RegionGroup {
  code: string
  locations: LocationEntry[]
  orderEntries: OrderEntry[]
}

interface OrderEntry {
  key: string
  orderId: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  bundesland: string
  photoCount: number
}

interface CapturedPhoto {
  id: string
  url: string
  name: string
  capturedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const REGIONAL_CODES: Record<string, string[]> = {
  'Wien': ['GEW'],
  'Niederösterreich': ['GEW', 'USP', 'WBR'],
  'Burgenland': ['GEW', 'ANK'],
  'Steiermark': ['ANK', 'CLA', 'USP'],
  'Kärnten': ['PSG'],
  'Oberösterreich': ['USP', 'WBR', 'DGO'],
  'Salzburg': ['PSB'],
  'Tirol': ['PSG', 'PSB', 'HWT', 'SWG'],
  'Vorarlberg': ['PSB', 'HWT', 'SWG'],
}

const REGION_LABELS: Record<string, string> = {
  GEW: 'Wien / NÖ / Burgenland',
  USP: 'Oberösterreich USP',
  WBR: 'Oberösterreich WBR',
  DGO: 'OÖ Donau / Grieskirchen / Wels',
  ANK: 'Steiermark / Burgenland',
  CLA: 'Kartnig',
  PSG: 'Tirol / Kärnten Progress',
  SWG: 'Tirol SWG',
  HWT: 'Tirol / Vorarlberg HWT',
  PSB: 'Salzburg / Vorarlberg',
}

const EIGNERCODE: Record<string, string> = {
  GEW: '012', ANK: '061', WBR: '130', HWN: '140', HWT: '160',
  AWS: '180', PER: '210', SWG: '230', WUA: '063', USP: '265', 'USP-008': '008',
  PSG: '026', PWL: '006', PSB: '005', KFM: '030', CLA: '062',
  CEE: '014', RBO: '631', EPA: '020', ISA: '004', ARG: '035',
  GWS: '015', IPA: '007', DGO: '130',
}

function buildOsaId(gkz: string, regionalCode: string, standortnummer: string, tafelnummer: string): string {
  if (!gkz || !regionalCode || !standortnummer || !tafelnummer) return ''
  const eignerNum = (EIGNERCODE[regionalCode] || regionalCode).padStart(3, '0')
  const snrPadded = standortnummer.trim().padStart(5, '0')
  const tafelPadded = String(parseInt(tafelnummer) || 0).padStart(3, '0')
  return `${gkz}.${eignerNum}.${snrPadded}_${tafelPadded}`
}

const REGION_COLORS: Record<string, string> = {
  GEW: 'bg-red-600',
  USP: 'bg-[#003D5C]',
  WBR: 'bg-[#005580]',
  DGO: 'bg-indigo-700',
  ANK: 'bg-green-700',
  CLA: 'bg-purple-700',
  PSG: 'bg-orange-600',
  SWG: 'bg-amber-600',
  HWT: 'bg-teal-600',
  PSB: 'bg-[#00A9CE]',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMondayOfWeek(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setDate(jan4.getDate() - (jan4.getDay() + 6) % 7)
  const targetMonday = new Date(mondayOfWeek1)
  targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7)
  return targetMonday
}

function getSundayOfWeek(year: number, week: number): Date {
  const monday = getMondayOfWeek(year, week)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday
}

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

/** Returns the assignment-system uniqueId for a location (mirrors PhotographerAssignment logic) */
function getLocationUniqueId(loc: SelectedLocation): string {
  return loc.locationId ||
    `${loc.standortnummer}-${loc.plz}-${loc.adresse.replace(/\s+/g, '_')}-${loc.periodId || 'default'}`
}

/** Check if a specific location is assigned to a photographer for a given week/year */
function isLocationAssigned(
  order: Order,
  loc: SelectedLocation,
  photographerId: string,
  week: number,
  year: number
): boolean {
  if (!order.photographerAssignments) return false
  const uid = getLocationUniqueId(loc)
  return order.photographerAssignments.some(
    a => a.photographerId === photographerId &&
         a.week === week &&
         a.year === year &&
         Array.isArray(a.locationIds) &&
         a.locationIds.includes(uid)
  )
}

/** Check if an order has any location assigned to a photographer for a given week/year */
function orderHasPhotographerAssignment(
  order: Order,
  photographerId: string,
  week: number,
  year: number
): boolean {
  if (!order.photographerAssignments) return false
  return order.photographerAssignments.some(
    a => a.photographerId === photographerId &&
         a.week === week &&
         a.year === year &&
         Array.isArray(a.locationIds) &&
         a.locationIds.length > 0
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function PhotographerMobileView({ orders, onExit }: PhotographerMobileViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('2026-02')
  const [masterLocations, setMasterLocations] = useState<any[]>([])
  const [photographers, setPhotographers] = useState<Photographer[]>([])
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['GEW']))
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const [doneLocations, setDoneLocations] = useState<Set<string>>(new Set())
  const [photos, setPhotos] = useState<Record<string, CapturedPhoto[]>>({})
  const [lightboxPhoto, setLightboxPhoto] = useState<CapturedPhoto | null>(null)
  const [showRouteOverview, setShowRouteOverview] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  // Tab state
  const [activeTab, setActiveTab] = useState<'tour' | 'nearby' | 'scanner' | 'orders'>('tour')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`

  useEffect(() => {
    fetchMasterLocations()
    fetchPhotographers()
  }, [])

  const fetchMasterLocations = async () => {
    try {
      const res = await fetch(`${serverUrl}/master-locations`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.locations) setMasterLocations(data.locations)
    } catch (e) {
      console.error('Error fetching master locations:', e)
    }
  }

  const fetchPhotographers = async () => {
    try {
      const res = await fetch(`${serverUrl}/photographers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.photographers) setPhotographers(data.photographers.filter((p: Photographer) => p.active))
    } catch (e) {
      console.error('Error fetching photographers:', e)
    }
  }

  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation nicht verfügbar')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
        toast.success('Standort ermittelt')
      },
      err => {
        setGpsLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Standortzugriff verweigert – bitte in den Browser-Einstellungen erlauben')
        } else {
          setGpsError('Standort konnte nicht ermittelt werden')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const getWeekOptions = () => {
    const weeks = []
    const year = 2026
    for (let week = 1; week <= 52; week++) {
      const monday = getMondayOfWeek(year, week)
      const sunday = getSundayOfWeek(year, week)
      const fmt = (d: Date) =>
        `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`
      weeks.push({
        value: `${year}-${week.toString().padStart(2, '0')}`,
        label: `KW ${week} (${fmt(monday)} – ${fmt(sunday)})`,
      })
    }
    return weeks
  }

  const getRegionalCode = (loc: SelectedLocation): string => {
    if (loc.regionalCode) return loc.regionalCode
    const masterLoc = masterLocations.find(ml => ml.standortnummer === loc.standortnummer)
    if (masterLoc?.regionalCode) return masterLoc.regionalCode
    const bundesland = getBundeslandFromPLZ(loc.plz)
    if (['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)) return 'GEW'
    const codes = REGIONAL_CODES[bundesland]
    return codes?.[0] || 'UNKNOWN'
  }

  // Build region groups – filtered by selected photographer
  const buildRegionGroups = (): RegionGroup[] => {
    const [year, week] = selectedWeek.split('-').map(Number)
    const weekStart = getMondayOfWeek(year, week)
    const weekEnd = getSundayOfWeek(year, week)

    const relevantOrders = orders.filter(order => {
      if (!order.laufzeitStart || !order.laufzeitEnd) return false
      const orderStart = new Date(order.laufzeitStart)
      const orderEnd = new Date(order.laufzeitEnd)
      return orderStart <= weekEnd && orderEnd >= weekStart
    })

    const regionMap: Record<string, RegionGroup> = {}
    const ensureRegion = (code: string) => {
      if (!regionMap[code]) regionMap[code] = { code, locations: [], orderEntries: [] }
    }

    relevantOrders.forEach(order => {
      // Wien / NÖ / Burgenland – detailed location rows
      if (order.selectedLocations && order.selectedLocations.length > 0) {
        const wienNoBlgdPhotoCount =
          (order.photosPerRegion?.wien || 0) +
          (order.photosPerRegion?.no || 0) +
          (order.photosPerRegion?.bgld || 0)
        const wienNoBgldLocationCount = order.selectedLocations.filter(l =>
          ['Wien', 'Niederösterreich', 'Burgenland'].includes(getBundeslandFromPLZ(l.plz))
        ).length
        const photosPerLocation =
          wienNoBlgdPhotoCount > 0 && wienNoBgldLocationCount > 0
            ? Math.ceil(wienNoBlgdPhotoCount / wienNoBgldLocationCount)
            : 1

        order.selectedLocations.forEach(loc => {
          const bundesland = getBundeslandFromPLZ(loc.plz)
          if (!['Wien', 'Niederösterreich', 'Burgenland'].includes(bundesland)) return

          // ── Photographer filter ──
          if (selectedPhotographerId) {
            if (!isLocationAssigned(order, loc, selectedPhotographerId, week, year)) return
          }

          const code = getRegionalCode(loc)
          ensureRegion(code)
          const masterLoc = masterLocations.find(ml => ml.standortnummer === loc.standortnummer)
          const existingCount = regionMap[code].locations.filter(
            l => l.standortnummer === loc.standortnummer && l.orderId === order.id
          ).length
          const key = existingCount > 0
            ? `${order.id}__${loc.standortnummer}__${existingCount}`
            : `${order.id}__${loc.standortnummer}`

          regionMap[code].locations.push({
            key,
            orderId: order.id,
            auftrag: order.auftrag,
            auftraggeber: order.auftraggeber,
            auftragsnr: order.auftragsnr,
            bundesland,
            plz: loc.plz,
            gemeinde: loc.gemeinde,
            standortnummer: loc.standortnummer,
            adresse: loc.adresse,
            photoCount: photosPerLocation,
            marke: order.marke || '',
            unternehmen: masterLoc?.unternehmen || '',
            region: masterLoc?.region || '',
            osaId: masterLoc?.osaId || masterLoc?.osa_id ||
              buildOsaId(masterLoc?.gemeindekennzeichen || '', masterLoc?.regionalCode || loc.regionalCode || '', loc.standortnummer || '', masterLoc?.tafelnummer || ''),
            tafelnummer: masterLoc?.tafelnummer || '',
            haendler: masterLoc?.haendler || '',
            buchungsformat: masterLoc?.buchungsformat || '',
            konstruktionsformat: masterLoc?.konstruktionsformat || masterLoc?.cofm || '',
            wtr: masterLoc?.wtr || '',
            tour: masterLoc?.tour || '',
            isBelegbildTauglich: masterLoc?.isBelegbildTauglich ?? false,
            besondereInfos: order.besondereAnforderungen || order.infos || masterLoc?.besondereInfos || '',
            laufzeitStart: order.laufzeitStart || '',
            laufzeitEnd: order.laufzeitEnd || '',
            sujet: order.sujet || '',
          })
        })
      }

      // Other Bundesländer – order-level entries
      // Only show if this photographer has any assignment on this order for this week
      if (order.photosPerRegion) {
        const hasAssignment = !selectedPhotographerId ||
          orderHasPhotographerAssignment(order, selectedPhotographerId, week, year)
        if (!hasAssignment) return

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
          { field: 'vVorarlberg', code: 'PSB', bundesland: 'Vorarlberg' },
        ]
        regionMapping.forEach(({ field, code, bundesland }) => {
          const photoCount = order.photosPerRegion?.[field as keyof typeof order.photosPerRegion] || 0
          if (photoCount > 0) {
            ensureRegion(code)
            const key = `${order.id}__${code}__${bundesland}`
            const existing = regionMap[code].orderEntries.find(e => e.key === key)
            if (existing) {
              existing.photoCount += photoCount
            } else {
              regionMap[code].orderEntries.push({
                key,
                orderId: order.id,
                auftrag: order.auftrag,
                auftraggeber: order.auftraggeber,
                auftragsnr: order.auftragsnr,
                bundesland,
                photoCount,
              })
            }
          }
        })
      }
    })

    return Object.values(regionMap).sort((a, b) => a.code.localeCompare(b.code))
  }

  const buildFlatSequence = (groups: RegionGroup[]) => {
    const flat: { key: string; address: string; label: string }[] = []
    groups.forEach(rg => {
      rg.locations.forEach(loc => {
        flat.push({
          key: loc.key,
          label: `${loc.standortnummer} – ${loc.gemeinde}`,
          address: `${loc.adresse}, ${loc.plz} ${loc.gemeinde}, Österreich`,
        })
      })
      rg.orderEntries.forEach(entry => {
        flat.push({
          key: entry.key,
          label: `${entry.auftragsnr} (${entry.bundesland})`,
          address: `${entry.bundesland}, Österreich`,
        })
      })
    })
    return flat
  }

  const regionGroups = buildRegionGroups()
  const flatSequence = buildFlatSequence(regionGroups)
  const allAddresses = flatSequence.map(e => e.address)

  const handleCopyAllAddresses = () => {
    const text = flatSequence.map((e, i) => `${i + 1}. ${e.label}\n   ${e.address}`).join('\n')
    const doCopy = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
        setCopiedAll(true)
        toast.success('Alle Adressen kopiert')
        setTimeout(() => setCopiedAll(false), 2000)
      } catch {
        toast.error('Kopieren nicht verfügbar')
      }
      document.body.removeChild(ta)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedAll(true)
        toast.success('Alle Adressen kopiert')
        setTimeout(() => setCopiedAll(false), 2000)
      }).catch(doCopy)
    } else {
      doCopy()
    }
  }

  const getNextLocation = (key: string): NextLocation | null => {
    const idx = flatSequence.findIndex(e => e.key === key)
    if (idx === -1 || idx === flatSequence.length - 1) return null
    const next = flatSequence[idx + 1]
    return { label: next.label, address: next.address }
  }

  const totalItems = regionGroups.reduce((sum, rg) => sum + rg.locations.length + rg.orderEntries.length, 0)
  const doneCount = doneLocations.size

  const toggleRegion = (code: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleLocationExpand = (key: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleDone = (key: string) => {
    setDoneLocations(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const newPhotos: CapturedPhoto[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      capturedAt: new Date().toISOString(),
    }))
    setPhotos(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newPhotos] }))
    toast.success(`${files.length} Foto${files.length > 1 ? 's' : ''} hinzugefügt`)
    if (fileInputRefs.current[key]) fileInputRefs.current[key]!.value = ''
  }

  const removePhoto = (key: string, photoId: string) => {
    setPhotos(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== photoId) }))
  }

  const selectedPhotographer = photographers.find(p => p.id === selectedPhotographerId)
  const weekLabel = getWeekOptions().find(w => w.value === selectedWeek)?.label || selectedWeek

  // ── Photographer selection screen ─────────────────────────────────────────
  if (!selectedPhotographerId) {
    return (
      <div
        className="flex flex-col bg-gray-100"
        style={{ maxWidth: 480, margin: '0 auto', height: '100dvh' }}
      >
        {/* Header */}
        <div className="bg-[#C8102E] text-white px-6 pt-10 pb-8">
          <div className="flex items-center gap-3 mb-1">
            <Camera className="h-7 w-7 opacity-90" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Gewista</div>
              <div className="text-xl font-bold leading-tight">Fotografen-App</div>
            </div>
          </div>
        </div>

        {/* Selection card */}
        <div className="flex-1 flex flex-col justify-start px-5 pt-8 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-full bg-[#003D5C]/10 flex items-center justify-center">
                <User className="h-5 w-5 text-[#003D5C]" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">Wer bist du?</div>
                <div className="text-xs text-gray-500">Wähle deinen Namen um fortzufahren</div>
              </div>
            </div>

            <Select onValueChange={v => setSelectedPhotographerId(v)}>
              <SelectTrigger className="h-12 text-sm border-gray-300">
                <SelectValue placeholder="Fotograf auswählen …" />
              </SelectTrigger>
              <SelectContent>
                {photographers.length === 0 && (
                  <SelectItem value="_loading" disabled>Wird geladen …</SelectItem>
                )}
                {photographers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-center text-xs text-gray-400">
            Nur dir zugewiesene Standorte werden angezeigt.
          </p>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-gray-100 overflow-hidden" style={{ maxWidth: 480, margin: '0 auto', height: '100dvh' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 z-30 bg-[#C8102E] text-white shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {onExit && (
              <button onClick={onExit} className="mr-1 p-1 rounded-full bg-white/15 active:bg-white/30">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Fotografen-App</div>
              <div className="text-lg font-bold leading-tight">Gewista Fotoauftrag</div>
            </div>
          </div>
          {/* Photographer badge + logout */}
          <button
            onClick={() => setSelectedPhotographerId(null)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5"
          >
            <User className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold max-w-[100px] truncate">{selectedPhotographer?.name}</span>
            <LogOut className="h-3 w-3 opacity-70" />
          </button>
        </div>

        {/* Week selector */}
        <div className="px-4 pb-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="h-9 bg-white/15 border-white/30 text-white text-sm [&>svg]:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getWeekOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress bar – only on Tour tab */}
        {activeTab === 'tour' && totalItems > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs mb-1 opacity-90">
              <span>{doneCount} von {totalItems} erledigt</span>
              <span className="font-bold">{Math.round((doneCount / totalItems) * 100)}%</span>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${totalItems > 0 ? (doneCount / totalItems) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">

      {/* ── Tour Tab ── */}
      {activeTab === 'tour' && (<>

      {/* No data */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Camera className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-700 font-medium text-sm mb-1">Keine Standorte zugewiesen</p>
          <p className="text-gray-400 text-xs">Für {weekLabel} sind dir keine Standorte zugeteilt.</p>
        </div>
      )}

      {/* ── Gesamtroute Card ── */}
      {totalItems > 0 && (
        <div className="px-3 pt-4">
          <div className="rounded-xl overflow-hidden shadow-sm border border-[#00A9CE]/30 bg-white mb-3">
            {/* Card header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#003D5C] to-[#005580] text-white"
              onClick={() => setShowRouteOverview(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 opacity-80" />
                <div className="text-left">
                  <div className="font-bold text-sm">Gesamtroute</div>
                  <div className="text-xs opacity-75">{flatSequence.length} Standorte · Alle Regionen</div>
                </div>
              </div>
              {showRouteOverview
                ? <ChevronUp className="h-4 w-4 opacity-70" />
                : <ChevronDown className="h-4 w-4 opacity-70" />
              }
            </button>

            {/* GPS + route section */}
            <div className="px-3 py-3 space-y-2 bg-gray-50 border-b border-gray-100">

              {/* GPS button / status */}
              {!gpsCoords ? (
                <button
                  onClick={requestGPS}
                  disabled={gpsLoading}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#003D5C] text-white text-sm font-semibold active:opacity-80 transition-opacity disabled:opacity-60"
                >
                  {gpsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  {gpsLoading ? 'Standort wird ermittelt …' : 'Aktuellen Standort ermitteln'}
                </button>
              ) : (
                <div className="flex items-center justify-between px-3 h-10 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-xs font-medium">
                    <LocateFixed className="h-3.5 w-3.5" />
                    <span>Standort ermittelt ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)})</span>
                  </div>
                  <button
                    onClick={() => { setGpsCoords(null); setGpsError(null) }}
                    className="text-green-600 hover:text-green-800 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* GPS error */}
              {gpsError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-600">{gpsError}</span>
                </div>
              )}

              {/* Google Maps button */}
              <a
                href={buildMultiStopUrl(allAddresses, gpsCoords ?? undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2.5 w-full h-12 rounded-xl border shadow-sm active:opacity-70 transition-opacity ${
                  gpsCoords
                    ? 'bg-white border-[#00A9CE]/40 ring-1 ring-[#00A9CE]/20'
                    : 'bg-white border-gray-200 opacity-60 pointer-events-none'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-700 leading-tight">
                    Kürzeste Route in Google Maps
                  </div>
                  <div className="text-[10px] text-gray-400 leading-tight">
                    {gpsCoords
                      ? `ab aktuellem Standort · ${flatSequence.length} Stops`
                      : 'Zuerst Standort ermitteln'
                    }
                  </div>
                </div>
              </a>

              {/* Hint: optimize stops in Google Maps */}
              {gpsCoords && (
                <p className="text-[10px] text-gray-400 text-center">
                  Tippe in Google Maps auf <strong>„Stops optimieren"</strong> für die kürzeste Reihenfolge.
                  {allAddresses.length > 23 && ' · Max. 23 Stops'}
                </p>
              )}
            </div>

            {/* Expanded stop list */}
            {showRouteOverview && (
              <div className="px-3 pb-3 pt-2">
                {/* Copy all addresses */}
                <button
                  onClick={handleCopyAllAddresses}
                  className="flex items-center gap-2 w-full h-9 px-3 mb-3 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium active:opacity-70 transition-opacity"
                >
                  {copiedAll
                    ? <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    : <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                  }
                  {copiedAll ? 'Kopiert!' : 'Alle Adressen kopieren'}
                </button>

                {/* Numbered stop list */}
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {flatSequence.map((entry, idx) => {
                    const isDone = doneLocations.has(entry.key)
                    return (
                      <div
                        key={entry.key}
                        className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                          isDone ? 'bg-green-500 text-white' : 'bg-[#003D5C] text-white'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{entry.label}</div>
                          <div className="text-[10px] text-gray-400 truncate">{entry.address}</div>
                        </div>
                        <a
                          href={buildRouteUrl(entry.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 text-[#003D5C] active:opacity-60"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Region Groups ── */}
      <div className="px-3 pt-2 space-y-3">
        {regionGroups.map(rg => {
          const isExpanded = expandedRegions.has(rg.code)
          const totalInRegion = rg.locations.length + rg.orderEntries.length
          const doneInRegion = [...rg.locations, ...rg.orderEntries].filter(e =>
            doneLocations.has(e.key)
          ).length
          const colorClass = REGION_COLORS[rg.code] || 'bg-gray-600'

          return (
            <div key={rg.code} className="rounded-xl overflow-hidden shadow-sm">
              {/* Region header */}
              <button
                className={`w-full flex items-center justify-between px-4 py-3 ${colorClass} text-white`}
                onClick={() => toggleRegion(rg.code)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 opacity-80 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-bold text-sm">{rg.code}</div>
                    <div className="text-xs opacity-80">{REGION_LABELS[rg.code] || rg.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs opacity-80">{doneInRegion}/{totalInRegion}</div>
                    <div className="text-xs">
                      {doneInRegion === totalInRegion && totalInRegion > 0 ? '✓ Fertig' : 'offen'}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 opacity-70" />
                    : <ChevronDown className="h-4 w-4 opacity-70" />
                  }
                </div>
              </button>

              {/* Location cards */}
              {isExpanded && (
                <div className="bg-white divide-y divide-gray-100">
                  {rg.locations.map(loc => (
                    <LocationCard
                      key={loc.key}
                      entryKey={loc.key}
                      title={loc.haendler || loc.adresse}
                      subtitle={`${loc.adresse}, ${loc.plz} ${loc.gemeinde}`}
                      badge={loc.bundesland}
                      photoCount={loc.photoCount}
                      isDone={doneLocations.has(loc.key)}
                      isExpanded={expandedLocations.has(loc.key)}
                      photos={photos[loc.key] || []}
                      nextLocation={getNextLocation(loc.key)}
                      onToggleDone={() => toggleDone(loc.key)}
                      onToggleExpand={() => toggleLocationExpand(loc.key)}
                      onFileChange={e => handleFileChange(loc.key, e)}
                      onRemovePhoto={photoId => removePhoto(loc.key, photoId)}
                      onLightbox={setLightboxPhoto}
                      fileInputRef={el => { fileInputRefs.current[loc.key] = el }}
                      besondereInfos={loc.besondereInfos}
                      osaId={loc.osaId}
                      auftrag={loc.auftrag}
                      details={[
                        { label: 'Adresse', value: loc.adresse },
                        { label: 'PLZ / Ort', value: `${loc.plz} ${loc.gemeinde}` },
                        { label: 'Standortnr', value: loc.standortnummer || '—' },
                        { label: 'OSA ID', value: loc.osaId || '—' },
                        { label: 'Tafelnummer', value: loc.tafelnummer || '—' },
                        { label: 'BuFM / CoFM', value: (() => { const co = (loc.konstruktionsformat || '').trim(); const bu = (loc.buchungsformat || '').replace(/[^0-9]/g, '').trim(); return (co || bu) ? `${co}/${bu}` : '—'; })() },
                        { label: 'Produktbild', value: loc.isBelegbildTauglich ? 'Ja ✓' : 'Nein' },
                        {
                          label: 'Laufzeit',
                          value: (loc.laufzeitStart && loc.laufzeitEnd)
                            ? `${new Date(loc.laufzeitStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} – ${new Date(loc.laufzeitEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
                            : '—'
                        },
                        loc.sujet && { label: 'Sujet', value: loc.sujet },
                        loc.haendler && { label: 'Händler', value: loc.haendler },
                        loc.wtr && { label: 'WTR', value: loc.wtr },
                        loc.tour && { label: 'Tour', value: loc.tour },
                        loc.auftrag && { label: 'Auftrag', value: loc.auftrag },
                        loc.auftraggeber && { label: 'Auftraggeber', value: loc.auftraggeber },
                        loc.auftragsnr && { label: 'Auftragsnr', value: loc.auftragsnr },
                        loc.marke && { label: 'Marke', value: loc.marke },
                        loc.unternehmen && { label: 'Eigentümer', value: loc.unternehmen },
                        loc.region && { label: 'Region', value: loc.region },
                      ].filter(Boolean) as { label: string; value: string }[]}
                    />
                  ))}
                  {rg.orderEntries.map(entry => (
                    <LocationCard
                      key={entry.key}
                      entryKey={entry.key}
                      title={entry.auftragsnr}
                      subtitle={entry.auftrag}
                      badge={entry.bundesland}
                      photoCount={entry.photoCount}
                      isDone={doneLocations.has(entry.key)}
                      isExpanded={expandedLocations.has(entry.key)}
                      photos={photos[entry.key] || []}
                      nextLocation={getNextLocation(entry.key)}
                      onToggleDone={() => toggleDone(entry.key)}
                      onToggleExpand={() => toggleLocationExpand(entry.key)}
                      onFileChange={e => handleFileChange(entry.key, e)}
                      onRemovePhoto={photoId => removePhoto(entry.key, photoId)}
                      onLightbox={setLightboxPhoto}
                      fileInputRef={el => { fileInputRefs.current[entry.key] = el }}
                      details={[
                        { label: 'Auftraggeber', value: entry.auftraggeber },
                        { label: 'Auftragsnr', value: entry.auftragsnr },
                        { label: 'Bundesland', value: entry.bundesland },
                      ]}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </>)}

      {/* ── Nearby Tab ── */}
      {activeTab === 'nearby' && (
        <NearbyTab
          masterLocations={masterLocations}
          orders={orders}
          selectedPhotographerId={selectedPhotographerId!}
          selectedWeek={selectedWeek}
          gpsCoords={gpsCoords}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          onRequestGPS={requestGPS}
          photos={photos}
          onAddPhotos={(key, newPhotos) => setPhotos(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newPhotos] }))}
          onRemovePhoto={(key, id) => setPhotos(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }))}
          onLightbox={setLightboxPhoto}
        />
      )}

      {/* ── Orders Tab ── */}
      {activeTab === 'orders' && (
        <OrderSearchTab
          masterLocations={masterLocations}
          orders={orders}
          photos={photos}
          onAddPhotos={(key, newPhotos) => setPhotos(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newPhotos] }))}
          onRemovePhoto={(key, id) => setPhotos(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }))}
          onLightbox={setLightboxPhoto}
        />
      )}

      {/* ── Scanner Tab ── */}
      {activeTab === 'scanner' && (
        <ScannerTab
          masterLocations={masterLocations}
          orders={orders}
          selectedPhotographerId={selectedPhotographerId!}
          selectedWeek={selectedWeek}
          photos={photos}
          onAddPhotos={(key, newPhotos) => setPhotos(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newPhotos] }))}
          onRemovePhoto={(key, id) => setPhotos(prev => ({ ...prev, [key]: (prev[key] || []).filter(p => p.id !== id) }))}
          onLightbox={setLightboxPhoto}
        />
      )}

      </div>{/* end scrollable content */}

      {/* ── Bottom Tab Bar ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 flex z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          onClick={() => setActiveTab('tour')}
          className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${activeTab === 'tour' ? 'text-[#C8102E]' : 'text-gray-400'}`}
        >
          <Route className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Meine Tour</span>
          {activeTab === 'tour' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#C8102E] rounded-b-full" />}
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${activeTab === 'nearby' ? 'text-[#C8102E]' : 'text-gray-400'}`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[10px] font-semibold">In der Nähe</span>
          {activeTab === 'nearby' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#C8102E] rounded-b-full" />}
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${activeTab === 'scanner' ? 'text-[#C8102E]' : 'text-gray-400'}`}
        >
          <QrCode className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Scanner</span>
          {activeTab === 'scanner' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#C8102E] rounded-b-full" />}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${activeTab === 'orders' ? 'text-[#C8102E]' : 'text-gray-400'}`}
        >
          <List className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Aufträge</span>
          {activeTab === 'orders' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#C8102E] rounded-b-full" />}
        </button>
      </div>

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxPhoto(null)}>
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.name}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ── LocationCard ──────────────────────────────────────────────────────────────
interface LocationCardProps {
  entryKey: string
  title: string
  subtitle: string
  badge: string
  photoCount: number
  isDone: boolean
  isExpanded: boolean
  photos: CapturedPhoto[]
  details: { label: string; value: string }[]
  nextLocation: NextLocation | null
  besondereInfos?: string
  osaId?: string
  auftrag?: string
  onToggleDone: () => void
  onToggleExpand: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: (id: string) => void
  onLightbox: (photo: CapturedPhoto) => void
  fileInputRef: (el: HTMLInputElement | null) => void
}

function LocationCard({
  entryKey,
  title,
  subtitle,
  badge,
  photoCount,
  isDone,
  isExpanded,
  photos,
  details,
  nextLocation,
  besondereInfos,
  osaId,
  auftrag,
  onToggleDone,
  onToggleExpand,
  onFileChange,
  onRemovePhoto,
  onLightbox,
  fileInputRef,
}: LocationCardProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const hasSufficientPhotos = photos.length >= photoCount

  return (
    <div className={`transition-colors ${isDone ? 'bg-green-50' : 'bg-white'}`}>
      {/* Card header row */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button onClick={onToggleDone} className="flex-shrink-0">
          {isDone
            ? <CheckCircle2 className="h-6 w-6 text-green-500" />
            : <Circle className="h-6 w-6 text-gray-300" />
          }
        </button>
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{osaId}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 border-gray-300 text-gray-500">
              {badge}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {osaId && (
              <span className="text-[11px] text-[#003D5C] font-medium">OSA {osaId}</span>
            )}
            {auftrag && (
              <span className="text-[11px] text-gray-500 truncate">{auftrag}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{photos.length}/{photoCount} Fotos</span>
            {hasSufficientPhotos && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-300">✓</Badge>
            )}
          </div>
        </div>
        <button onClick={onToggleExpand} className="flex-shrink-0 text-gray-400 p-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Besondere Informationen */}
          {besondereInfos && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-amber-600 uppercase tracking-wide font-semibold mb-0.5">Besondere Anforderungen</div>
                <div className="text-xs text-amber-900 font-medium">{besondereInfos}</div>
              </div>
            </div>
          )}
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-50 rounded-lg p-3">
            {details.map(d => (
              <div key={d.label}>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{d.label}</div>
                <div className="text-xs font-medium text-gray-800 break-words">{d.value || '—'}</div>
              </div>
            ))}
          </div>

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer"
                    onClick={() => onLightbox(photo)}
                  />
                  <button
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Camera / Gallery buttons */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                ref={el => { fileInputRef(el) }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFileChange}
                id={`camera-${entryKey}`}
              />
              <label
                htmlFor={`camera-${entryKey}`}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-[#C8102E] text-white text-sm font-semibold cursor-pointer active:opacity-80 transition-opacity"
              >
                <Camera className="h-4 w-4" />
                Kamera
              </label>
            </div>
            <div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFileChange}
                id={`gallery-${entryKey}`}
              />
              <label
                htmlFor={`gallery-${entryKey}`}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-[#003D5C] text-white text-sm font-semibold cursor-pointer active:opacity-80 transition-opacity"
              >
                <ImageIcon className="h-4 w-4" />
                Galerie
              </label>
            </div>
          </div>

          {/* Mark done */}
          <button
            onClick={onToggleDone}
            className={`w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              isDone
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {isDone
              ? <><CheckCircle2 className="h-4 w-4" /> Erledigt</>
              : <><Circle className="h-4 w-4" /> Als erledigt markieren</>
            }
          </button>

          {/* ── Route to next location – Google Maps only ── */}
          {nextLocation && (
            <div className="rounded-lg border border-[#00A9CE]/40 bg-[#00A9CE]/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[#003D5C]">
                <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide">Nächster Standort</span>
              </div>
              <p className="text-xs text-gray-600 truncate pl-5">{nextLocation.label}</p>
              <a
                href={buildRouteUrl(nextLocation.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white border border-gray-200 shadow-sm active:opacity-70 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">In Google Maps navigieren</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── OrderSearchTab ────────────────────────────────────────────────────────────
interface OrderSearchTabProps {
  masterLocations: any[]
  orders: Order[]
  photos: Record<string, CapturedPhoto[]>
  onAddPhotos: (key: string, photos: CapturedPhoto[]) => void
  onRemovePhoto: (key: string, id: string) => void
  onLightbox: (p: CapturedPhoto) => void
}

function OrderSearchTab({ masterLocations, orders, photos, onAddPhotos, onRemovePhoto, onLightbox }: OrderSearchTabProps) {
  const [query, setQuery] = useState('')
  const [selectedKW, setSelectedKW] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedLocKey, setSelectedLocKey] = useState<string | null>(null)

  const availableKWs = Array.from(new Set(
    orders.map(o => o.startKW).filter(Boolean)
  )).sort((a, b) => a - b)

  const filtered = orders
    .filter(o => {
      if (selectedKW !== 'all' && String(o.startKW) !== selectedKW) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        o.auftrag?.toLowerCase().includes(q) ||
        o.auftragsnr?.toLowerCase().includes(q) ||
        o.auftraggeber?.toLowerCase().includes(q) ||
        o.marke?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const kwA = a.startKW ?? (a.laufzeitStart ? new Date(a.laufzeitStart).getTime() : Infinity)
      const kwB = b.startKW ?? (b.laufzeitStart ? new Date(b.laufzeitStart).getTime() : Infinity)
      return kwA - kwB
    })

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    onAddPhotos(key, files.map(f => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: URL.createObjectURL(f), name: f.name, capturedAt: new Date().toISOString() })))
    toast.success(`${files.length} Foto${files.length > 1 ? 's' : ''} hinzugefügt`)
    if (e.target) e.target.value = ''
  }

  // Detail view: order selected
  if (selectedOrder) {
    const locs = (selectedOrder.selectedLocations || []).map(loc => {
      const ml = masterLocations.find(m => m.standortnummer === loc.standortnummer)
      return {
        ...loc,
        osaId: ml?.osaId || '',
        tafelnummer: ml?.tafelnummer || '',
        buchungsformat: ml?.buchungsformat || '',
        konstruktionsformat: ml?.konstruktionsformat || ml?.cofm || '',
        isBelegbildTauglich: ml?.isBelegbildTauglich ?? false,
        besondereInfos: ml?.besondereInfos || '',
      }
    })

    const laufzeit = (selectedOrder.laufzeitStart && selectedOrder.laufzeitEnd)
      ? `${new Date(selectedOrder.laufzeitStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} – ${new Date(selectedOrder.laufzeitEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
      : null

    return (
      <div className="flex flex-col">
        <div className="bg-[#003D5C] text-white px-4 py-4">
          <button onClick={() => { setSelectedOrder(null); setSelectedLocKey(null) }} className="flex items-center gap-2 text-white/80 mb-3 text-sm">
            <ArrowLeft className="h-4 w-4" /> Zurück zur Suche
          </button>
          <div className="font-bold text-base">{selectedOrder.auftrag}</div>
          <div className="text-xs text-white/70 mt-0.5">{selectedOrder.auftragsnr} · {selectedOrder.auftraggeber}</div>
          {laufzeit && <div className="text-xs text-white/60 mt-0.5">{laufzeit}</div>}
          {selectedOrder.sujet && (
            <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-xs mt-2">
              <span className="opacity-60">Sujet:</span> <span className="font-semibold">{selectedOrder.sujet}</span>
            </div>
          )}
        </div>

        <div className="px-3 pt-3 space-y-2 pb-4">
          {locs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <MapPin className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Keine Standorte verknüpft</p>
              <p className="text-gray-400 text-xs mt-1">Diesem Auftrag wurden noch keine Standorte zugewiesen.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 px-1">{locs.length} Standort{locs.length !== 1 ? 'e' : ''}</p>
              {locs.map((loc, idx) => {
                const photoKey = `orders__${selectedOrder.id}__${loc.standortnummer}`
                const isOpen = selectedLocKey === photoKey
                const locPhotos = photos[photoKey] || []
                const addr = `${loc.adresse}, ${loc.plz} ${loc.gemeinde}, Österreich`
                const bufmCofm = (() => {
                  const co = (loc.konstruktionsformat || '').trim()
                  const bu = (loc.buchungsformat || '').replace(/[^0-9]/g, '').trim()
                  return (co || bu) ? `${co}/${bu}` : null
                })()
                return (
                  <div key={`${loc.standortnummer}-${idx}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setSelectedLocKey(isOpen ? null : photoKey)}>
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#003D5C]/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-[#003D5C]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{loc.standortnummer}</div>
                        <div className="text-xs text-gray-500 truncate">{loc.adresse}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {loc.osaId && <span className="text-[10px] bg-[#003D5C]/10 text-[#003D5C] rounded-full px-1.5 py-0.5 font-mono">{loc.osaId}</span>}
                          {bufmCofm && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{bufmCofm}</span>}
                          {locPhotos.length > 0 && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">{locPhotos.length} Fotos ✓</span>}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                        {loc.besondereInfos && (
                          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-amber-900">{loc.besondereInfos}</span>
                          </div>
                        )}
                        <a href={buildRouteUrl(addr)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white border border-gray-200 shadow-sm">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                            <circle cx="12" cy="9" r="2.5" fill="white"/>
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">In Google Maps navigieren</span>
                        </a>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded-xl p-2">
                          {loc.tafelnummer && <div><span className="block text-gray-400 uppercase tracking-wide">Tafel</span><span className="font-semibold text-gray-700">{loc.tafelnummer}</span></div>}
                          {bufmCofm && <div><span className="block text-gray-400 uppercase tracking-wide">BuFM/CoFM</span><span className="font-semibold text-gray-700">{bufmCofm}</span></div>}
                          <div><span className="block text-gray-400 uppercase tracking-wide">Produktbild</span><span className="font-semibold text-gray-700">{loc.isBelegbildTauglich ? 'Ja ✓' : 'Nein'}</span></div>
                        </div>
                        {locPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {locPhotos.map(photo => (
                              <div key={photo.id} className="relative">
                                <img src={photo.url} alt={photo.name} className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer" onClick={() => onLightbox(photo)} />
                                <button onClick={() => onRemovePhoto(photoKey, photo.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input type="file" accept="image/*" capture="environment" className="hidden" id={`ocam-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`ocam-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#C8102E] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <Camera className="h-4 w-4" /> Kamera
                            </label>
                          </div>
                          <div>
                            <input type="file" accept="image/*" multiple className="hidden" id={`ogal-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`ogal-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#003D5C] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <ImageIcon className="h-4 w-4" /> Galerie
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Auftrag, Auftragsnr, Kunde…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003D5C] shadow-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {availableKWs.length > 0 && (
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedKW('all')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedKW === 'all' ? 'bg-[#C8102E] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            Alle KW
          </button>
          {availableKWs.map(kw => (
            <button
              key={kw}
              onClick={() => setSelectedKW(selectedKW === String(kw) ? 'all' : String(kw))}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedKW === String(kw) ? 'bg-[#C8102E] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              KW {kw}
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Keine Aufträge gefunden</p>
          <p className="text-gray-400 text-xs mt-1">Suchbegriff anpassen</p>
        </div>
      ) : (
        <div className="px-3 pb-4 space-y-2">
          <p className="text-xs text-gray-400 px-1">{filtered.length} Auftrag{filtered.length !== 1 ? 'räge' : ''}</p>
          {filtered.map(order => {
            const locCount = order.selectedLocations?.length || 0
            const photoCount = (order.selectedLocations || []).reduce((s, loc) => s + (photos[`orders__${order.id}__${loc.standortnummer}`]?.length || 0), 0)
            const laufzeit = (order.laufzeitStart && order.laufzeitEnd)
              ? `${new Date(order.laufzeitStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} – ${new Date(order.laufzeitEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
              : null
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:opacity-70 transition-opacity"
              >
                <div className="flex-shrink-0 text-center w-10">
                  <div className="text-[10px] text-gray-400 uppercase leading-tight">KW</div>
                  <div className="text-base font-bold text-[#C8102E] leading-tight">{order.startKW ?? '—'}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">{order.auftrag}</div>
                  <div className="text-xs text-gray-500 truncate">{order.auftragsnr} · {order.auftraggeber}</div>
                  {laufzeit && <div className="text-xs text-gray-400 mt-0.5">{laufzeit}</div>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {locCount > 0 && <span className="text-[10px] bg-[#003D5C]/10 text-[#003D5C] rounded-full px-1.5 py-0.5">{locCount} Standort{locCount !== 1 ? 'e' : ''}</span>}
                    {photoCount > 0 && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">{photoCount} Fotos ✓</span>}
                    {order.sujet && <span className="text-[10px] bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5">{order.sujet}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── NearbyTab ─────────────────────────────────────────────────────────────────
interface NearbyTabProps {
  masterLocations: any[]
  orders: Order[]
  selectedPhotographerId: string
  selectedWeek: string
  gpsCoords: { lat: number; lng: number } | null
  gpsLoading: boolean
  gpsError: string | null
  onRequestGPS: () => void
  photos: Record<string, CapturedPhoto[]>
  onAddPhotos: (key: string, photos: CapturedPhoto[]) => void
  onRemovePhoto: (key: string, id: string) => void
  onLightbox: (p: CapturedPhoto) => void
}
interface NearbyLocEntry {
  standortnummer: string
  adresse: string
  plz: string
  gemeinde: string
  distanceKm: number | null
  osaId: string
  tafelnummer: string
  besondereInfos: string
  assignedOrders: { order: Order; photoKey: string }[]
}

function NearbyTab({
  masterLocations, orders, selectedPhotographerId, selectedWeek,
  gpsCoords, gpsLoading, gpsError, onRequestGPS,
  photos, onAddPhotos, onRemovePhoto, onLightbox,
}: NearbyTabProps) {
  const [selectedLoc, setSelectedLoc] = useState<NearbyLocEntry | null>(null)
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null)

  const [year, week] = selectedWeek.split('-').map(Number)
  const weekStart = getMondayOfWeek(year, week)
  const weekEnd = getSundayOfWeek(year, week)

  const nearbyList: NearbyLocEntry[] = masterLocations.map(ml => {
    const coords = getApproxCoords(ml.plz || '')
    const distanceKm = gpsCoords && coords ? haversineKm(gpsCoords.lat, gpsCoords.lng, coords.lat, coords.lng) : null
    const assignedOrders: { order: Order; photoKey: string }[] = []
    orders.forEach(order => {
      if (!order.laufzeitStart || !order.laufzeitEnd) return
      if (new Date(order.laufzeitStart) > weekEnd || new Date(order.laufzeitEnd) < weekStart) return
      const locMatch = order.selectedLocations?.find(l => l.standortnummer === ml.standortnummer)
      if (!locMatch) return
      if (!isLocationAssigned(order, locMatch, selectedPhotographerId, week, year)) return
      assignedOrders.push({ order, photoKey: `nearby__${order.id}__${ml.standortnummer}` })
    })
    return {
      standortnummer: ml.standortnummer || '',
      adresse: ml.adresse || '',
      plz: ml.plz || '',
      gemeinde: ml.gemeinde || '',
      distanceKm,
      osaId: ml.osaId || ml.osa_id || buildOsaId(ml.plz || '', ml.regionalCode || '', ml.standortnummer || '', ml.tafelnummer || ''),
      tafelnummer: ml.tafelnummer || '',
      besondereInfos: ml.besondereInfos || '',
      assignedOrders,
    }
  }).sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return 0
    if (a.distanceKm === null) return 1
    if (b.distanceKm === null) return -1
    return a.distanceKm - b.distanceKm
  })

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    onAddPhotos(key, files.map(f => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: URL.createObjectURL(f), name: f.name, capturedAt: new Date().toISOString() })))
    toast.success(`${files.length} Foto${files.length > 1 ? 's' : ''} hinzugefügt`)
    if (e.target) e.target.value = ''
  }

  const distBadge = (km: number | null) => {
    if (km === null) return { label: '—', cls: 'bg-gray-100 text-gray-400' }
    if (km < 1) return { label: `${Math.round(km * 1000)} m`, cls: 'bg-green-100 text-green-700' }
    if (km < 5) return { label: `${km.toFixed(1)} km`, cls: 'bg-emerald-100 text-emerald-700' }
    if (km < 20) return { label: `${Math.round(km)} km`, cls: 'bg-amber-100 text-amber-700' }
    return { label: `${Math.round(km)} km`, cls: 'bg-red-100 text-red-600' }
  }

  // Detail view
  if (selectedLoc) {
    const addr = `${selectedLoc.adresse}, ${selectedLoc.plz} ${selectedLoc.gemeinde}, Österreich`
    const badge = distBadge(selectedLoc.distanceKm)
    return (
      <div className="flex flex-col">
        <div className="bg-[#003D5C] text-white px-4 py-4">
          <button onClick={() => { setSelectedLoc(null); setSelectedOrderKey(null) }} className="flex items-center gap-2 text-white/80 mb-3 text-sm">
            <ArrowLeft className="h-4 w-4" /> Zurück zur Liste
          </button>
          <div className="font-bold text-base">{selectedLoc.standortnummer}</div>
          <div className="text-xs text-white/70 mt-0.5">{selectedLoc.adresse}, {selectedLoc.plz} {selectedLoc.gemeinde}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedLoc.osaId && (
              <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-xs">
                <span className="opacity-60">OSA ID:</span> <span className="font-semibold">{selectedLoc.osaId}</span>
              </div>
            )}
            {selectedLoc.tafelnummer && (
              <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-xs">
                <span className="opacity-60">Tafel:</span> <span className="font-semibold">{selectedLoc.tafelnummer}</span>
              </div>
            )}
            {selectedLoc.distanceKm !== null && (
              <div className="inline-block bg-white/20 rounded-full px-2 py-0.5 text-xs">{badge.label} entfernt</div>
            )}
          </div>
        </div>
        <div className="px-4 pt-3">
          {selectedLoc.besondereInfos && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-300 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-amber-600 uppercase tracking-wide font-semibold mb-0.5">Besondere Anforderungen</div>
                <div className="text-xs text-amber-900 font-medium">{selectedLoc.besondereInfos}</div>
              </div>
            </div>
          )}
          <a href={buildRouteUrl(addr)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-white border border-gray-200 shadow-sm mb-4">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            <span className="text-sm font-semibold text-gray-700">In Google Maps navigieren</span>
          </a>
          {selectedLoc.assignedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <List className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Keine Aufträge zugewiesen</p>
              <p className="text-gray-400 text-xs mt-1">Für diese KW sind dir hier keine Aufträge zugeteilt.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{selectedLoc.assignedOrders.length} Auftrag{selectedLoc.assignedOrders.length > 1 ? 'räge' : ''} zugewiesen</p>
              {selectedLoc.assignedOrders.map(({ order, photoKey }) => {
                const isOpen = selectedOrderKey === photoKey
                const orderPhotos = photos[photoKey] || []
                return (
                  <div key={photoKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setSelectedOrderKey(isOpen ? null : photoKey)}>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-gray-900">{order.auftragsnr || order.auftrag}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.auftraggeber}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400">{orderPhotos.length} Fotos</span>
                          {orderPhotos.length > 0 && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓</span>}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                        {orderPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {orderPhotos.map(photo => (
                              <div key={photo.id} className="relative">
                                <img src={photo.url} alt={photo.name} className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer" onClick={() => onLightbox(photo)} />
                                <button onClick={() => onRemovePhoto(photoKey, photo.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input type="file" accept="image/*" capture="environment" className="hidden" id={`ncam-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`ncam-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#C8102E] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <Camera className="h-4 w-4" /> Kamera
                            </label>
                          </div>
                          <div>
                            <input type="file" accept="image/*" multiple className="hidden" id={`ngal-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`ngal-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#003D5C] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <ImageIcon className="h-4 w-4" /> Galerie
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex flex-col">
      {!gpsCoords && (
        <div className="px-4 pt-5 pb-3">
          <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#003D5C]/10 flex items-center justify-center">
              <Compass className="h-7 w-7 text-[#003D5C]" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">Standort ermitteln</div>
              <div className="text-xs text-gray-400 mt-0.5">Finde die nächsten Standorte in deiner Umgebung</div>
            </div>
            {gpsError && (
              <div className="flex items-start gap-2 w-full px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-left">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-600">{gpsError}</span>
              </div>
            )}
            <button onClick={onRequestGPS} disabled={gpsLoading} className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#C8102E] text-white text-sm font-semibold disabled:opacity-60">
              {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {gpsLoading ? 'Wird ermittelt …' : 'GPS-Standort ermitteln'}
            </button>
          </div>
        </div>
      )}
      {gpsCoords && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 text-green-700 text-xs">
              <LocateFixed className="h-3.5 w-3.5" />
              <span>{gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span>
            </div>
            <button onClick={onRequestGPS} disabled={gpsLoading} className="text-green-600 p-1">
              {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
      {masterLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MapPin className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Keine Standorte geladen</p>
        </div>
      ) : (
        <div className="px-3 pt-2 space-y-2 pb-4">
          {gpsCoords && <p className="text-xs text-gray-400 px-1">{nearbyList.length} Standorte · sortiert nach Entfernung</p>}
          {!gpsCoords && <p className="text-xs text-gray-400 px-1">{nearbyList.length} Standorte · GPS für Entfernungsanzeige aktivieren</p>}
          {nearbyList.map((loc, idx) => {
            const badge = distBadge(loc.distanceKm)
            const uploadedCount = loc.assignedOrders.reduce((s, { photoKey }) => s + (photos[photoKey]?.length || 0), 0)
            return (
              <button
                key={`${loc.standortnummer}-${idx}`}
                onClick={() => setSelectedLoc(loc)}
                className="w-full text-left bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:opacity-70 transition-opacity"
              >
                <div className={`flex-shrink-0 w-14 text-center rounded-xl py-1.5 text-xs font-bold ${badge.cls}`}>{badge.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 truncate">{loc.standortnummer}</div>
                  <div className="text-xs text-gray-500 truncate">{loc.adresse}, {loc.plz} {loc.gemeinde}</div>
                  {loc.assignedOrders.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] bg-[#003D5C]/10 text-[#003D5C] rounded-full px-2 py-0.5 font-medium">{loc.assignedOrders.length} Auftrag{loc.assignedOrders.length > 1 ? 'räge' : ''}</span>
                      {uploadedCount > 0 && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">{uploadedCount} Fotos ✓</span>}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── ScannerTab ────────────────────────────────────────────────────────────────
interface ScannerTabProps {
  masterLocations: any[]
  orders: Order[]
  selectedPhotographerId: string
  selectedWeek: string
  photos: Record<string, CapturedPhoto[]>
  onAddPhotos: (key: string, photos: CapturedPhoto[]) => void
  onRemovePhoto: (key: string, id: string) => void
  onLightbox: (p: CapturedPhoto) => void
}

type ScanMode = 'qr' | 'nfc'
type ScanState = 'idle' | 'scanning' | 'success' | 'error'

interface ScannedLocEntry {
  standortnummer: string
  adresse: string
  plz: string
  gemeinde: string
  osaId: string
  tafelnummer: string
  besondereInfos: string
  assignedOrders: { order: Order; photoKey: string }[]
}

function ScannerTab({
  masterLocations, orders, selectedPhotographerId, selectedWeek,
  photos, onAddPhotos, onRemovePhoto, onLightbox,
}: ScannerTabProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('qr')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [scannedLoc, setScannedLoc] = useState<ScannedLocEntry | null>(null)
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null)
  const [lastScannedRaw, setLastScannedRaw] = useState<string>('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const ndefRef = useRef<any>(null)

  const [year, week] = selectedWeek.split('-').map(Number)
  const weekStart = getMondayOfWeek(year, week)
  const weekEnd = getSundayOfWeek(year, week)

  // Detect NFC support on mount
  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      stopNFC()
    }
  }, [])

  // Stop camera when switching modes
  useEffect(() => {
    stopCamera()
    stopNFC()
    setScanState('idle')
    setErrorMsg('')
  }, [scanMode])

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const stopNFC = () => {
    if (ndefRef.current) {
      try { ndefRef.current.stop?.() } catch {}
      ndefRef.current = null
    }
  }

  // ── Build location entry from masterLocation ──────────────────────────────
  const buildLocEntry = (ml: any): ScannedLocEntry => {
    const assignedOrders: { order: Order; photoKey: string }[] = []
    orders.forEach(order => {
      if (!order.laufzeitStart || !order.laufzeitEnd) return
      if (new Date(order.laufzeitStart) > weekEnd || new Date(order.laufzeitEnd) < weekStart) return
      const locMatch = order.selectedLocations?.find(l => l.standortnummer === ml.standortnummer)
      if (!locMatch) return
      if (!isLocationAssigned(order, locMatch, selectedPhotographerId, week, year)) return
      assignedOrders.push({ order, photoKey: `scanner__${order.id}__${ml.standortnummer}` })
    })
    return {
      standortnummer: ml.standortnummer || '',
      adresse: ml.adresse || '',
      plz: ml.plz || '',
      gemeinde: ml.gemeinde || '',
      osaId: ml.osaId || ml.osa_id || buildOsaId(ml.plz || '', ml.regionalCode || '', ml.standortnummer || '', ml.tafelnummer || ''),
      tafelnummer: ml.tafelnummer || '',
      besondereInfos: ml.besondereInfos || '',
      assignedOrders,
    }
  }

  // ── Handle scan result (text from QR or NFC) ──────────────────────────────
  const handleScanResult = (data: string) => {
    stopCamera()
    stopNFC()
    setLastScannedRaw(data.trim())
    let standortnummer = data.trim()

    // Try JSON parse
    try {
      const json = JSON.parse(data)
      standortnummer = json.standortnummer || json.nr || json.id || json.code || data.trim()
    } catch {}

    // URL: extract last path segment or query param "s"
    if (standortnummer.startsWith('http')) {
      try {
        const url = new URL(standortnummer)
        const s = url.searchParams.get('s') || url.searchParams.get('standort') || url.searchParams.get('nr')
        if (s) standortnummer = s
        else standortnummer = url.pathname.split('/').filter(Boolean).pop() || standortnummer
      } catch {}
    }

    // Find in masterLocations (exact or case-insensitive or partial)
    const exact = masterLocations.find(ml =>
      ml.standortnummer === standortnummer ||
      ml.standortnummer?.toLowerCase() === standortnummer.toLowerCase()
    )
    if (exact) {
      setScanState('success')
      setScannedLoc(buildLocEntry(exact))
      toast.success(`Standort ${exact.standortnummer} gefunden`)
      return
    }
    const partial = masterLocations.find(ml =>
      ml.standortnummer?.toLowerCase().includes(standortnummer.toLowerCase()) ||
      standortnummer.toLowerCase().includes(ml.standortnummer?.toLowerCase() || '__')
    )
    if (partial) {
      setScanState('success')
      setScannedLoc(buildLocEntry(partial))
      toast.success(`Standort ${partial.standortnummer} gefunden`)
      return
    }

    setScanState('error')
    setErrorMsg(`Kein Standort gefunden für: "${standortnummer}"`)
    toast.error('Standort nicht gefunden')
  }

  // ── QR Camera scanning ────────────────────────────────────────────────────
  const startQRScan = async () => {
    setScanState('scanning')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        tickQR()
      }
    } catch (err: any) {
      setScanState('error')
      setErrorMsg(err.name === 'NotAllowedError'
        ? 'Kamerazugriff verweigert – bitte in den Browser-Einstellungen erlauben'
        : 'Kamera konnte nicht gestartet werden')
    }
  }

  const tickQR = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tickQR)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code?.data) {
      handleScanResult(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tickQR)
  }

  const stopQRScan = () => {
    stopCamera()
    setScanState('idle')
  }

  // ── NFC scanning ──────────────────────────────────────────────────────────
  const startNFCScan = async () => {
    setScanState('scanning')
    setErrorMsg('')
    if (!('NDEFReader' in window)) {
      setScanState('error')
      setErrorMsg('NFC/RFID wird von diesem Gerät oder Browser nicht unterstützt.\nNutze Chrome auf Android mit aktiviertem NFC.')
      return
    }
    try {
      const ndef = new (window as any).NDEFReader()
      ndefRef.current = ndef
      await ndef.scan()
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        let text = ''
        for (const record of message.records) {
          try {
            if (record.recordType === 'text' || record.recordType === 'url') {
              text = new TextDecoder().decode(record.data)
              break
            }
          } catch {}
        }
        handleScanResult(text || serialNumber || '')
      })
      ndef.addEventListener('readingerror', () => {
        setScanState('error')
        setErrorMsg('NFC-Tag konnte nicht gelesen werden')
      })
    } catch (err: any) {
      setScanState('error')
      setErrorMsg(err.message || 'NFC-Scan fehlgeschlagen')
    }
  }

  const stopNFCScan = () => {
    stopNFC()
    setScanState('idle')
  }

  // ── Photo upload helper ───────────────────────────────────────────────────
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    onAddPhotos(key, files.map(f => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: URL.createObjectURL(f), name: f.name, capturedAt: new Date().toISOString() })))
    toast.success(`${files.length} Foto${files.length > 1 ? 's' : ''} hinzugefügt`)
    if (e.target) e.target.value = ''
  }

  // ── Detail view (after successful scan) ───────────────────────────────────
  if (scannedLoc) {
    const addr = `${scannedLoc.adresse}, ${scannedLoc.plz} ${scannedLoc.gemeinde}, Österreich`
    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="bg-[#003D5C] text-white px-4 py-4">
          <button
            onClick={() => { setScannedLoc(null); setSelectedOrderKey(null); setScanState('idle') }}
            className="flex items-center gap-2 text-white/80 mb-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück zum Scanner
          </button>
          <div className="flex items-center gap-2 mb-0.5">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs text-green-300">Erfolgreich gescannt</span>
          </div>
          <div className="font-bold text-base">{scannedLoc.standortnummer}</div>
          <div className="text-xs text-white/70 mt-0.5">{scannedLoc.adresse}, {scannedLoc.plz} {scannedLoc.gemeinde}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {scannedLoc.osaId && (
              <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-xs">
                <span className="opacity-60">OSA ID:</span> <span className="font-semibold">{scannedLoc.osaId}</span>
              </div>
            )}
            {scannedLoc.tafelnummer && (
              <div className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-xs">
                <span className="opacity-60">Tafel:</span> <span className="font-semibold">{scannedLoc.tafelnummer}</span>
              </div>
            )}
            {lastScannedRaw && (
              <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5 text-[10px] text-white/60">
                <ScanLine className="h-3 w-3" />
                {scanMode === 'qr' ? 'QR-Code' : 'NFC/RFID'}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-3">
          {scannedLoc.besondereInfos && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-300 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-amber-600 uppercase tracking-wide font-semibold mb-0.5">Besondere Anforderungen</div>
                <div className="text-xs text-amber-900 font-medium">{scannedLoc.besondereInfos}</div>
              </div>
            </div>
          )}
          {/* Maps + rescan */}
          <div className="flex gap-2 mb-4">
            <a href={buildRouteUrl(addr)} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-white border border-gray-200 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">Navigation</span>
            </a>
            <button
              onClick={() => { setScannedLoc(null); setSelectedOrderKey(null); setScanState('idle') }}
              className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#003D5C] text-white text-sm font-semibold"
            >
              <QrCode className="h-4 w-4" /> Neu scannen
            </button>
          </div>

          {/* Orders */}
          {scannedLoc.assignedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <List className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Keine Aufträge zugewiesen</p>
              <p className="text-gray-400 text-xs mt-1">Für diese KW sind dir hier keine Aufträge zugeteilt.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{scannedLoc.assignedOrders.length} Auftrag{scannedLoc.assignedOrders.length > 1 ? 'räge' : ''} zugewiesen</p>
              {scannedLoc.assignedOrders.map(({ order, photoKey }) => {
                const isOpen = selectedOrderKey === photoKey
                const orderPhotos = photos[photoKey] || []
                return (
                  <div key={photoKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => setSelectedOrderKey(isOpen ? null : photoKey)}>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-gray-900">{order.auftragsnr || order.auftrag}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.auftraggeber}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400">{orderPhotos.length} Fotos</span>
                          {orderPhotos.length > 0 && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓</span>}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                        {orderPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {orderPhotos.map(photo => (
                              <div key={photo.id} className="relative">
                                <img src={photo.url} alt={photo.name} className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer" onClick={() => onLightbox(photo)} />
                                <button onClick={() => onRemovePhoto(photoKey, photo.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input type="file" accept="image/*" capture="environment" className="hidden" id={`scam-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`scam-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#C8102E] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <Camera className="h-4 w-4" /> Kamera
                            </label>
                          </div>
                          <div>
                            <input type="file" accept="image/*" multiple className="hidden" id={`sgal-${photoKey}`} onChange={e => handlePhotoCapture(e, photoKey)} />
                            <label htmlFor={`sgal-${photoKey}`} className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#003D5C] text-white text-sm font-semibold cursor-pointer active:opacity-80">
                              <ImageIcon className="h-4 w-4" /> Galerie
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Scanner main view ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col px-4 pt-5">
      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        <button
          onClick={() => setScanMode('qr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${scanMode === 'qr' ? 'bg-white text-[#003D5C] shadow-sm' : 'text-gray-400'}`}
        >
          <QrCode className="h-4 w-4" /> QR-Code
        </button>
        <button
          onClick={() => setScanMode('nfc')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${scanMode === 'nfc' ? 'bg-white text-[#003D5C] shadow-sm' : 'text-gray-400'}`}
        >
          <Nfc className="h-4 w-4" /> NFC / RFID
          {nfcSupported === false && <XCircle className="h-3 w-3 text-red-400" />}
          {nfcSupported === true && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
        </button>
      </div>

      {/* ── QR Mode ── */}
      {scanMode === 'qr' && (
        <div className="space-y-4">
          {/* Camera viewfinder */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '1' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Hidden canvas for jsQR processing */}
            <canvas ref={canvasRef} className="hidden" />

            {scanState !== 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center text-white">
                  <QrCode className="h-16 w-16 mx-auto mb-3 opacity-40" />
                  <p className="text-sm opacity-70">Kamera inaktiv</p>
                </div>
              </div>
            )}

            {scanState === 'scanning' && (
              <>
                {/* Scan frame corners */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00A9CE] rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00A9CE] rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00A9CE] rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00A9CE] rounded-br-lg" />
                    {/* Animated scan line */}
                    <div
                      className="absolute left-2 right-2 h-0.5 bg-[#00A9CE] opacity-80 rounded-full"
                      style={{ animation: 'scanline 2s ease-in-out infinite', top: '50%' }}
                    />
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">QR-Code in den Rahmen halten</span>
                </div>
              </>
            )}
          </div>

          {/* Scan line animation CSS */}
          <style>{`
            @keyframes scanline {
              0%, 100% { transform: translateY(-56px); opacity: 0.3; }
              50% { transform: translateY(56px); opacity: 1; }
            }
            @keyframes nfcpulse {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
            }
          `}</style>

          {/* Start / Stop button */}
          {scanState !== 'scanning' ? (
            <button
              onClick={startQRScan}
              className="flex items-center justify-center gap-2 w-full h-13 py-3.5 rounded-2xl bg-[#C8102E] text-white text-sm font-bold active:opacity-80"
            >
              <QrCode className="h-5 w-5" /> QR-Code scannen
            </button>
          ) : (
            <button
              onClick={stopQRScan}
              className="flex items-center justify-center gap-2 w-full h-13 py-3.5 rounded-2xl bg-gray-200 text-gray-700 text-sm font-semibold active:opacity-80"
            >
              <X className="h-4 w-4" /> Scan stoppen
            </button>
          )}

          {/* Error */}
          {scanState === 'error' && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">Fehler</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NFC / RFID Mode ── */}
      {scanMode === 'nfc' && (
        <div className="space-y-4">
          {/* NFC visual */}
          <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#003D5C] to-[#001F30] flex flex-col items-center justify-center py-12 overflow-hidden" style={{ minHeight: 260 }}>
            {/* Pulse rings */}
            {scanState === 'scanning' && (
              <>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="absolute w-20 h-20 rounded-full border-2 border-[#00A9CE]/40"
                    style={{ animation: `nfcpulse 2s ease-out ${i * 0.6}s infinite` }}
                  />
                ))}
              </>
            )}
            <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center mb-4 ${scanState === 'scanning' ? 'bg-[#00A9CE]/20 border-2 border-[#00A9CE]' : 'bg-white/10'}`}>
              <Nfc className={`h-10 w-10 ${scanState === 'scanning' ? 'text-[#00A9CE]' : 'text-white/50'}`} />
            </div>
            <div className="relative z-10 text-center px-6">
              {scanState === 'idle' && (
                <>
                  <p className="text-white/80 text-sm font-medium">NFC / RFID bereit</p>
                  <p className="text-white/40 text-xs mt-1">Drücke „Scannen starten" und halte das Tag ans Gerät</p>
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-white/30 text-[10px] font-mono leading-relaxed">Format: <span className="text-[#00A9CE]/60">'41002.008.02353_001'</span>;<span className="text-white/20">…</span></p>
                    <p className="text-white/25 text-[10px] mt-0.5">OSA-ID wird automatisch erkannt</p>
                  </div>
                </>
              )}
              {scanState === 'scanning' && (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Loader2 className="h-4 w-4 text-[#00A9CE] animate-spin" />
                    <p className="text-[#00A9CE] text-sm font-semibold">Lese OSA-ID …</p>
                  </div>
                  <p className="text-white/50 text-xs">Halte RFID-Tag ans Gerät</p>
                  <p className="text-white/25 text-[10px] mt-1 font-mono">'41002.008.XXXXX_XXX'</p>
                </>
              )}
              {scanState === 'error' && (
                <p className="text-red-400 text-xs text-center whitespace-pre-line">{errorMsg}</p>
              )}
            </div>
          </div>

          {/* NFC compatibility info */}
          {nfcSupported === false && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
              <Wifi className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">NFC nicht unterstützt</p>
                <p className="text-xs text-amber-600 mt-0.5">Für NFC/RFID benötigst du Chrome auf Android 89+ mit aktiviertem NFC.</p>
              </div>
            </div>
          )}

          {/* Start / Stop button */}
          {scanState !== 'scanning' ? (
            <button
              onClick={startNFCScan}
              disabled={nfcSupported === false}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#003D5C] text-white text-sm font-bold active:opacity-80 disabled:opacity-40"
            >
              <Nfc className="h-5 w-5" /> Scannen starten
            </button>
          ) : (
            <button
              onClick={stopNFCScan}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gray-200 text-gray-700 text-sm font-semibold active:opacity-80"
            >
              <X className="h-4 w-4" /> Scan stoppen
            </button>
          )}
        </div>
      )}

      {/* ── Manual Input (both modes) ── */}
      <div className="mt-5 bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Manuelle Eingabe</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">Standortnummer direkt eingeben (Fallback, falls Scan nicht möglich)</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) handleScanResult(manualInput) }}
            placeholder="z. B. GEW-1234"
            className="flex-1 h-11 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#003D5C]/20 focus:border-[#003D5C]"
          />
          <button
            onClick={() => { if (manualInput.trim()) handleScanResult(manualInput) }}
            disabled={!manualInput.trim()}
            className="h-11 px-4 rounded-xl bg-[#003D5C] text-white text-sm font-semibold disabled:opacity-40"
          >
            Suchen
          </button>
        </div>
      </div>
    </div>
  )
}