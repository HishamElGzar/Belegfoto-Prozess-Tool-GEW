import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://blsanpzzwcmlfvbnfybf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})

const KV_TABLE = 'kv_store_b2ee3d82'

// ---- KV helpers (direct database access, replaces edge function) ----

async function kvGet(key: string): Promise<any> {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.value
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await supabase
    .from(KV_TABLE)
    .upsert({ key, value })
  if (error) throw new Error(error.message)
}

async function kvDel(key: string): Promise<void> {
  const { error } = await supabase
    .from(KV_TABLE)
    .delete()
    .eq('key', key)
  if (error) throw new Error(error.message)
}

async function kvGetByPrefix(prefix: string): Promise<any[]> {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .like('key', prefix + '%')
  if (error) throw new Error(error.message)
  return data?.map((d: any) => d.value) ?? []
}

// ---- Calendar week helper ----

function getCalendarWeek(dateString: string): number {
  const date = new Date(dateString)
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function calculatePhotoCount(regions: Record<string, boolean>, isSpecialCustomer: boolean): number {
  const normalCounts: Record<string, number> = {
    wien: 3, no: 2, bgld: 2, ooUsp: 2, ooWbr: 2, ooDgWels: 1,
    stmkAnkuender: 2, sProgressSalzburg: 2, tProgressTirol: 2,
    tSwg: 2, tHwt: 1, kPsg: 2, vVorarlberg: 2, kartnig: 2,
  }
  let totalCount = 0
  for (const [region, selected] of Object.entries(regions)) {
    if (selected) totalCount += normalCounts[region] || 0
  }
  if (isSpecialCustomer) totalCount = Math.ceil(totalCount * 1.5)
  return totalCount
}

// ---- Orders API ----

export async function getOrders(): Promise<{ orders: any[] }> {
  const orders = await kvGetByPrefix('order:')
  return { orders }
}

export async function getOrder(id: string): Promise<{ order: any }> {
  const order = await kvGet(`order:${id}`)
  if (!order) throw new Error('Order not found')
  return { order }
}

export async function createOrder(data: any): Promise<{ order: any; message: string }> {
  const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startKW = data.laufzeitStart ? getCalendarWeek(data.laufzeitStart) : null
  const photoCount = calculatePhotoCount(data.regions || {}, data.isSpecialCustomer || false)
  const order = {
    id: orderId,
    auftrag: data.auftrag || '',
    auftraggeber: data.auftraggeber || '',
    wt: data.wt || '',
    marke: data.marke || '',
    sujet: data.sujet || '',
    auftragsnr: data.auftragsnr || '',
    laufzeitStart: data.laufzeitStart || '',
    laufzeitEnd: data.laufzeitEnd || '',
    startKW,
    photoCount,
    infos: data.infos || '',
    isNormalCustomer: data.isNormalCustomer ?? true,
    isSpecialCustomer: data.isSpecialCustomer ?? false,
    produktbilderNurWien: data.produktbilderNurWien ?? false,
    regions: data.regions || {},
    osaIds: data.osaIds || [],
    selectedLocations: data.selectedLocations || [],
    images: data.images || [],
    photoStatus: data.photoStatus || 'pending',
    salesforceId: data.salesforceId,
    sharelink: data.sharelink,
    dateCreated: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  }
  await kvSet(`order:${orderId}`, order)
  return { order, message: 'Order created successfully' }
}

export async function updateOrder(id: string, data: any): Promise<{ order: any; message: string }> {
  const existingOrder = await kvGet(`order:${id}`)
  if (!existingOrder) throw new Error('Order not found')
  const startKW = data.laufzeitStart ? getCalendarWeek(data.laufzeitStart) : existingOrder.startKW
  const photoCount = calculatePhotoCount(
    data.regions || existingOrder.regions,
    data.isSpecialCustomer ?? existingOrder.isSpecialCustomer,
  )
  const updatedOrder = {
    ...existingOrder,
    ...data,
    id,
    startKW,
    photoCount,
    dateModified: new Date().toISOString(),
  }
  await kvSet(`order:${id}`, updatedOrder)
  if (data.sharelink !== undefined && updatedOrder.salesforceId) {
    const allOrders = await kvGetByPrefix('order:')
    const linkedOrders = allOrders.filter((o: any) =>
      o.salesforceId === updatedOrder.salesforceId && o.id !== id)
    for (const linkedOrder of linkedOrders) {
      await kvSet(`order:${linkedOrder.id}`, {
        ...linkedOrder,
        sharelink: data.sharelink,
        dateModified: new Date().toISOString(),
      })
    }
  }
  return { order: updatedOrder, message: 'Order updated successfully' }
}

export async function deleteOrder(id: string): Promise<{ message: string }> {
  await kvDel(`order:${id}`)
  return { message: 'Order deleted successfully' }
}

export async function updatePhotoStatus(orderId: string, photoStatus: string): Promise<{ order: any }> {
  const order = await kvGet(`order:${orderId}`)
  if (!order) throw new Error('Order not found')
  const updated = { ...order, photoStatus, dateModified: new Date().toISOString() }
  await kvSet(`order:${orderId}`, updated)
  return { order: updated }
}

// ---- Orders by Salesforce ID ----

export async function getOrdersBySalesforceId(salesforceId: string): Promise<{ orders: any[] }> {
  const allOrders = await kvGetByPrefix('order:')
  const linked = allOrders.filter((o: any) => o.salesforceId === salesforceId)
  return { orders: linked }
}

export async function unlinkOrders(body: { orderId: string }): Promise<{ message: string }> {
  const order = await kvGet(`order:${body.orderId}`)
  if (!order) throw new Error('Order not found')
  const updated = { ...order, salesforceId: null, sharelink: null, dateModified: new Date().toISOString() }
  await kvSet(`order:${body.orderId}`, updated)
  return { message: 'Order unlinked successfully' }
}

// ---- Photographers API ----

export async function getPhotographers(): Promise<{ photographers: any[] }> {
  const photographers = await kvGetByPrefix('photographer:')
  return { photographers }
}

// ---- Occupancy periods API ----

export async function getOccupancyPeriods(): Promise<{ periods: any[] }> {
  const periods = await kvGetByPrefix('occupancy-period:')
  return { periods }
}

// ---- Master locations API ----

export async function getMasterLocations(): Promise<{ locations: any[] }> {
  const locations = await kvGetByPrefix('master-location:')
  return { locations }
}

export async function createMasterLocation(data: any): Promise<{ location: any; message: string }> {
  const locationId = `ml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const location = {
    id: locationId,
    ...data,
    dateCreated: new Date().toISOString(),
  }
  await kvSet(`master-location:${locationId}`, location)
  return { location, message: 'Location created successfully' }
}

export async function updateMasterLocation(id: string, data: any): Promise<{ location: any; message: string }> {
  const existing = await kvGet(`master-location:${id}`)
  if (!existing) throw new Error('Location not found')
  const updated = { ...existing, ...data, id, dateModified: new Date().toISOString() }
  await kvSet(`master-location:${id}`, updated)
  return { location: updated, message: 'Location updated successfully' }
}

export async function deleteMasterLocation(id: string): Promise<{ message: string }> {
  await kvDel(`master-location:${id}`)
  return { message: 'Location deleted successfully' }
}

// ---- Campaigns API ----

export async function getCampaigns(): Promise<{ campaigns: any[] }> {
  const campaigns = await kvGetByPrefix('campaign:')
  return { campaigns }
}

export async function getCampaign(id: string): Promise<{ campaign: any }> {
  const campaign = await kvGet(`campaign:${id}`)
  if (!campaign) throw new Error('Campaign not found')
  return { campaign }
}

// ---- Assignments API ----

export async function getAssignments(): Promise<{ assignments: any[] }> {
  const assignments = await kvGetByPrefix('assignment:')
  return { assignments }
}

export async function getUnassignedPhotos(): Promise<{ photos: any[] }> {
  const photos = await kvGetByPrefix('unassigned-photo:')
  return { photos }
}

// ---- Exported for backward compatibility ----

export const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
export const publicAnonKey = supabaseAnonKey
