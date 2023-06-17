'use strict'

import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import * as maptilersdk from "@maptiler/sdk";
import {GeocodingControl} from "@maptiler/geocoding-control/maptilersdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "@maptiler/geocoding-control/style.css";
import * as turf from '@turf/turf'
import idbKeyval from "./javascript/idb-keyval-iife.js";
import fileUtils from "./javascript/fs-helpers.js"
import mapUtils from './javascript/map-utils.js'
import {combineTilesJimp} from "./javascript/combine-tiles-jimp.js";
import {setIntervalAsync, clearIntervalAsync} from 'set-interval-async';
import imageUtils from "./javascript/image-utiles.js";


const defaultWaterdepth = 50
const pbElement = document.getElementById('progress');
const previewImage = document.getElementById("previewImage");
const progressMsg = document.getElementById('progressMsg')
const progressMsg2 = document.getElementById('progressMsg2')
const progressBusyArea = document.getElementById('progressBusyArea')
const progressArea = document.getElementById('progressArea');

const modal = document.getElementById("modal");
const modalMsg = document.getElementById("modalMsg");
const zoom = document.getElementById("zoom");

let distance, urlKey, urlType, map, geocoder
let promiseArray = [];
let mapSize = 50;
let vmapSize = mapSize * 1.05;
let tileSize = mapSize / 9;
let timer, ticks = 0, prev_lng, prev_lat, mapCanvas
let panels = document.getElementsByClassName('panel');
let icons = document.getElementsByClassName('icon');
let iconClass = [];

let userSettings = await loadUserSettings()
let grid = await loadSettings();

for (let i = 0; i < panels.length; i++) {
    iconClass.push(icons[i].className);
}

initMap()

function initMap() {
    try {

        console.log('init')
        let geoCtrl = document.getElementsByClassName('mapboxgl-ctrl-geocoder')

        if (scope.apiKey.length > 0) {
            if (scope.serverType === 'mapbox') {
                mapboxgl.accessToken = scope.apiKey
                urlKey = 'access_token='
                urlType = '@2x.png'
                map = new mapboxgl.Map({
                    container: 'map',                               // Specify the container ID
                    // style: 'mapbox://styles/mapbox/outdoors-v11',   // Specify which map style to use
                    style: scope.stylesUrl + 'outdoors-v11',  // Specify which map style to use
                    center: [grid.lng, grid.lat],                   // Specify the starting position [lng, lat]
                    zoom: grid.zoom,                                // Specify the starting zoom
                    preserveDrawingBuffer: true
                });

                geocoder = new MapboxGeocoder({
                    accessToken: mapboxgl.accessToken, mapboxgl: mapboxgl, marker: false
                });
                //Add control once even on reload
                if (geoCtrl.length === 0) {
                    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
                }
            } else {
                maptilersdk.config.apiKey = scope.apiKey;
                urlKey = 'key='
                urlType = '.webp'
                map = new maptilersdk.Map({
                    container: 'map', // container's id or the HTML element to render the map
                    style: maptilersdk.MapStyle.OUTDOOR,
                    center: [grid.lng, grid.lat],
                    zoom: grid.zoom,                                // Specify the starting zoom
                    preserveDrawingBuffer: true,
                    navigationControl: false,
                    geolocateControl: false,
                });

                geocoder = new GeocodingControl({
                    apiKey: maptilersdk.config.apiKey,
                    class: 'geocoder',
                    showResultsWhileTyping: true,
                    placeholder: 'Try: Lng , Lat or Name',

                });
                document.getElementById('outdoors-v11').check = true
                //Add control once even on reload
                if (geoCtrl.length === 0) {
                    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
                }
            }

            map.on('zoomend', () => {
                let z = Math.round(map.getZoom())
                zoom.innerHTML = z.toString()
                // let tiles = getTileCount(z)
                // let count = tiles.length
            });
            map.on('error', function (e) {
                toggleModal('open', `Mapbox error: ${e.error.message} Please check your api key and other map settings in the settings panel`)
                console.log(e)
                togglePanel(4)
            })
            map.on('load', function () {
                console.log('load')
                mapCanvas = map.getCanvasContainer();
                zoom.innerHTML = Math.round(grid.zoom).toString()
                map.getCanvas().addEventListener('wheel', (e) => {
                    const scrollDirection = e.deltaY < 0 ? 1 : -1;

                    e.preventDefault();
                    if (e.shiftKey) {
                        map.scrollZoom.disable();
                        let size = scope.mapSize
                        if (scrollDirection === 1) {
                            size += 1
                        } else {
                            size -= 1
                        }
                        if (size >= 4 && size <= 1000) {
                            scope.mapSize = size
                            let mapSize = document.getElementById('mapSize')
                            changeMapsize(mapSize)
                        }
                    } else {
                        map.scrollZoom.enable();
                    }
                });

                scope.mapSize = mapSize;
                scope.baseLevel = 0;
                scope.heightScale = 100;
            });

            map.on('style.load', function (e) {
                addSource();
                addLayer();
                setMouse();
            });

            map.on('click', function (e) {
                grid.lng = e.lngLat.lng;
                grid.lat = e.lngLat.lat;

                setGrid(grid.lng, grid.lat, vmapSize);
                map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
                saveSettings();
                zoom.innerHTML = Math.round(grid.zoom).toString()
                updateInfopanel();
            });

            map.on('idle', function () {
                // scope can be set if bindings.js is loaded (because of docReady)
                scope.waterDepth = parseInt(grid.waterDepth) || 50;
                scope.landscapeSize = parseInt(grid.landscapeSize) || 2017;
                scope.exportType = parseInt(grid.exportType) || 'unrealHeightmap';
                saveSettings();
            });

            if (scope.serverType === 'mapbox') {
                geocoder.on('result', function (query) {
                    grid.lng = query.result.center[0];
                    grid.lat = query.result.center[1];

                    setGrid(grid.lng, grid.lat, vmapSize);
                    map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
                    saveSettings();
                    updateInfopanel();
                });
            } else {
                // geocoder.addEventListener("pick", (e) => {
                //    //console.log(e)
                //     // grid.lng = query.result.center[0];
                //     // grid.lat = query.result.center[1];
                //     //
                //     // setGrid(grid.lng, grid.lat, vmapSize);
                //     // map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
                //     // saveSettings();
                //     // updateInfopanel()
                // });
            }
        } else {
            toggleModal('open', `Please check your api key and other map settings in the settings panel`)
            togglePanel(4)
        }
    } catch (e) {
        toggleModal('open', `${e.message} Could be missing api key in the settings panel`)
        console.log(e)
    }
}

