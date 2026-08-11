import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { CircleCheck as CheckCircle2, Eye, X, ChevronDown, Plus } from 'lucide-react'

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
  photosPerRegion: Record<string, number>
  dateCreated: string
  dateModified: string
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

interface OrderPhotoCardProps {
  order: PhotoOrder
  editingValues: Record<string, number>
  editingSujet: number
  editingGesamt: number
  onUpdateRegion: (region: string, value: number) => void
  onUpdateSujet: (value: number) => void
  onUpdateGesamt: (value: number) => void
  onSaveRegions: () => void
  onSaveSujet: () => void
  onSaveGesamt: () => void
  onMarkChecked: () => void
  onViewOrder: () => void
}

export function OrderPhotoCard({
  order,
  editingValues,
  editingSujet,
  editingGesamt,
  onUpdateRegion,
  onUpdateSujet,
  onUpdateGesamt,
  onSaveRegions,
  onSaveSujet,
  onSaveGesamt,
  onMarkChecked,
  onViewOrder,
}: OrderPhotoCardProps) {
  const initialVisible = REGIONEN
    .filter(r => (order.photosPerRegion?.[r.key] || 0) > 0)
    .map(r => r.key)

  const [visibleRegions, setVisibleRegions] = useState<string[]>(
    initialVisible.length > 0 ? initialVisible : []
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addRegion = (key: string) => {
    setVisibleRegions(prev => [...prev, key])
    setDropdownOpen(false)
  }

  const removeRegion = (key: string) => {
    setVisibleRegions(prev => prev.filter(k => k !== key))
    onUpdateRegion(key, 0)
  }

  const availableToAdd = REGIONEN.filter(r => !visibleRegions.includes(r.key))

  const totalPhotos = Object.entries(editingValues).reduce(
    (sum, [, val]) => sum + (val || 0),
    0
  )

  const hasChanges = JSON.stringify(editingValues) !== JSON.stringify(order.photosPerRegion)
  const sujetChanged = editingSujet !== order.sujetCount
  const gesamtChanged = editingGesamt !== order.photoCount

  return (
    <Card className="overflow-hidden border border-gray-200 hover:border-[#003d5c]/40 transition-colors">
      {/* Header */}
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
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0">
            Fotomanagement
          </Badge>
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
        {/* Region section */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-[#003d5c] uppercase tracking-wide">Fotoanzahl je Region</p>

            {/* Add region dropdown */}
            {availableToAdd.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#003d5c] border border-[#003d5c]/30 rounded px-2 py-0.5 hover:bg-[#003d5c]/5 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Region hinzufügen
                  <ChevronDown className="h-3 w-3" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                    {availableToAdd.map(r => (
                      <button
                        key={r.key}
                        onClick={() => addRegion(r.key)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-[#003d5c] transition-colors"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {visibleRegions.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic py-2">Keine Regionen hinzugefügt</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visibleRegions.map(key => {
                const region = REGIONEN.find(r => r.key === key)!
                const isSpecial = key === 'ooDgWels'
                return (
                  <div
                    key={key}
                    className={`rounded p-1.5 flex flex-col ${isSpecial ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}
                    style={{ minWidth: '80px' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[9px] font-semibold leading-tight truncate flex-1 ${isSpecial ? 'text-red-700' : 'text-[#003d5c]'}`}>
                        {region.label}
                      </p>
                      <button
                        onClick={() => removeRegion(key)}
                        className={`ml-1 rounded-full p-0.5 hover:bg-opacity-20 flex-shrink-0 ${isSpecial ? 'hover:bg-red-400 text-red-400' : 'hover:bg-blue-400 text-blue-400'}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={editingValues[key] || 0}
                      onChange={(e) => onUpdateRegion(key, parseInt(e.target.value) || 0)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-center text-xs font-medium px-1 w-full"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom row: Sujets, Tiles, Gesamt, Actions */}
        <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
          {/* Sujets */}
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-gray-500 font-medium">Sujets</p>
            <Input
              type="number"
              min="0"
              value={editingSujet || 0}
              onChange={(e) => onUpdateSujet(parseInt(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              className="w-16 h-7 text-center text-xs font-medium"
            />
            {sujetChanged && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSaveSujet() }} className="h-5 text-[10px] px-1.5 mt-0.5">✓</Button>
            )}
          </div>

          {/* Tiles / Regionen Anzahl — manually editable */}
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-gray-500 font-medium">Tiles</p>
            <Input
              type="number"
              min="0"
              value={editingGesamt || 0}
              onChange={(e) => onUpdateGesamt(parseInt(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()}
              className="w-16 h-7 text-center text-xs font-medium"
            />
            {gesamtChanged && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSaveGesamt() }} className="h-5 text-[10px] px-1.5 mt-0.5">✓</Button>
            )}
          </div>

          {/* Gesamt Fotos — auto-calculated sum of regions */}
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-[#003d5c] font-semibold">Gesamt Fotos</p>
            <div className="w-20 h-8 flex items-center justify-center rounded border border-[#003d5c]/30 bg-[#003d5c]/5 text-sm font-bold text-[#003d5c]">
              {totalPhotos}
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            {hasChanges && (
              <Button
                size="sm"
                variant="default"
                onClick={(e) => { e.stopPropagation(); onSaveRegions() }}
                className="h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700"
              >
                ✓ Regionen speichern
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={(e) => { e.stopPropagation(); onMarkChecked() }}
              className="h-8 text-xs bg-green-600 hover:bg-green-700 px-3"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Geprüft
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              onClick={(e) => { e.stopPropagation(); onViewOrder() }}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
