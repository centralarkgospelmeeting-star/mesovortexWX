'use client';

import { useState, useEffect } from 'react';
import { RadarMap, BasemapType } from '../components/RadarMap';
import { UniversalLegend } from '../components/UniversalLegend';
import { MainNavbar, MainNavTab } from '../components/MainNavbar';
import { FloatingProductPanel } from '../components/FloatingProductPanel';
import { WarningDrawerRight, WarningAlert } from '../components/WarningDrawerRight';
import { WarningDetailsPopup } from '../components/WarningDetailsPopup';
import { MainMenuDrawer } from '../components/MainMenuDrawer';
import { SettingsWorkspace } from '../components/SettingsWorkspace';
import { RADAR_SITES } from '../lib/radar-config';

export default function MesoVortexApp() {
  // Navigation & Product
  const [tab, setTab] = useState<MainNavTab>('Radar');
  const [product, setProduct] = useState('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('US');
  const [radarOpacity, setRadarOpacity] = useState(0.88);

  // Basemap
  const [basemap, setBasemap] = useState<BasemapType>('satellite-streets');

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [timestampLabel, setTimestampLabel] = useState('LIVE');

  // Overlays
  const [showLightning, setShowLightning] = useState(true);
  const [showLSR, setShowLSR] = useState(true);
  const [showWatches, setShowWatches] = useState(true);
  const [showStormTracks, setShowStormTracks] = useState(true);
  const [showRadarPills, setShowRadarPills] = useState(true);

  // Drawers & Modals
  const [warningDrawerOpen, setWarningDrawerOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<WarningAlert | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Live Alerts
  const [alerts, setAlerts] = useState<WarningAlert[]>([]);

  useEffect(() => {
    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
      .then((res) => res.json())
      .then((data) => {
        const items = (data.features || []).map((f: any, i: number) => ({
          id: f.id || `alert-${i}`,
          event: f.properties?.event || 'Weather Advisory',
          headline: f.properties?.headline || f.properties?.event,
          severity: f.properties?.severity || 'Moderate',
          areaDesc: f.properties?.areaDesc || '',
          sent: f.properties?.sent || '',
          expires: f.properties?.expires || '',
          wfo: f.properties?.senderName || 'NWS',
        }));
        setAlerts(items);
      })
      .catch((err) => console.warn('[Alerts Fetch Error]:', err));
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] select-none font-sans text-slate-100">
      
      {/* 1. UNIVERSAL LEGEND STRIP (Pinned at the very top edge, Section 2.A) */}
      <UniversalLegend
        type={
          tab === 'Outlooks' ? 'spc' :
          tab === 'Satellite' ? 'satellite' :
          product === 'vel' || product === 'srvel' ? 'vel' :
          product === 'cc' ? 'cc' :
          product === 'zdr' ? 'zdr' :
          'ref'
        }
      />

      {/* 2. MAIN NAVIGATION BAR (Section 2.B) */}
      <MainNavbar
        activeTab={tab}
        onSelectTab={(t) => setTab(t)}
        warningCount={alerts.length}
        onToggleWarningDrawer={() => setWarningDrawerOpen((v) => !v)}
        onToggleMainMenu={() => setMenuOpen(true)}
        onSearchLocation={(query) => {
          const match = RADAR_SITES.find(
            (s) =>
              s.id.toLowerCase().includes(query.toLowerCase()) ||
              s.name.toLowerCase().includes(query.toLowerCase())
          );
          if (match) setRadarSite(match.id);
        }}
      />

      {/* 3. FULL MAP WORKSPACE (Map-First, Section 2.C) */}
      <div className="absolute inset-0">
        <RadarMap
          product={product}
          radarSite={radarSite}
          mode={tab as any}
          basemap={basemap}
          tilt={tilt}
          onSelectSite={(id) => setRadarSite(id)}
        />
      </div>

      {/* 4. FLOATING LOWER-LEFT PRODUCT PANEL WITH EMBEDDED PLAYBACK (Section 3) */}
      <FloatingProductPanel
        tab={tab}
        currentSiteId={radarSite}
        onSelectSite={(id) => setRadarSite(id)}
        product={product}
        onSelectProduct={(p) => setProduct(p)}
        tilt={tilt}
        onSelectTilt={(t) => setTilt(t)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onStepFrame={(dir) => setTimestampLabel(dir === -1 ? '-10m' : 'LIVE')}
        onGoLive={() => {
          setIsPlaying(false);
          setTimestampLabel('LIVE');
        }}
        timestampLabel={timestampLabel}
        radarOpacity={radarOpacity}
        onChangeOpacity={(op) => setRadarOpacity(op)}
        showLightning={showLightning}
        onToggleLightning={() => setShowLightning((v) => !v)}
        showLSR={showLSR}
        onToggleLSR={() => setShowLSR((v) => !v)}
        showWatches={showWatches}
        onToggleWatches={() => setShowWatches((v) => !v)}
        showStormTracks={showStormTracks}
        onToggleStormTracks={() => setShowStormTracks((v) => !v)}
        showRadarPills={showRadarPills}
        onToggleRadarPills={() => setShowRadarPills((v) => !v)}
      />

      {/* 5. RIGHT-SIDE WARNING DRAWER (Section 10) */}
      <WarningDrawerRight
        isOpen={warningDrawerOpen}
        onClose={() => setWarningDrawerOpen(false)}
        alerts={alerts}
        onSelectWarning={(w) => setSelectedWarning(w)}
      />

      {/* 6. SEPARATE FLOATING MAP WARNING DETAILS BOX (Section 10) */}
      <WarningDetailsPopup
        warning={selectedWarning}
        onClose={() => setSelectedWarning(null)}
      />

      {/* 7. UPPER-LEFT MAIN MENU DRAWER (Section 12) */}
      <MainMenuDrawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onResetConus={() => setRadarSite('US')}
      />

      {/* 8. SETTINGS WORKSPACE DIALOG (Section 13) */}
      <SettingsWorkspace
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        basemap={basemap}
        onSelectBasemap={(b) => setBasemap(b)}
      />
    </div>
  );
}
