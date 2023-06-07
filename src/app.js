// <reference path='https://api.tiles.mapbox.com/mapbox-gl-js/v1.8.0/mapbox-gl.js' />

'use strict'

const defaultWaterdepth = 50

let mapSize = 50;
let vmapSize = mapSize * 1.05;
let tileSize = mapSize / 9;
let timer
let ticks = 0

let grid = loadSettings();
let mapCanvas, cache, bRefresh = true;
let prev_lng, prev_lat
let panels = document.getElementsByClassName('panel');
let icons = document.getElementsByClassName('icon');
let iconClass = [];
let Gdal
let setIntervalAsync = SetIntervalAsync.setIntervalAsync;
let clearIntervalAsync = SetIntervalAsync.clearIntervalAsync;

(async function () {
    Gdal = await initGdalJs({path: 'https://cdn.jsdelivr.net/npm/gdal3.js@2.4.0/dist/package', useWorker: false})
})();

for (let i = 0; i < panels.length; i++) {
    iconClass.push(icons[i].className);
}

// MapBox API token, temperate email for dev
//mapboxgl.accessToken = 'pk.eyJ1IjoiZGVsZWJhc2giLCJhIjoiY2t1YWxkODF0MGh2NjJxcXA4czBpdXlmdyJ9.D_ngzR7j4vU1CILtpNLg4Q'
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVydGRldm4iLCJhIjoiY2t2dXF1ZGhyMHlteTJ2bzJjZzE3M24xOCJ9.J5skknTRyh-6RoDWD4kw2w';


let map = new mapboxgl.Map({
    container: 'map',                               // Specify the container ID
    // style: 'mapbox://styles/mapbox/outdoors-v11',   // Specify which map style to use
    style: 'mapbox://styles/mapbox/streets-v11',  // Specify which map style to use
    center: [grid.lng, grid.lat],                   // Specify the starting position [lng, lat]
    zoom: grid.zoom,                                // Specify the starting zoom
    preserveDrawingBuffer: true
});

let geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    marker: false
});

const pbElement = document.getElementById('progress');
const previewImage = document.getElementById("previewImage");
const progressMsg = document.getElementById('progressMsg')
const progressMsg2 = document.getElementById('progressMsg2')
const progressBusyArea = document.getElementById('progressBusyArea')
const progressArea = document.getElementById('progressArea')

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

map.on('load', function () {
    mapCanvas = map.getCanvasContainer();

    map.getCanvas().addEventListener(
        'wheel',
        (e) => {
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
        }
    );

    scope.mapSize = mapSize;
    scope.baseLevel = 0;
    scope.heightScale = 100;
    caches.open('tiles').then((data) => cache = data);
});

map.on('style.load', function () {
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
    updateInfopanel();
});

map.on('idle', function () {
    // scope can be set if bindings.js is loaded (because of docReady)
    scope.waterDepth = parseInt(grid.waterDepth) || 50;
    scope.landscapeSize = parseInt(grid.landscapeSize) || 2017;
    scope.exportType = parseInt(grid.exportType) || 'unrealHeightmap';
    saveSettings();
});

geocoder.on('result', function (query) {
    grid.lng = query.result.center[0];
    grid.lat = query.result.center[1];

    setGrid(grid.lng, grid.lat, vmapSize);
    map.panTo(new mapboxgl.LngLat(grid.lng, grid.lat));
    saveSettings();
    updateInfopanel();
});

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
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, vmapSize)
    });

    map.addSource('start', {
        'type': 'geojson',
        'data': getGrid(grid.lng, grid.lat, vmapSize / 9)
    });

    map.addSource('mapbox-streets', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8'
    });

    // map.addSource('contours', {
    //     type: 'vector',
    //     url: 'mapbox://mapbox.mapbox-terrain-v2'
    // });
}

