export interface ShippingResult {
  baseRate: number;
  distanceMultiplier: number;
  distanceCost: number;
  totalCost: number;
  insuranceCost: number;
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

export function applyCourierRounding(weight: number, courier: string): number {
  // Sesuai permintaan pengguna: jangan dibulatkan dan jangan digenapkan ke 1 kg
  return weight;
}

/**
 * Kalkulasi Billed Weight: Aktual (Kg) vs Volumetrik
 * Rumus Volumetrik Udara Darat umum: (P x L x T) / 6000
 */
export function getBilledWeight(actualWeightKg: number, lengthCm: number, widthCm: number, heightCm: number, courier: string = "", usePackingKayu: boolean = false) {
  let l = lengthCm;
  let w = widthCm;
  let h = heightCm;
  
  if (usePackingKayu && courier === "SiCepat") {
    // SiCepat menambahkan dimensi 5 cm di setiap sisi
    l += 5;
    w += 5;
    h += 5;
  }

  const volumetricWeight = (l * w * h) / 6000;
  let maxWeight = Math.max(actualWeightKg, volumetricWeight);

  if (usePackingKayu && courier === "J&T") {
    // J&T menambah 30% dari berat asli/volumetrik
    maxWeight = maxWeight * 1.3;
  }

  const billedWeight = applyCourierRounding(maxWeight, courier);
  
  return { 
    billedWeight, 
    actualWeight: Number(actualWeightKg.toFixed(2)), 
    volumetricWeight: Number(volumetricWeight.toFixed(2)) 
  };
}

export function calculateInsurance(itemPrice: number, courier: string): number {
  if (courier === "JNE") {
    return (0.002 * itemPrice) + 5000;
  } else if (courier === "J&T") {
    return 0.002 * itemPrice;
  } else if (courier === "SiCepat") {
    return 0.005 * itemPrice;
  }
  return 0;
}

/**
 * Engine Kalkulator Harga Ekspedisi Dinamis Berjenjang
 */
export function calculateShipping(distanceKm: number, weightKg: number, courier: string, usePackingKayu: boolean = false, itemPrice: number = 0, useInsurance: boolean = false): ShippingResult {
  const billedWeight = weightKg; // Tanpa pembulatan atau minimal berat 1kg
  
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
  let totalCost = costPerKg * billedWeight;

  // JNE Packing Kayu = Ongkir * 2
  if (usePackingKayu && courier === "JNE") {
    totalCost = totalCost * 2;
  }

  let insuranceCost = 0;
  if (useInsurance) {
    insuranceCost = calculateInsurance(itemPrice, courier);
  }

  totalCost += insuranceCost;

  return {
    baseRate,
    distanceMultiplier: multiplierPerKm,
    distanceCost,
    totalCost,
    insuranceCost,
    estimatedDays,
  };
}
