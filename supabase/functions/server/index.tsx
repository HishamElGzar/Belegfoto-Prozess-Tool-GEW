import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
)

// Health check endpoints
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Fotoprozess API Server', 
    timestamp: new Date().toISOString() 
  })
})

app.get('/make-server-b2ee3d82', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Fotoprozess API Server', 
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  })
})

// Utility function to calculate calendar week (KW) from date
function getCalendarWeek(dateString: string): number {
  const date = new Date(dateString)
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Utility function to calculate photo count
function calculatePhotoCount(regions: Record<string, boolean>, isSpecialCustomer: boolean): number {
  // Base photo count per region for normal customers
  const normalCounts: Record<string, number> = {
    wien: 3,
    no: 2,
    bgld: 2,
    ooUsp: 2,
    ooWbr: 2,
    ooDgWels: 1,
    stmkAnkuender: 2,
    sProgressSalzburg: 2,
    tProgressTirol: 2,
    tSwg: 2,
    tHwt: 1,
    kPsg: 2,
    vVorarlberg: 2,
    kartnig: 2,
  }

  let totalCount = 0
  for (const [region, selected] of Object.entries(regions)) {
    if (selected) {
      totalCount += normalCounts[region] || 0
    }
  }

  // Special customers get 50% more photos (rounded up)
  if (isSpecialCustomer) {
    totalCount = Math.ceil(totalCount * 1.5)
  }

  return totalCount
}

// Initialize storage bucket on startup
const BUCKET_NAME = 'make-533c5b3a-order-images'

async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME)
    
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      })
      console.log('Storage bucket created:', BUCKET_NAME)
    }
  } catch (error) {
    console.log('Error ensuring bucket exists:', error)
  }
}

// Get all orders
app.get('/make-server-b2ee3d82/orders', async (c) => {
  try {
    const orders = await kv.getByPrefix('order:')
    return c.json({ orders })
  } catch (error) {
    console.log('Error fetching orders:', error)
    return c.json({ error: 'Failed to fetch orders', details: String(error) }, 500)
  }
})

// Get single order
app.get('/make-server-b2ee3d82/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const order = await kv.get(`order:${id}`)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    return c.json({ order })
  } catch (error) {
    console.log('Error fetching order:', error)
    return c.json({ error: 'Failed to fetch order', details: String(error) }, 500)
  }
})