function onMove(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, vmapSize);
}

function onUp(e) {
    grid.lng = e.lngLat.lng;
    grid.lat = e.lngLat.lat;
    setGrid(e.lngLat.lng, e.lngLat.lat, vmapSize);

    // Unbind mouse/touch events
    map.off('mousemove', onMove);
    map.off('touchmove', onMove);
    updateInfopanel();
}

function addSource() {
    map.addSource('grid', {
        'type': 'geojson', 'data': getGrid(grid.lng, grid.lat, vmapSize)
    });

    map.addSource('start', {
        'type': 'geojson', 'data': getGrid(grid.lng, grid.lat, vmapSize / 9)
    });

    // map.addSource('mapbox-streets', {
    //     type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8'
    // });
}

function addLayer() {
    // Add styles to the map
    map.addLayer({
        'id': 'grid', 'type': 'fill', 'source': 'grid', 'paint': {
            'fill-color': 'blue', 'fill-outline-color': 'blue', 'fill-opacity': 0.25
        }
    });

    map.addLayer({
        'id': 'startsquare', 'type': 'fill', 'source': 'start', 'paint': {
            'fill-color': 'blue', 'fill-outline-color': 'blue', 'fill-opacity': 0.3
        }
    });
}


function setMouse() {
    map.on('mouseenter', 'startsquare', function () {
        mapCanvas.style.cursor = 'move';
    });

    map.on('mouseleave', 'startsquare', function () {
        mapCanvas.style.cursor = '';
        saveSettings();
    });

    map.on('mousedown', 'startsquare', function (e) {
        // Prevent the default map drag behavior.
        e.preventDefault();
        mapCanvas.style.cursor = 'grab';
        map.on('mousemove', onMove);
        map.once('mouseup', onUp);
    });

    map.on('touchstart', 'startsquare', function (e) {
        if (e.points.length !== 1) return;
        // Prevent the default map drag behavior.
        e.preventDefault();
        map.on('touchmove', onMove);
        map.once('touchend', onUp);
    });
}