function addLayer() {
    // Add styles to the map
    map.addLayer({
        'id': 'gridlines',
        'type': 'fill',
        'source': 'grid',
        'paint': {
            'fill-color': 'blue',
            'fill-outline-color': 'blue',
            'fill-opacity': 0.25
        }
    });

    map.addLayer({
        'id': 'startsquare',
        'type': 'fill',
        'source': 'start',
        'paint': {
            'fill-color': 'blue',
            'fill-outline-color': 'blue',
            'fill-opacity': 0.3
        }
    });
    //
    // map.addLayer({
    //     'id': 'contours',
    //     'type': 'line',
    //     'source': 'contours',
    //     'source-layer': 'contour',
    //     'layout': {
    //         'visibility': 'visible',
    //         'line-join': 'round',
    //         'line-cap': 'round'
    //     },
    //     'paint': {
    //         'line-color': '#877b59',
    //         'line-width': 0.25
    //     }
    // });

    // map.addLayer({
    //     'id': 'water-streets',
    //     'source': 'mapbox-streets',
    //     'source-layer': 'water',
    //     'type': 'fill',
    //     'paint': {
    //         'fill-color': 'rgba(66,100,225, 0.3)',
    //         'fill-outline-color': 'rgba(33,33,255, 1)'
    //     }
    // });
}


function setMouse() {
    map.on('mouseenter', 'startsquare', function () {
        mapCanvas.style.cursor = 'move';
    });

    map.on('mouseleave', 'startsquare', function () {
        ;
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

function deleteCaches() {
    if (confirm('Delete the caches.\nIs that okay?')) {
        caches.delete('tiles').then(() => {
            caches.open('tiles').then((data) => cache = data);
        });
    }
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

function loadSettings() {
    let stored = JSON.parse(localStorage.getItem('grid')) || {};

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
    localStorage.setItem('grid', JSON.stringify(grid));
}

function Create2DArray(rows, def = null) {
    let arr = new Array(rows);
    for (let i = 0; i < rows; i++) {
        arr[i] = new Array(rows).fill(def);
    }
    return arr;
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
                let styleName = map.getStyle().metadata['mapbox:origin'];
                if (!(styleName)) {
                    styleName = 'satellite-v9';
                }
                document.getElementById(styleName).checked = true;
            }
            break;
        case 3:
            // none
            break;
    }
}

function calcMinMaxHeight(heightmap) {
    const maxY = heightmap.length;
    const maxX = heightmap[0].length;

    const heights = {min: 100000, max: -100000}

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = heightmap[y][x];
            if (h > heights.max) heights.max = h;
            if (h < heights.min) heights.min = h;
        }
    }

    heights.min = heights.min / 10;
    heights.max = heights.max / 10;

    return heights;
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

function setBaseLevel() {
    if (grid.minHeight === null) {
        new Promise((resolve) => {
            getHeightmap("preview", resolve);
        }).then(() => {
            scope.baseLevel = grid.minHeight;
        });
    } else {
        scope.baseLevel = grid.minHeight;
    }
    saveSettings();
}

function setHeightScale() {
    if (grid.maxHeight === null) {
        new Promise((resolve) => {
            getHeightmap("preview", resolve);
        }).then(() => {
            scope.heightScale = Math.min(250, Math.floor((1024 - scope.waterDepth) / (grid.maxHeight - scope.baseLevel) * 100));
        });
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

async function getHeightmap() {
    return new Promise(async (resolve, reject) => {

        // get the extent of the current map
        // in heightmap, each pixel is treated as vertex data, and 1081px represents 1080 faces
        // therefore, "1px = 16m" when the map size is 17.28km
        let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);

        // zoom is 14 in principle
        let zoom = 14;

        // get a tile that covers the top left and bottom right (for the tile count calculation)
        let x = long2tile(extent.topleft[0], zoom);
        let y = lat2tile(extent.topleft[1], zoom);
        let x2 = long2tile(extent.bottomright[0], zoom);
        let y2 = lat2tile(extent.bottomright[1], zoom);

        // get the required tile count in Zoom 13
        let tileCnt = Math.max(x2 - x + 1, y2 - y + 1);

        // fixed in high latitudes: adjusted the tile count to 6 or less
        // because Terrain RGB tile distance depends on latitude
        // don't need too many tiles
        if (tileCnt > 6) {
            let z = zoom;
            let tx, ty, tx2, ty2, tc;
            do {
                z--;
                tx = long2tile(extent.topleft[0], z);
                ty = lat2tile(extent.topleft[1], z);
                tx2 = long2tile(extent.bottomright[0], z);
                ty2 = lat2tile(extent.bottomright[1], z);
                tc = Math.max(tx2 - tx + 1, ty2 - ty + 1);

            } while (tc > 6);
            // reflect the fixed result
            x = tx;
            y = ty;
            zoom = z;
            tileCnt = tc;
        }
        document.getElementById('zoomlevel').innerHTML = zoom
        let tileLng = tile2long(x, zoom);
        let tileLat = tile2lat(y, zoom);

        let tileLng2 = tile2long(x + tileCnt, zoom);
        let tileLat2 = tile2lat(y + tileCnt, zoom);

        // get the length of one side of the tiles extent
        let distance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng2, tileLat2]), {units: 'kilometers'}) / Math.SQRT2;

        // create the tiles empty array
        let tiles = Create2DArray(tileCnt);
        const promiseArray = [];

        // download the tiles
        for (let i = 0; i < tileCnt; i++) {
            for (let j = 0; j < tileCnt; j++) {
                let url = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw?access_token=' + mapboxgl.accessToken;
                let woQUrl = 'https://api.mapbox.com/v4/mapbox.terrain-rgb/' + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw';
                promiseArray.push(downloadPngToTile(url, woQUrl).then((png) => tiles[i][j] = png));
            }
        }

        await Promise.all(promiseArray);
        let heightmap = toHeightmap(tiles, distance);

        let heights = calcMinMaxHeight(heightmap);
        grid.minHeight = heights.min;
        grid.maxHeight = heights.max;
        console.log('complete in ', ticks * 10, ' ms');
        prev_lng = document.getElementById('lng').innerHTML
        prev_lat = document.getElementById('lat').innerHTML
        heightmap ? resolve(heightmap) : reject('timout');
    });
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

