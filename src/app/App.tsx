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
  getOrders,
  createOrder as apiCreateOrder,
  updateOrder as apiUpdateOrder,
  deleteOrder as apiDeleteOrder,
  updatePhotoStatus as apiUpdatePhotoStatus,
  getOccupancyPeriods,
  getPhotographers,
  getMasterLocations,
  getCampaigns,
} from "./utils/api";

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
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [returnToTab, setReturnToTab] = useState<string>("orders");
  const tabListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await getOrders();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      const data = await apiCreateOrder(orderData);
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

  const handleUpdateOrder = async (orderData: Partial<Order>) => {
    if (!selectedOrder) return;
    try {
      const data = await apiUpdateOrder(selectedOrder.id, orderData);
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
      await apiDeleteOrder(orderId);
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

  const handlePhotoStatusChange = async (orderId: string, status: string) => {
    try {
      const data = await apiUpdatePhotoStatus(orderId, status);
      const statusText =
        status === "requested"
          ? "Fotos angefordert"
          : "Keine Fotos benötigt";
      toast.success("Foto-Status aktualisiert", {
        description: statusText,
      });
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

  const addLocationToAllOrders = async () => {
    toast.info("Funktion nicht verfügbar im direkten Datenbankmodus");
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