function setLngLat(mode) {
    let lngInput = document.getElementById('lngInput');
    let latInput = document.getElementById('latInput');

    switch (mode) {
        case 'current_position':
            lngInput.value = grid.lng;
            latInput.value = grid.lat;
            break;
        case 'clear':
            lngInput.value = '';
            latInput.value = '';
            break;
        case 'apply':
            if ((lngInput.value) && (latInput.value)) {
                grid.lng = parseFloat(lngInput.value);
                grid.lat = parseFloat(latInput.value);

                setGrid(grid.lng, grid.lat, vmapSize);
                map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));

                saveSettings();
                updateInfopanel();
            }
            break;
    }
}

function setGrid(lng, lat, size) {
    map.getSource('grid').setData(getGrid(lng, lat, size));
    map.getSource('start').setData(getGrid(lng, lat, size / 9));
    grid.zoom = map.getZoom();
}

function getExtent(lng, lat, size = vmapSize) {
    let dist = Math.sqrt(2 * Math.pow(size / 2, 2));
    let point = turf.point([lng, lat]);
    let topleft = turf.destination(point, dist, -45, {units: 'kilometers'}).geometry.coordinates;
    let bottomright = turf.destination(point, dist, 135, {units: 'kilometers'}).geometry.coordinates;
    return {'topleft': topleft, 'bottomright': bottomright};
}

function getGrid(lng, lat, size) {
    let extent = getExtent(lng, lat, size);
    let poly = turf.squareGrid([extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]], tileSize, {units: 'kilometers'});
    return poly
}

async function loadUserSettings() {
    let userSettings = await idbKeyval.get('userSettings') || {};
    if (userSettings.dirHandle) {
        scope.downloadDirectory = userSettings.dirHandle.name
    } else {
        scope.downloadDirectory = ''
    }

    if (!scope.serverType) {
        scope.serverType = userSettings.serverType || 'mapbox'
    }

    if (scope.serverType === 'mapbox') {
        scope.apiKey = userSettings.mapboxApiKey || ''
        scope.terrianUrl = userSettings.mapboxTerrianUrl || 'https://api.mapbox.com/v4/mapbox.terrain-rgb/'
        scope.stylesUrl = userSettings.mapboxStylesUrl || 'mapbox://styles/mapbox/'
        scope.weightMapUrl = userSettings.mapboxWeightMapUrl || ''
        scope.satelliteMapUrl = userSettings.mapboxSatelliteMapUrl || 'https://api.mapbox.com/v4/mapbox.satellite/'
        scope.mapUrl = userSettings.mapboxMapUrl || ''
    } else {
        scope.apiKey = userSettings.maptilerApiKey || ''
        scope.terrianUrl = userSettings.maptilerTerrianUrl || 'https://api.maptiler.com/tiles/terrain-rgb-v2/'
        scope.stylesUrl = userSettings.maptilerStylesUrl || 'https://api.maptiler.com/maps/outdoor/style.json'
        scope.weightMapUrl = userSettings.maptilerWeightMapUrl || ''
        scope.satelliteMapUrl = userSettings.maptilerSatelliteMapUrl || 'https://api.maptiler.com/tiles/satellite-v2/'
        scope.mapUrl = userSettings.maptilerMapUrl || ''
    }
    return userSettings
}

async function saveUserSettings() {
    userSettings.serverType = scope.serverType
    if (scope.serverType === 'mapbox') {
        userSettings.mapboxApiKey = scope.apiKey
        userSettings.mapboxTerrianUrl = scope.terrianUrl
        userSettings.mapboxStylesUrl = scope.stylesUrl
        userSettings.mapboxWeightMapUrl = scope.weightMapUrl
        userSettings.mapboxSatelliteMapUrl = scope.satelliteMapUrl
        userSettings.mapboxMapUrl = scope.mapUrl
    } else {
        userSettings.maptilerApiKey = scope.apiKey
        userSettings.maptilerTerrianUrl = scope.terrianUrl
        userSettings.maptilerStylesUrl = scope.stylesUrl
        userSettings.maptilerWeightMapUrl = scope.weightMapUrl
        userSettings.maptilerSatelliteMapUrl = scope.satelliteMapUrl
        userSettings.maptilerMapUrl = scope.mapUrl
    }
    idbKeyval.set('userSettings', userSettings)
    await loadUserSettings()
    if (map) {
        map.remove();
    }
    initMap()
    togglePanel(4)
}

