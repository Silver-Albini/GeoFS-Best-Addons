// ==UserScript==
// @name         GeoFS Better NAV Map
// @version      2.0
// @description  Custom nav maps, overlays, zoom unlocker
// @author       krunchiekrunch
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.geo-fs.com/images/icons/favicon.ico
// @grant        none
// @license      CC BY-NC-SA 4.0
// @downloadURL  https://raw.githubusercontent.com/krunchiekrunch/GeoFS-Better-NAV-Map/refs/heads/main/userscript.js
// @updateURL    https://raw.githubusercontent.com/krunchiekrunch/GeoFS-Better-NAV-Map/refs/heads/main/userscript.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Config

    const MAX_ZOOM = 21;
    const tileProvider = 'googleHybrid';

    const tileProviders = {
        googleHybrid: {
            url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        },

        googleStreets: {
            url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        },

        geofs: {
            url: 'https://data.geo-fs.com/osm25/{z}/{x}/{y}.png',
        }
    };

    // Overlays

    const overlayLayers = [
        {
            name: 'ATC Boundaries',
            url: 'https://tiles.flightradar24.com/atc_boundaries_green/{z}/{x}/{y}/tile.png',
            opacity: 1,
            enabled: true,
            maxZoom: MAX_ZOOM
        },
        {
            name: 'Navaids',
            url: 'https://tiles.flightradar24.com/navaid/{z}/{x}/{y}/tile.png',
            opacity: 1,
            enabled: true,
            maxZoom: MAX_ZOOM
        },
        {
            name: 'Low Airways',
            url: 'https://tiles.flightradar24.com/navdata_la/{z}/{x}/{y}/tile.png',
            opacity: 1,
            enabled: false,
            maxZoom: MAX_ZOOM
        },
        {
            name: 'High Airways',
            url: 'https://tiles.flightradar24.com/navdata_ha/{z}/{x}/{y}/tile.png',
            opacity: 1,
            enabled: false,
            maxZoom: MAX_ZOOM
        }
    ];

    let installedMap = null;
    let baseLayer = null;
    let activeOverlays = [];

    // GeoFS Config

    function configureGeoFS() {
        const api = window.geofs?.api;

        if (!api || !api.map) return false;

        window.geofs.osmTileProvider = tileProviders[tileProvider].url;

        api.mapMaxZoom = MAX_ZOOM;

        if (api.mapOption) {
            api.mapOption.maxZoom = MAX_ZOOM;
        }

        if (!api.map.__betterNavHooked) {
            const originalInit = api.map.init;

            api.map.init = function (...args) {
                configureGeoFS();

                const result = originalInit.apply(this, args);

                setTimeout(installMap, 100);

                return result;
            };

            api.map.__betterNavHooked = true;
        }

        return true;
    }

    // Marker visibility fix

    function unlockGeoFSMarkers() {
        const api = window.geofs?.api;
        if (!api?.map) return;

        const geoMap = api.map;

        // Extend marker layer zoom limits
        for (const name in geoMap.markerLayers) {
            geoMap.markerLayers[name].maxZoom = MAX_ZOOM + 1;
        }

        // Extend default marker layer
        if (geoMap.defaultLayer) {
            geoMap.defaultLayer.maxZoom = MAX_ZOOM + 1;
        }

        // Extend marker visibility arrays
        if (geoMap.markerByMinZoom) {
            while (geoMap.markerByMinZoom.length <= MAX_ZOOM) {
                geoMap.markerByMinZoom.push([]);
            }
        }

        // Refresh marker visibility
        if (geoMap._map) {
            geoMap.updateMarkerVisibility();
            geoMap.updateMarkerLayers();
        }
    }

    // Replace base map (GeoFS default)

    function installMap() {
        const api = window.geofs?.api;

        if (!api || !api.map?._map || !window.L) {
            return false;
        }

        const map = api.map._map;

        if (installedMap === map) {
            unlockGeoFSMarkers();
            return true;
        }

        const provider = tileProviders[tileProvider];

        if (!provider) {
            console.error('[Better NAV Map] Unknown tile provider:', tileProvider);
            return false;
        }

        // Remove original base tile layers
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });

        // Config zoom
        api.mapMaxZoom = MAX_ZOOM;
        api.mapOption.maxZoom = MAX_ZOOM;
        map.setMaxZoom(MAX_ZOOM);

        // Create custom base map
        baseLayer = L.tileLayer(provider.url, {
            minZoom: 0,
            maxZoom: MAX_ZOOM,
            subdomains: provider.subdomains,
            attribution: 'Map data',
            crossOrigin: true
        });

        baseLayer.addTo(map);

        // Create overlays
        activeOverlays = [];

        overlayLayers.forEach(config => {
            if (!config.enabled) return;

            const layer = L.tileLayer(config.url, {
                minZoom: 0,
                maxZoom: config.maxZoom || MAX_ZOOM,
                opacity: config.opacity,
                attribution: '',
                crossOrigin: true
            });

            layer.addTo(map);
            activeOverlays.push(layer);

            console.log('[Better NAV Map] Overlay added:', config.name);
        });

        installedMap = map;

        // Apply marker visibility fix
        unlockGeoFSMarkers();

        console.log('[Better NAV Map] Custom base map installed:', tileProvider);

        return true;
    }

    // Startup

    const interval = setInterval(() => {
        configureGeoFS();

        if (installMap()) {
            clearInterval(interval);
        }
    }, 100);

})();
