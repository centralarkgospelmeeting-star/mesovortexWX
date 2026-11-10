export type RadarNetworkType =
  | 'wsr88d'        // NOAA NEXRAD WSR-88D (160+ sites)
  | 'tdwr'          // FAA Terminal Doppler Weather Radar (45 sites)
  | 'research'      // OU, NSSL, NCAR (KOUN, RaXPol)
  | 'mobile'        // DOW (Doppler on Wheels), SMART-R mobile units
  | 'international' // Environment Canada, BoM Australia, OPERA Europe
  | 'private'       // Climavision, Baron X-band, Spotter Trucks
  | 'spotter';      // Spotter-deployed mobile radar nodes

export interface RadarStation {
  id: string;             // e.g. 'KLZK', 'TDAL', 'DOW-7', 'CASPR-1'
  callsign: string;       // Clean 3-4 letter ID e.g. 'LZK', 'DAL'
  name: string;           // Display title e.g. 'Little Rock, AR'
  lat: number;
  lon: number;
  elevationM: number;
  network: RadarNetworkType;
  country: string;        // 'US', 'CA', 'AU', 'EU', etc.
  state?: string;
  isOnline: boolean;
  supportedProducts: string[]; // ['ref', 'vel', 'cc', 'zdr', etc.]
  supportedTilts: string[];    // ['0.5', '0.9', '1.3', etc.]
  vcpMode?: string;            // 'VCP 212', 'VCP 80 (TDWR)', 'Mobile Scan'
}

export interface RadarTileRequest {
  station: RadarStation;
  product: string;
  tilt: string;
  time?: string; // ISO string or timestamp
}

// Universal Interface that every Radar Provider must implement
export interface RadarSourceDriver {
  networkType: RadarNetworkType;
  getTileUrl(req: RadarTileRequest): string;
  getFrameLoop(req: RadarTileRequest, count?: number): { time: string; label: string; tileUrl: string }[];
}

// ----------------------------------------------------------------------------
// 1. DRIVER: NOAA WSR-88D & FAA TDWR DRIVER (High-Speed Level III & RIDGE)
// ----------------------------------------------------------------------------
export class NoaaWsR88DDriver implements RadarSourceDriver {
  networkType: RadarNetworkType = 'wsr88d';
  private baseUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

  private mapProductCode(product: string, tilt: string, network: RadarNetworkType): string {
    if (network === 'tdwr') {
      // FAA TDWR Level III product codes: TR0 (Base Refl), TV0 (Base Vel)
      if (product === 'vel') return 'TV0';
      return 'TR0';
    }

    if (product === 'vel') {
      if (tilt === '0.9') return 'N1U';
      if (tilt === '1.3') return 'N2U';
      if (tilt === '1.8') return 'N3U';
      return 'N0U';
    }
    if (product === 'cc') return 'N0C';
    if (product === 'zdr') return 'N0X';
    if (product === 'kdp') return 'N0K';

    // Reflectivity
    if (tilt === '0.9') return 'N1B';
    if (tilt === '1.3') return 'N2B';
    if (tilt === '1.8') return 'N3B';
    return 'N0B';
  }

  getTileUrl(req: RadarTileRequest): string {
    const code = this.mapProductCode(req.product, req.tilt, req.station.network);
    return `${this.baseUrl}/ridge::${req.station.callsign}-${code}-0/{z}/{x}/{y}.png`;
  }

  getFrameLoop(req: RadarTileRequest, count = 8): { time: string; label: string; tileUrl: string }[] {
    const code = this.mapProductCode(req.product, req.tilt, req.station.network);
    const now = new Date();
    const frames = [];

    for (let i = count; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 5 * 60 * 1000);
      d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 5) * 5, 0, 0);
      const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
      frames.push({
        time: d.toISOString(),
        label: `-${i * 5}m`,
        tileUrl: `${this.baseUrl}/ridge::${req.station.callsign}-${code}-${stamp}/{z}/{x}/{y}.png`,
      });
    }

    frames.push({
      time: now.toISOString(),
      label: 'LIVE',
      tileUrl: this.getTileUrl(req),
    });

    return frames;
  }
}

// ----------------------------------------------------------------------------
// 2. DRIVER: MOBILE RADAR & RESEARCH DRIVER (DOW / Smart-R / Climavision / Custom)
// ----------------------------------------------------------------------------
export class MobileResearchRadarDriver implements RadarSourceDriver {
  networkType: RadarNetworkType = 'mobile';

