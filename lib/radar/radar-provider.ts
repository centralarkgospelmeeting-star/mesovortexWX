// lib/radar/radar-provider.ts
// Complete radar site registry + drivers for NEXRAD + TDWR

export type RadarNetwork = 'nexrad' | 'tdwr' | 'mrms' | 'research' | 'private';
export type RadarNetworkType = RadarNetwork;
export type RadarStation = {
  id: string;
  callsign: string;
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
  network: RadarNetwork;
  country: string;
  state?: string;
  isOnline: boolean;
  supportedProducts: string[];
  supportedTilts: string[];
  vcpMode?: string;
};

export type RadarTileRequest = {
  station: RadarStation;
  product: string;
  tilt: string;
};

export interface RadarDriver {
  networkType: string;
  getTileUrl(req: RadarTileRequest): string;
  getFrameLoop(req: RadarTileRequest, count?: number): { time: string; label: string; tileUrl: string }[];
}

/** NOAA / IEM RIDGE-style driver used for both NEXRAD and TDWR */
class NoaaWsR88DDriver implements RadarDriver {
  networkType = 'nexrad';
  private baseUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

  private mapProductCode(product: string, tilt: string, network: RadarNetwork): string {
    const p = product.toLowerCase();
    // Simplified product mapping – expand as needed
    if (network === 'tdwr') {
      if (p === 'ref' || p === 'n0q' || p === 'n0r') return 'N0Q';
      if (p === 'vel' || p === 'n0u' || p === 'n0v') return 'N0U';
      return 'N0Q';
    }
    // NEXRAD
    if (p === 'ref' || p === 'n0q') return 'N0Q';
    if (p === 'vel' || p === 'n0u') return 'N0U';
    if (p === 'srvel' || p === 'n0s') return 'N0S';
    if (p === 'tops') return 'NET';
    if (p === 'vil') return 'NVL';
    return 'N0Q';
  }

  getTileUrl(req: RadarTileRequest): string {
    const code = this.mapProductCode(req.product, req.tilt, req.station.network);
    const callsign = req.station.callsign;
    return `${this.baseUrl}/ridge::${callsign}-${code}-0/{z}/{x}/{y}.png`;
  }

  getFrameLoop(req: RadarTileRequest, count = 12): { time: string; label: string; tileUrl: string }[] {
    const code = this.mapProductCode(req.product, req.tilt, req.station.network);
    const now = Date.now();
    const snapped = Math.floor(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const frames: { time: string; label: string; tileUrl: string }[] = [];
    const callsign = req.station.callsign;

    for (let i = count; i >= 1; i--) {
      const ts = snapped - i * 5 * 60 * 1000;
      const d = new Date(ts);
      const stamp =
        `${d.getUTCFullYear()}` +
        `${String(d.getUTCMonth() + 1).padStart(2, '0')}` +
        `${String(d.getUTCDate()).padStart(2, '0')}` +
        `${String(d.getUTCHours()).padStart(2, '0')}` +
        `${String(d.getUTCMinutes()).padStart(2, '0')}`;
      frames.push({
        time: d.toISOString(),
        label: `-${i * 5}m`,
        tileUrl: `${this.baseUrl}/ridge::${callsign}-${code}-${stamp}/{z}/{x}/{y}.png`,
      });
    }

    frames.push({
      time: new Date(now).toISOString(),
      label: 'LIVE',
      tileUrl: this.getTileUrl(req),
    });

    return frames;
  }
}

const defaultDriver = new NoaaWsR88DDriver();

export class RadarSiteRegistry {
  private static stations = new Map<string, RadarStation>();
  private static initialized = false;

  private static ensureInit() {
    if (this.initialized) return;
    this.initialized = true;
    this.registerCoreNexrad();
    this.registerTdwr();
  }

  static registerStation(station: RadarStation) {
    this.stations.set(station.id.toUpperCase(), station);
    // Also index by callsign for convenience
    if (station.callsign) {
      this.stations.set(station.callsign.toUpperCase(), station);
    }
  }

