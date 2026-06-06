import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { X, MapPin, Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Fix Leaflet's default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (
    address: string,
    city: string,
    province: string,
    lat: number,
    lng: number,
  ) => void;
  sellerLocations?: { lat: number; lng: number }[];
}

// Komponen tambahan untuk update center peta secara terprogram
function MapUpdater({ center }: { center: L.LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapModal({
  isOpen,
  onClose,
  onSelectLocation,
  sellerLocations = [],
}: MapModalProps) {
  const [position, setPosition] = useState<L.LatLng>(
    new L.LatLng(-6.2088, 106.8456),
  ); // Jakarta default
  const [isLoading, setIsLoading] = useState(false);
  const [addressData, setAddressData] = useState<{
    address: string;
    city: string;
    province: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const markerRef = useRef<L.Marker>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Map
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow map layout to settle
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);

      // Auto fetch location for default position if empty
      if (!addressData) {
        fetchAddress(position.lat, position.lng);
      }
    }
  }, [isOpen]);

  // Reverse Geocoding using Nominatim
  const fetchAddress = async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      if (!response.ok) throw new Error("Gagal mengambil alamat");
      const data = await response.json();

      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.county ||
        "";
      const province = data.address.state || data.address.region || "";
      const fullAddress = data.display_name || "";

      setAddressData({ address: fullAddress, city, province });
    } catch (error) {
      toast.error("Gagal mendapatkan nama jalan", {
        description: "Pastikan koneksi internet stabil.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Click map to set marker
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        fetchAddress(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  // Debounced Search Function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) return;

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=1`,
        );
        if (!res.ok) throw new Error("Search API failed");
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          const newPos = new L.LatLng(lat, lon);
          setPosition(newPos);
          fetchAddress(lat, lon);
        } else {
          toast.error("Lokasi tidak ditemukan", {
            description:
              "Coba gunakan nama jalan atau kota yang lebih spesifik.",
          });
        }
      } catch (err) {
      } finally {
        setIsSearching(false);
      }
    }, 800); // 800ms debounce
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          setPosition(latlng);
          fetchAddress(latlng.lat, latlng.lng);
        }
      },
    }),
    [],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Pilih Lokasi
                Pengiriman
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-border bg-secondary/30 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari jalan, kecamatan, atau kota..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            <div className="relative h-[50vh] min-h-[300px] max-h-[500px] w-full bg-muted overflow-hidden">
              <MapContainer
                center={position}
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
                maxBounds={[
                  [-11.0, 95.0],
                  [6.0, 141.0],
                ]} // Geofencing Indonesia
                minZoom={5}
              >
                <MapUpdater center={position} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Visualisasi Rute dari Semua Penjual ke Titik Pembeli */}
                {sellerLocations?.map((seller, idx) => (
                  <Polyline
                    key={idx}
                    positions={[
                      [seller.lat, seller.lng],
                      [position.lat, position.lng],
                    ]}
                    pathOptions={{
                      color: "#A67B5B",
                      weight: 3,
                      dashArray: "5, 10",
                      opacity: 0.7,
                    }}
                  />
                ))}

                <Marker
                  draggable={true}
                  eventHandlers={eventHandlers}
                  position={position}
                  ref={markerRef}
                />
                <MapEvents />
              </MapContainer>
            </div>

            <div className="p-5 border-t border-border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Alamat Terpilih
              </p>
              <div className="bg-secondary/30 border border-border p-3 rounded-lg min-h-[60px] flex items-center">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sedang memuat
                    alamat...
                  </div>
                ) : addressData ? (
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {addressData.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        {addressData.city || "Kota Tidak Diketahui"}
                      </span>
                      <span className="text-[11px] bg-secondary text-secondary-foreground font-bold px-2 py-0.5 rounded-full">
                        {addressData.province || "Provinsi Tidak Diketahui"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Geser pin peta untuk memilih alamat secara otomatis.
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (addressData) {
                      onSelectLocation(
                        addressData.address,
                        addressData.city,
                        addressData.province,
                        position.lat,
                        position.lng,
                      );
                      onClose();
                    } else {
                      toast.error("Pilih lokasi terlebih dahulu di peta");
                    }
                  }}
                  disabled={isLoading || !addressData}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Gunakan Lokasi Ini
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