async function previewHeightmap() {
    startTimer('Processing heightmap')
    let convertedHeightmap, png, canvas, url, heightmap, imgUrl;
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked
    heightmap = await getHeightmap()
    if (autoCalc === true) {
        autoCalculateBaseHeight()
    }
    convertedHeightmap = convertHeightmap(heightmap);
    png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
    imgUrl = download('heightmap.png', png, true);
    previewImage.src = imgUrl
    updateInfopanel()
    stopTimer()
}

async function exportMap(buff) {

    let convertedHeightmap, png, heightmap;
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked
    let weightmap = document.getElementById('weightmap').checked
    let satellite = document.getElementById('satellite').checked
    let geojson = document.getElementById('geojson').checked
    let worldpartiongridsize = document.getElementById('worldpartiongridsize').value
    let heightmapblurradius = document.getElementById('blurradius').value
    let weightmapblurradius = document.getElementById('weightmapblurradius').value
    let exportBuff

    if (scope.exportType === 'unrealHeightmap' || scope.exportType === 'unrealSend') {
        startTimer('Processing heightmap')
        heightmap = await getHeightmap()
        if (autoCalc === true) {
            autoCalculateBaseHeight()
        }
        convertedHeightmap = convertHeightmap(heightmap);
        png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
        updateInfopanel()
        stopTimer()

        //Resample rescale
        //Timer does not work with gdal so fake it
        startFakeTimer('Resizing and adjusting image')
        exportBuff = await manipulateImage(png, heightmapblurradius)
        download('heightmap.png', exportBuff, false);
        stopFakeTimer()

    } else if (scope.exportType === 'geojsonOnly') {

    } else if (scope.exportType === 'unrealMapImage') {

    }

    // //Process satellite
    // if (satellite === true) {
    //     startTimer('Downloading satellite')
    //     //download sat
    //     //exportBuff = await manipulateImage(buff, 0)
    //     stopTimer()
    // }
    // //Process Weightmap
    // if (weightmap === true) {
    //     startTimer('Weightmap')
    //     //download weight
    //     //  exportBuff = await manipulateImage(buff, weightmapblurradius)
    //     stopTimer()
    // }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function manipulateImage(buff, blurradius) {
    //  await sleep('3000')
    let ZrangeSeaLevel = '32767'
    let maxPngValue = '65535'
    let minPngValue = '0'
    let resizeMethod = 'bilinear'
    let translateOptions = []

    let sealevel = document.getElementById('sealevel').checked
    let flipx = document.getElementById('flipx').checked
    let flipy = document.getElementById('flipy').checked
    let exportBuffer

    let landscapeSize = scope.landscapeSize.toString()

    let heightimage = await IJS.Image.load(buff);

    //Manipulate image
    if (flipx === true) {
        heightimage = await heightimage.flipX()
    }

    if (flipy === true) {
        heightimage = await heightimage.flipY()
    }
    if (blurradius > 0) {
        heightimage = await heightimage.blurFilter(blurradius)
    }
    exportBuffer = await heightimage.toBuffer()

    // Resample and scale
    if (landscapeSize !== '0' || landscapeSize !== '1081') {
        if (sealevel) {
            translateOptions = [
                '-ot', 'UInt16',
                '-of', 'PNG',
                '-scale', minPngValue, maxPngValue, ZrangeSeaLevel, maxPngValue,
                '-outsize', landscapeSize, landscapeSize, '-r', resizeMethod
            ];
        } else {
            translateOptions = [
                '-ot', 'UInt16',
                '-of', 'PNG',
                '-outsize', landscapeSize, landscapeSize, '-r', resizeMethod
            ];
        }
        exportBuffer = await processGdal(exportBuffer, 'heightmap.png', translateOptions, "png");
    }

    return exportBuffer
}

