'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RadarMap, BasemapType } from '../components/RadarMap';
import { UniversalLegend } from '../components/UniversalLegend';
import { MainNavbar, MainNavTab, SpcDay } from '../components/MainNavbar';
import { FloatingProductPanel } from '../components/FloatingProductPanel';
import { WarningDrawerRight, WarningAlert } from '../components/WarningDrawerRight';
import { WarningDetailsPopup } from '../components/WarningDetailsPopup';
import { MainMenuDrawer } from '../components/MainMenuDrawer';
import { SettingsWorkspace } from '../components/SettingsWorkspace';
import { RADAR_SITES, RadarSite } from '../lib/radar-config';

// Auxiliary Workstation & AI Modals
import { WeatherAssistant } from '../components/WeatherAssistant';
import { MCDModal } from '../components/MCDModal';
import { HyperlocalDashboardModal } from '../components/HyperlocalDashboardModal';
import { SkewTSoundingModal } from '../components/SkewTSoundingModal';
import { CrossSectionModal } from '../components/CrossSectionModal';
import { PlacefileManagerModal, ActivePlacefile } from '../components/PlacefileManagerModal';
import { PalColorTableModal } from '../components/PalColorTableModal';
import { ThreatMatrixPanel } from '../components/ThreatMatrixPanel';
import { SynchronizedQuadView } from '../components/SynchronizedQuadView';
import { METARPanel } from '../components/METARPanel';
import { generateThermodynamicSounding } from '../lib/skewt-engine';
import { computeVerticalCrossSection } from '../lib/cross-section';

// Web Audio API 1050 Hz Official NOAA Warning Siren Generator
function play1050HzSiren(durationSeconds = 3) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, ctx.currentTime);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);
  } catch (err) {
    console.warn('[Audio Siren Blocked]:', err);
  }
}