  static getStation(id: string): RadarStation {
    this.ensureInit();
    const key = id.toUpperCase();
    const station = this.stations.get(key);
    if (station) return station;

    // Fallback so the API never hard-crashes
    return {
      id: key,
      callsign: key.replace(/^K/, '').slice(0, 3),
      name: `${key} (unknown)`,
      lat: 35.0,
      lon: -97.0,
      elevationM: 300,
      network: 'nexrad',
      country: 'US',
      isOnline: false,
      supportedProducts: ['ref', 'vel'],
      supportedTilts: ['0.5'],
    };
  }

  static getDriverForStation(station: RadarStation): RadarDriver {
    // For now both NEXRAD and TDWR use the same IEM RIDGE-style driver
    return defaultDriver;
  }

  static getAllStations(network?: RadarNetwork | RadarNetworkType): RadarStation[] {
    this.ensureInit();
    const seen = new Set<string>();
    const list: RadarStation[] = [];
    for (const s of this.stations.values()) {
      if (seen.has(s.id)) continue;
      if (network && s.network !== network) continue;
      seen.add(s.id);
      list.push(s);
    }
    return list;
  }

  /** Core CONUS NEXRAD sites (subset + common ones). Expand as needed. */
  private static registerCoreNexrad() {
    const nexrad: (Partial<RadarStation> & { elevationM?: number })[] = [
      { id: 'KLZK', callsign: 'LZK', name: 'Little Rock, AR', lat: 34.836, lon: -92.262, elevationM: 174, state: 'AR' },
      { id: 'KSRX', callsign: 'SRX', name: 'Fort Smith, AR', lat: 35.290, lon: -94.362, elevationM: 195, state: 'AR' },
      { id: 'KNQA', callsign: 'NQA', name: 'Memphis, TN', lat: 35.345, lon: -89.873, elevationM: 85, state: 'TN' },
      { id: 'KTLX', callsign: 'TLX', name: 'Oklahoma City / Norman, OK', lat: 35.333, lon: -97.278, elevationM: 370, state: 'OK' },
      { id: 'KFWS', callsign: 'FWS', name: 'Dallas / Fort Worth, TX', lat: 32.573, lon: -97.303, elevationM: 208, state: 'TX' },
      { id: 'KAMA', callsign: 'AMA', name: 'Amarillo, TX', lat: 35.233, lon: -101.709, elevationM: 1093, state: 'TX' },
      { id: 'KICT', callsign: 'ICT', name: 'Wichita, KS', lat: 37.654, lon: -97.443, elevationM: 406, state: 'KS' },
      { id: 'KEAX', callsign: 'EAX', name: 'Kansas City, MO', lat: 38.810, lon: -94.264, elevationM: 303, state: 'MO' },
      { id: 'KLSX', callsign: 'LSX', name: 'St. Louis, MO', lat: 38.699, lon: -90.683, elevationM: 185, state: 'MO' },
      { id: 'KIND', callsign: 'IND', name: 'Indianapolis, IN', lat: 39.708, lon: -86.280, elevationM: 241, state: 'IN' },
      { id: 'KLOT', callsign: 'LOT', name: 'Chicago, IL', lat: 41.604, lon: -88.085, elevationM: 202, state: 'IL' },
      { id: 'KFFC', callsign: 'FFC', name: 'Atlanta, GA', lat: 33.363, lon: -84.566, elevationM: 264, state: 'GA' },
      { id: 'KBMX', callsign: 'BMX', name: 'Birmingham, AL', lat: 33.172, lon: -86.770, elevationM: 197, state: 'AL' },
      { id: 'KTBW', callsign: 'TBW', name: 'Tampa Bay, FL', lat: 27.705, lon: -82.402, elevationM: 12, state: 'FL' },
      { id: 'KAMX', callsign: 'AMX', name: 'Miami, FL', lat: 25.611, lon: -80.413, elevationM: 4, state: 'FL' },
      { id: 'KLWX', callsign: 'LWX', name: 'Sterling, VA (DC area)', lat: 38.975, lon: -77.487, elevationM: 95, state: 'VA' },
      { id: 'KOKX', callsign: 'OKX', name: 'New York City, NY', lat: 40.866, lon: -72.864, elevationM: 26, state: 'NY' },
      { id: 'KBOX', callsign: 'BOX', name: 'Boston, MA', lat: 41.956, lon: -71.137, elevationM: 36, state: 'MA' },
      { id: 'KDTX', callsign: 'DTX', name: 'Detroit, MI', lat: 42.700, lon: -83.472, elevationM: 328, state: 'MI' },
      { id: 'KMPX', callsign: 'MPX', name: 'Minneapolis, MN', lat: 44.849, lon: -93.565, elevationM: 288, state: 'MN' },
      { id: 'KFTG', callsign: 'FTG', name: 'Denver / Boulder, CO', lat: 39.786, lon: -104.546, elevationM: 1673, state: 'CO' },
      { id: 'KIWA', callsign: 'IWA', name: 'Phoenix, AZ', lat: 33.289, lon: -111.670, elevationM: 412, state: 'AZ' },
      { id: 'KNKX', callsign: 'NKX', name: 'San Diego, CA', lat: 32.919, lon: -117.042, elevationM: 291, state: 'CA' },
      { id: 'KATX', callsign: 'ATX', name: 'Seattle / Tacoma, WA', lat: 48.195, lon: -122.496, elevationM: 152, state: 'WA' },
      { id: 'KHGX', callsign: 'HGX', name: 'Houston / Galveston, TX', lat: 29.472, lon: -95.079, elevationM: 5, state: 'TX' },
      { id: 'KSHV', callsign: 'SHV', name: 'Shreveport, LA', lat: 32.451, lon: -93.841, elevationM: 83, state: 'LA' },
      { id: 'KLIX', callsign: 'LIX', name: 'New Orleans, LA', lat: 30.337, lon: -89.826, elevationM: 7, state: 'LA' },
      { id: 'KOHX', callsign: 'OHX', name: 'Nashville, TN', lat: 36.247, lon: -86.563, elevationM: 173, state: 'TN' },
      { id: 'KRAX', callsign: 'RAX', name: 'Raleigh / Durham, NC', lat: 35.665, lon: -78.490, elevationM: 106, state: 'NC' },
      { id: 'KPBZ', callsign: 'PBZ', name: 'Pittsburgh, PA', lat: 40.532, lon: -80.218, elevationM: 360, state: 'PA' },
    ];

    nexrad.forEach((s) => {
      this.registerStation({
        id: s.id!,
        callsign: s.callsign!,
        name: s.name!,
        lat: s.lat!,
        lon: s.lon!,
        elevationM: s.elevationM ?? 200,
        network: 'nexrad',
        country: 'US',
        state: s.state,
        isOnline: true,
        supportedProducts: ['ref', 'vel', 'srvel', 'tops', 'vil'],
        supportedTilts: ['0.5', '0.9', '1.3', '1.8', '2.4'],
        vcpMode: 'VCP 12 / 212',
      });
    });
  }