async function processGdal(buff, filename, translateOptions, file_type) {
    let blob = new Blob([buff], {type: 'image/' + file_type})
    const file = new File([blob], filename);
    const result = await Gdal.open(file);
    const dataset = result.datasets[0];
    const filePath = await Gdal.gdal_translate(dataset, translateOptions);
    const fileBytes = await Gdal.getFileBytes(filePath);
    Gdal.close(dataset);
    return fileBytes;
}

// function isDownloadComplete(tiles) {
//     let tileNum = tiles.length;
//     for (let i = 0; i < tileNum; i++) {
//         for (let j = 0; j < tileNum; j++) {
//             if (!(tiles[i][j])) return false;
//         }
//     }
//     return true;
// }

function autoCalculateBaseHeight() {
    setBaseLevel()
    setHeightScale()
}

function toHeightmap(tiles, distance) {

    let tileNum = tiles.length;
    let srcMap = Create2DArray(tileNum * 512, 0);

    // in heightmap, each pixel is treated as vertex data, and 1081px represents 1080 faces
    // therefore, "1px = 16m" when the map size is 17.28km
    let heightmap = Create2DArray(Math.ceil(1080 * (distance / mapSize)), 0);

    //  let heightmap = Create2DArray(Math.ceil(1080), 0);
    let smSize = srcMap.length;
    let hmSize = heightmap.length;

    let r = (hmSize - 1) / (smSize - 1);

    for (let i = 0; i < tileNum; i++) {
        for (let j = 0; j < tileNum; j++) {
            let tile = new Uint8Array(UPNG.toRGBA8(tiles[i][j])[0]);
            for (let y = 0; y < 512; y++) {
                for (let x = 0; x < 512; x++) {
                    let tileIndex = y * 512 * 4 + x * 4;
                    // resolution 0.1 meters
                    srcMap[i * 512 + y][j * 512 + x] = -100000 + ((tile[tileIndex] * 256 * 256 + tile[tileIndex + 1] * 256 + tile[tileIndex + 2]));
                }
            }
        }
    }

    // bilinear interpolation
    let hmIndex = Array(hmSize);

    for (let i = 0; i < hmSize; i++) {
        hmIndex[i] = i / r
    }
    for (let i = 0; i < (hmSize - 1); i++) {
        for (let j = 0; j < (hmSize - 1); j++) {
            let y0 = Math.floor(hmIndex[i]);
            let x0 = Math.floor(hmIndex[j]);
            let y1 = y0 + 1;
            let x1 = x0 + 1;
            let dy = hmIndex[i] - y0;
            let dx = hmIndex[j] - x0;
            heightmap[i][j] = Math.round((1 - dx) * (1 - dy) * srcMap[y0][x0] + dx * (1 - dy) * srcMap[y0][x1] + (1 - dx) * dy * srcMap[y1][x0] + dx * dy * srcMap[y1][x1]);
        }
    }
    for (let i = 0; i < hmSize; i++) {
        heightmap[i][hmSize - 1] = srcMap[i][hmSize - 1]
    }
    for (let j = 0; j < hmSize; j++) {
        heightmap[hmSize - 1][j] = srcMap[hmSize - 1][j]
    }

    return heightmap;
}

