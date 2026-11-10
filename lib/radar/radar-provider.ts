import { RADAR_SITES } from '../radar-config';

export type RadarNetwork = 'nexrad' | 'tdwr' | 'mrms' | 'research' | 'private' | 'mobile' | 'spotter';
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

class NoaaWsR88DDriver implements RadarDriver {
  networkType = 'nexrad';
  private baseUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

  private mapProductCode(product: string, network: RadarNetwork): string | null {
    const p = product.toLowerCase();
    if (network === 'tdwr') {
      if (p === 'vel' || p === 'n0u' || p === 'n0v') return 'TV0';
      if (p === 'ref' || p === 'n0q' || p === 'n0r') return 'TZL';
      return null;
    }
    if (p === 'cc' || p === 'zdr' || p === 'kdp' || p === 'n0c' || p === 'n0x' || p === 'n0k') {
      return null;
    }
    if (p === 'vel' || p === 'n0u') return 'N0U';
    if (p === 'srvel' || p === 'n0s') return 'N0S';
    if (p === 'tops') return 'NET';
    if (p === 'vil') return 'NVL';
    return 'N0Q';
  }

  getTileUrl(req: RadarTileRequest): string {
    const national =
      !req.station?.callsign ||
      req.station.id === 'US' ||
      req.station.callsign === 'US' ||
      req.station.callsign.length < 3;

    if (national) {
      return `${this.baseUrl}/nexrad-n0q-900913/{z}/{x}/{y}.png`;
    }

    const code = this.mapProductCode(req.product, req.station.network);
    if (!code) {
      return this.getTileUrl({ ...req, product: 'ref' });
    }

    const id = req.station.network === 'tdwr' ? req.station.id : req.station.callsign;
    return `${this.baseUrl}/ridge::${id}-${code}-0/{z}/{x}/{y}.png`;
  }

