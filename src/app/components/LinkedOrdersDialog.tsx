import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Link2, Unlink, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from "sonner"
import {
  projectId,
  publicAnonKey,
} from '../utils/supabase/info'

interface LinkedOrder {
  id: string
  auftrag: string
  auftraggeber: string
  auftragsnr: string
  wt: string
  laufzeitStart: string
  laufzeitEnd: string
  photoStatus: string
}

interface LinkedOrdersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  linkGroupId: string
  linkGroupName: string
  onSuccess: () => void
}

export function LinkedOrdersDialog({ 
  open, 
  onOpenChange, 
  linkGroupId, 
  linkGroupName,
  onSuccess 
}: LinkedOrdersDialogProps) {
  const [orders, setOrders] = useState<LinkedOrder[]>([])
  const [loading, setLoading] = useState(false)

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`

  useEffect(() => {
    if (open && linkGroupId) {
      loadLinkedOrders()
    }
  }, [open, linkGroupId])

  const loadLinkedOrders = async () => {
    setLoading(true)
    try {
      // Try to load by Salesforce ID first
      const response = await fetch(`${serverUrl}/orders/salesforce/${linkGroupId}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch linked orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching linked orders:', error)
      toast.error('Fehler beim Laden der verknüpften Aufträge')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkAll = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${serverUrl}/orders/unlink`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderIds: orders.map(o => o.id),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      toast.success('Verknüpfung erfolgreich aufgehoben')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error unlinking orders:', error)
      toast.error('Fehler beim Aufheben der Verknüpfung')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      'pending': { label: 'Offen', color: 'bg-gray-100 text-gray-800 border-gray-300' },
      'no_photos': { label: 'Keine Fotos', color: 'bg-red-100 text-red-800 border-red-300' },
      'photo_management': { label: 'Fotomanagement', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      'logistics': { label: 'Logistik', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      'tour_assignment': { label: 'Tourenzuordnung', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      'photographer': { label: 'Fotograf', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      'post_processing': { label: 'Nachbearbeitung', color: 'bg-pink-100 text-pink-800 border-pink-300' },
      'quality_check': { label: 'Qualitätskontrolle', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'sales': { label: 'Verkauf', color: 'bg-green-100 text-green-800 border-green-300' },
      'completed': { label: 'Abgeschlossen', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    }

    const config = statusConfig[status] || statusConfig['pending']
    return (
      <Badge variant="outline" className={`text-xs ${config.color}`}>
        {config.label}
      </Badge>
    )
  }

  const readyForSales = orders.every(o => 
    o.photoStatus === 'logistics' || 
    o.photoStatus === 'tour_assignment' || 
    o.photoStatus === 'photographer' ||
    o.photoStatus === 'post_processing' ||
    o.photoStatus === 'quality_check'
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Verknüpfte Aufträge: {linkGroupName}
          </DialogTitle>
          <DialogDescription>
            Diese Aufträge sind miteinander verknüpft und teilen dieselbe Salesforce ID.
          </DialogDescription>
        </DialogHeader>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Auftrag</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Auftraggeber</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">WT</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Laufzeit</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{order.auftrag}</div>
                      <div className="text-xs text-muted-foreground">{order.auftragsnr}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.auftraggeber}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {order.wt}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {order.laufzeitStart && new Date(order.laufzeitStart).toLocaleDateString('de-DE')}
                      {' - '}
                      {order.laufzeitEnd && new Date(order.laufzeitEnd).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(order.photoStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleUnlinkAll}
            disabled={loading}
          >
            <Unlink className="h-4 w-4 mr-2" />
            Verknüpfung aufheben
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}