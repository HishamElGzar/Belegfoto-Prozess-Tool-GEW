import { useState, useEffect, useRef } from "react";
import { OrderDashboard } from "./components/OrderDashboard";
import { OrderForm } from "./components/OrderForm";
import { ExportDialog } from "./components/ExportDialog";
import { PhotographerAssignment } from "./components/PhotographerAssignment";
import { LocationManagement } from "./components/LocationManagement";
import { CampaignLocationSelection } from "./components/CampaignLocationSelection";
import { PhotoManagementView } from "./components/PhotoManagementView";
import { PhotoArrivalCheckView } from "./components/PhotoArrivalCheckView";
import { DataReset } from "./components/DataReset";
import { AdminLocationAction } from "./components/AdminLocationAction";
import { RegionalPhotoExport } from "./components/RegionalPhotoExport";
import { PhotographerMobileView } from "./components/PhotographerMobileView";
import { Toaster, toast } from "sonner";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Camera, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import {
  projectId,
  publicAnonKey,
} from "./utils/supabase/info";

interface SelectedLocation {
  periodId: string;
  periodDates: string;
  locationId: string;
  bundesland: string;
  gemeinde: string;
  plz: string;
  standortnummer: string;
  adresse: string;
}

interface ImageData {
  id: string;
  name: string;
  url: string;
  storagePath?: string;
  uploadedAt: string;
}

interface Order {
  id: string;
  auftrag: string;
  auftraggeber: string;
  wt: string;
  marke: string;
  sujet: string;
  auftragsnr: string;
  laufzeitStart: string;
  laufzeitEnd: string;
  startKW: number;
  photoCount: number;
  infos: string;
  isNormalCustomer: boolean;
  isSpecialCustomer: boolean;
  produktbilderNurWien: boolean;
  regions: Record<string, boolean>;
  osaIds: string[];
  selectedLocations: SelectedLocation[];
  images: ImageData[];
  photoStatus: string;
  salesforceId?: string;
  sharelink?: string;
  dateCreated: string;
  dateModified: string;
}

