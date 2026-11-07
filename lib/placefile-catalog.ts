export type PlacefileCategory =
  | 'Surface & Mesonets'
  | 'Lightning & mPING'
  | 'Severe & Warnings'
  | 'SPC Outlooks & Fire'
  | 'Marine, Tropical & Hydro'
  | 'Infrastructure & Geohazards';

export type PlacefileMeta = {
  id: string;
  name: string;
  category: PlacefileCategory;
  url: string;
  description: string;
  defaultEnabled?: boolean;
};

export const PLACEFILE_NATION_CATALOG: PlacefileMeta[] = [
  // 1. Surface & Mesonets
  {
    id: 'pfn-metars',
    name: 'METAR Station Plots',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/metars.php',
    description: 'Full surface METAR airport station observation plots.',
    defaultEnabled: true,
  },
  {
    id: 'pfn-conditions',
    name: 'Weather Conditions',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/conditions.php',
    description: 'Current weather condition icons (rain, snow, fog, clear).',
  },
  {
    id: 'pfn-temps',
    name: 'Surface Temperatures',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/temps.php',
    description: 'Current ambient air temperature readings (°F).',
  },
  {
    id: 'pfn-dp',
    name: 'Dew Point Temperatures',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/dp.php',
    description: 'Surface dew points (°F) to track drylines and moisture return.',
  },
  {
    id: 'pfn-wind-gusts',
    name: 'Peak Wind Gusts',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/wind_gusts.php',
    description: 'Observed peak wind gusts (mph / knots).',
  },
  {
    id: 'pfn-gusts',
    name: 'Current Gusts',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/gusts.php',
    description: 'Real-time wind gust reports.',
  },
  {
    id: 'pfn-vis',
    name: 'Visibility',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/vis.php',
    description: 'Surface visibility in statute miles (fog, smoke, blizzard).',
  },
  {
    id: 'pfn-wc',
    name: 'Wind Chill Index',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/wc.php',
    description: 'Real-time winter wind chill temperatures.',
  },
  {
    id: 'pfn-hi',
    name: 'Heat Index',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/hi.php',
    description: 'Summer apparent heat index values.',
  },
  {
    id: 'pfn-raws',
    name: 'RAWS Stations',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/RAWS.php',
    description: 'Remote Automated Weather Stations for wildland and fire weather.',
  },
  {
    id: 'pfn-okmesonet',
    name: 'Oklahoma Mesonet',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/okmesonet.php',
    description: 'High-density research mesonet across Oklahoma.',
  },
  {
    id: 'pfn-kymesonet',
    name: 'Kentucky Mesonet',
    category: 'Surface & Mesonets',
    url: 'https://placefilenation.com/Placefiles/kymesonet.php',
    description: 'Official Kentucky statewide environmental mesonet.',
  },

  // 2. Lightning & mPING
  {
    id: 'pfn-glm-lightning',
    name: 'GOES GLM Satellite Lightning',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/glm_lightning.php',
    description: 'NOAA GOES Geostationary Lightning Mapper optical flash events.',
    defaultEnabled: true,
  },
  {
    id: 'pfn-20lightning',
    name: 'Lightning (Past 20 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/20lightning.php',
    description: 'Recent cloud-to-ground lightning strikes under 20 minutes old.',
  },
  {
    id: 'pfn-40lightning',
    name: 'Lightning (Past 40 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/40lightning.php',
    description: 'Lightning strike history decaying up to 40 minutes.',
  },
  {
    id: 'pfn-60lightning',
    name: 'Lightning (Past 60 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/60lightning.php',
    description: '1-hour accumulated strike density.',
  },
  {
    id: 'pfn-mping-15',
    name: 'mPING Reports (15 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/mping_15min.php',
    description: 'NSSL crowdsourced weather reports (hail, tornado, rain, snow).',
  },
  {
    id: 'pfn-mping-30',
    name: 'mPING Reports (30 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/mping_30min.php',
    description: '30-minute crowdsourced precipitation observations.',
  },
  {
    id: 'pfn-mping-60',
    name: 'mPING Reports (60 min)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/mping_60min.php',
    description: '1-hour crowdsourced storm reports.',
  },
  {
    id: 'pfn-mping-300',
    name: 'mPING Reports (5 Hours)',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/mping_300min.php',
    description: 'Extended 5-hour crowdsourced severe weather trail.',
  },
  {
    id: 'pfn-cocorahs-rain',
    name: 'CoCoRaHS Rain Accumulation',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/cocorahs_rain.php',
    description: 'Community Collaborative Rain, Hail & Snow Network rain gauge totals.',
  },
  {
    id: 'pfn-cocorahs-snow',
    name: 'CoCoRaHS Snow Totals',
    category: 'Lightning & mPING',
    url: 'https://placefilenation.com/Placefiles/cocorahs_snow.php',
    description: 'Measured snowfall and snowpack depths.',
  },

  // 3. Severe & Warnings
  {
    id: 'pfn-nws-polygons',
    name: 'NWS Warning Polygons',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/nws_polygons.php',
    description: 'Live polygon warnings for Tornado, Severe Thunderstorm & Flash Flood.',
    defaultEnabled: true,
  },
  {
    id: 'pfn-nws-marine-polygons',
    name: 'NWS Marine Warnings',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/nws_marine_polygons.php',
    description: 'Special Marine Warnings across coastal and offshore sectors.',
  },
  {
    id: 'pfn-severe-watch',
    name: 'Tornado & Severe Watch Boxes',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/severeWatch.php',
    description: 'SPC Tornado Watch & Severe Thunderstorm Watch boxes.',
    defaultEnabled: true,
  },
  {
    id: 'pfn-alert-areas',
    name: 'NWS Alert Areas',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/alert-areas.php',
    description: 'County-based weather advisories, watches, and warnings.',
  },
  {
    id: 'pfn-alert-areas-noicons',
    name: 'NWS Alert Areas (Clean)',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/alert-areas_noicons.php',
    description: 'County alert boundaries without overlay icons.',
  },
  {
    id: 'pfn-alert-marine-areas',
    name: 'Marine Alert Areas',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/alert-marine-areas.php',
    description: 'Offshore gale, storm, and hurricane force wind advisories.',
  },
  {
    id: 'pfn-tornado-reports',
    name: 'Tornado Reports',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/tornado.php',
    description: 'Verified NWS Local Storm Reports of confirmed tornadoes.',
  },
  {
    id: 'pfn-hail-reports',
    name: 'Hail Reports',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/hail.php',
    description: 'Severe hail reports with diameter measurements in inches.',
  },
  {
    id: 'pfn-wind-reports',
    name: 'Wind Damage Reports',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/wind.php',
    description: 'Measured wind gusts (>58 mph) and structural/tree damage.',
  },
  {
    id: 'pfn-spot-network',
    name: 'Spotter Network (Verified)',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/spot-placefile.php',
    description: 'Verified Spotter Network chaser locations and storm reports.',
  },
  {
    id: 'pfn-spot-network-pending',
    name: 'Spotter Network (Pending)',
    category: 'Severe & Warnings',
    url: 'https://placefilenation.com/Placefiles/spot-placefile-pending.php',
    description: 'Pending and unverified real-time storm spotter reports.',
  },

  // 4. SPC Outlooks & Fire
  {
    id: 'pfn-spcday1',
    name: 'SPC Day 1 Convective Lines',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/spcday1.php',
    description: 'Day 1 categorical outlook line contours.',
  },
  {
    id: 'pfn-day1-shaded',
    name: 'SPC Day 1 Shaded Risk',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/day1_shaded.php',
    description: 'Full color shaded risk areas (MRGL, SLGT, ENH, MDT, HIGH).',
  },
  {
    id: 'pfn-spcday2',
    name: 'SPC Day 2 Convective Lines',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/spcday2.php',
    description: 'Day 2 severe thunderstorm categorical outlook boundaries.',
  },
  {
    id: 'pfn-day2-shaded',
    name: 'SPC Day 2 Shaded Risk',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/day2_shaded.php',
    description: 'Day 2 full color risk fills.',
  },
  {
    id: 'pfn-spcday3',
    name: 'SPC Day 3 Convective Lines',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/spcday3.php',
    description: 'Day 3 severe weather boundaries.',
  },
  {
    id: 'pfn-day3-shaded',
    name: 'SPC Day 3 Shaded Risk',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/day3_shaded.php',
    description: 'Day 3 full color risk fills.',
  },
  {
    id: 'pfn-mcd',
    name: 'Mesoscale Discussions (MCD)',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/mcd.php',
    description: 'Active SPC Mesoscale Convective Discussions with watch probabilities.',
  },
  {
    id: 'pfn-day1firewx',
    name: 'SPC Day 1 Fire Outlook',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/day1firewx.php',
    description: 'Critical and extreme wildfire weather risk corridors.',
  },
  {
    id: 'pfn-day2firewx',
    name: 'SPC Day 2 Fire Outlook',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/day2firewx.php',
    description: 'Day 2 fire weather hazard zones.',
  },
  {
    id: 'pfn-wildfire',
    name: 'Wildfire Perimeters',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/wildfile_placefile.php',
    description: 'Active burning wildfire footprints and incident locations.',
  },
  {
    id: 'pfn-fire-danger',
    name: 'Fire Danger Monitor',
    category: 'SPC Outlooks & Fire',
    url: 'https://placefilenation.com/Placefiles/fire_danger_monitor.php',
    description: 'Real-time regional fuel dryness and fire risk levels.',
  },

  // 5. Marine, Tropical & Hydro
  {
    id: 'pfn-buoys',
    name: 'Marine Weather Buoys',
    category: 'Marine, Tropical & Hydro',
    url: 'https://placefilenation.com/Placefiles/buoys.php',
    description: 'NOAA National Data Buoy Center (NDBC) wave heights, water temp & winds.',
  },
  {
    id: 'pfn-nhc',
    name: 'NHC Atlantic Tropical Outlook',
    category: 'Marine, Tropical & Hydro',
    url: 'https://placefilenation.com/Placefiles/nhc.php',
    description: 'National Hurricane Center Atlantic basin tropical systems & cones.',
  },
  {
    id: 'pfn-epnhc',
    name: 'NHC Eastern Pacific Outlook',
    category: 'Marine, Tropical & Hydro',
    url: 'https://placefilenation.com/Placefiles/epnhc.php',
    description: 'Eastern North Pacific tropical cyclones & disturbances.',
  },
  {
    id: 'pfn-ahps-alerts',
    name: 'AHPS River Flood Alerts',
    category: 'Marine, Tropical & Hydro',
    url: 'https://placefilenation.com/Placefiles/ahps-placefile-alerts.php',
    description: 'Advanced Hydrologic Prediction Service river gauge flood stages.',
  },
  {
    id: 'pfn-ahps',
    name: 'AHPS River Gauges',
    category: 'Marine, Tropical & Hydro',
    url: 'https://placefilenation.com/Placefiles/ahps-placefile.php',
    description: 'Full nationwide USGS / NWS river gauge water level monitoring.',
  },

  // 6. Infrastructure & Geohazards
  {
    id: 'pfn-cwa-boundaries',
    name: 'NWS CWA County Warning Areas',
    category: 'Infrastructure & Geohazards',
    url: 'https://placefilenation.com/Placefiles/nws_cwa_boundaries.php',
    description: 'NWS Weather Forecast Office responsibility border lines.',
  },
  {
    id: 'pfn-radar-status',
    name: 'NEXRAD Radar Status',
    category: 'Infrastructure & Geohazards',
    url: 'https://placefilenation.com/Placefiles/radar_status.php',
    description: 'Operational status, maintenance, and VCP mode for all WSR-88D radars.',
  },
  {
    id: 'pfn-noaaradio',
    name: 'NOAA Weather Radio Transmitters',
    category: 'Infrastructure & Geohazards',
    url: 'https://placefilenation.com/Placefiles/noaaradio.php',
    description: 'NOAA Weather Radio broadcast tower coverage and frequencies.',
  },
  {
    id: 'pfn-quakes-1h',
    name: 'Earthquakes (Past Hour)',
    category: 'Infrastructure & Geohazards',
    url: 'https://placefilenation.com/Placefiles/earthquakes_last_hour.php',
    description: 'USGS seismic tremors and earthquake epicenters in the last 60 minutes.',
  },
  {
    id: 'pfn-quakes-24h',
    name: 'Earthquakes (Past 24 Hours)',
    category: 'Infrastructure & Geohazards',
    url: 'https://placefilenation.com/Placefiles/earthquakes_last_day.php',
    description: '24-hour USGS global seismic activity with magnitude markers.',
  },
];