  getFrameLoop(req: RadarTileRequest, count = 12): { time: string; label: string; tileUrl: string }[] {
    const live = this.getTileUrl(req);
    const now = Date.now();
    const frames: { time: string; label: string; tileUrl: string }[] = [];

    for (let i = count; i >= 1; i--) {
      const d = new Date(now - i * 5 * 60 * 1000);
      frames.push({
        time: d.toISOString(),
        label: `-${i * 5}m`,
        tileUrl: live,
      });
    }

    frames.push({
      time: new Date(now).toISOString(),
      label: 'LIVE',
      tileUrl: live,
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
    this.seedComprehensiveStations();
    this.registerTdwr();
  }

  static registerStation(station: RadarStation) {
    this.stations.set(station.id.toUpperCase(), station);
    if (station.callsign) {
      this.stations.set(station.callsign.toUpperCase(), station);
    }
  }

  static getStation(id: string): RadarStation {
    this.ensureInit();
    const key = id.toUpperCase();
    const station = this.stations.get(key);
    if (station) return station;

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
    return defaultDriver;
  }

  static getAllStations(network?: RadarNetwork | RadarNetworkType): RadarStation[] {
    this.ensureInit();
    const seen = new Set<string>();
    const list: RadarStation[] = [];
    Array.from(this.stations.values()).forEach((s) => {
      if (seen.has(s.id)) return;
      if (network && s.network !== network) return;
      seen.add(s.id);
      list.push(s);
    });
    return list;
  }

  private static seedComprehensiveStations() {
    for (const s of RADAR_SITES) {
      const stateMatch = s.name.match(/,\s*([A-Z]{2})\b/);
      this.registerStation({
        id: s.id,
        callsign: s.radarId,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        elevationM: Math.round(s.elevation * 0.3048),
        network: 'nexrad',
        country: 'US',
        state: stateMatch?.[1],
        isOnline: true,
        supportedProducts: ['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp'],
        supportedTilts: ['0.5', '0.9', '1.3', '1.8'],
        vcpMode: 'VCP 212 Convective',
      });
    }
  }

  private static registerTdwr() {
    const tdwrList: Array<Partial<RadarStation> & { elevationM?: number }> = [
      { id: 'TADW', callsign: 'ADW', name: 'Andrews AFB TDWR, MD', lat: 38.81, lon: -76.867, elevationM: 105, state: 'MD' },
      { id: 'TATL', callsign: 'ATL', name: 'Atlanta Hartsfield TDWR, GA', lat: 33.647, lon: -84.262, elevationM: 328, state: 'GA' },
      { id: 'TBWI', callsign: 'BWI', name: 'Baltimore/Washington TDWR, MD', lat: 39.09, lon: -76.63, elevationM: 91, state: 'MD' },
      { id: 'TBOS', callsign: 'BOS', name: 'Boston TDWR, MA', lat: 42.158, lon: -70.933, elevationM: 80, state: 'MA' },
      { id: 'TCLT', callsign: 'CLT', name: 'Charlotte Douglas TDWR, NC', lat: 35.361, lon: -80.885, elevationM: 265, state: 'NC' },
      { id: 'TMDW', callsign: 'MDW', name: 'Chicago Midway TDWR, IL', lat: 41.651, lon: -87.729, elevationM: 233, state: 'IL' },
      { id: 'TORD', callsign: 'ORD', name: "Chicago O'Hare TDWR, IL", lat: 41.797, lon: -87.858, elevationM: 227, state: 'IL' },
      { id: 'TLVE', callsign: 'LVE', name: 'Cleveland TDWR, OH', lat: 41.29, lon: -82.008, elevationM: 284, state: 'OH' },
      { id: 'TCMH', callsign: 'CMH', name: 'Columbus TDWR, OH', lat: 40.006, lon: -82.715, elevationM: 350, state: 'OH' },
      { id: 'TCVG', callsign: 'CVG', name: 'Covington/Cincinnati TDWR, KY', lat: 38.898, lon: -84.58, elevationM: 321, state: 'KY' },
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
      { id: 'TBNA', callsign: 'BNA', name: 'Nashville International TDWR, TN', lat: 35.98, lon: -86.662, elevationM: 249, state: 'TN' },
      { id: 'TMSY', callsign: 'MSY', name: 'New Orleans TDWR, LA', lat: 30.022, lon: -90.403, elevationM: 30, state: 'LA' },
      { id: 'TJFK', callsign: 'JFK', name: 'New York JFK TDWR, NY', lat: 40.589, lon: -73.88, elevationM: 34, state: 'NY' },
      { id: 'TEWR', callsign: 'EWR', name: 'Newark Liberty TDWR, NJ', lat: 40.593, lon: -74.27, elevationM: 41, state: 'NJ' },
      { id: 'TOKC', callsign: 'OKC', name: 'Oklahoma City TDWR, OK', lat: 35.276, lon: -97.51, elevationM: 399, state: 'OK' },
      { id: 'TMCO', callsign: 'MCO', name: 'Orlando International TDWR, FL', lat: 28.343, lon: -81.326, elevationM: 52, state: 'FL' },
      { id: 'TPHL', callsign: 'PHL', name: 'Philadelphia TDWR, PA', lat: 39.949, lon: -75.07, elevationM: 47, state: 'PA' },
      { id: 'TPHX', callsign: 'PHX', name: 'Phoenix Sky Harbor TDWR, AZ', lat: 33.42, lon: -112.163, elevationM: 332, state: 'AZ' },
      { id: 'TPIT', callsign: 'PIT', name: 'Pittsburgh TDWR, PA', lat: 40.501, lon: -80.486, elevationM: 422, state: 'PA' },
      { id: 'TRDU', callsign: 'RDU', name: 'Raleigh-Durham TDWR, NC', lat: 36.002, lon: -78.697, elevationM: 157, state: 'NC' },
      { id: 'TSLC', callsign: 'SLC', name: 'Salt Lake City TDWR, UT', lat: 40.967, lon: -111.93, elevationM: 1309, state: 'UT' },
      { id: 'TSJU', callsign: 'SJU', name: 'San Juan TDWR, PR', lat: 18.474, lon: -66.179, elevationM: 48, state: 'PR' },
      { id: 'TSTL', callsign: 'STL', name: 'St. Louis Lambert TDWR, MO', lat: 38.806, lon: -90.489, elevationM: 197, state: 'MO' },
      { id: 'TTPA', callsign: 'TPA', name: 'Tampa Bay TDWR, FL', lat: 27.86, lon: -82.518, elevationM: 28, state: 'FL' },
      { id: 'TTUL', callsign: 'TUL', name: 'Tulsa TDWR, OK', lat: 36.07, lon: -95.826, elevationM: 251, state: 'OK' },
      { id: 'TDCA', callsign: 'DCA', name: 'Washington National TDWR, MD', lat: 38.759, lon: -76.962, elevationM: 105, state: 'MD' },
      { id: 'TICH', callsign: 'ICH', name: 'Wichita TDWR, KS', lat: 37.507, lon: -97.437, elevationM: 412, state: 'KS' },
    ];

    for (const s of tdwrList) {
      this.registerStation({
        id: s.id || 'TDWR',
        callsign: s.callsign || 'TDWR',
        name: s.name || 'TDWR',
        lat: s.lat || 0,
        lon: s.lon || 0,
        elevationM: s.elevationM ?? 180,
        network: 'tdwr',
        country: 'US',
        state: s.state,
        isOnline: true,
        supportedProducts: ['ref', 'vel'],
        supportedTilts: ['0.2', '0.6', '1.0'],
        vcpMode: 'VCP 80 High-Res Airport',
      });
    }
  }
}
