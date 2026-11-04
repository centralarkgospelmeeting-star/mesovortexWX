'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { RADAR_PRODUCTS, RADAR_SITES } from '../lib/radar-config';

const RadarMap = dynamic(
  () => import('../components/RadarMap').then((module) => module.RadarMap),
  { ssr: false, loading: () => <div className="radar-map-container map-loading" /> }
);

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'dualpol' | 'et' | 'vil';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type AlertItem = { id: string; headline: string; severity: string; area: string; sent: string };

const mapTypes: { id: MapType; label: string }[] = [
  { id: 'street', label: 'Street' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'globe', label: 'Globe' }
];

export default function Page() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KOUN');
  const [mapType, setMapType] = useState<MapType>('street');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLooping, setIsLooping] = useState(false);
  const selectedProduct = RADAR_PRODUCTS.find((item) => item.key === product);
  const selectedSite = RADAR_SITES.find((site) => site.id === radarSite);

  useEffect(() => {
    const loadAlerts = () => fetch('/api/alerts')
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]));
    loadAlerts();
    const interval = setInterval(loadAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="radar-app">
      <header className="radar-toolbar">
        <a className="brand" href="/" aria-label="MesoVortexWX home">
          <span className="brand-mark" aria-hidden="true"><span>Ｍ</span></span>
          <span className="brand-name">MesoVortex<span>WX</span></span>
        </a>
        <nav className="mode-tabs" aria-label="Map style">
          {mapTypes.map((type) => (
            <button key={type.id} type="button" className={`mode-tab ${mapType === type.id ? 'active' : ''}`} onClick={() => setMapType(type.id)} aria-pressed={mapType === type.id}>
              {type.label}
            </button>
          ))}
        </nav>
        <div className="toolbar-actions">
          <label className="site-picker" aria-label="Select radar site">
            <span className="site-dot" />
            <select value={radarSite} onChange={(event) => setRadarSite(event.target.value)}>
              {RADAR_SITES.map((site) => <option key={site.id} value={site.id}>{site.id} · {site.name}</option>)}
            </select>
          </label>
          <span className="live-indicator"><i /> LIVE</span>
        </div>
      </header>

      {alerts.length > 0 && <div className="map-alert"><AlertBanner alert={alerts[0]} /></div>}

      <section className="map-canvas" aria-label="Interactive weather radar map">
        <RadarMap product={product} isLooping={isLooping} radarSite={radarSite} mapType={mapType} />
        <div className="map-location-chip"><strong>{selectedSite?.name ?? 'Radar site'}</strong><span>{radarSite} · NEXRAD</span></div>
        <div className="radar-panel">
          <div className="panel-heading"><div><span className="eyebrow">RADAR PRODUCT</span><strong>{selectedProduct?.label ?? 'Reflectivity'}</strong></div><span className="product-dot" /></div>
          <select className="product-picker" value={product} onChange={(event) => setProduct(event.target.value as RadarProduct)} aria-label="Radar product">
            {RADAR_PRODUCTS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <div className="legend-title">Reflectivity · dBZ</div><div className="legend-bar" />
          <div className="legend-values"><span>-10</span><span>15</span><span>25</span><span>35</span><span>45</span><span>60+</span></div>
          <div className="panel-footnote">{selectedSite?.name ?? radarSite} radar · Live RainViewer imagery</div>
        </div>
        <div className="timeline-bar">
          <button className={`play-button ${isLooping ? 'playing' : ''}`} type="button" onClick={() => setIsLooping((value) => !value)} aria-label={isLooping ? 'Stop radar loop' : 'Play radar loop'}>{isLooping ? 'Ⅱ' : '▶'}</button>
          <div className="timeline-content"><div className="timeline-labels"><span>{isLooping ? 'RADAR LOOP PLAYING' : 'RADAR LOOP'}</span><span>Latest scan</span></div><div className={`timeline-track ${isLooping ? 'is-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><b /></div></div>
          <span className="timeline-time">NOW</span>
        </div>
      </section>
    </main>
  );
}
