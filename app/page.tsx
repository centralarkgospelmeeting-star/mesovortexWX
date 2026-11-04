'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { RADAR_PRODUCTS, RADAR_SITES } from '../lib/radar-config';

const RadarMap = dynamic(
  () => import('../components/RadarMap').then((module) => module.RadarMap),
  { ssr: false, loading: () => <div className="radar-map-container map-loading" /> }
);

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type AlertItem = { id: string; headline: string; severity: string; area: string; sent: string };
type FeatureKey = 'chat' | 'lightning' | 'outlooks' | 'reports' | 'crowd' | 'risk' | 'models' | 'soundings' | '3d';

const mapTypes: { id: MapType; label: string }[] = [
  { id: 'street', label: 'Street' }, { id: 'terrain', label: 'Terrain' },
  { id: 'satellite', label: 'Satellite' }, { id: 'globe', label: 'Globe' }
];

const features: { id: FeatureKey; label: string; icon: string; description: string; requirement: string }[] = [
  { id: 'chat', label: 'AI Weather Assistant', icon: '✦', description: 'Ask questions about weather and the current radar view.', requirement: 'Requires OPENAI_API_KEY configured in deployment environment variables.' },
  { id: 'lightning', label: 'Lightning Layer', icon: 'ϟ', description: 'Overlay live lightning strike observations.', requirement: 'Needs a licensed or public lightning data feed; no strikes are fabricated.' },
  { id: 'outlooks', label: 'SPC Outlook Layer', icon: '◉', description: 'Display Storm Prediction Center convective outlooks.', requirement: 'SPC outlook GeoJSON/feed integration is not connected yet.' },
  { id: 'reports', label: 'Storm Reports', icon: '⚑', description: 'Show official preliminary storm reports on the map.', requirement: 'SPC storm-report feed integration is not connected yet.' },
  { id: 'crowd', label: 'Crowd Reports', icon: '＋', description: 'Collect and review community-submitted observations.', requirement: 'Needs a database, moderation, and abuse-prevention service.' },
  { id: 'risk', label: 'Personal Risk Score', icon: '⌁', description: 'Summarize weather threats for a chosen location.', requirement: 'Needs location consent and verified alert/forecast inputs; no score is guessed.' },
  { id: 'models', label: 'Multi-Model Viewer', icon: '▦', description: 'Compare forecast model fields and valid times.', requirement: 'Needs forecast model data and rendering pipeline.' },
  { id: 'soundings', label: 'Soundings', icon: '⌇', description: 'Explore vertical atmospheric profiles and indices.', requirement: 'Needs an observed or model sounding data source.' },
  { id: '3d', label: '3D Radar', icon: '⬡', description: 'Inspect volumetric radar sweeps in three dimensions.', requirement: 'Needs raw Level II scan decoding and a volumetric renderer; this map currently displays Level III tiles.' }
];