function setMapStyle(el) {
    const layerId = el.id;
    let styleName = map.getStyle().metadata['mapbox:origin'];
    if (layerId !== 'weightmap') {
        if (!(styleName)) {
            styleName = 'satellite-v9';
        }
        if (layerId != styleName) {
            map.setStyle('mapbox://styles/mapbox/' + layerId);
        }
    } else {
        map.setStyle('mapbox://styles/delebash/clfzz7dot000001qilz330eyt');
    }
}

function convertHeightmap(heightmap_source) {
    const heightmapSize = 1081;

    // height has L/H byte order
    let heightmap = new Uint8ClampedArray(2 * heightmapSize * heightmapSize);
    let workingmap = Create2DArray(heightmapSize, 0);

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

async function downloadPngToTile(url, withoutQueryUrl = url) {

    const cachedRes = await caches.match(url, {ignoreSearch: true});
    if (cachedRes && cachedRes.ok) {
        console.log('terrain-rgb: load from cache');
        let pngData = await cachedRes.arrayBuffer();
        let png = UPNG.decode(pngData);
        return png;
    } else {
        console.log('terrain-rgb: load by fetch, cache downloaded file');
        try {
            const response = await fetch(url);
            if (response.ok) {
                let res = response.clone();
                let pngData = await response.arrayBuffer();
                let png = UPNG.decode(pngData);
                cache.put(withoutQueryUrl, res);
                return png;
            } else {
                throw new Error('download terrain-rgb error:', response.status);
            }
        } catch (e) {
            console.log(e.message);
        }
    }
}


// function getInfo(fileName) {
//     return 'Heightmap name: ' + fileName + '\n' +
//         '\n' +
//         '/* Generated by height: Skylines online heightmap generator (https://cs.heightmap.skydark.pl) (https://github.com/sysoppl/height-Skylines-heightmap-generator) */\n' +
//         '\n' +
//         'Longitude: ' + grid.lng.toFixed(5) + '\n' +
//         'Latitude: ' + grid.lat.toFixed(5) + '\n' +
//         'Min Height: ' + grid.minHeight + '\n' +
//         'Max Height: ' + grid.maxHeight + '\n' +
//         'Water contours: ' + grid.waterContours + '\n' +
//         'Height contours: ' + grid.heightContours + '\n' +
//         'Zoom: ' + grid.zoom + '\n';
// }

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
}