async function loadSettings() {
    let stored = await idbKeyval.get('grid') || {};

    // Mt Rainier
    stored.lng = parseFloat(stored.lng) || -121.75954;
    stored.lat = parseFloat(stored.lat) || 46.85255;
    stored.zoom = parseFloat(stored.zoom) || 11.0;
    stored.minHeight = parseFloat(stored.minHeight) || 0;
    stored.maxHeight = parseFloat(stored.maxHeight) || 0;
    // stored.heightContours = stored.heightContours || false;
    // stored.waterContours = stored.waterContours || false;

    // TODO: do not set global lets!
    document.getElementById('waterDepth').value = parseInt(stored.waterDepth) || defaultWaterdepth;
    return stored;
}

function saveSettings() {
    grid.zoom = map.getZoom();
    grid.waterDepth = parseInt(document.getElementById('waterDepth').value);
    grid.landscapeSize = scope.landscapeSize;
    grid.exportType = scope.exportType;
    idbKeyval.set('grid', grid);
}


function togglePanel(index) {
    let isOpens = [];
    for (let i = 0; i < panels.length; i++) {
        isOpens.push(panels[i].classList.contains('slide-in'));
    }
    for (let i = 0; i < panels.length; i++) {
        if (isOpens[i] && (i != index)) {
            panels[i].setAttribute('class', 'panel slide-out');
            icons[i].setAttribute('class', iconClass[i]);
        }
    }

    panels[index].setAttribute('class', isOpens[index] ? 'panel slide-out' : 'panel slide-in');
    icons[index].setAttribute('class', isOpens[index] ? iconClass[index] : 'icon fas fa-angle-left');

    // initial settings when each panel is opened
    switch (index) {
        case 0:
            break;
        case 1:
            break;
        case 2:
            if (!isOpens[2]) {
                let styleName, objStyle
                if (scope.serverType === 'mapbox') {
                    styleName = map.getStyle().metadata['mapbox:origin'];
                } else {
                    styleName = map.getStyle().name
                    objStyle = mapUtils.convertMapboxMaptilerStyles('maptiler', styleName.toUpperCase())
                    if (objStyle.length === 0) {
                        objStyle = mapUtils.convertMapboxMaptilerStyles('maptilerAltName', styleName)
                    }
                    if (objStyle.length > 0) {
                        styleName = objStyle[0].mapbox
                        document.getElementById(styleName).checked = true;
                    }
                }
            }
            break;
        case 3:
            // none
            break;
        case 4:
            // none
            break;
    }
}


function updateInfopanel() {
    let rhs = 17.28 / mapSize * 100;

    // document.getElementById('rHeightscale').innerHTML = rhs.toFixed(1);
    document.getElementById('lng').innerHTML = grid.lng.toFixed(5);
    document.getElementById('lat').innerHTML = grid.lat.toFixed(5);
    document.getElementById('minh').innerHTML = grid.minHeight;
    document.getElementById('maxh').innerHTML = grid.maxHeight;
}

function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

function changeMapsize(el) {
    if (el.value < 4) {
        el.value = 4
    }
    mapSize = el.value / 1;
    vmapSize = mapSize * 1.05;
    tileSize = mapSize / 9;
    setGrid(grid.lng, grid.lat, vmapSize);

    grid.minHeight = null;
    grid.maxHeight = null;
    updateInfopanel();
}

async function setBaseLevel() {
    if (grid.minHeight === null) {
        await getHeightmap();
        scope.baseLevel = grid.minHeight;
    } else {
        scope.baseLevel = grid.minHeight;
    }
    saveSettings();
}

async function setHeightScale() {
    if (grid.maxHeight === null) {
        await getHeightmap();
        scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));
    } else {
        scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));
    }
    saveSettings();
}

function incPb(el, value = 1) {
    let v = el.value + value;
    if (el.value === el.max) {
        el.value = 0
    } else {
        el.value = v;
    }
}

