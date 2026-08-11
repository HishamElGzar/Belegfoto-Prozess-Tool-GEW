import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MapPin, CheckCircle2, AlertCircle } from "lucide-react";

const TARGET_OSA_ID = "41002.008.02353_001";

interface Order {
  id: string;
  auftrag: string;
  auftraggeber: string;
  selectedLocations?: any[];
  selectedLocationIds?: string[];
}

interface AdminLocationActionProps {
  onAddLocation: () => Promise<void>;
  orders: Order[];
}

export function AdminLocationAction({ onAddLocation, orders }: AdminLocationActionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordersWithLocation = orders.filter((o) =>
    o.selectedLocations?.some(
      (l: any) => l.osaId === TARGET_OSA_ID || l.standortnummer === "2353"
    )
  );

  const handleAdd = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      await onAddLocation();
      setResult(`Standort ${TARGET_OSA_ID} wurde zu allen Aufträgen hinzugefügt.`);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Admin: Standort zu allen Aufträgen hinzufügen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-md text-sm">
          <div className="font-medium mb-1">Ziel-Standort (OSA-ID):</div>
          <code className="text-primary font-mono">{TARGET_OSA_ID}</code>
          <div className="text-muted-foreground mt-1 text-xs">
            Enns, Oberösterreich · Standortnr. 2353 · Tafel 1
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Status in Aufträgen:</div>
          {orders.length === 0 ? (
            <div className="text-sm text-muted-foreground">Keine Aufträge geladen.</div>
          ) : (
            orders.map((order) => {
              const hasLocation =
                order.selectedLocations?.some(
                  (l: any) => l.osaId === TARGET_OSA_ID || l.standortnummer === "2353"
                ) ?? false;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2 border rounded-md text-sm"
                >
                  <div>
                    <span className="font-medium">{order.auftrag || order.id}</span>
                    {order.auftraggeber && (
                      <span className="text-muted-foreground ml-2 text-xs">{order.auftraggeber}</span>
                    )}
                  </div>
                  {hasLocation ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <CheckCircle2 className="h-3 w-3" /> Vorhanden
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Fehlt
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            {result}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            Fehler: {error}
          </div>
        )}

        <Button onClick={handleAdd} disabled={loading} className="w-full">
          {loading ? "Wird hinzugefügt..." : `Standort ${TARGET_OSA_ID} zu allen Aufträgen hinzufügen`}
        </Button>
      </CardContent>
    </Card>
  );
}