  getTileUrl(req: RadarTileRequest): string {
    // Dynamic endpoint for deployed mobile X/C-band trucks or research feeds
    return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${req.station.callsign}-N0B-0/{z}/{x}/{y}.png`;
  }

  getFrameLoop(req: RadarTileRequest, count = 6): { time: string; label: string; tileUrl: string }[] {
    const url = this.getTileUrl(req);
    return [
      { time: new Date().toISOString(), label: 'RAPID SCAN (60s)', tileUrl: url }
    ];
  }
}

// ----------------------------------------------------------------------------
// 3. CENTRAL RADAR REGISTRY (Extensible Engine)
// ----------------------------------------------------------------------------
export class RadarSiteRegistry {
  private static drivers: Map<RadarNetworkType, RadarSourceDriver> = new Map();
  private static stations: Map<string, RadarStation> = new Map();

  static initialize() {
    if (this.drivers.size > 0) return;

    // Register Default Network Drivers
    const noaaDriver = new NoaaWsR88DDriver();
    this.registerDriver('wsr88d', noaaDriver);
    this.registerDriver('tdwr', noaaDriver);
    
    const mobileDriver = new MobileResearchRadarDriver();
    this.registerDriver('mobile', mobileDriver);
    this.registerDriver('research', mobileDriver);
    this.registerDriver('private', mobileDriver);
    this.registerDriver('international', mobileDriver);

    // Seed Core US WSR-88D Fleet + FAA TDWR + Mobile Units
    this.seedComprehensiveStations();
  }

  static registerDriver(network: RadarNetworkType, driver: RadarSourceDriver) {
    this.drivers.set(network, driver);
  }

  static registerStation(station: RadarStation) {
    this.stations.set(station.id.toUpperCase(), station);
    this.stations.set(station.callsign.toUpperCase(), station);
  }

  static getStation(idOrCallsign: string): RadarStation {
    this.initialize();
    const query = idOrCallsign.toUpperCase().trim();
    return this.stations.get(query) || this.stations.get(query.replace(/^K/, '')) || this.getDefaultStation();
  }

  static getAllStations(filterNetwork?: RadarNetworkType): RadarStation[] {
    this.initialize();
    const unique = Array.from(new Set(this.stations.values()));
    if (!filterNetwork) return unique;
    return unique.filter((s) => s.network === filterNetwork);
  }

  static getDriverForStation(station: RadarStation): RadarSourceDriver {
    this.initialize();
    return this.drivers.get(station.network) || this.drivers.get('wsr88d')!;
  }

  static getDefaultStation(): RadarStation {
    return {
      id: 'KLZK',
      callsign: 'LZK',
      name: 'Little Rock, AR',
      lat: 34.836,
      lon: -92.262,
      elevationM: 174,
      network: 'wsr88d',
      country: 'US',
      state: 'AR',
      isOnline: true,
      supportedProducts: ['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp'],
      supportedTilts: ['0.5', '0.9', '1.3', '1.8'],
      vcpMode: 'VCP 212',
    };
  }

  private static seedComprehensiveStations() {
    // 1. PRIMARY WSR-88D NEXRAD STATIONS (CONUS)
    const wsr88dList: Partial<RadarStation>[] = [
      { id: 'KLZK', callsign: 'LZK', name: 'Little Rock, AR', lat: 34.836, lon: -92.262, elevationM: 174, state: 'AR' },
      { id: 'KSRX', callsign: 'SRX', name: 'Fort Smith / Western AR', lat: 35.290, lon: -94.362, elevationM: 254, state: 'AR' },
      { id: 'KTLX', callsign: 'TLX', name: 'Oklahoma City, OK', lat: 35.333, lon: -97.278, elevationM: 370, state: 'OK' },
      { id: 'KINX', callsign: 'INX', name: 'Tulsa, OK', lat: 36.175, lon: -95.564, elevationM: 204, state: 'OK' },
      { id: 'KFDR', callsign: 'FDR', name: 'Frederick, OK', lat: 34.362, lon: -98.976, elevationM: 384, state: 'OK' },
      { id: 'KFWS', callsign: 'FWS', name: 'Dallas / Fort Worth, TX', lat: 32.573, lon: -97.303, elevationM: 208, state: 'TX' },
      { id: 'KHGX', callsign: 'HGX', name: 'Houston / Galveston, TX', lat: 29.472, lon: -95.079, elevationM: 5, state: 'TX' },
      { id: 'KEWX', callsign: 'EWX', name: 'Austin / San Antonio, TX', lat: 29.704, lon: -98.028, elevationM: 192, state: 'TX' },
      { id: 'KAMA', callsign: 'AMA', name: 'Amarillo, TX', lat: 35.233, lon: -101.709, elevationM: 1093, state: 'TX' },
      { id: 'KLBB', callsign: 'LBB', name: 'Lubbock, TX', lat: 33.654, lon: -101.814, elevationM: 992, state: 'TX' },
      { id: 'KMAF', callsign: 'MAF', name: 'Midland / Odessa, TX', lat: 31.943, lon: -102.189, elevationM: 872, state: 'TX' },
      { id: 'KICT', callsign: 'ICT', name: 'Wichita, KS', lat: 37.654, lon: -97.443, elevationM: 406, state: 'KS' },
      { id: 'KDDC', callsign: 'DDC', name: 'Dodge City, KS', lat: 37.761, lon: -99.969, elevationM: 789, state: 'KS' },
      { id: 'KTOP', callsign: 'TOP', name: 'Topeka, KS', lat: 38.997, lon: -95.271, elevationM: 268, state: 'KS' },
      { id: 'KEAX', callsign: 'EAX', name: 'Kansas City / Pleasant Hill, MO', lat: 38.810, lon: -94.264, elevationM: 303, state: 'MO' },
      { id: 'KLSX', callsign: 'LSX', name: 'St. Louis, MO', lat: 38.699, lon: -90.683, elevationM: 185, state: 'MO' },
      { id: 'KSGF', callsign: 'SGF', name: 'Springfield, MO', lat: 37.235, lon: -93.401, elevationM: 390, state: 'MO' },
      { id: 'KNQA', callsign: 'NQA', name: 'Memphis, TN', lat: 35.345, lon: -89.873, elevationM: 85, state: 'TN' },
      { id: 'KOHX', callsign: 'OHX', name: 'Nashville, TN', lat: 36.247, lon: -86.563, elevationM: 173, state: 'TN' },
      { id: 'KMRX', callsign: 'MRX', name: 'Knoxville / Morristown, TN', lat: 36.168, lon: -83.402, elevationM: 405, state: 'TN' },
      { id: 'KBMX', callsign: 'BMX', name: 'Birmingham, AL', lat: 33.172, lon: -86.770, elevationM: 197, state: 'AL' },
      { id: 'KHTX', callsign: 'HTX', name: 'Huntsville, AL', lat: 34.931, lon: -86.084, elevationM: 536, state: 'AL' },
      { id: 'KMOB', callsign: 'MOB', name: 'Mobile, AL', lat: 30.679, lon: -88.240, elevationM: 63, state: 'AL' },
      { id: 'KFFC', callsign: 'FFC', name: 'Atlanta / Peachtree City, GA', lat: 33.363, lon: -84.566, elevationM: 264, state: 'GA' },
      { id: 'KPAH', callsign: 'PAH', name: 'Paducah, KY', lat: 37.068, lon: -88.772, elevationM: 110, state: 'KY' },
      { id: 'KLVX', callsign: 'LVX', name: 'Louisville, KY', lat: 38.006, lon: -85.944, elevationM: 219, state: 'KY' },
      { id: 'KIND', callsign: 'IND', name: 'Indianapolis, IN', lat: 39.708, lon: -86.280, elevationM: 241, state: 'IN' },
      { id: 'KLOT', callsign: 'LOT', name: 'Chicago, IL', lat: 41.604, lon: -88.085, elevationM: 202, state: 'IL' },
      { id: 'KILX', callsign: 'ILX', name: 'Lincoln / Central IL', lat: 40.151, lon: -89.337, elevationM: 177, state: 'IL' },
      { id: 'KDMX', callsign: 'DMX', name: 'Des Moines, IA', lat: 41.731, lon: -93.723, elevationM: 299, state: 'IA' },
      { id: 'KOAX', callsign: 'OAX', name: 'Omaha, NE', lat: 41.320, lon: -96.366, elevationM: 347, state: 'NE' },
      { id: 'KMPX', callsign: 'MPX', name: 'Minneapolis / St. Paul, MN', lat: 44.849, lon: -93.565, elevationM: 288, state: 'MN' },
      { id: 'KMKX', callsign: 'MKX', name: 'Milwaukee, WI', lat: 42.968, lon: -88.551, elevationM: 292, state: 'WI' },
      { id: 'KFTG', callsign: 'FTG', name: 'Denver / Boulder, CO', lat: 39.786, lon: -104.546, elevationM: 1673, state: 'CO' },
      { id: 'KABX', callsign: 'ABX', name: 'Albuquerque, NM', lat: 35.150, lon: -106.824, elevationM: 1789, state: 'NM' },
      { id: 'KIWA', callsign: 'IWA', name: 'Phoenix, AZ', lat: 33.289, lon: -111.670, elevationM: 412, state: 'AZ' },
      { id: 'KMUX', callsign: 'MUX', name: 'San Francisco Bay Area, CA', lat: 37.155, lon: -121.898, elevationM: 1057, state: 'CA' },
      { id: 'KATX', callsign: 'ATX', name: 'Seattle / Tacoma, WA', lat: 48.195, lon: -122.496, elevationM: 152, state: 'WA' },
      { id: 'KMLB', callsign: 'MLB', name: 'Melbourne / Space Coast, FL', lat: 28.113, lon: -80.654, elevationM: 11, state: 'FL' },
      { id: 'KAMX', callsign: 'AMX', name: 'Miami, FL', lat: 25.611, lon: -80.413, elevationM: 4, state: 'FL' },
      { id: 'KTBW', callsign: 'TBW', name: 'Tampa Bay, FL', lat: 27.705, lon: -82.402, elevationM: 12, state: 'FL' },
      { id: 'KLWX', callsign: 'LWX', name: 'Washington DC / Baltimore, MD', lat: 38.975, lon: -77.487, elevationM: 95, state: 'VA' },
      { id: 'KOKX', callsign: 'OKX', name: 'New York City / Upton, NY', lat: 40.866, lon: -72.864, elevationM: 26, state: 'NY' },
      { id: 'KBOX', callsign: 'BOX', name: 'Boston, MA', lat: 41.956, lon: -71.137, elevationM: 36, state: 'MA' },
    ];

    wsr88dList.forEach((s) => {
      this.registerStation({
        id: s.id!,
        callsign: s.callsign!,
        name: s.name!,
        lat: s.lat!,
        lon: s.lon!,
        elevationM: s.elevationM || 200,
        network: 'wsr88d',
        country: 'US',
        state: s.state,
        isOnline: true,
        supportedProducts: ['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp'],
        supportedTilts: ['0.5', '0.9', '1.3', '1.8'],
        vcpMode: 'VCP 212 Convective',
      });
    });

    // 2. FAA TERMINAL DOPPLER WEATHER RADARS (TDWR High-Resolution Airport Radars)
    const tdwrList: Partial<RadarStation>[] = [
      { id: 'TDFW', callsign: 'DFW', name: 'DFW Airport TDWR, TX', lat: 32.915, lon: -97.027, state: 'TX' },
      { id: 'TDAL', callsign: 'DAL', name: 'Dallas Love Field TDWR, TX', lat: 32.847, lon: -96.852, state: 'TX' },
      { id: 'TIAH', callsign: 'IAH', name: 'Houston Bush Intercontinental TDWR, TX', lat: 29.984, lon: -95.341, state: 'TX' },
      { id: 'THOU', callsign: 'HOU', name: 'Houston Hobby TDWR, TX', lat: 29.645, lon: -95.278, state: 'TX' },
      { id: 'TORD', callsign: 'ORD', name: 'Chicago O’Hare TDWR, IL', lat: 41.974, lon: -87.907, state: 'IL' },
      { id: 'TMDW', callsign: 'MDW', name: 'Chicago Midway TDWR, IL', lat: 41.786, lon: -87.752, state: 'IL' },
      { id: 'TATL', callsign: 'ATL', name: 'Atlanta Hartsfield TDWR, GA', lat: 33.640, lon: -84.427, state: 'GA' },
      { id: 'TJFK', callsign: 'JFK', name: 'New York JFK TDWR, NY', lat: 40.639, lon: -73.778, state: 'NY' },
      { id: 'TEWR', callsign: 'EWR', name: 'Newark Liberty TDWR, NJ', lat: 40.692, lon: -74.168, state: 'NJ' },
      { id: 'TMCO', callsign: 'MCO', name: 'Orlando International TDWR, FL', lat: 28.429, lon: -81.316, state: 'FL' },
      { id: 'TMIA', callsign: 'MIA', name: 'Miami International TDWR, FL', lat: 25.795, lon: -80.287, state: 'FL' },
      { id: 'TMCI', callsign: 'MCI', name: 'Kansas City Airport TDWR, MO', lat: 39.297, lon: -94.713, state: 'MO' },
      { id: 'TSTL', callsign: 'STL', name: 'St. Louis Lambert TDWR, MO', lat: 38.748, lon: -90.370, state: 'MO' },
      { id: 'TMEM', callsign: 'MEM', name: 'Memphis International TDWR, TN', lat: 35.042, lon: -89.976, state: 'TN' },
      { id: 'TBNA', callsign: 'BNA', name: 'Nashville International TDWR, TN', lat: 36.124, lon: -86.678, state: 'TN' },
      { id: 'TCLT', callsign: 'CLT', name: 'Charlotte Douglas TDWR, NC', lat: 35.214, lon: -80.943, state: 'NC' },
      { id: 'TDEN', callsign: 'DEN', name: 'Denver International TDWR, CO', lat: 39.856, lon: -104.673, state: 'CO' },
      { id: 'TPHX', callsign: 'PHX', name: 'Phoenix Sky Harbor TDWR, AZ', lat: 33.434, lon: -112.008, state: 'AZ' },
    ];

    tdwrList.forEach((s) => {
      this.registerStation({
        id: s.id!,
        callsign: s.callsign!,
        name: s.name!,
        lat: s.lat!,
        lon: s.lon!,
        elevationM: 180,
        network: 'tdwr',
        country: 'US',
        state: s.state,
        isOnline: true,
        supportedProducts: ['ref', 'vel'],
        supportedTilts: ['0.2', '0.6', '1.0'],
        vcpMode: 'VCP 80 High-Res Airport',
      });
    });

    // 3. RESEARCH & MOBILE RADARS (NSSL / OU / DOW / Chaser Units)
    const researchMobileList: RadarStation[] = [
      {
        id: 'KOUN',
        callsign: 'OUN',
        name: 'Norman, OK (NSSL / NOAA Dual-Pol Testbed)',
        lat: 35.236,
        lon: -97.462,
        elevationM: 357,
        network: 'research',
        country: 'US',
        state: 'OK',
        isOnline: true,
        supportedProducts: ['ref', 'vel', 'cc', 'zdr', 'kdp'],
        supportedTilts: ['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'],
        vcpMode: 'NSSL Experimental Rapid Scan',
      },
      {
        id: 'DOW-7',
        callsign: 'DOW7',
        name: 'Doppler on Wheels 7 (Mobile Severe Unit)',
        lat: 35.467,
        lon: -97.516,
        elevationM: 365,
        network: 'mobile',
        country: 'US',
        state: 'OK',
        isOnline: true,
        supportedProducts: ['ref', 'vel'],
        supportedTilts: ['0.5', '1.0', '1.5'],
        vcpMode: 'Mobile FastScan 30s',
      },
      {
        id: 'CASPR-1',
        callsign: 'CASP1',
        name: 'Climavision High-Res Gap Radar (Private Network)',
        lat: 36.162,
        lon: -86.781,
        elevationM: 180,
        network: 'private',
        country: 'US',
        state: 'TN',
        isOnline: true,
        supportedProducts: ['ref', 'vel'],
        supportedTilts: ['0.5'],
        vcpMode: 'Low-Level Supplementary Scan',
      },
      {
        id: 'CASS-SPOTTER',
        callsign: 'SPOT1',
        name: 'Spotter Network Mobile Radar Node (Field Deployed)',
        lat: 35.222,
        lon: -101.831,
        elevationM: 1090,
        network: 'spotter',
        country: 'US',
        state: 'TX',
        isOnline: true,
        supportedProducts: ['ref'],
        supportedTilts: ['0.5'],
        vcpMode: 'Chaser Tactical Observation',
      },
    ];

    researchMobileList.forEach((s) => this.registerStation(s));
  }
}
