import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Fix for default marker icon in Leaflet with React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address: string) => void;
    initialLocation?: { lat: number; lng: number };
    restrictToKariakoo?: boolean;
}

// Tanzania bounding box
const TANZANIA_BOUNDS: L.LatLngBoundsExpression = [
    [-11.76, 29.32], // Southwest
    [-0.98, 40.44]   // Northeast
];

// Kariakoo, Dar es Salaam bounding box
const KARIAKOO_BOUNDS: L.LatLngBoundsExpression = [
    [-6.835, 39.260], // Southwest
    [-6.805, 39.290]   // Northeast
];

const isWithinBounds = (lat: number, lng: number, restrictToKariakoo: boolean = false) => {
    if (restrictToKariakoo) {
        return lat >= -6.835 && lat <= -6.805 && lng >= 39.260 && lng <= 39.290;
    }
    // Default to Tanzania
    return lat >= -11.76 && lat <= -0.98 && lng >= 29.32 && lng <= 40.44;
};

// Component to handle map view updates
const MapController = ({ center, zoom }: { center: [number, number]; zoom?: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || map.getZoom(), {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [center, zoom, map]);
    return null;
};

const LocationMarker = ({ position, setPosition, onLocationSelect, restrictToKariakoo }: any) => {
    const fetchAddress = useCallback(async (lat: number, lng: number) => {
        if (!isWithinBounds(lat, lng, restrictToKariakoo)) {
            const area = restrictToKariakoo ? "Kariakoo" : "Tanzania or Zanzibar";
            toast.error(`Please select a location within ${area}.`);
            return;
        }

        console.log(`Fetching address for: ${lat}, ${lng}`);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();

            // Double check country in response
            if (data.address && data.address.country_code !== 'tz') {
                const area = restrictToKariakoo ? "Kariakoo" : "Tanzania or Zanzibar";
                toast.error(`Please select a location within ${area}.`);
                return;
            }

            console.log("Reverse geocode result:", data.display_name);
            onLocationSelect(lat, lng, data.display_name || `${lat}, ${lng}`);
        } catch (error) {
            console.error("Error fetching address:", error);
            onLocationSelect(lat, lng, `${lat}, ${lng}`);
        }
    }, [onLocationSelect]);

    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            if (!isWithinBounds(lat, lng, restrictToKariakoo)) {
                const area = restrictToKariakoo ? "Kariakoo" : "Tanzania or Zanzibar";
                toast.error(`Please select a location within ${area}.`);
                return;
            }
            console.log(`Map clicked at: ${lat}, ${lng}`);
            setPosition([lat, lng]);
            fetchAddress(lat, lng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

const LocationPicker = ({ onLocationSelect, initialLocation, restrictToKariakoo = false }: LocationPickerProps) => {
    const [position, setPosition] = useState<[number, number] | null>(
        initialLocation ? [initialLocation.lat, initialLocation.lng] : null
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(
        initialLocation ? [initialLocation.lat, initialLocation.lng] : null
    );

    // Default center: Kariakoo, Dar es Salaam
    const defaultCenter: [number, number] = [-6.819, 39.274];

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        const query = searchQuery.toLowerCase().includes("tanzania") ? searchQuery : `${searchQuery}, Tanzania`;
        console.log(`Searching for: ${query}`);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=tz`
            );
            const data = await response.json();
            console.log("Search results:", data);

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];

                if (!isWithinBounds(newPos[0], newPos[1], restrictToKariakoo)) {
                    const area = restrictToKariakoo ? "Kariakoo" : "Tanzania";
                    toast.error(`Location found is outside ${area}.`);
                    return;
                }

                console.log(`Setting position to: ${newPos} (${display_name})`);
                setPosition(newPos);
                setMapCenter(newPos);
                onLocationSelect(newPos[0], newPos[1], display_name);
                toast.success("Location found!");
            } else {
                const area = restrictToKariakoo ? "Kariakoo" : "Tanzania";
                toast.error(`Location not found in ${area}. Try a different search.`);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Error searching for location.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleLocateMe = () => {
        setIsLocating(true);
        console.log("Locating user...");
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            setIsLocating(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;

                if (!isWithinBounds(latitude, longitude, restrictToKariakoo)) {
                    const area = restrictToKariakoo ? "Kariakoo" : "Tanzania/Zanzibar";
                    toast.error(`Your current location is outside ${area}.`);
                    setIsLocating(false);
                    return;
                }

                console.log(`User located at: ${latitude}, ${longitude} (Accuracy: ${pos.coords.accuracy}m)`);
                const newPos: [number, number] = [latitude, longitude];
                setPosition(newPos);
                setMapCenter(newPos);

                // Fetch address for current location
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();

                    if (data.address && data.address.country_code !== 'tz') {
                        const area = restrictToKariakoo ? "Kariakoo" : "Tanzania/Zanzibar";
                        toast.error(`Your current location is outside ${area}.`);
                        setIsLocating(false);
                        return;
                    }

                    console.log("Locate me reverse geocode:", data.display_name);
                    onLocationSelect(latitude, longitude, data.display_name || `${latitude}, ${longitude}`);
                } catch (error) {
                    console.error("Locate me address error:", error);
                    onLocationSelect(latitude, longitude, `${latitude}, ${longitude}`);
                }

                toast.success(`Location updated! (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`);
                setIsLocating(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error("Could not get your location. Please check permissions.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={restrictToKariakoo ? "Search in Kariakoo..." : "Search in Tanzania..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10 bg-white"
                    />
                </div>
                <Button
                    onClick={() => handleSearch()}
                    disabled={isSearching}
                    className="bg-[#00966d] hover:bg-[#007d5b] text-white min-w-[100px]"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-none"
                >
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </Button>
            </div>

            <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border relative" style={{ zIndex: 1 }}>
                <MapContainer
                    center={mapCenter || defaultCenter}
                    zoom={15}
                    scrollWheelZoom={true}
                    maxBounds={restrictToKariakoo ? KARIAKOO_BOUNDS : TANZANIA_BOUNDS}
                    maxBoundsViscosity={1.0}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={mapCenter || defaultCenter} />
                    <LocationMarker
                        position={position}
                        setPosition={setPosition}
                        onLocationSelect={onLocationSelect}
                        restrictToKariakoo={restrictToKariakoo}
                    />
                </MapContainer>
            </div>
        </div>
    );
};

export default LocationPicker;
