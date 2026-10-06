import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { CircleAlert as AlertCircle, RefreshCw, Database, MapPin } from 'lucide-react'
import {
  getMasterLocations,
  getCampaigns,
  getOccupancyPeriods,
} from '../utils/api'

export function DataReset() {
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false)
  const [isInitLocations, setIsInitLocations] = useState(false)
  const [isInitCampaigns, setIsInitCampaigns] = useState(false)
  const [isMigratingIds, setIsMigratingIds] = useState(false)

  // Initialize master locations (no-op: test-data seeding not supported via direct DB API)
  const initMasterLocations = async () => {
    setIsInitLocations(true)
    setMessage('Erstelle Master-Standorte...')

    try {
      setMessage('ℹ️ Testdaten-Seeding wird von der direkten Datenbank-API nicht unterstützt.')
    } catch (error) {
      console.error('Error initializing master locations:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInitLocations(false)
    }
  }

  // Initialize campaigns with location assignments (no-op: test-data seeding not supported via direct DB API)
  const initCampaigns = async () => {
    setIsInitCampaigns(true)
    setMessage('Erstelle Kampagnen mit Standort-Zuordnungen...')

    try {
      setMessage('ℹ️ Testdaten-Seeding wird von der direkten Datenbank-API nicht unterstützt.')
    } catch (error) {
      console.error('Error initializing campaigns:', error)
      setMessage(`❌ Fehler: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInitCampaigns(false)
    }
  }

  // Initialize everything in order (no-op: test-data seeding not supported via direct DB API)
  const initAll = async () => {
    setIsResetting(true)
    setMessage('Initialisiere alle Testdaten...')

    try {
      setMessage('ℹ️ Testdaten-Seeding wird von der direkten Datenbank-API nicht unterstützt.')
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
      console.log('Testing occupancy-periods...')
      const periodsData = await getOccupancyPeriods()
      console.log('occupancy-periods data:', periodsData)

      // Test 2: master-locations GET
      console.log('Testing master-locations...')
      const locationsData = await getMasterLocations()
      console.log('master-locations data:', locationsData)

      // Test 3: campaigns GET
      console.log('Testing campaigns...')
      const campaignsData = await getCampaigns()
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
      // No dedicated reset-and-init-data endpoint in the direct DB API; this is a no-op.
      setMessage('ℹ️ Daten-Reset wird von der direkten Datenbank-API nicht unterstützt.')
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
      // No dedicated add-salesforce-ids endpoint in the direct DB API; this is a no-op.
      setMessage('ℹ️ Salesforce ID Migration wird von der direkten Datenbank-API nicht unterstützt.')
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