export default function MesoVortexWorkstation() {
  // Navigation & Product State
  const [activeTab, setActiveTab] = useState<MainNavTab>('Radar');
  const [spcDay, setSpcDay] = useState<SpcDay>('Day 1');
  const [product, setProduct] = useState('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [radarOpacity, setRadarOpacity] = useState(0.88);
  const [smoothing, setSmoothing] = useState(true);
  const [colorTable, setColorTable] = useState('default');
  const [maxRefWindow, setMaxRefWindow] = useState(10);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);

  // Basemap & Settings
  const [basemap, setBasemap] = useState<BasemapType>('satellite-streets');
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [audioSirenEnabled, setAudioSirenEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.9);

  // Playback Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(9);
  const [timestampLabel, setTimestampLabel] = useState('LIVE · 18:45:00 UTC');

  // Overlays Toggles
  const [showLightning, setShowLightning] = useState(false);
  const [showLSR, setShowLSR] = useState(false);
  const [showWatches, setShowWatches] = useState(true);
  const [showStormTracks, setShowStormTracks] = useState(true);
  const [showRadarPills, setShowRadarPills] = useState(true);
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [showCountyBoundaries, setShowCountyBoundaries] = useState(true);
  const [showTornadoAnalysis, setShowTornadoAnalysis] = useState(false);

  // Warnings Drawer & Details Popup State (Sections 10 & 11)
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<WarningAlert[]>([]);
  const [selectedWarning, setSelectedWarning] = useState<WarningAlert | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{
    event: string;
    headline: string;
    area: string;
  } | null>(null);

  // Left Main Menu & Settings Workspace State
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auxiliary Feature Modals
  const [weatherAssistantOpen, setWeatherAssistantOpen] = useState(false);
  const [mcdModalOpen, setMcdModalOpen] = useState(false);
  const [mcdText, setMcdText] = useState('');
  const [mcdLoading, setMcdLoading] = useState(false);
  const [hyperlocalOpen, setHyperlocalOpen] = useState(false);
  const [skewTOpen, setSkewTOpen] = useState(false);
  const [crossSectionOpen, setCrossSectionOpen] = useState(false);
  const [placefilesOpen, setPlacefilesOpen] = useState(false);
  const [palTableOpen, setPalTableOpen] = useState(false);
  const [threatMatrixOpen, setThreatMatrixOpen] = useState(false);
  const [quadViewOpen, setQuadViewOpen] = useState(false);
  const [metarOpen, setMetarOpen] = useState(false);

  // Active Placefiles State
  const [placefiles, setPlacefiles] = useState<ActivePlacefile[]>([
    { id: '1', name: 'NWS Spotter Network Real-Time', url: 'https://www.spotternetwork.org/feeds/placefile.txt', enabled: true },
    { id: '2', name: 'SPC Convective Mesoscale Outflow', url: 'https://www.spc.noaa.gov/products/placefiles/outflow.txt', enabled: true },
  ]);

  // Live Airport METARs State
  const [metarObs, setMetarObs] = useState([
    { station: 'KLIT', text: 'KLIT 122253Z 16012G18KT 10SM SCT045 OVC090 24/18 A2992 RMK AO2', temp: '75°F (24°C)', dewpoint: '64°F (18°C)', wind: '160° at 12 kt, gusts 18 kt' },
    { station: 'KDFW', text: 'KDFW 122253Z 18016KT 10SM BKN030 OVC060 26/20 A2988 RMK AO2', temp: '78°F (26°C)', dewpoint: '68°F (20°C)', wind: '180° at 16 kt' },
    { station: 'KOKC', text: 'KOKC 122252Z 20022G31KT 9SM FEW025 BKN045 22/16 A2985 RMK AO2', temp: '72°F (22°C)', dewpoint: '61°F (16°C)', wind: '200° at 22 kt, gusts 31 kt' },
    { station: 'KMEM', text: 'KMEM 122254Z 17011KT 10SM CLR 25/17 A2995 RMK AO2', temp: '77°F (25°C)', dewpoint: '63°F (17°C)', wind: '170° at 11 kt' },
  ]);

  const handleTogglePlacefile = (id: string) => {
    setPlacefiles((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const handleAddPlacefile = (name: string, url: string) => {
    setPlacefiles((prev) => [...prev, { id: `pf-${Date.now()}`, name, url, enabled: true }]);
  };

  const handleDeletePlacefile = (id: string) => {
    setPlacefiles((prev) => prev.filter((p) => p.id !== id));
  };

  const alertedIdsRef = useRef<Set<string>>(new Set());
  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];

  // Fetch real-time NWS Warnings & Alerts
  useEffect(() => {
    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
      .then((res) => res.json())
      .then((data) => {
        const items: WarningAlert[] = (data.features || []).map((f: any, i: number) => ({
          id: f.id || `alert-${i}`,
          event: f.properties?.event || 'Severe Warning',
          headline:
            f.properties?.headline ||
            f.properties?.description?.slice(0, 85) ||
            'Severe Weather Warning',
          severity: f.properties?.severity || 'Immediate',
          areaDesc: f.properties?.areaDesc || 'Regional Counties',
          sent: f.properties?.sent || new Date().toISOString(),
          expires: f.properties?.expires || '',
          wfo: f.properties?.senderName?.split('/')?.[0] || 'NWS',
          geometry: f.geometry,
        }));

        setLiveAlerts(items);

        // Check for new Tornado or Severe Thunderstorm Warnings for Announcement Banner
        const criticalAlert = items.find(
          (a) => a.event.includes('Tornado Warning') || a.event.includes('Severe Thunderstorm Warning')
        );

        if (criticalAlert && !alertedIdsRef.current.has(criticalAlert.id)) {
          alertedIdsRef.current.add(criticalAlert.id);
          setActiveAnnouncement({
            event: criticalAlert.event,
            headline: criticalAlert.headline,
            area: criticalAlert.areaDesc,
          });

          // Play 1050 Hz Siren if enabled
          if (audioSirenEnabled) {
            play1050HzSiren(3);
          }

          // Spoken TTS Announcement if enabled
          if (ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const announcementText = `The National Weather Service has issued a ${criticalAlert.event} for ${criticalAlert.areaDesc}.`;
            const utter = new SpeechSynthesisUtterance(announcementText);
            utter.volume = ttsVolume;
            window.speechSynthesis.speak(utter);
          }
        }
      })
      .catch((err) => console.warn('[Alerts Fetch Error]:', err));
  }, [audioSirenEnabled, ttsEnabled, ttsVolume]);

  // Handle Location Search Submit
  const handleSearchLocation = (query: string, matchedSite?: RadarSite) => {
    if (matchedSite) {
      setRadarSite(matchedSite.id);
      setTargetCoords([matchedSite.lon, matchedSite.lat]);
      return;
    }

    // Check if coordinates format: e.g. "34.74, -92.28"
    const coordParts = query.split(',').map((p) => parseFloat(p.trim()));
    if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
      setTargetCoords([coordParts[1], coordParts[0]]);
      return;
    }

    // Try finding closest radar site to search string
    const fallbackSite = RADAR_SITES.find(
      (s) =>
        s.id.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    if (fallbackSite) {
      setRadarSite(fallbackSite.id);
      setTargetCoords([fallbackSite.lon, fallbackSite.lat]);
    }
  };

  // Warning selection handler (Section 10)
  const handleSelectWarning = (alert: WarningAlert) => {
    setSelectedWarning(alert);

    // If warning has geometry coordinates, fly map to center
    if (alert.geometry?.type === 'Polygon' && alert.geometry.coordinates?.[0]?.length) {
      const ring = alert.geometry.coordinates[0];
      const avgLon = ring.reduce((sum: number, c: number[]) => sum + c[0], 0) / ring.length;
      const avgLat = ring.reduce((sum: number, c: number[]) => sum + c[1], 0) / ring.length;
      setTargetCoords([avgLon, avgLat]);
    } else if (alert.lat && alert.lon) {
      setTargetCoords([alert.lon, alert.lat]);
    }
  };

  // Locate Me using Browser Geolocation
  const handleLocateMe = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTargetCoords([pos.coords.longitude, pos.coords.latitude]);
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  };

  // Reset CONUS view
  const handleResetConus = () => {
    setRadarSite('US');
    setTargetCoords([-98.5795, 39.8283]);
  };

  // Spoken TTS Announcement helper
  const handleSpeakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.volume = ttsVolume;
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  // Playback timer simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % 10);
      setTimestampLabel(`LOOP FRAME ${((currentFrameIndex + 1) % 10) + 1}/10`);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, currentFrameIndex]);

  // Generate AI SPC MCD
  const handleGenerateMCD = useCallback(() => {
    setMcdModalOpen(true);
    setMcdLoading(true);
    fetch('/api/copilot/mcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: currentSite.radarId, product }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMcdText(data.mcd || data.text || 'No mesoscale discussion generated.');
      })
      .catch((err) => {
        setMcdText(`SPC MCD Generation Error: ${err.message}`);
      })
      .finally(() => setMcdLoading(false));
  }, [currentSite.radarId, product]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#020617] select-none font-sans text-slate-100">
      {/* 1. UNIVERSAL DATA LEGEND & TEMPORARY ALERT ANNOUNCEMENT BANNER (Sections 2.A & 11) */}
      <UniversalLegend
        type={activeTab === 'Outlooks' ? 'spc' : activeTab === 'Satellite' ? 'satellite' : product}
        activeAnnouncement={activeAnnouncement}
        onDismissAnnouncement={() => setActiveAnnouncement(null)}
        onSpeakAnnouncement={() => {
          if (activeAnnouncement) {
            handleSpeakText(
              `The National Weather Service has issued a ${activeAnnouncement.event} for ${activeAnnouncement.area}. ${activeAnnouncement.headline}.`
            );
          }
        }}
      />

      {/* 2. MAIN NAVIGATION BAR (Section 2.B) */}
      <MainNavbar
        activeTab={activeTab}
        onSelectTab={(t) => setActiveTab(t)}
        warningCount={liveAlerts.length}
        onToggleWarningDrawer={() => setWarningsOpen((v) => !v)}
        onToggleMainMenu={() => setMainMenuOpen((v) => !v)}
        onSearchLocation={handleSearchLocation}
        spcDay={spcDay}
        onSelectSpcDay={(d) => setSpcDay(d)}
      />

      {/* 3. MAIN MAP WORKSPACE (Section 2.C) */}
      <div className="absolute inset-0">
        <RadarMap
          product={product}
          radarSite={radarSite}
          mode={activeTab}
          tilt={tilt}
          maxRefWindow={maxRefWindow}
          basemap={basemap}
          spcDay={spcDay}
          radarOpacity={radarOpacity}
          showRangeRings={showRangeRings}
          showRadarPills={showRadarPills}
          showLightning={showLightning}
          showStormTracks={showStormTracks}
          selectedWarning={selectedWarning}
          targetCoords={targetCoords}
          onSelectSite={(id) => setRadarSite(id)}
          onSelectWarningFromMap={(w) => {
            setSelectedWarning(w);
            setWarningsOpen(true);
          }}
        />
      </div>

      {/* 4. FLOATING PRODUCT CONTROL PANEL (Sections 3, 4, 5, 6, 7, 8, 9 & Wireframe 2) */}
      <FloatingProductPanel
        tab={activeTab}
        currentSiteId={currentSite.id}
        onSelectSite={(id) => setRadarSite(id)}
        product={product}
        onSelectProduct={(p) => setProduct(p)}
        tilt={tilt}
        onSelectTilt={(t) => setTilt(t)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((v) => !v)}
        onStepFrame={(dir) => {
          setCurrentFrameIndex((prev) => (prev + dir + 10) % 10);
          setTimestampLabel(`FRAME ${(currentFrameIndex + dir + 10) % 10 + 1}/10`);
        }}
        onGoLive={() => {
          setIsPlaying(false);
          setCurrentFrameIndex(9);
          setTimestampLabel('LIVE · 18:45:00 UTC');
        }}
        timestampLabel={timestampLabel}
        radarOpacity={radarOpacity}
        onChangeOpacity={(op) => setRadarOpacity(op)}
        smoothing={smoothing}
        onToggleSmoothing={() => setSmoothing((v) => !v)}
        colorTable={colorTable}
        onSelectColorTable={(tbl) => setColorTable(tbl)}
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
        showRangeRings={showRangeRings}
        onToggleRangeRings={() => setShowRangeRings((v) => !v)}
        showCountyBoundaries={showCountyBoundaries}
        onToggleCountyBoundaries={() => setShowCountyBoundaries((v) => !v)}
        showTornadoAnalysis={showTornadoAnalysis}
        onToggleTornadoAnalysis={() => setShowTornadoAnalysis((v) => !v)}
        onOpenQuadView={() => setQuadViewOpen(true)}
        onOpenCrossSection={() => setCrossSectionOpen(true)}
        onOpenSkewT={() => setSkewTOpen(true)}
        onOpenMCD={handleGenerateMCD}
        currentFrameIndex={currentFrameIndex}
        totalFrames={10}
        onScrubFrame={(idx) => {
          setCurrentFrameIndex(idx);
          setTimestampLabel(`FRAME ${idx + 1}/10`);
        }}
        spcDay={spcDay}
        onSelectSpcDay={(d) => setSpcDay(d)}
      />

      {/* 5. WARNING DRAWER — RIGHT SIDE (Section 10 & Wireframe 3) */}
      <WarningDrawerRight
        isOpen={warningsOpen}
        onClose={() => setWarningsOpen(false)}
        alerts={liveAlerts}
        onSelectWarning={handleSelectWarning}
        selectedAlertId={selectedWarning?.id}
      />

      {/* 6. WARNING DETAILS — SEPARATE FLOATING MAP WINDOW (Section 10 & Wireframe 4) */}
      <WarningDetailsPopup
        warning={selectedWarning}
        onClose={() => setSelectedWarning(null)}
        onSpeak={handleSpeakText}
      />

      {/* 7. MAIN MENU DRAWER — THREE-LINE BUTTON (Section 12 & Wireframe 5) */}
      <MainMenuDrawer
        isOpen={mainMenuOpen}
        onClose={() => setMainMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onResetConus={handleResetConus}
        onLocateMe={handleLocateMe}
        onOpenWeatherAssistant={() => setWeatherAssistantOpen(true)}
        onOpenMCD={handleGenerateMCD}
        onOpenHyperlocal={() => setHyperlocalOpen(true)}
        onOpenSkewT={() => setSkewTOpen(true)}
        onOpenCrossSection={() => setCrossSectionOpen(true)}
        onOpenPlacefiles={() => setPlacefilesOpen(true)}
        onOpenPalColorTable={() => setPalTableOpen(true)}
        onOpenThreatMatrix={() => setThreatMatrixOpen(true)}
        onOpenQuadView={() => setQuadViewOpen(true)}
        onOpenMetar={() => setMetarOpen(true)}
      />

      {/* 8. SETTINGS WORKSPACE (Section 13 & Wireframe 6) */}
      <SettingsWorkspace
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        basemap={basemap}
        onSelectBasemap={(b) => setBasemap(b as BasemapType)}
        units={units}
        onSelectUnits={(u) => setUnits(u)}
        audioSirenEnabled={audioSirenEnabled}
        onToggleAudioSiren={() => setAudioSirenEnabled((v) => !v)}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => setTtsEnabled((v) => !v)}
        ttsVolume={ttsVolume}
        onChangeTtsVolume={(vol) => setTtsVolume(vol)}
      />

      {/* 9. AI WEATHER SUITE & ADVANCED WORKSTATION MODALS */}
      {weatherAssistantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <WeatherAssistant
              context={{
                site: currentSite.name,
                product: product,
                alerts: liveAlerts.map((a) => a.headline),
              }}
              onClose={() => setWeatherAssistantOpen(false)}
            />
          </div>
        </div>
      )}

      {mcdModalOpen && (
        <MCDModal
          mcdText={mcdText}
          loading={mcdLoading}
          onClose={() => setMcdModalOpen(false)}
          onRegenerate={handleGenerateMCD}
        />
      )}

      {hyperlocalOpen && (
        <HyperlocalDashboardModal
          lat={currentSite.lat}
          lon={currentSite.lon}
          siteName={currentSite.name}
          onClose={() => setHyperlocalOpen(false)}
        />
      )}

      {skewTOpen && (
        <SkewTSoundingModal
          sounding={generateThermodynamicSounding(currentSite.lat, currentSite.lon)}
          onClose={() => setSkewTOpen(false)}
        />
      )}

      {crossSectionOpen && (
        <CrossSectionModal
          data={computeVerticalCrossSection(
            [currentSite.lon - 0.25, currentSite.lat - 0.25],
            [currentSite.lon + 0.25, currentSite.lat + 0.25],
            currentSite.lat,
            currentSite.lon
          )}
          onClose={() => setCrossSectionOpen(false)}
        />
      )}

      {placefilesOpen && (
        <PlacefileManagerModal
          placefiles={placefiles}
          onToggle={handleTogglePlacefile}
          onAdd={handleAddPlacefile}
          onDelete={handleDeletePlacefile}
          onClose={() => setPlacefilesOpen(false)}
        />
      )}

      {palTableOpen && (
        <PalColorTableModal
          onApplyPal={(curve) => {
            console.log('Applied PAL curve:', curve);
            setPalTableOpen(false);
          }}
          onClose={() => setPalTableOpen(false)}
        />
      )}

      {threatMatrixOpen && (
        <ThreatMatrixPanel
          onClose={() => setThreatMatrixOpen(false)}
        />
      )}

      {quadViewOpen && (
        <SynchronizedQuadView
          radarSite={currentSite.id}
          onClose={() => setQuadViewOpen(false)}
        />
      )}

      {metarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
          <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-base font-black text-white">Airport METAR Surface Weather Observations</h2>
              <button
                onClick={() => setMetarOpen(false)}
                className="rounded-xl bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:text-white transition cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <METARPanel observations={metarObs} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