type ViewMode = "dashboard" | "create" | "edit" | "view";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewMode, setViewMode] =
    useState<ViewMode>("dashboard");
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [returnToTab, setReturnToTab] = useState<string>("orders");
  const tabListRef = useRef<HTMLDivElement>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/server/make-server-b2ee3d82`;

  useEffect(() => {
    // Run migration first, then fetch orders
    const initialize = async () => {
      await migratePhotoStatuses();
      await migrateMasterLocations();
      await fetchOrders();
      await initializeData();
      await addLocationToAllOrders().catch((e) =>
        console.error("Error adding location to all orders:", e)
      );
    };
    initialize();
  }, []);

  const initializeApp = async () => {
    await fetchOrders();
    // Initialize test data if no orders exist
    const response = await fetch(`${serverUrl}/orders`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (!data.orders || data.orders.length === 0) {
      await initializeTestData();
    }
    
    // Initialize occupancy period data if none exists
    await initializeData();
  };

  const initializeData = async () => {
    // Initialize occupancy periods if none exist
    const periodsResponse = await fetch(`${serverUrl}/occupancy-periods`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    
    let periodsData = { periods: [] };
    if (periodsResponse.ok) {
      periodsData = await periodsResponse.json();
    }
    
    if (!periodsData.periods || periodsData.periods.length === 0) {
      console.log('Initializing occupancy data...');
      await fetch(`${serverUrl}/init-occupancy-data`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
    }

    // Initialize photographers if none exist
    const photographersResponse = await fetch(`${serverUrl}/photographers`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    
    let photographersData = { photographers: [] };
    if (photographersResponse.ok) {
      photographersData = await photographersResponse.json();
    }
    
    if (!photographersData.photographers || photographersData.photographers.length === 0) {
      console.log('Initializing photographers...');
      await fetch(`${serverUrl}/init-photographers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
    }

    // Initialize master locations if none exist
    const masterLocationsResponse = await fetch(`${serverUrl}/master-locations`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    
    let masterLocationsData = { locations: [] };
    if (masterLocationsResponse.ok) {
      masterLocationsData = await masterLocationsResponse.json();
    }
    
    if (!masterLocationsData.locations || masterLocationsData.locations.length === 0) {
      console.log('Initializing master locations...');
      await fetch(`${serverUrl}/init-master-locations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
    }

    // Initialize campaigns if none exist
    const campaignsResponse = await fetch(`${serverUrl}/campaigns`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });
    
    let campaignsData = { campaigns: [] };
    if (campaignsResponse.ok) {
      campaignsData = await campaignsResponse.json();
    }
    
    if (!campaignsData.campaigns || campaignsData.campaigns.length === 0) {
      console.log('Initializing campaigns...');
      await fetch(`${serverUrl}/init-campaigns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
    }
  };

  const initializeTestData = async () => {
    try {
      const response = await fetch(
        `${serverUrl}/init-test-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to initialize test data");
      }

      const data = await response.json();
      console.log("Test data initialized:", data.message);
      await fetchOrders();
      toast.success("Testdaten wurden geladen", {
        description: `${data.count} Aufträge wurden erstellt.`,
      });
    } catch (error) {
      console.error("Error initializing test data:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await fetch(`${serverUrl}/orders`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const migrateMasterLocations = async () => {
    try {
      await fetch(`${serverUrl}/migrate-master-locations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
    } catch (error) {
      console.error('Error migrating master locations:', error);
    }
  };

  const addLocationToAllOrders = async () => {
    const response = await fetch(`${serverUrl}/admin/add-location-to-all-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    const data = await response.json();
    console.log(`Standort 41002.008.02353_001: ${data.message}`);
    if (data.updatedOrders > 0) {
      toast.success(`Standort hinzugefügt`, {
        description: `41002.008.02353_001 wurde zu ${data.updatedOrders} Aufträgen hinzugefügt.`,
      });
    }
    await fetchOrders();
  };

  // Migrate photo statuses on first load
  const migratePhotoStatuses = async () => {
    try {
      const response = await fetch(`${serverUrl}/migrate-photo-statuses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        console.error("Migration failed");
        return;
      }

      const data = await response.json();
      if (data.migratedCount > 0) {
        console.log(`Migrated ${data.migratedCount} orders to new photo statuses`);
      }
    } catch (error) {
      console.error("Error migrating photo statuses:", error);
    }
  };

  const handleCreateOrder = async (
    orderData: Partial<Order>,
  ) => {
    try {
      const response = await fetch(`${serverUrl}/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to create order",
        );
      }

      const data = await response.json();
      toast.success("Auftrag erfolgreich erstellt", {
        description: `Auftrag "${data.order.auftrag}" wurde angelegt.`,
      });

      await fetchOrders();
      setViewMode("dashboard");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Fehler beim Erstellen des Auftrags", {
        description: String(error),
      });
    }
  };

  const handleUpdateOrder = async (
    orderData: Partial<Order>,
  ) => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(
        `${serverUrl}/orders/${selectedOrder.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to update order",
        );
      }

      const data = await response.json();
      toast.success("Auftrag erfolgreich aktualisiert", {
        description: `Auftrag "${data.order.auftrag}" wurde gespeichert.`,
      });

      await fetchOrders();
      setViewMode("dashboard");
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Fehler beim Aktualisieren des Auftrags", {
        description: String(error),
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(
        `${serverUrl}/orders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to delete order",
        );
      }

      toast.success("Auftrag erfolgreich gelöscht");
      await fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Fehler beim Löschen des Auftrags", {
        description: String(error),
      });
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewMode("view");
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewMode("edit");
  };

  const handleExport = () => {
    setShowExport(true);
  };

  const handlePhotoStatusChange = async (
    orderId: string,
    status: string,
  ) => {
    try {
      const response = await fetch(
        `${serverUrl}/orders/${orderId}/photo-status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoStatus: status }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to update photo status",
        );
      }

      const data = await response.json();
      const statusText =
        status === "requested"
          ? "Fotos angefordert"
          : "Keine Fotos benötigt";
      toast.success("Foto-Status aktualisiert", {
        description: statusText,
      });

      // Update the selected order immediately (only if in view/edit mode)
      if (selectedOrder && selectedOrder.id === orderId && viewMode !== 'dashboard') {
        setSelectedOrder(data.order);
      }

      await fetchOrders();
    } catch (error) {
      console.error("Error updating photo status:", error);
      toast.error("Fehler beim Aktualisieren des Foto-Status", {
        description: String(error),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/20">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg">
            Lade Aufträge...
          </p>
        </div>
      </div>
    );
  }

  if (loadError && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Verbindung fehlgeschlagen</h2>
          <p className="text-muted-foreground mb-6">
            Die Aufträge konnten nicht geladen werden. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.
          </p>
          <Button onClick={() => fetchOrders()} size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  // Fotografen-App gets full screen, no desktop chrome
  if (viewMode === "dashboard" && returnToTab === "photographer-app") {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100">
        <PhotographerMobileView
          orders={orders}
          onExit={() => setReturnToTab("orders")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
      {/* Header */}
      {viewMode === "dashboard" && (
        <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
          <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl font-semibold leading-tight">Gewista Fotomanager</h1>
                <p className="text-white/70 text-sm leading-tight">Auftrags- und Fotoverwaltung</p>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="container mx-auto p-4 sm:p-6">
        {viewMode === "dashboard" ? (
          <Tabs value={returnToTab} onValueChange={setReturnToTab} className="space-y-6">
            <div ref={tabListRef} className="overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-max">
                <TabsTrigger value="orders">Aufträge</TabsTrigger>
                <TabsTrigger value="photo-management">Fotomanagement</TabsTrigger>
                <TabsTrigger value="campaigns">Kampagnen & Standorte</TabsTrigger>
                <TabsTrigger value="logistics">Fotografen-Zuweisung</TabsTrigger>
                <TabsTrigger value="regional-export">Regionaler Export</TabsTrigger>
                <TabsTrigger value="photographer-app">Fotografen-App</TabsTrigger>
                <TabsTrigger value="photo-arrival">Foto-Eingang</TabsTrigger>
                <TabsTrigger value="locations">Standorte verwalten</TabsTrigger>
                <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="orders">
              <OrderDashboard
                orders={orders}
                onCreateNew={() => {
                  setSelectedOrder(null);
                  setViewMode("create");
                }}
                onViewOrder={handleViewOrder}
                onEditOrder={handleEditOrder}
                onDeleteOrder={handleDeleteOrder}
                onExport={handleExport}
                onPhotoStatusChange={handlePhotoStatusChange}
                onRefreshOrders={fetchOrders}
              />
            </TabsContent>

            <TabsContent value="campaigns">
              <CampaignLocationSelection />
            </TabsContent>

            <TabsContent value="photo-management">
              <PhotoManagementView 
                onViewOrder={(orderId) => {
                  const order = orders.find(o => o.id === orderId);
                  if (order) {
                    setReturnToTab("photo-management");
                    setSelectedOrder(order);
                    setViewMode("view");
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="photo-arrival">
              <PhotoArrivalCheckView
                onViewOrder={(orderId) => {
                  const order = orders.find(o => o.id === orderId);
                  if (order) {
                    setReturnToTab("photo-arrival");
                    setSelectedOrder(order);
                    setViewMode("view");
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="logistics">
              <PhotographerAssignment
                orders={orders}
                onRefresh={fetchOrders}
              />
            </TabsContent>

            <TabsContent value="regional-export">
              <RegionalPhotoExport orders={orders} />
            </TabsContent>

            <TabsContent value="locations">
              <LocationManagement />
            </TabsContent>

            <TabsContent value="settings">
              <div className="max-w-2xl space-y-6">
                <DataReset />
                <AdminLocationAction
                  onAddLocation={addLocationToAllOrders}
                  orders={orders}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        {viewMode === "create" && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setViewMode("dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold">Neuer Auftrag</h1>
            </div>
            <OrderForm
              onSave={handleCreateOrder}
              onCancel={() => setViewMode("dashboard")}
            />
          </div>
        )}

        {viewMode === "edit" && selectedOrder && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setViewMode("dashboard"); setSelectedOrder(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold">Auftrag bearbeiten</h1>
            </div>
            <OrderForm
              order={selectedOrder}
              onSave={handleUpdateOrder}
              onCancel={() => {
                setViewMode("dashboard");
                setSelectedOrder(null);
              }}
            />
          </div>
        )}

        {viewMode === "view" && selectedOrder && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => { setViewMode("dashboard"); setSelectedOrder(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold">Auftrag ansehen</h1>
            </div>
            <OrderForm
              order={selectedOrder}
              onSave={() => {}}
              onCancel={() => {
                setViewMode("dashboard");
                setSelectedOrder(null);
              }}
              onPhotoStatusChange={handlePhotoStatusChange}
              readOnly
            />
          </div>
        )}

        <ExportDialog
          open={showExport}
          onClose={() => setShowExport(false)}
          orders={orders}
        />
      </div>

      <Toaster position="top-right" />
    </div>
  );
}