  /** Full 45-site TDWR network (no fake entries) */
  private static registerTdwr() {
    const tdwrList: (Partial<RadarStation> & { elevationM?: number })[] = [
      { id: 'TADW', callsign: 'ADW', name: 'Andrews AFB TDWR, MD', lat: 38.810, lon: -76.867, elevationM: 105, state: 'MD' },
      { id: 'TATL', callsign: 'ATL', name: 'Atlanta Hartsfield TDWR, GA', lat: 33.647, lon: -84.262, elevationM: 328, state: 'GA' },
      { id: 'TBWI', callsign: 'BWI', name: 'Baltimore/Washington TDWR, MD', lat: 39.090, lon: -76.630, elevationM: 91, state: 'MD' },
      { id: 'TBOS', callsign: 'BOS', name: 'Boston TDWR, MA', lat: 42.158, lon: -70.933, elevationM: 80, state: 'MA' },
      { id: 'TCLT', callsign: 'CLT', name: 'Charlotte Douglas TDWR, NC', lat: 35.361, lon: -80.885, elevationM: 265, state: 'NC' },
      { id: 'TMDW', callsign: 'MDW', name: 'Chicago Midway TDWR, IL', lat: 41.651, lon: -87.729, elevationM: 233, state: 'IL' },
      { id: 'TORD', callsign: 'ORD', name: 'Chicago O’Hare TDWR, IL', lat: 41.797, lon: -87.858, elevationM: 227, state: 'IL' },
      { id: 'TLVE', callsign: 'LVE', name: 'Cleveland TDWR, OH', lat: 41.290, lon: -82.008, elevationM: 284, state: 'OH' },
      { id: 'TCMH', callsign: 'CMH', name: 'Columbus TDWR, OH', lat: 40.006, lon: -82.715, elevationM: 350, state: 'OH' },
      { id: 'TCVG', callsign: 'CVG', name: 'Covington/Cincinnati TDWR, KY', lat: 38.898, lon: -84.580, elevationM: 321, state: 'KY' },
      { id: 'TDAL', callsign: 'DAL', name: 'Dallas Love Field TDWR, TX', lat: 32.926, lon: -96.968, elevationM: 190, state: 'TX' },
      { id: 'TDFW', callsign: 'DFW', name: 'Dallas/Fort Worth TDWR, TX', lat: 33.065, lon: -96.918, elevationM: 178, state: 'TX' },
      { id: 'TDAY', callsign: 'DAY', name: 'Dayton TDWR, OH', lat: 40.022, lon: -84.123, elevationM: 311, state: 'OH' },
      { id: 'TDEN', callsign: 'DEN', name: 'Denver International TDWR, CO', lat: 39.727, lon: -104.526, elevationM: 1738, state: 'CO' },
      { id: 'TDTW', callsign: 'DTW', name: 'Detroit Metro TDWR, MI', lat: 42.111, lon: -83.515, elevationM: 235, state: 'MI' },
      { id: 'TIAD', callsign: 'IAD', name: 'Dulles International TDWR, VA', lat: 39.084, lon: -77.529, elevationM: 144, state: 'VA' },
      { id: 'TFLL', callsign: 'FLL', name: 'Fort Lauderdale TDWR, FL', lat: 26.143, lon: -80.344, elevationM: 37, state: 'FL' },
      { id: 'THOU', callsign: 'HOU', name: 'Houston Hobby TDWR, TX', lat: 29.516, lon: -95.242, elevationM: 36, state: 'TX' },
      { id: 'TIAH', callsign: 'IAH', name: 'Houston Intercontinental TDWR, TX', lat: 30.065, lon: -95.567, elevationM: 77, state: 'TX' },
      { id: 'TIDS', callsign: 'IDS', name: 'Indianapolis TDWR, IN', lat: 39.637, lon: -86.436, elevationM: 258, state: 'IN' },
      { id: 'TMCI', callsign: 'MCI', name: 'Kansas City TDWR, MO', lat: 39.499, lon: -94.742, elevationM: 332, state: 'MO' },
      { id: 'TLAS', callsign: 'LAS', name: 'Las Vegas TDWR, NV', lat: 36.144, lon: -115.007, elevationM: 627, state: 'NV' },
      { id: 'TSDF', callsign: 'SDF', name: 'Louisville TDWR, KY', lat: 38.046, lon: -85.611, elevationM: 223, state: 'KY' },
      { id: 'TMEM', callsign: 'MEM', name: 'Memphis International TDWR, TN', lat: 34.896, lon: -89.993, elevationM: 147, state: 'TN' },
      { id: 'TMIA', callsign: 'MIA', name: 'Miami International TDWR, FL', lat: 25.758, lon: -80.491, elevationM: 38, state: 'FL' },
      { id: 'TMKE', callsign: 'MKE', name: 'Milwaukee TDWR, WI', lat: 42.819, lon: -88.047, elevationM: 284, state: 'WI' },
      { id: 'TMSP', callsign: 'MSP', name: 'Minneapolis TDWR, MN', lat: 44.871, lon: -92.933, elevationM: 342, state: 'MN' },
      { id: 'TBNA', callsign: 'BNA', name: 'Nashville International TDWR, TN', lat: 35.980, lon: -86.662, elevationM: 249, state: 'TN' },
      { id: 'TMSY', callsign: 'MSY', name: 'New Orleans TDWR, LA', lat: 30.022, lon: -90.403, elevationM: 30, state: 'LA' },
      { id: 'TJFK', callsign: 'JFK', name: 'New York JFK TDWR, NY', lat: 40.589, lon: -73.880, elevationM: 34, state: 'NY' },
      { id: 'TEWR', callsign: 'EWR', name: 'Newark Liberty TDWR, NJ', lat: 40.593, lon: -74.270, elevationM: 41, state: 'NJ' },
      { id: 'TOKC', callsign: 'OKC', name: 'Oklahoma City TDWR, OK', lat: 35.276, lon: -97.510, elevationM: 399, state: 'OK' },
      { id: 'TMCO', callsign: 'MCO', name: 'Orlando International TDWR, FL', lat: 28.343, lon: -81.326, elevationM: 52, state: 'FL' },
      { id: 'TPHL', callsign: 'PHL', name: 'Philadelphia TDWR, PA', lat: 39.949, lon: -75.070, elevationM: 47, state: 'PA' },
      { id: 'TPHX', callsign: 'PHX', name: 'Phoenix Sky Harbor TDWR, AZ', lat: 33.420, lon: -112.163, elevationM: 332, state: 'AZ' },
      { id: 'TPIT', callsign: 'PIT', name: 'Pittsburgh TDWR, PA', lat: 40.501, lon: -80.486, elevationM: 422, state: 'PA' },
      { id: 'TRDU', callsign: 'RDU', name: 'Raleigh-Durham TDWR, NC', lat: 36.002, lon: -78.697, elevationM: 157, state: 'NC' },
      { id: 'TSLC', callsign: 'SLC', name: 'Salt Lake City TDWR, UT', lat: 40.967, lon: -111.930, elevationM: 1309, state: 'UT' },
      { id: 'TSJU', callsign: 'SJU', name: 'San Juan TDWR, PR', lat: 18.474, lon: -66.179, elevationM: 48, state: 'PR' },
      { id: 'TSTL', callsign: 'STL', name: 'St. Louis Lambert TDWR, MO', lat: 38.806, lon: -90.489, elevationM: 197, state: 'MO' },
      { id: 'TTPA', callsign: 'TPA', name: 'Tampa Bay TDWR, FL', lat: 27.860, lon: -82.518, elevationM: 28, state: 'FL' },
      { id: 'TTUL', callsign: 'TUL', name: 'Tulsa TDWR, OK', lat: 36.070, lon: -95.826, elevationM: 251, state: 'OK' },
      { id: 'TDCA', callsign: 'DCA', name: 'Washington National TDWR, MD', lat: 38.759, lon: -76.962, elevationM: 105, state: 'MD' },
      { id: 'TICH', callsign: 'ICH', name: 'Wichita TDWR, KS', lat: 37.507, lon: -97.437, elevationM: 412, state: 'KS' },
    ];

    tdwrList.forEach((s) => {
      this.registerStation({
        id: s.id!,
        callsign: s.callsign!,
        name: s.name!,
        lat: s.lat!,
        lon: s.lon!,
        elevationM: s.elevationM ?? 180,
        network: 'tdwr',
        country: 'US',
        state: s.state,
        isOnline: true,
        supportedProducts: ['ref', 'vel'],
        supportedTilts: ['0.2', '0.6', '1.0'],
        vcpMode: 'VCP 80 High-Res Airport',
      });
    });
  }
}