export default function Page() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KTLX');
  const [mapType, setMapType] = useState<MapType>('street');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);
  const selectedProduct = RADAR_PRODUCTS.find((item) => item.key === product);
  const selectedSite = RADAR_SITES.find((site) => site.id === radarSite);
  const featurePanel = features.find((feature) => feature.id === activeFeature);
  const isAssistantOpen = activeFeature === 'chat';

  useEffect(() => {
    const loadAlerts = () => fetch('/api/alerts').then((res) => res.json()).then((data) => setAlerts(data.alerts || [])).catch(() => setAlerts([]));
    loadAlerts();
    const interval = setInterval(loadAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="radar-app">
      <header className="radar-toolbar">
        <a className="brand" href="/" aria-label="MesoVortexWX home"><span className="brand-mark" aria-hidden="true"><span>Ｍ</span></span><span className="brand-name">MesoVortex<span>WX</span></span></a>
        <nav className="mode-tabs" aria-label="Map style">
          {mapTypes.map((type) => <button key={type.id} type="button" className={`mode-tab ${mapType === type.id ? 'active' : ''}`} onClick={() => setMapType(type.id)} aria-pressed={mapType === type.id}>{type.label}</button>)}
        </nav>
        <div className="toolbar-actions">
          <label className="site-picker" aria-label="Select NEXRAD radar site"><span className="site-dot" /><select value={radarSite} onChange={(event) => setRadarSite(event.target.value)}>{RADAR_SITES.map((site) => <option key={site.id} value={site.id}>{site.radarId} · {site.name}</option>)}</select></label>
          <span className="live-indicator"><i /> NEXRAD</span>
        </div>
      </header>
      {alerts.length > 0 && <div className="map-alert"><AlertBanner alert={alerts[0]} /></div>}
      <section className="map-canvas" aria-label="Interactive NEXRAD weather radar map">
        <RadarMap product={product} radarSite={radarSite} mapType={mapType} />
        <div className="map-location-chip"><strong>{selectedSite?.name ?? 'Radar site'}</strong><span>NOAA NEXRAD · {selectedSite?.radarId ?? radarSite}</span></div>

        <aside className="feature-dock" aria-label="Weather tools">
          <div className="dock-caption">TOOLS</div>
          {features.map((feature) => <button key={feature.id} type="button" className={`dock-item ${activeFeature === feature.id ? 'selected' : ''}`} onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)} aria-pressed={activeFeature === feature.id}>
            <span className="dock-icon">{feature.icon}</span><span>{feature.label}</span><b>+</b>
          </button>)}
        </aside>

        {isAssistantOpen && <WeatherAssistant
          key="weather-assistant"
          context={{
            site: `${selectedSite?.radarId ?? radarSite} · ${selectedSite?.name ?? 'Selected site'}`,
            product: selectedProduct?.label ?? product,
            alerts: alerts.slice(0, 5).map((alert) => `${alert.severity}: ${alert.headline} (${alert.area})`)
          }}
          onClose={() => setActiveFeature(null)}
        />}

        {featurePanel && activeFeature !== 'chat' && <div className="feature-detail" role="dialog" aria-modal="false" aria-labelledby="feature-title">
          <button type="button" className="feature-close" onClick={() => setActiveFeature(null)} aria-label="Close tool details">×</button>
          <span className="eyebrow">WEATHER TOOL</span><h2 id="feature-title">{featurePanel.label}</h2>
          <p>{featurePanel.description}</p><div className="feature-status"><span className="feature-status-dot" />Integration needed</div>
          <p className="feature-requirement">{featurePanel.requirement}</p>
        </div>}

        <div className="radar-panel">
          <div className="panel-heading"><div><span className="eyebrow">LIVE NEXRAD · LEVEL III</span><strong>{selectedProduct?.label ?? 'Reflectivity'}</strong></div><span className="product-dot" /></div>
          <div className="product-tabs" role="group" aria-label="NEXRAD radar products">
            {RADAR_PRODUCTS.map((item) => <button key={item.key} type="button" className={product === item.key ? 'active' : ''} title={item.description} onClick={() => setProduct(item.key as RadarProduct)}>{item.label}</button>)}
          </div>
          <div className="legend-title">{product === 'vel' || product === 'srvel' ? 'Radial velocity' : product === 'cc' ? 'Correlation coefficient' : product === 'zdr' ? 'Differential reflectivity' : product === 'kdp' ? 'Specific differential phase' : 'Reflectivity'}</div><div className="legend-bar" />
          <div className="legend-values"><span>Low</span><span>Moderate</span><span>High</span><span>Severe</span></div>
          <div className="panel-footnote">Station-specific radar tiles · Iowa Environmental Mesonet / NOAA NEXRAD. Product availability may vary by station.</div>
          <button className="radar-refresh" type="button" onClick={() => window.dispatchEvent(new Event('mesovortex:refresh-radar'))}>Refresh latest scan</button>
        </div>
        <div className="timeline-bar"><span className="live-scan-dot" /><div className="timeline-content"><div className="timeline-labels"><span>STATION-SPECIFIC NEXRAD</span><span>Latest available scan</span></div><div className="timeline-track"><i /><i /><i /><i /><i /><i /><i /><b /></div></div><span className="timeline-time">LIVE</span></div>
      </section>
    </main>
  );
}
