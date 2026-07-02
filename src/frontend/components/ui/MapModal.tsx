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
import { X, MapPin, Loader2, Search, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Custom Pin Icon yang cantik untuk Leaflet
const customPinIcon = L.divIcon({
  className: "custom-leaflet-marker",
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transform: translateY(-50%);">
      <svg viewBox="0 0 24 24" fill="#A67B5B" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40], // Titik jangkar ada di bagian paling bawah tengah pin
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

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// 🌟 Komponen tambahan untuk update center peta secara terprogram
function MapUpdater({ center }: { center: L.LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 16, { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

// 🌟 SOLUSI UTAMA: Komponen pembantu untuk memaksa Leaflet menghitung ulang ukuran kontainer
// Ini dijalankan langsung di dalam elemen MapContainer agar peta tidak macet abu-abu
function MapContainerEvents() {
  const map = useMap();

  useEffect(() => {
    // Jalankan berkala untuk memastikan render ubin OSM tidak tertinggal oleh animasi Framer Motion
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 600),
    ];

    return () => timers.forEach(clearTimeout);
  }, [map]);

  return null;
}

export default function MapModal({
  isOpen,
  onClose,
  onSelectLocation,
  sellerLocations = [],
}: MapModalProps) {
  const [position, setPosition] = useState<L.LatLng>(
    // Set koordinat awal default ke Purwokerto/Banyumas (lokasi kampus Telkom) atau Jakarta
    new L.LatLng(-7.4244, 109.2301),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [addressData, setAddressData] = useState<{
    address: string;
    city: string;
    province: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const markerRef = useRef<L.Marker>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Map & Geolocation Address
  useEffect(() => {
    if (isOpen) {
      // Trigger resize global untuk memastikan map me-refresh layer ubin
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 400);

      if (!addressData) {
        fetchAddress(position.lat, position.lng);
      }
      return () => clearTimeout(timer);
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
      toast.error("Gagal mendapatkan detail alamat", {
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
        setShowDropdown(false);
      },
    });
    return null;
  };

  // Debounced Search Function (Autocomplete)
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`,
        );
        if (!res.ok) throw new Error("Search API failed");
        const data = await res.json();

        setSearchResults(data);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const newPos = new L.LatLng(lat, lon);

    setPosition(newPos);
    fetchAddress(lat, lon);
    setSearchQuery(result.display_name);
    setShowDropdown(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung deteksi lokasi (GPS).");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = new L.LatLng(latitude, longitude);
        setPosition(newPos);
        fetchAddress(latitude, longitude);
        setIsLocating(false);
        toast.success("Lokasi ditemukan!");
      },
      (err) => {
        setIsLocating(false);
        toast.error("Gagal mendapatkan lokasi GPS", {
          description:
            "Pastikan izin akses lokasi aktif di perangkat/browser Anda.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-visible flex flex-col max-h-[90vh]"
          >
            <div className="p-5 border-b border-border/50 flex justify-between items-center bg-white rounded-t-2xl shrink-0 z-50">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                Pilih Lokasi Pengiriman
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 bg-white relative shrink-0 z-50">
              <div className="flex gap-3">
                <div className="relative flex-1" ref={searchRef}>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari jalan, kecamatan, atau kota..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 focus:bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                  )}

                  {/* Autocomplete Dropdown */}
                  <AnimatePresence>
                    {showDropdown && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                      >
                        {searchResults.map((result) => (
                          <button
                            key={result.place_id}
                            onClick={() => handleSelectResult(result)}
                            className="w-full text-left p-3 hover:bg-secondary border-b border-border/50 last:border-0 flex items-start gap-3 transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-sm text-foreground line-clamp-2">
                              {result.display_name}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  className="w-11 h-11 bg-white border border-border rounded-xl text-foreground hover:bg-secondary hover:border-border transition-all flex items-center justify-center shrink-0 disabled:opacity-50 group"
                  title="Gunakan Lokasi Saat Ini"
                >
                  {isLocating ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Navigation className="w-5 h-5 text-primary" />
                  )}
                </button>
              </div>
            </div>

            {/* Kontainer Peta dengan Tinggi Absolut yang Tegas */}
            <div className="relative flex flex-col flex-1 min-h-[350px] max-h-[450px] w-full z-0 px-5 pb-2 pt-2 bg-white">
              <div className="relative flex-1 w-full rounded-xl overflow-hidden shadow-inner border border-border">
                <MapContainer
                  center={position}
                  zoom={16}
                  scrollWheelZoom={true}
                  className="h-full w-full absolute inset-0 z-10"
                maxBounds={[
                  [-11.0, 95.0],
                  [6.0, 141.0],
                ]} // Geofencing Indonesia
                minZoom={5}
              >
                <MapContainerEvents />{" "}
                {/* 🌟 Pemicu re-render ukuran kontainer otomatis */}
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
                  icon={customPinIcon}
                />
                  <MapEvents />
                </MapContainer>
              </div>
            </div>

            <div className="p-5 border-t border-border/50 bg-white rounded-b-2xl shrink-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Alamat Terpilih
              </p>
              <div className="bg-[#A67B5B]/5 border border-[#A67B5B]/20 p-3.5 rounded-xl min-h-[68px] flex items-start gap-3 transition-all">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground w-full h-full justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#A67B5B]" /> <span className="text-sm font-medium">Menganalisa koordinat GPS...</span>
                  </div>
                ) : addressData ? (
                  <>
                    <MapPin className="w-5 h-5 text-[#A67B5B] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                        {addressData.address}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] bg-white border border-[#A67B5B]/20 text-[#A67B5B] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          {addressData.city || "Kota Tidak Diketahui"}
                        </span>
                        <span className="text-[10px] bg-white border border-[#A67B5B]/20 text-[#A67B5B] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          {addressData.province || "Provinsi Tidak Diketahui"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground w-full h-full justify-center">
                    <MapPin className="w-5 h-5 opacity-50" />
                    <p className="text-sm font-medium">Geser pin peta untuk memilih alamat secara otomatis.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-border text-foreground text-sm font-semibold rounded-xl hover:bg-secondary transition-all"
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
                  className="flex-1 px-5 py-2.5 bg-[#A67B5B] hover:bg-[#8e684d] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-none disabled:hover:bg-[#A67B5B] flex items-center justify-center gap-2"
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