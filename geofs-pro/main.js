// ==UserScript==
// @name         GeoFS Pro (HD and AD Free) Improved
// @namespace    http://tampermonkey.net/
// @version      2026-04-28
// @description  Gets higher resolution images(HD) and blocks ads(AD free)
// @author       M. Dallen Shelly
// @match        https://www.geo-fs.com/geofs.php?v=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    "use strict";

    // ⏱ Delay everything by 10 seconds
    setTimeout(() => {

        const provider = "google";
        const multiplayerServer = "default";

        window.geofsNewHDState = true;

        window.geofs.geoIpUpdate = function() {
            delete window.geofs.api.analytics;
            document.body.classList.add("geofs-hd");

            let ad = document.querySelector('.geofs-adbanner.geofs-adsense-container');
            if (ad) ad.remove(); // safer

            if (multiplayerServer !== "default") {
                window.geofs.multiplayerHost = multiplayerServer;
            }

            switch (provider) {
                case "cache":
                    window.geofs.api.imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
                        maximumLevel: 21,
                        hasAlphaChannel: false,
                        subdomains: "abcdefghijklmnopqrstuvwxyz".split(""),
                        url: "http://localhost/map/{z}/{x}/{y}"
                    });
                    break;

                case "google":
                    window.geofs.api.imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
                        maximumLevel: 21,
                        hasAlphaChannel: false,
                        subdomains: ["mt0", "mt1", "mt2", "mt3"],
                        url: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    });
                    break;

                case "apple":
                    window.geofs.api.imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
                        maximumLevel: 21,
                        hasAlphaChannel: false,
                        subdomains: ["sat-cdn1", "sat-cdn2", "sat-cdn3", "sat-cdn4"],
                        url: "https://{s}.apple-mapkit.com/tile?style=7&size=1&scale=1&z={z}&x={x}&y={y}&v=9651&accessKey=..."
                    });
                    break;

                case "bing":
                    window.geofs.api.imageryProvider = new window.Cesium.BingMapsImageryProvider({
                        url: "https://dev.virtualearth.net",
                        key: "AjrgR5TNicgFReuFwvNH71v4YeQNkXIB20l63ZMm86mVuBGZPhTHMkdiVq2_9L7x",
                        mapStyle: window.Cesium.BingMapsStyle.AERIAL
                    });
                    break;
            }

            window.geofs.api.setImageryProvider(window.geofs.api.imageryProvider, false);

            window.geofs.api.viewer.terrainProvider =
            window.geofs.api.flatRunwayTerrainProviderInstance =
                new window.geofs.api.FlatRunwayTerrainProvider({
                    baseProvider: new window.Cesium.CesiumTerrainProvider({
                        url: "https://data.geo-fs.com/srtm/",
                        requestWaterMask: false,
                        requestVertexNormals: true
                    }),
                    bypass: false,
                    maximumLevel: 12
                });
        };

        window.executeOnEventDone("geofsStarted", function() {
            if (window.geofs.api.hdOn === window.geofsNewHDState) return;

            window.jQuery("body").trigger("terrainProviderWillUpdate");
            window.geofs.geoIpUpdate();
            window.geofs.api.hdOn = window.geofsNewHDState;
            window.geofs.api.renderingQuality();
            window.jQuery("body").trigger("terrainProviderUpdate");
        });

        window.executeOnEventDone("afterDeferredload", function() {
            window.geofs.mapXYZ = "https://data.geo-fs.com/osm/{z}/{x}/{y}.png";
        });

        let ad = document.querySelector('.geofs-adbanner.geofs-adsense-container');
        if (ad) ad.remove();

    }, 10000); // ⏱ 10 seconds

})();