function setMapStyle(el) {
    const layerId = el.id;
    if (scope.serverType === 'mapbox') {
        map.setStyle(scope.stylesUrl + layerId);
    } else {
        let objStyle = mapUtils.convertMapboxMaptilerStyles('mapbox', layerId)
        if (objStyle.length > 0) {
            const style_code = objStyle[0].maptiler.split(".");
            let style
            if (style_code.length === 2) {
                style = maptilersdk.MapStyle[style_code[0]][style_code[1]]
            } else {
                style = maptilersdk.MapStyle[style_code[0]]
            }
            map.setStyle(style, {diff: objStyle[0].diff})
        }
    }
}


function startTimer(msg) {
    overlayOn()
    progressArea.style.display = 'block'
    progressMsg.innerHTML = msg
    timer = setIntervalAsync(async () => {
        ticks++;
        incPb(pbElement)
    }, 10);
}

function stopTimer() {
    clearIntervalAsync(timer);
    pbElement.value = 0
    console.log('complete in ', ticks * 10, ' ms');
    ticks = 0
    progressMsg.innerHTML = ''
    progressArea.style.display = 'none'
    overlayOff()
}

function startFakeTimer(msg) {
    overlayOn()
    progressBusyArea.style.display = 'block'
    progressMsg2.innerHTML = msg
}

function stopFakeTimer() {
    progressBusyArea.style.display = 'none'
    progressMsg2.innerHTML = ''
    overlayOff()
}


async function getHeightmap(z = 14, override = false) {
    return new Promise(async (resolve, reject) => {

        let obj = await downloadTiles(scope.terrianUrl, true, z, override)
        let heightmap = mapUtils.toHeightmap(obj.tiles, obj.distance, mapSize);
        let heights = mapUtils.calcMinMaxHeight(heightmap);
        grid.minHeight = heights.min;
        grid.maxHeight = heights.max;
        prev_lng = document.getElementById('lng').innerHTML
        prev_lat = document.getElementById('lat').innerHTML
        heightmap ? resolve(heightmap) : reject('timout');
    })
}

async function downloadTiles(tilesUrl, isHeightmap = true, z = 14, override = false) {
    return new Promise(async (resolve, reject) => {
        let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);

        let objTileCnt = mapUtils.getTileCountAdjusted(z, extent, override)
        let x = objTileCnt.x
        let y = objTileCnt.y
        let zoom = objTileCnt.zoom
        let tileCnt = objTileCnt.tileCnt
        let objTiles = {}


        document.getElementById('satzoomval').value = zoom
        document.getElementById('tilecount').innerHTML = mapUtils.getTileCount(zoom, extent).length.toString()


        let tileLng = mapUtils.tile2long(x, zoom);
        let tileLat = mapUtils.tile2lat(y, zoom);

        let tileLng2 = mapUtils.tile2long(x + tileCnt, zoom);
        let tileLat2 = mapUtils.tile2lat(y + tileCnt, zoom);
        let tiles
        // get the length of one side of the tiles extent
        distance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng2, tileLat2]), {units: 'kilometers'}) / Math.SQRT2;
        if (isHeightmap === true) {
            // create the tiles empty array
            tiles = mapUtils.Create2DArray(tileCnt);
        } else {
            tiles = []
        }
        promiseArray = [];
        let count = 0
        progress(count);
        // download the tiles
        for (let i = 0; i < tileCnt; i++) {
            for (let j = 0; j < tileCnt; j++) {
                let url = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + urlType + '?' + urlKey + scope.apiKey;
                let woQUrl = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + urlType;
                if (isHeightmap === true) {
                    promiseArray.push(mapUtils.downloadToTile(true, url, woQUrl).then((png) => {
                        tiles[i][j] = png
                        progress(count++);
                    }));
                } else {
                    promiseArray.push(mapUtils.downloadToTile(false, url, woQUrl, (x + j), (y + i)).then((tile) => {
                        tiles.push(tile)
                        progress(count++);
                    }));
                }
            }
        }
        await Promise.all(promiseArray);
        objTiles.tiles = tiles
        objTiles.distance = distance
        objTiles ? resolve(objTiles) : reject('timout');
    });
}

function progress(count) {
    let ele = document.getElementById('downloadCount')
    ele.innerHTML = `downloading ${count} of ${promiseArray.length}`
    // console.log(count / promiseArray.length);
}

function setUrlInfo(val) {
    if (scope.serverType === 'mapbox') {
        if (val === 'height') {
            urlType = '@2x.png'
        }
    } else {
        if (val === 'height') {
            urlType = '.webp'
        } else {
            urlType = '.jpg'
        }
    }
}

