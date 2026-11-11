  // 4. Radar Layer (Routing all products & Tilts)
  const updateRadar = useCallback(
    (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else {
        // Products available from IEM ridge (NEXRAD Level 3)
        if (product === 'vel' || product === 'norm_vel' || product === 'nrvel') {
          const pc = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : tilt === '1.8' ? 'N3U' : 'N0U';
          tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${pc}-0/{z}/{x}/{y}.png`;
        } else if (product === 'srvel') {
          tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0S-0/{z}/{x}/{y}.png`;
        } else if (product === 'ref' || product === 'max_ref' || product === 'maxref' || product === 'ref_x') {
          const pc = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
          tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${pc}-0/{z}/{x}/{y}.png`;
        }
        // Products available from MRMS (no IEM ridge tiles)
        else if (product === 'cc' || product === 'min_cc') {
          tileUrl = `${IEM_TILE}/mrms::RhoHV/{z}/{x}/{y}.png`;
        } else if (product === 'zdr') {
          tileUrl = `${IEM_TILE}/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png`;
        } else if (product === 'kdp') {
          tileUrl = `${IEM_TILE}/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png`;
        } else if (product === 'tops') {
          tileUrl = `${IEM_TILE}/mrms::EchoTop18/{z}/{x}/{y}.png`;
        } else if (product === 'vil') {
          tileUrl = `${IEM_TILE}/mrms::VIL/{z}/{x}/{y}.png`;
        } else if (product === 'hhc') {
          tileUrl = `${IEM_TILE}/mrms::HydrometeorClassification/{z}/{x}/{y}.png`;
        } else if (product === 'qpe') {
          tileUrl = `${IEM_TILE}/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png`;
        } else if (product === 'sw') {
          tileUrl = `${IEM_TILE}/mrms::SpectrumWidth/{z}/{x}/{y}.png`;
        }
        // Max Reflectivity: use reflectivity base (compositing done separately)
        else if (product === 'max_ref' || product === 'maxref') {
          const pc = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
          tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${pc}-0/{z}/{x}/{y}.png`;
        }
      }

      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

      if (!tileUrl) {
        // No valid endpoint for this product
        return;
      }

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'xyz',
      });

      const beforeId = map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined;

      let contrast = 0.2;
      let saturation = 0.35;
      let hueRotate = 0;

      if (colorTable === 'radarscope') { contrast = 0.55; saturation = 0.75; hueRotate = 15; }
      else if (colorTable === 'cod') { contrast = 0.35; saturation = 0.6; hueRotate = -20; }
      else if (colorTable === 'smooth') { contrast = 0.25; saturation = 0.45; hueRotate = 35; }
      else if (colorTable === 'couplet') { contrast = 0.7; saturation = 0.9; hueRotate = 140; }

      if (product === 'max_ref' || product === 'maxref') {
        hueRotate = 0; contrast = 0.6; saturation = 0.85;
      }

      map.addLayer({
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: {
          'raster-opacity': radarOpacity,
          'raster-contrast': contrast,
          'raster-saturation': saturation,
          'raster-hue-rotate': hueRotate,
          'raster-resampling': smoothing ? 'linear' : 'nearest',
          'raster-fade-duration': 0,
        },
      }, beforeId);
    },
    [mode, product, tilt, site.radarId, radarOpacity, smoothing, colorTable]
  );
