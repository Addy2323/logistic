import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Navigation, Compass } from "lucide-react";
import { toast } from "sonner";

// Fix default icon issues
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for Pickup and Delivery to make them stand out
const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface DeliveryRouteMapProps {
    pickupLat: number | null;
    pickupLng: number | null;
    pickupAddress: string;
    deliveryLat: number | null;
    deliveryLng: number | null;
    deliveryAddress: string;
}

// Controller to auto-focus map to fit both pickup and delivery bounds
const MapBoundsController = ({ pickup, delivery }: { pickup: [number, number]; delivery: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 300);
        return () => clearTimeout(timer);
    }, [map]);

    useEffect(() => {
        if (pickup && delivery) {
            const bounds = L.latLngBounds([pickup, delivery]);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        }
    }, [pickup, delivery, map]);
    return null;
};

const DeliveryRouteMap = ({
    pickupLat,
    pickupLng,
    pickupAddress,
    deliveryLat,
    deliveryLng,
    deliveryAddress
}: DeliveryRouteMapProps) => {
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
    const [loading, setLoading] = useState(false);
    const [distance, setDistance] = useState<string | null>(null);
    const [duration, setDuration] = useState<string | null>(null);

    // Validate coordinates are within Tanzania
    const isValidCoordinate = (lat: number | null, lng: number | null) => {
        if (lat === null || lng === null) return false;
        return lat >= -11.76 && lat <= -0.98 && lng >= 29.32 && lng <= 40.44;
    };

    const hasPickup = isValidCoordinate(pickupLat, pickupLng);
    const hasDelivery = isValidCoordinate(deliveryLat, deliveryLng);

    useEffect(() => {
        if (!hasPickup || !hasDelivery) {
            setRouteCoords([]);
            return;
        }

        const fetchOSRMRoute = async () => {
            setLoading(true);
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.code === "Ok" && data.routes && data.routes.length > 0) {
                    const osrmRoute = data.routes[0];
                    const geojsonCoords = osrmRoute.geometry.coordinates;
                    // OSRM returns coordinates as [lng, lat], Leaflet expects [lat, lng]
                    const parsedCoords: [number, number][] = geojsonCoords.map((coord: number[]) => [coord[1], coord[0]]);
                    setRouteCoords(parsedCoords);

                    // Set distance and duration
                    const distKm = (osrmRoute.distance / 1000).toFixed(1);
                    const durMins = Math.round(osrmRoute.duration / 60);
                    setDistance(`${distKm} km`);
                    setDuration(`${durMins} mins`);
                } else {
                    throw new Error("OSRM routing returned invalid status");
                }
            } catch (err) {
                console.warn("OSRM Routing API failed, falling back to straight-line polyline:", err);
                // Fallback to direct straight line
                setRouteCoords([
                    [pickupLat as number, pickupLng as number],
                    [deliveryLat as number, deliveryLng as number]
                ]);
                setDistance(null);
                setDuration(null);
            } finally {
                setLoading(false);
            }
        };

        fetchOSRMRoute();
    }, [pickupLat, pickupLng, deliveryLat, deliveryLng, hasPickup, hasDelivery]);

    if (!hasPickup || !hasDelivery) {
        return (
            <div className="flex flex-col items-center justify-center h-48 bg-muted/40 border border-border/50 rounded-2xl text-muted-foreground p-4 text-center">
                <Compass className="w-8 h-8 opacity-40 mb-2 stroke-1" />
                <p className="text-xs font-semibold">Route Map Unavailable</p>
                <p className="text-[10px] opacity-70 mt-1 max-w-[240px]">
                    Pickup and delivery GPS coordinates within Tanzania are required to render routing.
                </p>
            </div>
        );
    }

    const pickupPos: [number, number] = [pickupLat as number, pickupLng as number];
    const deliveryPos: [number, number] = [deliveryLat as number, deliveryLng as number];

    return (
        <div className="space-y-2">
            <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-muted/20">
                <MapContainer
                    center={pickupPos}
                    zoom={12}
                    scrollWheelZoom={false}
                    className="h-full w-full z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={pickupPos} icon={pickupIcon}>
                        {/* Popup or tooltip if needed */}
                    </Marker>
                    <Marker position={deliveryPos} icon={deliveryIcon}>
                        {/* Popup or tooltip if needed */}
                    </Marker>
                    {routeCoords.length > 0 && (
                        <Polyline
                            positions={routeCoords}
                            color="#3b82f6"
                            weight={4}
                            opacity={0.8}
                            dashArray="1"
                        />
                    )}
                    <MapBoundsController pickup={pickupPos} delivery={deliveryPos} />
                </MapContainer>

                {loading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {(distance || duration) && (
                <div className="flex items-center gap-4 px-3 py-2 bg-primary/5 border border-primary/10 rounded-xl text-xs font-medium text-primary">
                    <Navigation className="w-3.5 h-3.5" />
                    <div className="flex gap-3">
                        {distance && (
                            <span>
                                Estimated Distance: <strong className="text-foreground font-bold">{distance}</strong>
                            </span>
                        )}
                        {duration && (
                            <span>
                                Estimated Travel Time: <strong className="text-foreground font-bold">{duration}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryRouteMap;