async function previewHeightmap() {
    startTimer('Processing heightmap')
    let convertedHeightmap, png, heightmap, imgUrl;
    setUrlInfo('height')
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked
    heightmap = await getHeightmap()
    if (autoCalc === true) {
        await autoCalculateBaseHeight()
    }
    convertedHeightmap = convertHeightmap(heightmap);
    png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
    imgUrl = download('heightmap.png', png, true);
    previewImage.src = imgUrl
    updateInfopanel()
    stopTimer()
}

async function exportMap() {
    let dirHandle = await userSettings.dirHandle
    if (await fileUtils.verifyPermission(dirHandle, true) === false) {
        console.error(`User did not grant permission to '${dirHandle.name}'`);
        return;
    }
    let convertedHeightmap, png, heightmap;
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked
    let weightmap = document.getElementById('weightmap').checked
    let satellite = document.getElementById('satellite').checked
    let geojson = document.getElementById('geojson').checked
    let worldpartiongridsize = document.getElementById('worldpartiongridsize').value
    let heightmapblurradius = document.getElementById('blurradius').value
    let weightmapblurradius = document.getElementById('weightmapblurradius').value
    let sealevel = document.getElementById('sealevel').checked
    let flipx = document.getElementById('flipx').checked
    let flipy = document.getElementById('flipy').checked
    let override = document.getElementById('satellitezoom').checked

    let landscapeSize = scope.landscapeSize.toString()
    let exportBuff, lat, lng
    lng = grid.lng.toFixed(5)
    lat = grid.lat.toFixed(5)

    if (scope.exportType === 'unrealHeightmap' || scope.exportType === 'unrealSend') {
        startTimer('Processing heightmap')
        setUrlInfo('height')
        heightmap = await getHeightmap()
        if (autoCalc === true) {
            await autoCalculateBaseHeight()
        }
        convertedHeightmap = convertHeightmap(heightmap);
        png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
        updateInfopanel()
        stopTimer()
        // //Resample rescale
        // //Timer does not work with gdal so fake it
        startFakeTimer('Resizing and adjusting image')
        exportBuff = await imageUtils.manipulateImage(png, 0, sealevel, flipx, flipy, landscapeSize, true)
        stopFakeTimer()

        let heightmapFileName = `heightmap_lat_${lat}_lng_${lng}_landscape_size_${landscapeSize}.png`
        await saveImage(dirHandle, exportBuff, heightmapFileName, "png")

    } else if (scope.exportType === 'geojsonOnly') {

    } else if (scope.exportType === 'unrealMapImage') {

    }

    // //Process satellite
    if (satellite === true) {
        startTimer('Processing satellite')
        let zoom = document.getElementById('satzoomval').value
        setUrlInfo('sat')
        let objTiles = await downloadTiles(scope.satelliteMapUrl, false, zoom, override)
        stopTimer()

        startFakeTimer('Combining images')

        const size = 512
        let imageBuffer = await combineTilesJimp(objTiles.tiles, size, size)
        let satelliteFileName = `satellite_lat_${lat}_lng_${lng}_zoom_${zoom}.png`
        await saveImage(dirHandle, imageBuffer, satelliteFileName, "png")

        stopFakeTimer()
    }

    //await idbKeyval.set('rgb_image_buffer', imageBuffer)
    // await fileUtils.writeFileToDisk(dirHandle, tile_info.rgbFileName, imageBuffer)

    // //Process Weightmap
    // if (weightmap === true) {
    //     startTimer('Weightmap')
    //     //download weight
    //     //  exportBuff = await manipulateImage(buff, weightmapblurradius)
    //     stopTimer()
    // }
}


async function autoCalculateBaseHeight() {
    await setBaseLevel()
    await setHeightScale()
}