// Create new order
app.post('/make-server-b2ee3d82/orders', async (c) => {
  try {
    const data = await c.req.json()
    const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate start KW from Laufzeit start
    const startKW = data.laufzeitStart ? getCalendarWeek(data.laufzeitStart) : null
    
    // Calculate photo count
    const photoCount = calculatePhotoCount(data.regions || {}, data.isSpecialCustomer || false)
    
    const order = {
      id: orderId,
      // V2000 fields
      auftrag: data.auftrag || '',
      auftraggeber: data.auftraggeber || '',
      wt: data.wt || '',
      auftragsnr: data.auftragsnr || '',
      laufzeitStart: data.laufzeitStart || '',
      laufzeitEnd: data.laufzeitEnd || '',
      
      // Calculated fields
      startKW,
      photoCount,
      
      // User input fields
      infos: data.infos || '',
      isNormalCustomer: data.isNormalCustomer ?? true,
      isSpecialCustomer: data.isSpecialCustomer ?? false,
      produktbilderNurWien: data.produktbilderNurWien ?? false,
      
      // Regional fields
      regions: data.regions || {},
      
      // OSA IDs for assembly list
      osaIds: data.osaIds || [],
      
      // Selected locations from sujets
      selectedLocations: data.selectedLocations || [],
      
      // Images
      images: data.images || [],
      
      // Photo request status: 'pending', 'requested', 'not_needed'
      photoStatus: data.photoStatus || 'pending',
      
      // System fields
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${orderId}`, order)
    return c.json({ order, message: 'Order created successfully' })
  } catch (error) {
    console.log('Error creating order:', error)
    return c.json({ error: 'Failed to create order', details: String(error) }, 500)
  }
})

// Update order
app.put('/make-server-b2ee3d82/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const existingOrder = await kv.get(`order:${id}`)
    if (!existingOrder) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    // Recalculate start KW if laufzeit changed
    const startKW = data.laufzeitStart ? getCalendarWeek(data.laufzeitStart) : existingOrder.startKW
    
    // Recalculate photo count
    const photoCount = calculatePhotoCount(
      data.regions || existingOrder.regions,
      data.isSpecialCustomer ?? existingOrder.isSpecialCustomer
    )
    
    const updatedOrder = {
      ...existingOrder,
      ...data,
      id,
      startKW,
      photoCount,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    
    // If sharelink is updated and salesforceId exists, update all linked orders
    if (data.sharelink !== undefined && updatedOrder.salesforceId) {
      const allOrders = await kv.getByPrefix('order:')
      const linkedOrders = allOrders.filter((order: any) => 
        order.salesforceId === updatedOrder.salesforceId && order.id !== id
      )
      
      console.log(`Updating sharelink for ${linkedOrders.length} linked orders with Salesforce ID: ${updatedOrder.salesforceId}`)
      
      for (const linkedOrder of linkedOrders) {
        const updated = {
          ...linkedOrder,
          sharelink: data.sharelink,
          dateModified: new Date().toISOString(),
        }
        await kv.set(`order:${linkedOrder.id}`, updated)
      }
    }
    
    return c.json({ order: updatedOrder, message: 'Order updated successfully' })
  } catch (error) {
    console.log('Error updating order:', error)
    return c.json({ error: 'Failed to update order', details: String(error) }, 500)
  }
})

// Delete order
app.delete('/make-server-b2ee3d82/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await kv.del(`order:${id}`)
    return c.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.log('Error deleting order:', error)
    return c.json({ error: 'Failed to delete order', details: String(error) }, 500)
  }
})

// Upload image for order
app.post('/make-server-b2ee3d82/orders/:id/upload-image', async (c) => {
  try {
    const orderId = c.req.param('id')
    const { fileName, fileData, contentType } = await c.req.json()
    
    const existingOrder = await kv.get(`order:${orderId}`)
    if (!existingOrder) {
      return c.json({ error: 'Order not found' }, 404)
    }

    // Generate unique file name
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    const extension = fileName.split('.').pop()
    const uniqueFileName = `${orderId}/${timestamp}-${randomId}.${extension}`

    // Convert base64 to buffer
    const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, buffer, {
        contentType: contentType,
        upsert: false,
      })

    if (uploadError) {
      console.log('Storage upload error:', uploadError)
      return c.json({ error: 'Failed to upload file', details: uploadError.message }, 500)
    }

    // Create signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(uniqueFileName, 31536000) // 1 year in seconds

    if (!urlData) {
      return c.json({ error: 'Failed to create signed URL' }, 500)
    }

    // Create image metadata
    const imageId = `img-${timestamp}-${randomId}`
    const imageData = {
      id: imageId,
      name: fileName,
      url: urlData.signedUrl,
      storagePath: uniqueFileName,
      uploadedAt: new Date().toISOString(),
    }

    // Update order with new image
    const updatedImages = [...(existingOrder.images || []), imageData]
    const updatedOrder = {
      ...existingOrder,
      images: updatedImages,
      dateModified: new Date().toISOString(),
    }

    await kv.set(`order:${orderId}`, updatedOrder)

    return c.json({ 
      image: imageData, 
      message: 'Image uploaded successfully' 
    })
  } catch (error) {
    console.log('Error uploading image:', error)
    return c.json({ error: 'Failed to upload image', details: String(error) }, 500)
  }
})

// Delete image from order
app.delete('/make-server-b2ee3d82/orders/:id/delete-image/:imageId', async (c) => {
  try {
    const orderId = c.req.param('id')
    const imageId = c.req.param('imageId')
    
    const existingOrder = await kv.get(`order:${orderId}`)
    if (!existingOrder) {
      return c.json({ error: 'Order not found' }, 404)
    }

    const image = existingOrder.images?.find((img: any) => img.id === imageId)
    if (!image) {
      return c.json({ error: 'Image not found' }, 404)
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([image.storagePath])

    if (deleteError) {
      console.log('Storage delete error:', deleteError)
      // Continue even if storage delete fails
    }

    // Remove image from order
    const updatedImages = existingOrder.images.filter((img: any) => img.id !== imageId)
    const updatedOrder = {
      ...existingOrder,
      images: updatedImages,
      dateModified: new Date().toISOString(),
    }

    await kv.set(`order:${orderId}`, updatedOrder)

    return c.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.log('Error deleting image:', error)
    return c.json({ error: 'Failed to delete image', details: String(error) }, 500)
  }
})

// Update photo status
app.patch('/make-server-b2ee3d82/orders/:id/photo-status', async (c) => {
  try {
    const id = c.req.param('id')
    const { photoStatus } = await c.req.json()
    
    const existingOrder = await kv.get(`order:${id}`)
    if (!existingOrder) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    const updatedOrder = {
      ...existingOrder,
      photoStatus,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    return c.json({ order: updatedOrder, message: 'Photo status updated successfully' })
  } catch (error) {
    console.log('Error updating photo status:', error)
    return c.json({ error: 'Failed to update photo status', details: String(error) }, 500)
  }
})

// Get all photographers
app.get('/make-server-b2ee3d82/photographers', async (c) => {
  try {
    const photographers = await kv.getByPrefix('photographer:')
    return c.json({ photographers })
  } catch (error) {
    console.log('Error fetching photographers:', error)
    return c.json({ error: 'Failed to fetch photographers', details: String(error) }, 500)
  }
})

// Create photographer
app.post('/make-server-b2ee3d82/photographers', async (c) => {
  try {
    const data = await c.req.json()
    const photographerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const photographer = {
      id: photographerId,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      active: data.active ?? true,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`photographer:${photographerId}`, photographer)
    return c.json({ photographer, message: 'Photographer created successfully' })
  } catch (error) {
    console.log('Error creating photographer:', error)
    return c.json({ error: 'Failed to create photographer', details: String(error) }, 500)
  }
})

// Update photographer
app.put('/make-server-b2ee3d82/photographers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const existingPhotographer = await kv.get(`photographer:${id}`)
    if (!existingPhotographer) {
      return c.json({ error: 'Photographer not found' }, 404)
    }
    
    const updatedPhotographer = {
      ...existingPhotographer,
      ...data,
      id,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`photographer:${id}`, updatedPhotographer)
    return c.json({ photographer: updatedPhotographer, message: 'Photographer updated successfully' })
  } catch (error) {
    console.log('Error updating photographer:', error)
    return c.json({ error: 'Failed to update photographer', details: String(error) }, 500)
  }
})

// Delete photographer
app.delete('/make-server-b2ee3d82/photographers/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await kv.del(`photographer:${id}`)
    return c.json({ message: 'Photographer deleted successfully' })
  } catch (error) {
    console.log('Error deleting photographer:', error)
    return c.json({ error: 'Failed to delete photographer', details: String(error) }, 500)
  }
})

// Assign photographer to order locations for a specific week
app.post('/make-server-b2ee3d82/orders/:id/assign-photographer', async (c) => {
  try {
    const orderId = c.req.param('id')
    const { photographerId, week, year, locationIds } = await c.req.json()
    
    const existingOrder = await kv.get(`order:${orderId}`)
    if (!existingOrder) {
      return c.json({ error: 'Order not found' }, 404)
    }

    const photographer = await kv.get(`photographer:${photographerId}`)
    if (!photographer) {
      return c.json({ error: 'Photographer not found' }, 404)
    }

    // Create or update assignment
    const assignmentKey = `assignment:${orderId}:${week}:${year}`
    const assignment = {
      orderId,
      photographerId,
      photographerName: photographer.name,
      week,
      year,
      locationIds: locationIds || [],
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    }

    await kv.set(assignmentKey, assignment)

    // Update order with photographer assignments regardless of status
    const updatedOrder = {
      ...existingOrder,
      photographerAssignments: [
        ...(existingOrder.photographerAssignments || []).filter(
          (a: any) => !(a.week === week && a.year === year && a.photographerId === photographerId)
        ),
        assignment
      ],
      dateModified: new Date().toISOString(),
    }
    
    // Advance status to 'photographer' when a photographer is assigned
    if (
      existingOrder.photoStatus === 'logistics_transferred' ||
      existingOrder.photoStatus === 'tour_assignment' ||
      existingOrder.photoStatus === 'photographer_assigned'
    ) {
      updatedOrder.photoStatus = 'photographer'
    }
    
    await kv.set(`order:${orderId}`, updatedOrder)
    return c.json({ assignment, order: updatedOrder, message: 'Photographer assigned successfully' })
  } catch (error) {
    console.log('Error assigning photographer:', error)
    return c.json({ error: 'Failed to assign photographer', details: String(error) }, 500)
  }
})

// Get assignments for specific week
app.get('/make-server-b2ee3d82/assignments/week/:year/:week', async (c) => {
  try {
    const year = c.req.param('year')
    const week = c.req.param('week')
    const allAssignments = await kv.getByPrefix('assignment:')
    const weekAssignments = allAssignments.filter((a: any) => 
      a.year?.toString() === year && a.week?.toString() === week
    )
    return c.json({ assignments: weekAssignments })
  } catch (error) {
    console.log('Error fetching assignments:', error)
    return c.json({ error: 'Failed to fetch assignments', details: String(error) }, 500)
  }
})

// Initialize test photographers
app.post('/make-server-b2ee3d82/init-photographers', async (c) => {
  try {
    const existingPhotographers = await kv.getByPrefix('photographer:')
    if (existingPhotographers.length > 0) {
      return c.json({ message: 'Photographers already exist', count: existingPhotographers.length })
    }

    const testPhotographers = [
      { name: 'Max Mustermann', email: 'max@foto.at', phone: '+43 664 1234567', active: true },
      { name: 'Anna Schmidt', email: 'anna@foto.at', phone: '+43 664 2345678', active: true },
      { name: 'Peter Huber', email: 'peter@foto.at', phone: '+43 664 3456789', active: true },
      { name: 'Maria Wagner', email: 'maria@foto.at', phone: '+43 664 4567890', active: true },
    ]

    const createdPhotographers = []
    for (const photoData of testPhotographers) {
      const photographerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const photographer = {
        id: photographerId,
        ...photoData,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }
      await kv.set(`photographer:${photographerId}`, photographer)
      createdPhotographers.push(photographer)
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    return c.json({ 
      message: 'Test photographers created successfully', 
      count: createdPhotographers.length,
      photographers: createdPhotographers 
    })
  } catch (error) {
    console.log('Error creating test photographers:', error)
    return c.json({ error: 'Failed to create test photographers', details: String(error) }, 500)
  }
})

// Get all occupancy periods
app.get('/make-server-b2ee3d82/occupancy-periods', async (c) => {
  try {
    console.log('Fetching occupancy periods...')
    const periods = await kv.getByPrefix('occupancy-period:')
    console.log(`Found ${periods.length} occupancy periods`)
    return c.json({ periods })
  } catch (error) {
    console.log('Error fetching occupancy periods:', error)
    return c.json({ error: 'Failed to fetch occupancy periods', details: String(error) }, 500)
  }
})

// Initialize occupancy data
app.post('/make-server-b2ee3d82/init-occupancy-data', async (c) => {
  try {
    console.log('Initializing occupancy data...')
    
    // Check if data already exists
    const existingPeriods = await kv.getByPrefix('occupancy-period:')
    if (existingPeriods.length > 0) {
      console.log(`Occupancy data already exists (${existingPeriods.length} periods)`)
      return c.json({ 
        message: 'Occupancy data already exists', 
        count: existingPeriods.length,
        periods: existingPeriods
      })
    }

    // Create sample occupancy periods with locations
    const samplePeriods = [
      {
        id: `period-${Date.now()}-1`,
        startDate: '2026-01-06',
        endDate: '2026-01-19',
        locations: [
          {
            id: `loc-${Date.now()}-1`,
            bundesland: 'Wien',
            gemeinde: 'Wien',
            plz: '1010',
            standortnummer: '5437',
            adresse: 'Stephansplatz 1'
          },
          {
            id: `loc-${Date.now()}-2`,
            bundesland: 'Wien',
            gemeinde: 'Wien',
            plz: '1010',
            standortnummer: '5438',
            adresse: 'Graben 21'
          },
          {
            id: `loc-${Date.now()}-3`,
            bundesland: 'Wien',
            gemeinde: 'Wien',
            plz: '1020',
            standortnummer: '5439',
            adresse: 'Prater Hauptallee 1'
          },
          {
            id: `loc-${Date.now()}-4`,
            bundesland: 'Niederösterreich',
            gemeinde: 'St. Pölten',
            plz: '3100',
            standortnummer: '3215',
            adresse: 'Rathausplatz 1'
          },
          {
            id: `loc-${Date.now()}-5`,
            bundesland: 'Niederösterreich',
            gemeinde: 'Wiener Neustadt',
            plz: '2700',
            standortnummer: '3216',
            adresse: 'Hauptplatz 1'
          },
        ]
      },
      {
        id: `period-${Date.now()}-2`,
        startDate: '2026-01-20',
        endDate: '2026-02-02',
        locations: [
          {
            id: `loc-${Date.now()}-6`,
            bundesland: 'Wien',
            gemeinde: 'Wien',
            plz: '1030',
            standortnummer: '5440',
            adresse: 'Landstraße Hauptstraße 1'
          },
          {
            id: `loc-${Date.now()}-7`,
            bundesland: 'Oberösterreich',
            gemeinde: 'Linz',
            plz: '4020',
            standortnummer: '4128',
            adresse: 'Hauptplatz 1'
          },
          {
            id: `loc-${Date.now()}-8`,
            bundesland: 'Oberösterreich',
            gemeinde: 'Wels',
            plz: '4600',
            standortnummer: '4129',
            adresse: 'Stadtplatz 1'
          },
        ]
      },
      {
        id: `period-${Date.now()}-3`,
        startDate: '2026-02-03',
        endDate: '2026-02-16',
        locations: [
          {
            id: `loc-${Date.now()}-9`,
            bundesland: 'Steiermark',
            gemeinde: 'Graz',
            plz: '8010',
            standortnummer: '8234',
            adresse: 'Hauptplatz 1'
          },
          {
            id: `loc-${Date.now()}-10`,
            bundesland: 'Salzburg',
            gemeinde: 'Salzburg',
            plz: '5020',
            standortnummer: '5167',
            adresse: 'Mozartplatz 1'
          },
        ]
      },
    ]

    // Save periods to KV store
    const createdPeriods = []
    for (const period of samplePeriods) {
      await kv.set(`occupancy-period:${period.id}`, period)
      createdPeriods.push(period)
      console.log(`Created occupancy period: ${period.startDate} - ${period.endDate} with ${period.locations.length} locations`)
      
      // Small delay to ensure unique IDs
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.log(`Successfully initialized ${createdPeriods.length} occupancy periods`)
    
    return c.json({ 
      success: true,
      message: 'Occupancy data initialized successfully', 
      count: createdPeriods.length,
      periods: createdPeriods
    })
  } catch (error) {
    console.error('Error initializing occupancy data:', error)
    return c.json({ error: 'Failed to initialize occupancy data', details: String(error) }, 500)
  }
})

// Update location occupancy photo suitability
app.post('/make-server-b2ee3d82/locations/update-occupancy-photo-suitability', async (c) => {
  try {
    const { updates } = await c.req.json()
    console.log(`Updating occupancy photo suitability for ${updates.length} locations`)
    
    // Get existing settings or create new object
    let settings = await kv.get('location-occupancy-photo-settings') || {}
    
    // Update settings
    updates.forEach((update: any) => {
      const key = `${update.periodId}::${update.locationId}`
      settings[key] = update.suitableForOccupancyPhoto
      console.log(`Updated location ${key}: suitableForOccupancyPhoto = ${update.suitableForOccupancyPhoto}`)
    })

    // Save updated settings
    await kv.set('location-occupancy-photo-settings', settings)

    return c.json({ 
      success: true,
      message: 'Location occupancy photo suitability updated successfully',
      count: updates.length
    })
  } catch (error) {
    console.error('Error updating location occupancy photo suitability:', error)
    return c.json({ error: 'Failed to update location occupancy photo suitability', details: String(error) }, 500)
  }
})

// Get location occupancy photo settings
app.get('/make-server-b2ee3d82/locations/occupancy-photo-settings', async (c) => {
  try {
    console.log('Fetching location occupancy photo settings...')
    const settings = await kv.get('location-occupancy-photo-settings') || {}
    console.log(`Found ${Object.keys(settings).length} location settings`)
    return c.json({ settings })
  } catch (error) {
    console.error('Error fetching location occupancy photo settings:', error)
    return c.json({ error: 'Failed to fetch location occupancy photo settings', details: String(error) }, 500)
  }
})

// ================== MASTER LOCATIONS MANAGEMENT ==================

// Get all master locations
app.get('/make-server-b2ee3d82/master-locations', async (c) => {
  try {
    console.log('Fetching master locations...')
    const locations = await kv.getByPrefix('master-location:')
    console.log(`Found ${locations.length} master locations`)
    return c.json({ locations })
  } catch (error) {
    console.error('Error fetching master locations:', error)
    return c.json({ error: 'Failed to fetch master locations', details: String(error) }, 500)
  }
})

const EIGNERCODE: Record<string, string> = {
  GEW: '012', ANK: '061', WBR: '130', HWN: '140', HWT: '160',
  AWS: '180', PER: '210', SWG: '230', WUA: '063', USP: '265', 'USP-008': '008',
  PSG: '026', PWL: '006', PSB: '005', KFM: '030', CLA: '062',
  CEE: '014', RBO: '631', EPA: '020', ISA: '004', ARG: '035',
  GWS: '015', IPA: '007', DGO: '130',
}

function computeOsaId(gkz: string, regionalCode: string, standortnummer: string, tafelnummer: string): string {
  if (!gkz?.trim() || !regionalCode?.trim() || !standortnummer?.trim() || !tafelnummer?.trim()) return ''
  const eignerNum = (EIGNERCODE[regionalCode.trim()] || regionalCode.trim()).padStart(3, '0')
  const snrPadded = standortnummer.trim().padStart(5, '0')
  const tafelPadded = String(parseInt(tafelnummer.trim()) || 0).padStart(3, '0')
  return `${gkz.trim()}.${eignerNum}.${snrPadded}_${tafelPadded}`
}

// Batch compute OSA IDs for all master locations (must be before /:id routes)
app.post('/make-server-b2ee3d82/master-locations/compute-osa-ids', async (c) => {
  try {
    const allLocations = await kv.getByPrefix('master-location:')
    let updatedCount = 0
    for (const loc of allLocations) {
      const tafelnummer = loc.tafelnummer || String(Math.floor(Math.random() * 4) + 1)
      const osaId = computeOsaId(loc.gemeindekennzeichen || '', loc.regionalCode || '', loc.standortnummer || '', tafelnummer)
      if (osaId !== (loc.osaId || '') || tafelnummer !== (loc.tafelnummer || '')) {
        await kv.set(`master-location:${loc.id}`, { ...loc, tafelnummer, osaId, updatedAt: new Date().toISOString() })
        updatedCount++
      }
    }
    return c.json({ message: `${updatedCount} OSA IDs berechnet`, total: allLocations.length })
  } catch (error) {
    console.error('Error computing OSA IDs:', error)
    return c.json({ error: 'Failed to compute OSA IDs', details: String(error) }, 500)
  }
})

// Create new master location
app.post('/make-server-b2ee3d82/master-locations', async (c) => {
  try {
    const data = await c.req.json()
    const locationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const location = {
      id: locationId,
      bundesland: data.bundesland || '',
      gemeinde: data.gemeinde || '',
      plz: data.plz || '',
      standortnummer: data.standortnummer || '',
      adresse: data.adresse || '',
      regionalCode: data.regionalCode || '',
      gemeindekennzeichen: data.gemeindekennzeichen || '',
      eignerkuerzel: data.eignerkuerzel || '',
      tafelnummer: data.tafelnummer || '',
      osaId: computeOsaId(data.gemeindekennzeichen || '', data.regionalCode || '', data.standortnummer || '', data.tafelnummer || ''),
      suitableForOccupancyPhoto: data.suitableForOccupancyPhoto ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    await kv.set(`master-location:${locationId}`, location)
    console.log('Created master location:', locationId)
    return c.json({ location, message: 'Master location created successfully' })
  } catch (error) {
    console.error('Error creating master location:', error)
    return c.json({ error: 'Failed to create master location', details: String(error) }, 500)
  }
})

// Update master location
app.put('/make-server-b2ee3d82/master-locations/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const existingLocation = await kv.get(`master-location:${id}`)
    if (!existingLocation) {
      return c.json({ error: 'Master location not found' }, 404)
    }
    
    const updatedLocation = {
      ...existingLocation,
      bundesland: data.bundesland ?? existingLocation.bundesland,
      gemeinde: data.gemeinde ?? existingLocation.gemeinde,
      plz: data.plz ?? existingLocation.plz,
      standortnummer: data.standortnummer ?? existingLocation.standortnummer,
      adresse: data.adresse ?? existingLocation.adresse,
      regionalCode: data.regionalCode ?? existingLocation.regionalCode,
      gemeindekennzeichen: data.gemeindekennzeichen ?? existingLocation.gemeindekennzeichen ?? '',
      eignerkuerzel: data.eignerkuerzel ?? existingLocation.eignerkuerzel ?? '',
      tafelnummer: data.tafelnummer ?? existingLocation.tafelnummer ?? '',
      suitableForOccupancyPhoto: data.suitableForOccupancyPhoto ?? existingLocation.suitableForOccupancyPhoto,
      updatedAt: new Date().toISOString(),
    }
    updatedLocation.osaId = computeOsaId(
      updatedLocation.gemeindekennzeichen || '',
      updatedLocation.regionalCode,
      updatedLocation.standortnummer,
      updatedLocation.tafelnummer
    )
    
    await kv.set(`master-location:${id}`, updatedLocation)
    console.log('Updated master location:', id)
    return c.json({ location: updatedLocation, message: 'Master location updated successfully' })
  } catch (error) {
    console.error('Error updating master location:', error)
    return c.json({ error: 'Failed to update master location', details: String(error) }, 500)
  }
})

// Delete master location
app.delete('/make-server-b2ee3d82/master-locations/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await kv.del(`master-location:${id}`)
    console.log('Deleted master location:', id)
    return c.json({ message: 'Master location deleted successfully' })
  } catch (error) {
    console.error('Error deleting master location:', error)
    return c.json({ error: 'Failed to delete master location', details: String(error) }, 500)
  }
})


// Toggle occupancy photo suitability for master location
app.patch('/make-server-b2ee3d82/master-locations/:id/toggle-occupancy', async (c) => {
  try {
    const id = c.req.param('id')
    const { suitableForOccupancyPhoto } = await c.req.json()
    
    const existingLocation = await kv.get(`master-location:${id}`)
    if (!existingLocation) {
      return c.json({ error: 'Master location not found' }, 404)
    }
    
    const updatedLocation = {
      ...existingLocation,
      suitableForOccupancyPhoto,
      updatedAt: new Date().toISOString(),
    }
    
    await kv.set(`master-location:${id}`, updatedLocation)
    console.log('Toggled occupancy photo for master location:', id, suitableForOccupancyPhoto)
    return c.json({ location: updatedLocation, message: 'Master location updated successfully' })
  } catch (error) {
    console.error('Error toggling occupancy photo:', error)
    return c.json({ error: 'Failed to toggle occupancy photo', details: String(error) }, 500)
  }
})

// Initialize test master locations
app.post('/make-server-b2ee3d82/init-master-locations', async (c) => {
  try {
    console.log('Initializing test master locations...')

    // Delete all existing master locations first
    const existing = await kv.getByPrefix('master-location:')
    for (const loc of existing) {
      await kv.del(`master-location:${loc.id}`)
    }

    const testLocations = [
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5437', adresse: 'Stephansplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5438', adresse: 'Graben 21', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Wien', gemeinde: 'Wien 2. Bezirk', plz: '1020', standortnummer: '5439', adresse: 'Prater Hauptallee 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90201', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 3. Bezirk', plz: '1030', standortnummer: '5440', adresse: 'Landstraßer Hauptstr. 7', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90301', tafelnummer: '4', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'St. Pölten', plz: '3100', standortnummer: '3215', adresse: 'Rathausplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30401', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'Wiener Neustadt', plz: '2700', standortnummer: '3216', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30454', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Oberösterreich', gemeinde: 'Linz', plz: '4020', standortnummer: '4128', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'USP', region: 'USP', gemeindekennzeichen: '40101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Oberösterreich', gemeinde: 'Wels', plz: '4600', standortnummer: '4129', adresse: 'Stadtplatz 1', unternehmen: 'Gewista', regionalCode: 'DGO', region: 'DGO', gemeindekennzeichen: '40604', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Steiermark', gemeinde: 'Graz', plz: '8010', standortnummer: '8234', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'ANK', region: 'ANK', gemeindekennzeichen: '60101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Salzburg', gemeinde: 'Salzburg', plz: '5020', standortnummer: '5167', adresse: 'Mozartplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '50101', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Tirol', gemeinde: 'Innsbruck', plz: '6020', standortnummer: '6045', adresse: 'Maria-Theresien-Straße 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '70101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Kärnten', gemeinde: 'Klagenfurt', plz: '9020', standortnummer: '9123', adresse: 'Alter Platz 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '20101', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Vorarlberg', gemeinde: 'Bregenz', plz: '6900', standortnummer: '6712', adresse: 'Kornmarktplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '80101', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
    ]

    const createdLocations = []
    for (const locData of testLocations) {
      const locationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const osaId = computeOsaId(locData.gemeindekennzeichen, locData.regionalCode, locData.standortnummer, locData.tafelnummer)
      const location = {
        id: locationId,
        ...locData,
        osaId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await kv.set(`master-location:${locationId}`, location)
      createdLocations.push(location)
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.log(`Successfully initialized ${createdLocations.length} master locations`)
    
    return c.json({ 
      success: true,
      message: 'Test master locations created successfully', 
      count: createdLocations.length,
      locations: createdLocations 
    })
  } catch (error) {
    console.error('Error creating test master locations:', error)
    return c.json({ error: 'Failed to create test master locations', details: String(error) }, 500)
  }
})

app.post('/make-server-b2ee3d82/migrate-master-locations', async (c) => {
  try {
    const locations = await kv.getByPrefix('master-location:')
    const needsMigration = locations.some((loc: any) => !loc.buchungsformat || !loc.konstruktionsformat || !loc.gemeindekennzeichen || !loc.osaId)
    if (!needsMigration) {
      return c.json({ success: true, migrated: false, message: 'All locations up to date' })
    }
    // Trigger full re-init via internal call
    const existing = await kv.getByPrefix('master-location:')
    for (const loc of existing) {
      await kv.del(`master-location:${loc.id}`)
    }
    const testLocations = [
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5437', adresse: 'Stephansplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5438', adresse: 'Graben 21', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Wien', gemeinde: 'Wien 2. Bezirk', plz: '1020', standortnummer: '5439', adresse: 'Prater Hauptallee 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90201', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 3. Bezirk', plz: '1030', standortnummer: '5440', adresse: 'Landstraßer Hauptstr. 7', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90301', tafelnummer: '4', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'St. Pölten', plz: '3100', standortnummer: '3215', adresse: 'Rathausplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30401', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'Wiener Neustadt', plz: '2700', standortnummer: '3216', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30454', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Oberösterreich', gemeinde: 'Linz', plz: '4020', standortnummer: '4128', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'USP', region: 'USP', gemeindekennzeichen: '40101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Oberösterreich', gemeinde: 'Wels', plz: '4600', standortnummer: '4129', adresse: 'Stadtplatz 1', unternehmen: 'Gewista', regionalCode: 'DGO', region: 'DGO', gemeindekennzeichen: '40604', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Steiermark', gemeinde: 'Graz', plz: '8010', standortnummer: '8234', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'ANK', region: 'ANK', gemeindekennzeichen: '60101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Salzburg', gemeinde: 'Salzburg', plz: '5020', standortnummer: '5167', adresse: 'Mozartplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '50101', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Tirol', gemeinde: 'Innsbruck', plz: '6020', standortnummer: '6045', adresse: 'Maria-Theresien-Straße 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '70101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Kärnten', gemeinde: 'Klagenfurt', plz: '9020', standortnummer: '9123', adresse: 'Alter Platz 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '20101', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Vorarlberg', gemeinde: 'Bregenz', plz: '6900', standortnummer: '6712', adresse: 'Kornmarktplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '80101', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
    ]
    for (const locData of testLocations) {
      const locationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const osaId = computeOsaId(locData.gemeindekennzeichen, locData.regionalCode, locData.standortnummer, locData.tafelnummer)
      await kv.set(`master-location:${locationId}`, { id: locationId, ...locData, osaId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    return c.json({ success: true, migrated: true, count: testLocations.length })
  } catch (error) {
    return c.json({ error: 'Migration failed', details: String(error) }, 500)
  }
})

// ================== CAMPAIGNS MANAGEMENT ==================

// Get all campaigns (orders with logistics status)
app.get('/make-server-b2ee3d82/campaigns', async (c) => {
  try {
    console.log('Fetching campaigns (all orders for campaign management)...')
    const allOrders = await kv.getByPrefix('order:')
    
    // Return all orders - filtering will be done in frontend
    const campaigns = allOrders.filter((order: any) => 
      // Optionally filter out orders that should never appear in campaigns
      order.photoStatus !== 'no_photos'
    ).map((order: any) => {
      // Ensure all fields are present, including photo management fields
      return {
        ...order,
        sujetCount: order.sujetCount || 0,
        photoCount: order.photoCount || 0,
        photosPerRegion: order.photosPerRegion || {
          wien: 0,
          no: 0,
          bgld: 0,
          ooUsp: 0,
          ooWbr: 0,
          ooDgWels: 0,
          stmkAnkuender: 0,
          sProgressSalzburg: 0,
          tProgressTirol: 0,
          tSwg: 0,
          tHwt: 0,
          kPsg: 0,
          vVorarlberg: 0,
          kartnig: 0
        }
      }
    })
    
    console.log(`Found ${campaigns.length} campaigns (from ${allOrders.length} total orders)`)
    
    // Debug: Log sample campaign data to verify fields
    if (campaigns.length > 0) {
      console.log('Sample campaign fields:', {
        id: campaigns[0].id,
        auftrag: campaigns[0].auftrag,
        sujetCount: campaigns[0].sujetCount,
        photoCount: campaigns[0].photoCount,
        photosPerRegion: campaigns[0].photosPerRegion
      })
    }
    
    return c.json({ campaigns })
  } catch (error) {
    console.log('Error fetching campaigns:', error)
    return c.json({ error: 'Failed to fetch campaigns', details: String(error) }, 500)
  }
})

// Get single campaign (order with logistics status)
app.get('/make-server-b2ee3d82/campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const order = await kv.get(`order:${id}`)
    
    if (!order) {
      return c.json({ error: 'Campaign not found' }, 404)
    }
    
    if (order.photoStatus !== 'logistics') {
      return c.json({ error: 'Order is not in logistics status' }, 400)
    }
    
    return c.json({ campaign: order })
  } catch (error) {
    console.log('Error fetching campaign:', error)
    return c.json({ error: 'Failed to fetch campaign', details: String(error) }, 500)
  }
})

// Update campaign (assigns locations to order)
app.put('/make-server-b2ee3d82/campaigns/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    const existingOrder = await kv.get(`order:${id}`)
    if (!existingOrder) {
      return c.json({ error: 'Campaign not found' }, 404)
    }
    
    // Get master locations for the selected location IDs
    const selectedLocationIds = data.selectedLocationIds || []
    const allLocations = await kv.getByPrefix('master-location:')
    const selectedLocations = allLocations.filter((loc: any) => 
      selectedLocationIds.includes(loc.id)
    )
    
    const updatedOrder = {
      ...existingOrder,
      selectedLocationIds,
      selectedLocations,
      // Update status if provided (e.g., to 'tour_assignment' when saving locations)
      photoStatus: data.photoStatus || existingOrder.photoStatus,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    console.log(`Updated campaign ${id} with ${selectedLocationIds.length} locations, status: ${updatedOrder.photoStatus}`)
    return c.json({ campaign: updatedOrder, message: 'Campaign updated successfully' })
  } catch (error) {
    console.log('Error updating campaign:', error)
    return c.json({ error: 'Failed to update campaign', details: String(error) }, 500)
  }
})

// Get photo orders (flattened view of all orders with locations)
app.get('/make-server-b2ee3d82/photo-orders', async (c) => {
  try {
    const orders = await kv.getByPrefix('order:')
    const photoOrders: any[] = []

    for (const order of orders) {
      // Only include orders that have photo status 'requested' or are in campaigns
      if (order.photoStatus === 'requested' && order.selectedLocations && order.selectedLocations.length > 0) {
        // Create one row per location
        for (const location of order.selectedLocations) {
          photoOrders.push({
            id: `${order.id}-${location.id || location.standortnummer}`,
            orderId: order.id,
            auftragsnr: order.auftragsnr || '',
            auftrag: order.auftrag || '',
            auftraggeber: order.auftraggeber || '',
            wt: order.wt || '',
            laufzeitStart: order.laufzeitStart || '',
            laufzeitEnd: order.laufzeitEnd || '',
            startKW: order.startKW || 0,
            produktbilderNurWien: order.produktbilderNurWien || false,
            isSpecialCustomer: order.isSpecialCustomer || false,
            photoCount: order.photoCount || 0,
            sujetCount: order.selectedLocations?.length || 0,
            bundesland: location.bundesland || '',
            gemeinde: location.gemeinde || '',
            standortnummer: location.standortnummer || '',
            adresse: location.adresse || '',
            plz: location.plz || '',
            unternehmen: location.unternehmen || '',
            haendler: location.haendler || '',
            tafelnummer: location.tafelnummer || '',
            photoStatus: order.photoStatus || 'pending',
            fotowunschTermin: order.fotowunschTermin || '',
            fotoDurch: order.fotoDurch || '',
            fotoTermin: location.fotoTermin || '',
            fotografFirma: location.fotografFirma || '',
            fotografName: location.fotografName || '',
            dateCreated: order.dateCreated,
            dateModified: order.dateModified,
          })
        }
      }
    }

    return c.json({ orders: photoOrders })
  } catch (error) {
    console.error('Error getting photo orders:', error)
    return c.json({ error: 'Failed to get photo orders' }, 500)
  }
})

// Add Salesforce IDs to orders
app.post('/make-server-b2ee3d82/add-salesforce-ids', async (c) => {
  try {
    console.log('Starting Salesforce ID migration...')
    
    // Generate a few random Salesforce IDs that will be shared across multiple orders
    const salesforceIds = [
      'SF-2026-001234',
      'SF-2026-001235',
      'SF-2026-001236',
      'SF-2026-001237',
      'SF-2026-001238',
      'SF-2026-001239',
      'SF-2026-001240',
      'SF-2026-001241',
      'SF-2026-001242',
      'SF-2026-001243',
    ]
    
    const orders = await kv.getByPrefix('order:')
    let migratedCount = 0
    
    for (const order of orders) {
      // If order doesn't have a Salesforce ID yet, assign one randomly
      if (!order.salesforceId) {
        // Randomly assign one of the Salesforce IDs to create groups
        const randomSalesforceId = salesforceIds[Math.floor(Math.random() * salesforceIds.length)]
        
        const updatedOrder = {
          ...order,
          salesforceId: randomSalesforceId,
          dateModified: new Date().toISOString(),
        }
        await kv.set(`order:${order.id}`, updatedOrder)
        console.log(`Added Salesforce ID ${randomSalesforceId} to order ${order.id}`)
        migratedCount++
      }
    }
    
    console.log(`Migration complete. Added Salesforce IDs to ${migratedCount} orders out of ${orders.length} total.`)
    
    return c.json({ 
      success: true,
      message: 'Salesforce ID migration completed successfully',
      totalOrders: orders.length,
      migratedCount
    })
  } catch (error) {
    console.error('Error during Salesforce ID migration:', error)
    return c.json({ error: 'Migration failed', details: String(error) }, 500)
  }
})

// Migrate old photo status values to new ones
app.post('/make-server-b2ee3d82/migrate-photo-statuses', async (c) => {
  try {
    console.log('Starting photo status migration...')
    
    const statusMapping: Record<string, string> = {
      'not_needed': 'no_photos',
      'requested': 'photo_management',
      'logistics_transferred': 'logistics',
      'photographer_assigned': 'photographer',
      'photos_uploaded': 'photographer',
      'editing_completed': 'post_processing',
      // 'pending' stays 'pending'
      // 'completed' stays 'completed'
    }
    
    const orders = await kv.getByPrefix('order:')
    let migratedCount = 0
    
    for (const order of orders) {
      const oldStatus = order.photoStatus
      const newStatus = statusMapping[oldStatus] || oldStatus
      
      if (oldStatus !== newStatus) {
        const updatedOrder = {
          ...order,
          photoStatus: newStatus,
          dateModified: new Date().toISOString(),
        }
        await kv.set(`order:${order.id}`, updatedOrder)
        console.log(`Migrated order ${order.id}: ${oldStatus} -> ${newStatus}`)
        migratedCount++
      }
    }
    
    console.log(`Migration complete. Migrated ${migratedCount} orders out of ${orders.length} total.`)
    
    return c.json({ 
      success: true,
      message: 'Photo status migration completed successfully',
      totalOrders: orders.length,
      migratedCount
    })
  } catch (error) {
    console.error('Error during migration:', error)
    return c.json({ error: 'Migration failed', details: String(error) }, 500)
  }
})

// ================== PHOTO MANAGEMENT ==================

// Get orders for photo management (status = photo_management)
app.get('/make-server-b2ee3d82/photo-management-orders', async (c) => {
  try {
    console.log('Fetching orders for photo management...')
    const allOrders = await kv.getByPrefix('order:')
    
    // Filter orders with photo_management status
    const photoManagementOrders = allOrders.filter((order: any) => 
      order.photoStatus === 'photo_management'
    )
    
    // Transform to include photosPerRegion with correct regions
    const orders = photoManagementOrders.map((order: any) => {
      // Initialize photosPerRegion with correct region structure if not exists
      if (!order.photosPerRegion) {
        // Use the regions structure from order.regions if available
        const regions = order.regions || {}
        order.photosPerRegion = {
          wien: regions.wien ? 3 : 0,
          no: regions.no ? 2 : 0,
          bgld: regions.bgld ? 2 : 0,
          ooUsp: regions.ooUsp ? 2 : 0,
          ooWbr: regions.ooWbr ? 2 : 0,
          ooDgWels: regions.ooDgWels ? 1 : 0,
          stmkAnkuender: regions.stmkAnkuender ? 2 : 0,
          sProgressSalzburg: regions.sProgressSalzburg ? 2 : 0,
          tProgressTirol: regions.tProgressTirol ? 2 : 0,
          tSwg: regions.tSwg ? 2 : 0,
          tHwt: regions.tHwt ? 1 : 0,
          kPsg: regions.kPsg ? 2 : 0,
          vVorarlberg: regions.vVorarlberg ? 2 : 0,
          kartnig: regions.kartnig ? 2 : 0,
        }
        
        // Apply special customer multiplier if needed
        if (order.isSpecialCustomer) {
          Object.keys(order.photosPerRegion).forEach(key => {
            order.photosPerRegion[key] = Math.ceil(order.photosPerRegion[key] * 1.5)
          })
        }
      }
      
      // Extract first location info for display
      const firstLocation = order.selectedLocations?.[0] || {}
      
      return {
        id: order.id,
        auftrag: order.auftrag || '',
        auftraggeber: order.auftraggeber || '',
        wt: order.wt || '',
        auftragsnr: order.auftragsnr || '',
        laufzeitStart: order.laufzeitStart || '',
        laufzeitEnd: order.laufzeitEnd || '',
        startKW: order.startKW || 0,
        photoStatus: order.photoStatus || '',
        isSpecialCustomer: order.isSpecialCustomer || false,
        photoCount: order.photoCount || 0,
        sujetCount: order.sujetCount || 0,
        osaIds: order.osaIds || [],
        photosPerRegion: order.photosPerRegion,
        // Additional info fields
        infos: order.infos || '',
        produktbilderNurWien: order.produktbilderNurWien || false,
        // Foto-Termine
        fotowunschTermin: order.fotowunschTermin || '',
        fotoDurch: order.fotoDurch || '',
        fotoTermin: order.fotoTermin || '',
        fotografFirma: order.fotografFirma || '',
        fotografName: order.fotografName || '',
        dateCreated: order.dateCreated,
        dateModified: order.dateModified,
      }
    })
    
    console.log(`Found ${orders.length} photo management orders`)
    return c.json({ orders })
  } catch (error) {
    console.error('Error fetching photo management orders:', error)
    return c.json({ error: 'Failed to fetch photo management orders', details: String(error) }, 500)
  }
})

// Update photo counts per region for an order
app.put('/make-server-b2ee3d82/photo-management-orders/:id/photos', async (c) => {
  try {
    const id = c.req.param('id')
    const { photosPerRegion } = await c.req.json()
    
    console.log(`Updating photo counts for order ${id}:`, photosPerRegion)
    
    const order = await kv.get(`order:${id}`)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    // Calculate total photo count
    const totalPhotoCount = Object.values(photosPerRegion).reduce((sum: number, val: any) => sum + (val || 0), 0)
    
    const updatedOrder = {
      ...order,
      photosPerRegion,
      photoCount: totalPhotoCount,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    console.log(`✓ Updated photo counts for order ${id}. Total: ${totalPhotoCount}. photosPerRegion:`, updatedOrder.photosPerRegion)
    
    return c.json({ 
      success: true, 
      order: updatedOrder,
      message: 'Photo counts updated successfully'
    })
  } catch (error) {
    console.error('Error updating photo counts:', error)
    return c.json({ error: 'Failed to update photo counts', details: String(error) }, 500)
  }
})

// Update sujet count for an order
app.put('/make-server-b2ee3d82/photo-management-orders/:id/sujets', async (c) => {
  try {
    const id = c.req.param('id')
    const { sujetCount } = await c.req.json()
    
    const order = await kv.get(`order:${id}`)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    const updatedOrder = {
      ...order,
      sujetCount: sujetCount || 0,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    console.log(`Updated sujet count for order ${id}: ${sujetCount}`)
    
    return c.json({ 
      success: true, 
      order: updatedOrder,
      message: 'Sujet count updated successfully'
    })
  } catch (error) {
    console.error('Error updating sujet count:', error)
    return c.json({ error: 'Failed to update sujet count', details: String(error) }, 500)
  }
})

// Update total photo count (Gesamtfotos) for an order
app.put('/make-server-b2ee3d82/photo-management-orders/:id/gesamtfotos', async (c) => {
  try {
    const id = c.req.param('id')
    const { photoCount } = await c.req.json()
    
    const order = await kv.get(`order:${id}`)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }
    
    const updatedOrder = {
      ...order,
      photoCount: photoCount || 0,
      dateModified: new Date().toISOString(),
    }
    
    await kv.set(`order:${id}`, updatedOrder)
    console.log(`Updated total photo count for order ${id}: ${photoCount}`)
    
    return c.json({ 
      success: true, 
      order: updatedOrder,
      message: 'Total photo count updated successfully'
    })
  } catch (error) {
    console.error('Error updating total photo count:', error)
    return c.json({ error: 'Failed to update total photo count', details: String(error) }, 500)
  }
})

// ================== ORDER LINKING MANAGEMENT ==================

// Link orders together
app.post('/make-server-b2ee3d82/link-orders', async (c) => {
  try {
    const { orderIds, groupName } = await c.req.json()
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
      return c.json({ error: 'At least 2 order IDs are required' }, 400)
    }

    // Generate link group ID
    const linkGroupId = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Use provided group name or generate one from first order
    let finalGroupName = groupName
    if (!finalGroupName) {
      const firstOrder = await kv.get(`order:${orderIds[0]}`)
      finalGroupName = firstOrder?.auftraggeber 
        ? `${firstOrder.auftraggeber} - ${new Date().toLocaleDateString('de-DE')}`
        : `Verknüpfte Aufträge - ${new Date().toLocaleDateString('de-DE')}`
    }

    // Update all orders with the link group
    const updatedOrders = []
    for (const orderId of orderIds) {
      const order = await kv.get(`order:${orderId}`)
      if (!order) {
        console.log(`Order ${orderId} not found, skipping`)
        continue
      }

      const updatedOrder = {
        ...order,
        linkGroupId,
        linkGroupName: finalGroupName,
        dateModified: new Date().toISOString(),
      }

      await kv.set(`order:${orderId}`, updatedOrder)
      updatedOrders.push(updatedOrder)
    }

    console.log(`Linked ${updatedOrders.length} orders with group: ${finalGroupName}`)
    
    return c.json({ 
      message: 'Orders linked successfully',
      linkGroupId,
      linkGroupName: finalGroupName,
      linkedCount: updatedOrders.length
    })
  } catch (error) {
    console.log('Error linking orders:', error)
    return c.json({ error: 'Failed to link orders', details: String(error) }, 500)
  }
})

// Unlink order from group
app.post('/make-server-b2ee3d82/unlink-order', async (c) => {
  try {
    const { orderId } = await c.req.json()
    
    if (!orderId) {
      return c.json({ error: 'Order ID is required' }, 400)
    }

    const order = await kv.get(`order:${orderId}`)
    if (!order) {
      return c.json({ error: 'Order not found' }, 404)
    }

    const updatedOrder = {
      ...order,
      linkGroupId: undefined,
      linkGroupName: undefined,
      dateModified: new Date().toISOString(),
    }

    await kv.set(`order:${orderId}`, updatedOrder)
    
    return c.json({ 
      message: 'Order unlinked successfully',
      order: updatedOrder
    })
  } catch (error) {
    console.log('Error unlinking order:', error)
    return c.json({ error: 'Failed to unlink order', details: String(error) }, 500)
  }
})

// Get orders by Salesforce ID (linked orders)
app.get('/make-server-b2ee3d82/orders/salesforce/:salesforceId', async (c) => {
  try {
    const salesforceId = c.req.param('salesforceId')
    const allOrders = await kv.getByPrefix('order:')
    const linkedOrders = allOrders.filter((order: any) => order.salesforceId === salesforceId)
    
    console.log(`Found ${linkedOrders.length} orders for Salesforce ID: ${salesforceId}`)
    return c.json({ orders: linkedOrders })
  } catch (error) {
    console.log('Error fetching orders by Salesforce ID:', error)
    return c.json({ error: 'Failed to fetch linked orders', details: String(error) }, 500)
  }
})

// Get orders by link group ID (legacy - kept for compatibility)
app.get('/make-server-b2ee3d82/orders/link-group/:groupId', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const allOrders = await kv.getByPrefix('order:')
    const linkedOrders = allOrders.filter((order: any) => order.linkGroupId === groupId)
    
    console.log(`Found ${linkedOrders.length} orders for link group: ${groupId}`)
    return c.json({ orders: linkedOrders })
  } catch (error) {
    console.log('Error fetching linked orders:', error)
    return c.json({ error: 'Failed to fetch linked orders', details: String(error) }, 500)
  }
})

// Batch unlink orders
app.post('/make-server-b2ee3d82/orders/unlink', async (c) => {
  try {
    const { orderIds } = await c.req.json()
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return c.json({ error: 'Order IDs array is required' }, 400)
    }

    const updatedOrders = []
    for (const orderId of orderIds) {
      const order = await kv.get(`order:${orderId}`)
      if (!order) {
        console.log(`Order ${orderId} not found, skipping`)
        continue
      }

      const updatedOrder = {
        ...order,
        linkGroupId: undefined,
        linkGroupName: undefined,
        dateModified: new Date().toISOString(),
      }

      await kv.set(`order:${orderId}`, updatedOrder)
      updatedOrders.push(updatedOrder)
    }

    console.log(`Unlinked ${updatedOrders.length} orders`)
    return c.json({ 
      message: 'Orders unlinked successfully',
      unlinkedCount: updatedOrders.length
    })
  } catch (error) {
    console.log('Error batch unlinking orders:', error)
    return c.json({ error: 'Failed to unlink orders', details: String(error) }, 500)
  }
})

// Initialize test data
app.post('/make-server-b2ee3d82/init-test-data', async (c) => {
  try {
    const existingOrders = await kv.getByPrefix('order:')
    if (existingOrders.length > 0) {
      return c.json({ message: 'Test data already exists', count: existingOrders.length })
    }

    const testOrders = [
      {
        auftrag: 'Sommerkampagne 2026',
        auftraggeber: 'BILLA AG',
        wt: 'WT1',
        marke: 'BILLA',
        auftragsnr: 'V2026-001',
        laufzeitStart: '2026-03-01',
        laufzeitEnd: '2026-04-15',
        infos: 'Neue Frühlingsdeko mit Sonderaufsteller',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: false, ooUsp: true, ooWbr: false, ooDgWels: false, stmkAnkuender: true, sProgressSalzburg: false, tProgressTirol: false, tSwg: false, tHwt: false, kPsg: false, vVorarlberg: false },
        photoStatus: 'pending',
      },
      {
        auftrag: 'Winteraktion Spezial',
        auftraggeber: 'BIPA GmbH',
        wt: 'WT2',
        marke: 'BIPA',
        auftragsnr: 'V2026-002',
        laufzeitStart: '2026-02-15',
        laufzeitEnd: '2026-03-31',
        infos: 'Beauty-Promotion Winter',
        isNormalCustomer: false,
        isSpecialCustomer: true,
        produktbilderNurWien: true,
        regions: { wien: true, no: false, bgld: false, ooUsp: false, ooWbr: true, ooDgWels: false, stmkAnkuender: false, sProgressSalzburg: true, tProgressTirol: true, tSwg: false, tHwt: false, kPsg: true, vVorarlberg: false },
        photoStatus: 'photo_management',
      },
      {
        auftrag: 'Osteraktion 2026',
        auftraggeber: 'PENNY Markt',
        wt: 'WT3',
        marke: 'PENNY',
        auftragsnr: 'V2026-003',
        laufzeitStart: '2026-03-20',
        laufzeitEnd: '2026-04-05',
        infos: 'Osterdekorationen für alle Filialen',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: true, ooUsp: true, ooWbr: true, ooDgWels: true, stmkAnkuender: true, sProgressSalzburg: true, tProgressTirol: true, tSwg: true, tHwt: true, kPsg: true, vVorarlberg: true },
        photoStatus: 'pending',
      },
      {
        auftrag: 'Produktlaunch Sommer',
        auftraggeber: 'BILLA AG',
        wt: 'WT1',
        marke: 'BILLA Plus',
        auftragsnr: 'V2026-004',
        laufzeitStart: '2026-05-01',
        laufzeitEnd: '2026-06-15',
        infos: 'Neues Produktsortiment',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: false, ooUsp: false, ooWbr: false, ooDgWels: false, stmkAnkuender: true, sProgressSalzburg: false, tProgressTirol: false, tSwg: false, tHwt: false, kPsg: false, vVorarlberg: false },
        photoStatus: 'pending',
      },
    ]

    const createdOrders = []
    for (const orderData of testOrders) {
      const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const startKW = orderData.laufzeitStart ? getCalendarWeek(orderData.laufzeitStart) : null
      const photoCount = calculatePhotoCount(orderData.regions, orderData.isSpecialCustomer)
      
      const order = {
        id: orderId,
        ...orderData,
        startKW,
        photoCount,
        osaIds: [],
        selectedLocations: [],
        images: [],
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }
      
      await kv.set(`order:${orderId}`, order)
      createdOrders.push(order)
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.log(`Created ${createdOrders.length} test orders`)
    return c.json({ 
      message: 'Test data created successfully',
      count: createdOrders.length,
      orders: createdOrders
    })
  } catch (error) {
    console.log('Error creating test data:', error)
    return c.json({ error: 'Failed to create test data', details: String(error) }, 500)
  }
})

// Initialize campaigns (placeholder - campaigns are derived from orders)
app.post('/make-server-b2ee3d82/init-campaigns', async (c) => {
  try {
    console.log('Campaigns are derived from orders, no separate initialization needed.')
    return c.json({ 
      message: 'Campaigns are derived from orders automatically',
      campaigns: [],
      count: 0
    })
  } catch (error) {
    console.log('Error initializing campaigns:', error)
    return c.json({ error: 'Failed to initialize campaigns', details: String(error) }, 500)
  }
})

// Reset all data and re-initialize
app.post('/make-server-b2ee3d82/reset-and-init-data', async (c) => {
  try {
    console.log('Resetting all data...')
    
    // Delete all existing orders
    const existingOrders = await kv.getByPrefix('order:')
    for (const order of existingOrders) {
      await kv.del(`order:${order.id}`)
    }
    console.log(`Deleted ${existingOrders.length} existing orders`)
    
    // Delete all existing master locations
    const existingMasterLocations = await kv.getByPrefix('master-location:')
    for (const loc of existingMasterLocations) {
      await kv.del(`master-location:${loc.id}`)
    }
    console.log(`Deleted ${existingMasterLocations.length} existing master locations`)

    // Delete all existing assignments
    const existingAssignments = await kv.getByPrefix('assignment:')
    for (const assignment of existingAssignments) {
      const key = `assignment:${assignment.orderId}:${assignment.week}:${assignment.year}`
      await kv.del(key)
    }
    console.log(`Deleted ${existingAssignments.length} existing assignments`)
    
    // Re-create test orders
    const testOrders = [
      {
        auftrag: 'Sommerkampagne 2026',
        auftraggeber: 'BILLA AG',
        wt: 'WT1',
        marke: 'BILLA',
        auftragsnr: 'V2026-001',
        laufzeitStart: '2026-03-01',
        laufzeitEnd: '2026-04-15',
        infos: 'Neue Frühlingsdeko mit Sonderaufsteller',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: false, ooUsp: true, ooWbr: false, ooDgWels: false, stmkAnkuender: true, sProgressSalzburg: false, tProgressTirol: false, tSwg: false, tHwt: false, kPsg: false, vVorarlberg: false },
        photoStatus: 'pending',
      },
      {
        auftrag: 'Winteraktion Spezial',
        auftraggeber: 'BIPA GmbH',
        wt: 'WT2',
        marke: 'BIPA',
        auftragsnr: 'V2026-002',
        laufzeitStart: '2026-02-15',
        laufzeitEnd: '2026-03-31',
        infos: 'Beauty-Promotion Winter',
        isNormalCustomer: false,
        isSpecialCustomer: true,
        produktbilderNurWien: true,
        regions: { wien: true, no: false, bgld: false, ooUsp: false, ooWbr: true, ooDgWels: false, stmkAnkuender: false, sProgressSalzburg: true, tProgressTirol: true, tSwg: false, tHwt: false, kPsg: true, vVorarlberg: false },
        photoStatus: 'photo_management',
      },
      {
        auftrag: 'Osteraktion 2026',
        auftraggeber: 'PENNY Markt',
        wt: 'WT3',
        marke: 'PENNY',
        auftragsnr: 'V2026-003',
        laufzeitStart: '2026-03-20',
        laufzeitEnd: '2026-04-05',
        infos: 'Osterdekorationen fuer alle Filialen',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: true, ooUsp: true, ooWbr: true, ooDgWels: true, stmkAnkuender: true, sProgressSalzburg: true, tProgressTirol: true, tSwg: true, tHwt: true, kPsg: true, vVorarlberg: true },
        photoStatus: 'pending',
      },
      {
        auftrag: 'Produktlaunch Sommer',
        auftraggeber: 'BILLA AG',
        wt: 'WT1',
        marke: 'BILLA Plus',
        auftragsnr: 'V2026-004',
        laufzeitStart: '2026-05-01',
        laufzeitEnd: '2026-06-15',
        infos: 'Neues Produktsortiment',
        isNormalCustomer: true,
        isSpecialCustomer: false,
        produktbilderNurWien: false,
        regions: { wien: true, no: true, bgld: false, ooUsp: false, ooWbr: false, ooDgWels: false, stmkAnkuender: true, sProgressSalzburg: false, tProgressTirol: false, tSwg: false, tHwt: false, kPsg: false, vVorarlberg: false },
        photoStatus: 'pending',
      },
    ]

    const createdOrders = []
    for (const orderData of testOrders) {
      const orderId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const startKW = orderData.laufzeitStart ? getCalendarWeek(orderData.laufzeitStart) : null
      const photoCount = calculatePhotoCount(orderData.regions, orderData.isSpecialCustomer)
      
      const order = {
        id: orderId,
        ...orderData,
        startKW,
        photoCount,
        osaIds: [],
        selectedLocations: [],
        images: [],
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString(),
      }
      
      await kv.set(`order:${orderId}`, order)
      createdOrders.push(order)
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Re-create master locations with OSA IDs and BuFM/CoFM
    const masterLocationData = [
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5437', adresse: 'Stephansplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 1. Bezirk', plz: '1010', standortnummer: '5438', adresse: 'Graben 21', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Wien', gemeinde: 'Wien 2. Bezirk', plz: '1020', standortnummer: '5439', adresse: 'Prater Hauptallee 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90201', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Wien', gemeinde: 'Wien 3. Bezirk', plz: '1030', standortnummer: '5440', adresse: 'Landstraßer Hauptstr. 7', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '90301', tafelnummer: '4', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'St. Pölten', plz: '3100', standortnummer: '3215', adresse: 'Rathausplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30401', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Niederösterreich', gemeinde: 'Wiener Neustadt', plz: '2700', standortnummer: '3216', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'GEW', region: 'GEW', gemeindekennzeichen: '30454', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Oberösterreich', gemeinde: 'Linz', plz: '4020', standortnummer: '4128', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'USP', region: 'USP', gemeindekennzeichen: '40101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Oberösterreich', gemeinde: 'Wels', plz: '4600', standortnummer: '4129', adresse: 'Stadtplatz 1', unternehmen: 'Gewista', regionalCode: 'DGO', region: 'DGO', gemeindekennzeichen: '40604', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Steiermark', gemeinde: 'Graz', plz: '8010', standortnummer: '8234', adresse: 'Hauptplatz 1', unternehmen: 'Gewista', regionalCode: 'ANK', region: 'ANK', gemeindekennzeichen: '60101', tafelnummer: '1', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Salzburg', gemeinde: 'Salzburg', plz: '5020', standortnummer: '5167', adresse: 'Mozartplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '50101', tafelnummer: '2', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
      { bundesland: 'Tirol', gemeinde: 'Innsbruck', plz: '6020', standortnummer: '6045', adresse: 'Maria-Theresien-Straße 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '70101', tafelnummer: '3', buchungsformat: '24 TS', konstruktionsformat: '12', isBelegbildTauglich: true },
      { bundesland: 'Kärnten', gemeinde: 'Klagenfurt', plz: '9020', standortnummer: '9123', adresse: 'Alter Platz 1', unternehmen: 'Gewista', regionalCode: 'PSG', region: 'PSG', gemeindekennzeichen: '20101', tafelnummer: '1', buchungsformat: '12 TS', konstruktionsformat: '8', isBelegbildTauglich: false },
      { bundesland: 'Vorarlberg', gemeinde: 'Bregenz', plz: '6900', standortnummer: '6712', adresse: 'Kornmarktplatz 1', unternehmen: 'Gewista', regionalCode: 'PSB', region: 'PSB', gemeindekennzeichen: '80101', tafelnummer: '2', buchungsformat: '24 TS', konstruktionsformat: '8', isBelegbildTauglich: true },
    ]
    for (const locData of masterLocationData) {
      const locationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const osaId = computeOsaId(locData.gemeindekennzeichen, locData.regionalCode, locData.standortnummer, locData.tafelnummer)
      await kv.set(`master-location:${locationId}`, { id: locationId, ...locData, osaId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    console.log(`Reset complete. Created ${createdOrders.length} new test orders and ${masterLocationData.length} master locations`)
    return c.json({
      success: true,
      message: 'Data reset and re-initialized successfully',
      count: createdOrders.length,
      orders: createdOrders
    })
  } catch (error) {
    console.error('Error resetting data:', error)
    return c.json({ error: 'Failed to reset data', details: String(error) }, 500)
  }
})

// Add a specific location to all orders
app.post('/make-server-b2ee3d82/admin/add-location-to-all-orders', async (c) => {
  try {
    const TARGET_OSA_ID = '41002.008.02353_001'
    const TARGET_GKZ = '41002'
    const TARGET_REGIONAL_CODE = 'USP-008'
    const TARGET_STANDORTNUMMER = '2353'
    const TARGET_TAFELNUMMER = '1'

    // Find or create the master location
    const allMasterLocations = await kv.getByPrefix('master-location:')
    let targetLocation = allMasterLocations.find((loc: any) => loc.osaId === TARGET_OSA_ID)

    if (!targetLocation) {
      const locationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      targetLocation = {
        id: locationId,
        bundesland: 'Oberösterreich',
        gemeinde: 'Enns',
        plz: '4470',
        standortnummer: TARGET_STANDORTNUMMER,
        adresse: '',
        regionalCode: TARGET_REGIONAL_CODE,
        gemeindekennzeichen: TARGET_GKZ,
        tafelnummer: TARGET_TAFELNUMMER,
        osaId: TARGET_OSA_ID,
        unternehmen: 'USP',
        region: 'USP-008',
        suitableForOccupancyPhoto: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await kv.set(`master-location:${locationId}`, targetLocation)
      console.log('Created new master location:', TARGET_OSA_ID)
    } else {
      console.log('Found existing master location:', TARGET_OSA_ID)
    }

    // Add location to all orders
    const allOrders = await kv.getByPrefix('order:')
    let updatedCount = 0

    for (const order of allOrders) {
      const existingLocationIds: string[] = order.selectedLocationIds || []
      const existingLocations: any[] = order.selectedLocations || []

      const alreadyAssigned = existingLocationIds.includes(targetLocation.id) ||
        existingLocations.some((l: any) => l.id === targetLocation.id || l.osaId === TARGET_OSA_ID)

      if (!alreadyAssigned) {
        const updatedOrder = {
          ...order,
          selectedLocationIds: [...existingLocationIds, targetLocation.id],
          selectedLocations: [...existingLocations, targetLocation],
          dateModified: new Date().toISOString(),
        }
        await kv.set(`order:${order.id}`, updatedOrder)
        updatedCount++
        console.log(`Added location ${TARGET_OSA_ID} to order ${order.id}`)
      }
    }

    return c.json({
      success: true,
      message: `Standort ${TARGET_OSA_ID} zu ${updatedCount} Aufträgen hinzugefügt`,
      location: targetLocation,
      updatedOrders: updatedCount,
      totalOrders: allOrders.length,
    })
  } catch (error) {
    console.error('Error adding location to all orders:', error)
    return c.json({ error: 'Failed to add location to orders', details: String(error) }, 500)
  }
})

Deno.serve(app.fetch)