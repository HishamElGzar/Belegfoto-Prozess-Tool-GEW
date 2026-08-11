import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, RefreshCw, Database, MapPin } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

export function DataReset() {
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false)
  const [isInitLocations, setIsInitLocations] = useState(false)
  const [isInitCampaigns, setIsInitCampaigns] = useState(false)
  const [isMigratingIds, setIsMigratingIds] = useState(false)

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`
  
  // Initialize master locations
  const initMasterLocations = async () => {
    setIsInitLocations(true)
    setMessage('Erstelle Master-Standorte...')
    
    try {
      const response = await fetch(`${serverUrl}/init-master-locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      
      const data = await response.json()
      console.log('init-master-locations response:', data)
      
      if (data.error) {
        setMessage(`❌ Fehler: ${data.error}`)
      } else {
        setMessage(`✅ ${data.count} Master-Standorte erfolgreich erstellt!`)
      }
    } catch (error) {
      console.error('Error initializing master locations:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInitLocations(false)
    }
  }
  
  // Initialize campaigns with location assignments
  const initCampaigns = async () => {
    setIsInitCampaigns(true)
    setMessage('Erstelle Kampagnen mit Standort-Zuordnungen...')
    
    try {
      const response = await fetch(`${serverUrl}/init-campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      
      const data = await response.json()
      console.log('init-campaigns response:', data)
      
      if (data.error) {
        setMessage(`❌ Fehler: ${data.error}`)
      } else {
        const locationCount = data.campaigns.reduce((sum: number, c: any) => sum + (c.selectedLocationIds?.length || 0), 0)
        setMessage(`✅ ${data.count} Kampagnen mit insgesamt ${locationCount} Standort-Zuordnungen erstellt!`)
      }
    } catch (error) {
      console.error('Error initializing campaigns:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInitCampaigns(false)
    }
  }
  
  // Initialize everything in order
  const initAll = async () => {
    setIsResetting(true)
    setMessage('Initialisiere alle Testdaten...')
    
    try {
      // Step 1: Initialize master locations
      setMessage('Schritt 1/2: Erstelle Master-Standorte...')
      const locResponse = await fetch(`${serverUrl}/init-master-locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      const locData = await locResponse.json()
      console.log('Master locations initialized:', locData)
      
      if (locData.error) {
        setMessage(`❌ Fehler beim Erstellen der Standorte: ${locData.error}`)
        return
      }
      
      // Step 2: Initialize campaigns with assigned locations
      setMessage('Schritt 2/2: Erstelle Kampagnen mit Standort-Zuordnungen...')
      const campResponse = await fetch(`${serverUrl}/init-campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      const campData = await campResponse.json()
      console.log('Campaigns initialized:', campData)
      
      if (campData.error) {
        setMessage(`❌ Fehler beim Erstellen der Kampagnen: ${campData.error}`)
        return
      }
      
      const locationCount = campData.campaigns.reduce((sum: number, c: any) => sum + (c.selectedLocationIds?.length || 0), 0)
      setMessage(`✅ Erfolgreich erstellt: ${locData.count} Standorte und ${campData.count} Kampagnen mit ${locationCount} Zuordnungen!`)
      
    } catch (error) {
      console.error('Error initializing all data:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsResetting(false)
    }
  }

  const testEndpoints = async () => {
    setIsTestingEndpoints(true)
    setMessage('Testing endpoints...')
    
    try {
      // Test 1: occupancy-periods GET
      console.log('Testing GET /occupancy-periods...')
      const periodsResponse = await fetch(`${serverUrl}/occupancy-periods`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      console.log('occupancy-periods status:', periodsResponse.status)
      const periodsData = await periodsResponse.json()
      console.log('occupancy-periods data:', periodsData)
      
      // Test 2: master-locations GET
      console.log('Testing GET /master-locations...')
      const locationsResponse = await fetch(`${serverUrl}/master-locations`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      console.log('master-locations status:', locationsResponse.status)
      const locationsData = await locationsResponse.json()
      console.log('master-locations data:', locationsData)
      
      // Test 3: campaigns GET
      console.log('Testing GET /campaigns...')
      const campaignsResponse = await fetch(`${serverUrl}/campaigns`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      console.log('campaigns status:', campaignsResponse.status)
      const campaignsData = await campaignsResponse.json()
      console.log('campaigns data:', campaignsData)
      
      setMessage(`✅ Endpunkte OK! Standorte: ${locationsData.locations?.length || 0}, Kampagnen: ${campaignsData.campaigns?.length || 0}`)
    } catch (error) {
      console.error('Endpoint test error:', error)
      setMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsTestingEndpoints(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Möchten Sie wirklich alle Daten zurücksetzen und neue Testdaten laden? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    setIsResetting(true)
    setMessage('Lösche alte Daten und lade neue Testdaten...')

    try {
      // Call the reset endpoint that deletes all old data and creates new test data
      const resetResponse = await fetch(`${serverUrl}/reset-and-init-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      })

      const resetData = await resetResponse.json()
      
      if (resetData.error) {
        setMessage(`Fehler: ${resetData.error}`)
        console.error('Reset error:', resetData)
        return
      }

      setMessage(`✓ ${resetData.count || 0} neue Aufträge erfolgreich geladen!`)
      setTimeout(() => {
        // onComplete()
      }, 1500)
    } catch (error) {
      console.error('Error resetting data:', error)
      setMessage(`Fehler beim Zurücksetzen der Daten: ${error}`)
    } finally {
      setIsResetting(false)
    }
  }

  const migrateSalesforceIds = async () => {
    setIsMigratingIds(true)
    setMessage('Füge Salesforce IDs zu bestehenden Aufträgen hinzu...')
    
    try {
      const response = await fetch(`${serverUrl}/add-salesforce-ids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      })
      
      const data = await response.json()
      console.log('Salesforce ID migration response:', data)
      
      if (data.error) {
        setMessage(`❌ Fehler: ${data.error}`)
      } else {
        setMessage(`✅ Salesforce IDs zu ${data.migratedCount} von ${data.totalOrders} Aufträgen hinzugefügt!`)
        // Reload page to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error('Error migrating Salesforce IDs:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsMigratingIds(false)
    }
  }

  return (
    <Card className="border-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="h-5 w-5" />
          Daten initialisieren
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Erstellen Sie Testdaten für Master-Standorte und Kampagnen mit Zuordnungen.
        </p>
        
        {message && (
          <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-line">
            {message}
          </div>
        )}
        
        <div className="space-y-2">
          <div className="font-semibold text-sm">Schnellstart (empfohlen):</div>
          <Button
            onClick={initAll}
            disabled={isResetting}
            variant="default"
            className="w-full"
          >
            <Database className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Initialisiere...' : 'Alle Testdaten erstellen'}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="font-semibold text-sm">Einzelne Schritte:</div>
          
          <Button
            onClick={initMasterLocations}
            disabled={isInitLocations}
            variant="secondary"
            className="w-full"
          >
            <MapPin className={`h-4 w-4 mr-2 ${isInitLocations ? 'animate-spin' : ''}`} />
            {isInitLocations ? 'Erstelle Standorte...' : '1. Master-Standorte erstellen'}
          </Button>

          <Button
            onClick={initCampaigns}
            disabled={isInitCampaigns}
            variant="secondary"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isInitCampaigns ? 'animate-spin' : ''}`} />
            {isInitCampaigns ? 'Erstelle Kampagnen...' : '2. Kampagnen erstellen'}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Button
            onClick={testEndpoints}
            disabled={isTestingEndpoints}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTestingEndpoints ? 'animate-spin' : ''}`} />
            {isTestingEndpoints ? 'Teste Endpunkte...' : 'Endpunkte testen'}
          </Button>

          <Button
            onClick={handleReset}
            disabled={isResetting}
            variant="destructive"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Wird zurückgesetzt...' : 'Alte Aufträge zurücksetzen'}
          </Button>

          <Button
            onClick={migrateSalesforceIds}
            disabled={isMigratingIds}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isMigratingIds ? 'animate-spin' : ''}`} />
            {isMigratingIds ? 'Migriere IDs...' : 'Salesforce IDs migrieren'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}