function convertHeightmap(heightmap_source) {
    const heightmapSize = 1081;

    // height has L/H byte order
    let heightmap = new Uint8ClampedArray(2 * heightmapSize * heightmapSize);
    let workingmap = mapUtils.Create2DArray(heightmapSize, 0);

    // correct the waterDepth for the scaling.
    // in the final pass, it will be scaled back. Round to 1 decimal
    //  let waterDepth = Math.round(scope.waterDepth /  parseFloat(scope.heightScale) * 100 * 10) / 10;

    // watermap: => normalized depth between 0 => deepest water, 1 => land

    for (let y = 0; y < heightmapSize; y++) {
        for (let x = 0; x < heightmapSize; x++) {
            // stay with ints as long as possible
            let height = (heightmap_source[y][x] - scope.baseLevel * 10);

            // raise the land by the amount of water depth
            // a height lower than baselevel is considered to be the below sea level and the height is set to 0
            // water depth is unaffected by height scale
            // the map is unscaled at this point, so high mountains above 1024 meter can be present
            let calcHeight = (height + Math.round(scope.waterDepth * 10)) / 10;
            workingmap[y][x] = Math.max(0, calcHeight);

            //convert to 16 bit hi/low 255
            let h = Math.round(workingmap[y][x] / 100 * parseFloat(scope.heightScale) / 0.015625);

            if (h > 65535) h = 65535;

            // calculate index in image
            let index = y * heightmapSize * 2 + x * 2;

            // height used hi/low 16 bit
            heightmap[index + 0] = h >> 8;
            heightmap[index + 1] = h & 255;
        }
    }

    // log the correct bounding rect to the console
    let bounds = getExtent(grid.lng, grid.lat, mapSize);
    console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);

    return heightmap;
}

function download(filename, data, url = false) {
    let a = window.document.createElement('a');

    if (url) {
        //  a.href = url;
        let objUrl = window.URL.createObjectURL(new Blob([data], {type: 'application/octet-stream'}));
        return objUrl
    } else {
        a.href = window.URL.createObjectURL(new Blob([data], {type: 'application/octet-stream'}));
    }
    a.download = filename;

    // Append anchor to body.
    document.body.appendChild(a)
    a.click();

    // Remove anchor from body
    document.body.removeChild(a)
}

function overlayOn() {
    document.getElementById("overlay").style.display = "block";
}

function overlayOff() {
    document.getElementById("overlay").style.display = "none";
}

function exportTypeChange(e) {
    // let ele = document.getElementById("exportType").value;
    // let unrealOptions = document.getElementById("unrealOptions");
    // if (ele.includes('unreal')) {
    //     unrealOptions.style.display = 'block'
    // } else {
    //     unrealOptions.style.display = 'none'
    // }
    scope.exportType = e.value
}

function landscapeSizeChange(e) {
    scope.landscapeSize = e.value
}

async function serverTypeChange(e) {
    scope.serverType = e.value
    await loadUserSettings()
}

async function openDirectory() {

    try {
        userSettings.dirHandle = await fileUtils.getDirHandle();
    } catch (ex) {
        if (ex.name === 'AbortError') {
            return;
        }
        const msg = 'An error occured trying to open the file.';
        console.error(msg, ex);
    }

    if (!userSettings.dirHandle) {
        console.log('error dirhandle');
    } else {
        scope.downloadDirectory = userSettings.dirHandle.name
        idbKeyval.set('userSettings', userSettings)
    }
}

function toggleModal(mode, msg) {
    if (mode === 'open') {
        modalMsg.innerHTML = msg
        modal.classList.add("show-modal");
    } else if (mode === 'close') {
        modalMsg.innerHTML = ''
        modal.classList.remove("show-modal");
    }
}

function overrideSatChange(zoom) {
    let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
    let tiles = mapUtils.getTileCount(zoom, extent)
    let count = tiles.length
    document.getElementById('tilecount').innerHTML = count.toString()
}

async function saveImage(dirHandle, imageBytes, save_fileName, file_type) {


    let outputBlob = new Blob([imageBytes], {type: 'image/' + file_type});
    await fileUtils.writeFileToDisk(dirHandle, save_fileName, outputBlob)
}

window.toggleModal = toggleModal
window.togglePanel = togglePanel
window.openDirectory = openDirectory
window.saveUserSettings = saveUserSettings
window.serverTypeChange = serverTypeChange
window.landscapeSizeChange = landscapeSizeChange
window.exportMap = exportMap
window.previewHeightmap = previewHeightmap
window.setMapStyle = setMapStyle
window.setLngLat = setLngLat
window.zoomIn = zoomIn
window.zoomOut = zoomOut
window.exportTypeChange = exportTypeChange
window.changeMapsize = changeMapsize
window.overrideSatChange = overrideSatChange

