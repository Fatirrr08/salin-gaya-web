export interface ShippingResult {
  baseRate: number;
  distanceMultiplier: number;
  distanceCost: number;
  totalCost: number;
  estimatedDays: string;
}

/**
 * Kalkulasi Jarak Haversine (Spheroid) dalam Kilometer
 */
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius Bumi dalam KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
}

export function applyCourierRounding(weight: number): number {
  const integerPart = Math.floor(weight);
  const fractionalPart = weight - integerPart;
  if (fractionalPart > 0.3) {
    return integerPart + 1;
  }
  return integerPart || 1; // min 1kg
}

/**
 * Kalkulasi Billed Weight: Aktual (Kg) vs Volumetrik
 * Rumus Volumetrik Udara Darat umum: (P x L x T) / 6000
 */
export function getBilledWeight(actualWeightKg: number, lengthCm: number, widthCm: number, heightCm: number) {
  const volumetricWeight = (lengthCm * widthCm * heightCm) / 6000;
  const maxWeight = Math.max(actualWeightKg, volumetricWeight);
  const billedWeight = Math.max(1, applyCourierRounding(maxWeight));
  
  return { 
    billedWeight, 
    actualWeight: Number(actualWeightKg.toFixed(2)), 
    volumetricWeight: Number(volumetricWeight.toFixed(2)) 
  };
}

/**
 * Engine Kalkulator Harga Ekspedisi Dinamis Berjenjang
 */
export function calculateShipping(distanceKm: number, weightKg: number, courier: string): ShippingResult {
  const billedWeight = Math.max(1, weightKg); // Pastikan berat minimal 1kg
  
  let baseRate = 0;
  let multiplierPerKm = 0;
  let estimatedDays = "";

  switch (courier) {
    case "JNE":
      // JNE REG: Base Rp10.000 + (Jarak KM * Rp200). Multiplier per KG penuh.
      baseRate = 10000;
      multiplierPerKm = 200;
      estimatedDays = `${Math.ceil(distanceKm / 100) + 1} - ${Math.ceil(distanceKm / 100) + 3} Hari`;
      break;
    case "J&T":
      // J&T EZ: Base Rp12.000 + (Jarak KM * Rp150). Multiplier per KG penuh.
      baseRate = 12000;
      multiplierPerKm = 150;
      estimatedDays = `${Math.ceil(distanceKm / 120) + 1} - ${Math.ceil(distanceKm / 120) + 2} Hari`;
      break;
    case "SiCepat":
      // SiCepat REG: Base Rp9.000 + (Jarak KM * Rp250). Multiplier per KG penuh.
      baseRate = 9000;
      multiplierPerKm = 250;
      estimatedDays = `${Math.ceil(distanceKm / 90) + 2} - ${Math.ceil(distanceKm / 90) + 4} Hari`;
      break;
    case "Ninja":
      // Ninja Xpress: Base Rp11.000 + (Jarak KM * Rp180). Multiplier per KG penuh.
      baseRate = 11000;
      multiplierPerKm = 180;
      estimatedDays = `${Math.ceil(distanceKm / 100) + 2} - ${Math.ceil(distanceKm / 100) + 4} Hari`;
      break;
    default:
      // Fallback
      baseRate = 10000;
      multiplierPerKm = 150;
      estimatedDays = "3 - 5 Hari";
  }

  // Cost calculation
  const distanceCost = Math.round(distanceKm * multiplierPerKm);
  const costPerKg = baseRate + distanceCost;
  const totalCost = costPerKg * billedWeight;

  return {
    baseRate,
    distanceMultiplier: multiplierPerKm,
    distanceCost,
    totalCost,
    estimatedDays
  };
}
