  // 4. Radar Layer (Routing all products & Tilts)
  const updateRadar = useCallback(
    (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else {
        let productCode = 'N0B';
        if (product === 'vel' || product === 'norm_vel' || product === 'nrvel') {
          productCode = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : tilt === '1.8' ? 'N3U' : 'N0U';
        } else if (product === 'srvel') {
          productCode = 'N0S';
        } else if (product === 'sw') {
          productCode = 'N0W';
        } else if (product === 'cc' || product === 'min_cc') {
          productCode = 'N0C';
        } else if (product === 'zdr') {
          productCode = 'N0X';
        } else if (product === 'kdp') {
          productCode = 'N0K';
        } else if (product === 'tops') {
          productCode = 'EET';
        } else if (product === 'vil') {
          productCode = 'DVL';
        } else if (product === 'hhc') {
          productCode = 'HHC';
        } else if (product === 'qpe') {
          productCode = 'DPR';
        } else if (product === 'max_ref' || product === 'maxref') {
          // Max Reflectivity: use reflectivity base tiles; client-side compositing
          // applies per-pixel max over the rolling window (see frames API)
          productCode = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
        } else {
          productCode = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
        }

        tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
      }

      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'xyz',
      });

      const beforeId = map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined;

      // Color table and contrast adjustments
      let contrast = 0.2;
      let saturation = 0.35;
      let hueRotate = 0;

      if (colorTable === 'radarscope') {
        contrast = 0.55;
        saturation = 0.75;
        hueRotate = 15;
      } else if (colorTable === 'cod') {
        contrast = 0.35;
        saturation = 0.6;
        hueRotate = -20;
      } else if (colorTable === 'smooth') {
        contrast = 0.25;
        saturation = 0.45;
        hueRotate = 35;
      } else if (colorTable === 'couplet') {
        contrast = 0.7;
        saturation = 0.9;
        hueRotate = 140;
      }

      // Max Reflectivity: amber tint to distinguish from base reflectivity
      if (product === 'max_ref' || product === 'maxref') {
        hueRotate = 0;
        contrast = 0.6;
        saturation = 0.85;
      }

      map.addLayer(
        {
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
        },
        beforeId
      );
    },
    [mode, product, tilt, site.radarId, radarOpacity, smoothing, colorTable]
  );
