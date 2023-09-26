'use strict'

import './styles.css'
import '@fortawesome/fontawesome-free/css/all.css'
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as maptilersdk from "@maptiler/sdk";
import {GeocodingControl} from "@maptiler/geocoding-control/maptilersdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "@maptiler/geocoding-control/style.css"
import {Grid} from 'ag-grid-community';
import 'ag-grid-community/styles//ag-grid.css';
import 'ag-grid-community/styles//ag-theme-alpine.css';
import * as turf from '@turf/turf'
import idbKeyval from "./javascript/idb-keyval-iife.js";
import fileUtils from "./javascript/fs-helpers.js"
import mapUtils from './javascript/map-utils.js'
import {setIntervalAsync, clearIntervalAsync} from 'set-interval-async';
import imageUtiles from "./javascript/image-utiles.js";


const myWorker = new Worker(new URL('./javascript/worker', import.meta.url), {
    type: 'module'
})

const defaultWaterdepth = 40
const meanKernel = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
];

const sharpenKernel = [
    [-0.00391, -0.01563, -0.02344, -0.01563, -0.00391],
    [-0.01563, -0.06250, -0.09375, -0.06250, -0.01563],
    [-0.02344, -0.09375, +1.85980, -0.09375, -0.02344],
    [-0.01563, -0.06250, -0.09375, -0.06250, -0.01563],
    [-0.00391, -0.01563, -0.02344, -0.01563, -0.00391]
];
const pbElement = document.getElementById('progress');
const previewImage = document.getElementById("previewImage");
const progressMsg = document.getElementById('progressMsg')
const progressArea = document.getElementById('progressArea');
const eGridDiv = document.querySelector('#myGrid');
const modal = document.getElementById("modal");
const modalMsg = document.getElementById("modalMsg");
const zoom = document.getElementById("zoom");
// const worldpart = document.getElementById('worldpart').checked
const worldpartiongridsize = document.getElementById('worldpartiongridsize').value
const landscapename = document.getElementById('landscapename').value
const processCount = document.getElementById('processCount')
const processStatus = document.getElementById('processStatus')
const togglePassword = document.querySelector('#togglePassword');
const apiKey = document.querySelector('#apiKey');
let cache, geojsonStyleObj = null;

togglePassword.addEventListener('click', function (e) {
    // toggle the type attribute
    const type = apiKey.getAttribute('type') === 'password' ? 'text' : 'password';
    apiKey.setAttribute('type', type);
    // toggle the eye slash icon
    this.classList.toggle('fa-eye-slash');
});

let distance, urlKey, urlType, map, geocoder, heightmapFileName, subDirName, vectorType

let promiseArray = [];
let mapSize = 50;
let vmapSize = mapSize * 1.05;
let tileSize = mapSize / 9;
let timer, ticks = 0, prev_lng, prev_lat, mapCanvas
let panels = document.getElementsByClassName('panel');
let icons = document.getElementsByClassName('icon');
let iconClass = [];
let weightmapGrid = null
let event_source
let rows = [
    {
        name: 'Forest',
        color: [201, 28, 19]
    },
    // {
    //     name: 'Water',
    //     color: '-------'
    // },
    {
        name: 'Water',
        color:
            [
                [78, 112, 155],
                [103, 178, 178],
                [85, 155, 200],
                [90, 163, 195],
                [64, 90, 104],
                [82, 122, 183],
                [95, 141, 175],
                [91, 142, 184],
                [100, 141, 167],
                [111, 140, 146],
                [46, 116, 81],
                [62, 129, 142],
                [58, 126, 131],
                [55, 121, 118],
                [68, 135, 169],
                [65, 132, 155],
                [83, 142, 208],
                [83, 142, 199],
                [19, 36, 52],
                [26, 48, 70],
                [21, 39, 56],
                [12, 21, 31],
                [14, 26, 37],
                [28, 52, 76],
                [37, 68, 100],
                [43, 78, 114],
                [41, 74, 108],
                [65, 119, 172],
                [68, 124, 180],
                [91, 141, 182],
                [26, 39, 49],
                [64, 112, 158],
                [15, 28, 40],
                [24, 43, 63],
                [39, 71, 104],
                [21, 39, 57],
                [18, 32, 47],
                [58, 107, 156],
                [39, 72, 105],
                [12, 23, 33],
                [37, 69, 100],
                [45, 83, 121],
                [53, 97, 141],
                [28, 51, 74],
                [19, 35, 52],
                [43, 78, 113],
                [25, 45, 66],
                [65, 118, 172],
                [48, 87, 127],
                [23, 41, 60],
                [41, 75, 109],
                [16, 30, 44],
                [35, 65, 94],
                [71, 130, 188],
                [68, 124, 181],
                [14, 25, 37],
                [62, 113, 164],
                [31, 56, 82],
                [73, 134, 194],
                [50, 92, 133],
                [74, 137, 198],
                [77, 140, 204],
                [56, 103, 149],
                [55, 100, 146],
                [57, 104, 151],
                [56, 103, 149],
                [78, 143, 208],
                [42, 77, 112],
                [50, 92, 133],
                [62, 113, 165],
                [75, 133, 180],
                [56, 104, 148],
                [62, 113, 165],
                [78, 143, 207],
                [50, 92, 133],
                [36, 65, 94],
                [69, 122, 175],
                [28, 50, 73],
                [21, 38, 55],
                [33, 61, 88],
                [15, 27, 39],
                [66, 131, 154],
                [89, 119, 144],
                [73, 129, 175],
                [66, 131, 154],
                [99, 141, 169],
                [65, 168, 154],
                [75, 165, 173],
                [62, 134, 142],
                [111, 140, 147]
            ]

    },
    {
        name: 'Scrub',
        color: [
            [143, 253, 139],
            [142, 253, 138]
        ]
    }, {
        name: 'Trees',
        color: [34, 106, 32]

    },
    {
        name: 'Rock',
        color: [101, 100, 93]

    },
    {
        name: 'Sand',
        color: [243, 234, 129]

    },
    {
        name: 'Grass',
        color: [
            [33, 226, 29],
            [33, 225, 29]
        ]
    },
    {
        name: 'Glacier',
        color: [
            [255, 255, 255],
            [254, 254, 254]
        ]

    },
    {
        name: 'Landcover',
        color: [0, 0, 0]
    },
    {
        name: 'Hillshade',
        color: [
            [241, 110, 218],
            [242, 110, 219],
            [242, 110, 220]
        ]
    },
    {
        name: 'Land',
        color: [154, 136, 66]
    },
    {
        name: 'Farmland',
        color: [
            [140, 17, 155],
            [140, 17, 156]
        ]
    }
]
let userSettings
let grid

//init
init()

async function init() {
    let bEnabled = checkFileApiSupport()
    if (bEnabled === false) {
        toggleModal('open', `This browser does not support File System Access API.  Try Edge or Chrome.`)
    } else {
        userSettings = await loadUserSettings()
        grid = await loadSettings();
        initMap()
    }
}

function checkFileApiSupport() {
    let bEnabled = fileUtils.checkFileApiSupport()
    return bEnabled
}

let gridOptions = {
    columnDefs: [
        {headerName: 'Name', field: 'name', editable: true},
        {headerName: 'Color', field: 'color', editable: true},
    ], defaultColDef: {
        flex: 1,
        minWidth: 100,
        resizable: true,
        headerCheckboxSelection: isFirstColumn,
        checkboxSelection: isFirstColumn,
    },
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    rowData: rows
};

function isFirstColumn(params) {
    let displayedColumns = params.columnApi.getAllDisplayedColumns();
    let thisIsFirstColumn = displayedColumns[0] === params.column;
    return thisIsFirstColumn;
}

for (let i = 0; i < panels.length; i++) {
    iconClass.push(icons[i].className);
}


function initWeightmapGrid() {

    if (weightmapGrid === null) {
        weightmapGrid = new Grid(eGridDiv, gridOptions);
    }
}

function initMap() {
    try {
        caches.open('tiles').then((data) => cache = data);
        console.log('init')
        let geoCtrl = document.getElementsByClassName('mapboxgl-ctrl-geocoder')

        if (scope.apiKey.length > 0) {
            if (scope.serverType === 'mapbox') {
                mapboxgl.accessToken = scope.apiKey
                urlKey = 'access_token='
                urlType = '@2x.png'
                vectorType = '.vector.pbf'
                map = new mapboxgl.Map({
                    container: 'map',                               // Specify the container ID
                    // style: 'mapbox://styles/mapbox/outdoors-v11',   // Specify which map style to use
                    style: scope.stylesUrl + 'outdoors-v11',  // Specify which map style to use
                    center: [grid.lng, grid.lat],                   // Specify the starting position [lng, lat]
                    zoom: grid.zoom,                                // Specify the starting zoom
                    preserveDrawingBuffer: true,
                    attributionControl: false
                });

                /* Given a query in the form "lng, lat" or "lat, lng"
* returns the matching geographic coordinate(s)
* as search results in carmen geojson format,
* https://github.com/mapbox/carmen/blob/master/carmen-geojson.md */
                const coordinatesGeocoder = function (query) {
// Match anything which looks like
// decimal degrees coordinate pair.
                    const matches = query.match(
                        /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i
                    );
                    if (!matches) {
                        return null;
                    }

                    function coordinateFeature(lng, lat) {
                        return {
                            center: [lng, lat],
                            geometry: {
                                type: 'Point',
                                coordinates: [lng, lat]
                            },
                            place_name: 'Lat: ' + lat + ' Lng: ' + lng,
                            place_type: ['coordinate'],
                            properties: {},
                            type: 'Feature'
                        };
                    }

                    const coord1 = Number(matches[1]);
                    const coord2 = Number(matches[2]);
                    const geocodes = [];

                    if (coord1 < -90 || coord1 > 90) {
// must be lng, lat
                        geocodes.push(coordinateFeature(coord1, coord2));
                    }

                    if (coord2 < -90 || coord2 > 90) {
// must be lat, lng
                        geocodes.push(coordinateFeature(coord2, coord1));
                    }

                    if (geocodes.length === 0) {
// else could be either lng, lat or lat, lng
                        geocodes.push(coordinateFeature(coord1, coord2));
                        geocodes.push(coordinateFeature(coord2, coord1));
                    }

                    return geocodes;
                };

                geocoder = new MapboxGeocoder({
                    accessToken: mapboxgl.accessToken,
                    mapboxgl: mapboxgl,
                    marker: false,
                    localGeocoder: coordinatesGeocoder,
                    placeholder: 'Try: Lng , Lat or Name',
                    reverseGeocode: true
                });
                //Add control once even on reload
                if (geoCtrl.length === 0) {
                    console.log('mapbox geocoder')
                    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
                }
            } else {
                maptilersdk.config.apiKey = scope.apiKey;
                urlKey = 'key='
                urlType = '.webp'
                vectorType = '.pbf'
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
                    enableReverse: true

                });
                document.getElementById('outdoors-v11').check = true

                // Add control once even on reload
                if (geoCtrl.length === 0) {
                    console.log('maptiler geocoder')
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

                        let size = Number(Number(scope.mapSize).toFixed(2));
                        if (scrollDirection === 1) {
                            size += .1
                        } else {
                            size -= .1
                        }
                        size = Number(Number(size).toFixed(2));
                        scope.mapSize = size
                        let mapSize = document.getElementById('mapSizeText')
                        mapSize.value = scope.mapSize
                        changeMapsize(mapSize)
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

            // map.on('dblclick',function (e){
            //     let coordinates = e.lngLat;
            //     new mapboxgl.Popup()
            //         .setLngLat(coordinates)
            //         .setHTML('you clicked here: <br/>' + coordinates)
            //         .addTo(map);
            //
            //     let bounds = getExtent(grid.lng, grid.lat, mapSize);
            //      console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);
            //
            // })

            map.on('idle', function () {
                // scope can be set if bindings.js is loaded (because of docReady)
                scope.waterDepth = parseInt(grid.waterDepth) || 50;
                scope.landscapeSize = parseInt(grid.landscapeSize) || 2017;
                scope.worldpartlandscapeSize = parseInt(grid.worldpartlandscapeSize) || 2041;
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
        scope.vectorUrl = userSettings.mapboxVectorUrl || 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/'
        scope.weightMapUrl = userSettings.mapboxWeightMapUrl || ''
        scope.satelliteMapUrl = userSettings.mapboxSatelliteMapUrl || 'https://api.mapbox.com/v4/mapbox.satellite/'
        scope.mapUrl = userSettings.mapboxMapUrl || 'https://api.mapbox.com/styles/v1/'


        let weightmapColors = userSettings.weightmapColors || []
        if (weightmapColors.length === 0) {
            userSettings.weightmapColors = rows
        } else {
            rows = weightmapColors
        }

    } else if (scope.serverType === 'maptiler') {
        scope.apiKey = userSettings.maptilerApiKey || ''
        scope.terrianUrl = userSettings.maptilerTerrianUrl || 'https://api.maptiler.com/tiles/terrain-rgb-v2/'
        scope.stylesUrl = userSettings.maptilerStylesUrl || 'https://api.maptiler.com/maps/outdoor/style.json'
        scope.vectorUrl = userSettings.maptilerVectorUrl || 'https://api.maptiler.com/tiles/v3/'
        scope.weightMapUrl = userSettings.maptilerWeightMapUrl || ''
        scope.satelliteMapUrl = userSettings.maptilerSatelliteMapUrl || 'https://api.maptiler.com/tiles/satellite-v2/'
        scope.mapUrl = userSettings.maptilerMapUrl || 'https://api.maptiler.com/maps/'

    }
    // document.getElementById('backendServer').checked = userSettings.backendServer || false

    scope.desktopServerUrl = userSettings.desktopServerUrl || 'http://localhost:5000/'
    scope.desktopDownloadDirectory = userSettings.desktopDownloadDirectory || ''
    scope.GeojsonUrl = userSettings.GeojsonUrl || ''
    scope.GeojsonLayerStyle = userSettings.GeojsonLayerStyle || ''
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

        userSettings.mapboxVectorUrl = scope.vectorUrl
        userSettings.weightmapColors = gridOptions.rowData
    } else {
        userSettings.maptilerApiKey = scope.apiKey
        userSettings.maptilerTerrianUrl = scope.terrianUrl
        userSettings.maptilerStylesUrl = scope.stylesUrl
        userSettings.maptilerWeightMapUrl = scope.weightMapUrl
        userSettings.maptilerSatelliteMapUrl = scope.satelliteMapUrl
        userSettings.maptilerMapUrl = scope.mapUrl
        userSettings.maptilerVectorUrl = scope.vectorUrl
    }
    // userSettings.backendServer = document.getElementById('backendServer').checked
    userSettings.desktopServerUrl = scope.desktopServerUrl
    userSettings.desktopDownloadDirectory = scope.desktopDownloadDirectory
    userSettings.GeojsonUrl = scope.GeojsonUrl
    userSettings.GeojsonLayerStyle = scope.GeojsonLayerStyle
    idbKeyval.set('userSettings', userSettings)
    await loadUserSettings()
    if (map) {
        map.remove();
    }
    location.reload()
    // togglePanel(4)
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

    document.getElementById('waterDepth').value = parseInt(stored.waterDepth) || defaultWaterdepth;
    document.getElementById('drawStrm').checked = stored.drawStreams || false;
    document.getElementById('blurPasses').value = parseInt(stored.blurPasses) || 0;
    document.getElementById('blurPostPasses').value = parseInt(stored.blurPostPasses) || 0;
    document.getElementById('plainsHeight').value = parseInt(stored.plainsHeight) || 0;
    document.getElementById('streamDepth').value = parseInt(stored.streamDepth) || 0;
    return stored;
}

function saveSettings() {
    grid.zoom = map.getZoom();
    grid.waterDepth = parseInt(document.getElementById('waterDepth').value);
    grid.landscapeSize = scope.landscapeSize;
    grid.worldpartlandscapeSize = scope.worldpartlandscapeSize;
    grid.exportType = scope.exportType;
    grid.drawStreams = document.getElementById('drawStrm').checked;
    grid.plainsHeight = parseInt(document.getElementById('plainsHeight').value);
    grid.blurPasses = parseInt(document.getElementById('blurPasses').value);
    grid.blurPostPasses = parseInt(document.getElementById('blurPostPasses').value);
    grid.streamDepth = parseInt(document.getElementById('streamDepth').value);
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
        case 5:
            initWeightmapGrid()
            break;
        case 6:
            // none
            break;
    }
}


function updateInfopanel() {
    let rhs = 17.28 / mapSize * 100;
    calculateScale();
    // document.getElementById('rHeightscale').innerHTML = rhs.toFixed(1);
    document.getElementById('lng').innerHTML = grid.lng.toFixed(5);
    document.getElementById('lat').innerHTML = grid.lat.toFixed(5);
    document.getElementById('minh').innerHTML = grid.minHeight;
    document.getElementById('maxh').innerHTML = grid.maxHeight;

}

function calculateScale() {

    let zScale = getUnrealZScale(grid.maxHeight, grid.minHeight)
    zScale = zScale.toFixed(4)
    let xyscale = getUnrealXYScale()
    xyscale = xyscale.toFixed(4)
    let scale_str = `${xyscale},${xyscale},${zScale}`
    document.getElementById('xyzscale').innerHTML = scale_str
    document.getElementById('exportxyzscale').innerHTML = scale_str
}

function getUnrealXYScale() {
    //Xy Scale
    // let extent = getExtent(grid.lng, grid.lat, mapSize);
    // console.log(extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]);
    //
    // const topLeft = turf.point([extent.topleft[0], extent.topleft[1]]);
    // const topRight = turf.point([extent.topleft[0], extent.bottomright[1]]);
    // let distance = turf.distance(topLeft, topRight, 'kilometers').toFixed(2);
    // console.log(distance)

    let km = scope.mapSize
    let landscapeSize
    let useworldpart = document.getElementById('useworldpart').checked
    // let km = this.tile_info.distance * 1000
    if (useworldpart === true) {
        landscapeSize = scope.worldpartlandscapeSize
    } else {
        landscapeSize = scope.landscapeSize
    }
    let distance = km * 1000
    let xyscale = (distance / landscapeSize) * 100
    return xyscale
}

function getUnrealZScale(maxElevation, minElevation) {
    let cm, zscale
    let sealevel = document.getElementById('sealevel').checked
    if (sealevel === true) {
        cm = (maxElevation * 100)
    } else {

        if (minElevation < 0) {
            minElevation = 0
        }
        let elevation = maxElevation - minElevation
        cm = (elevation * 100)
    }

    zscale = cm * 0.001953125

    return zscale
}

function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

function changeMapsize(el) {

    if (el.id === "mapSizeRange") {
        let ele2 = document.getElementById('mapSizeText')
        ele2.value = el.value
    } else if (el.id === "mapSizeText") {
        scope.mapSize = el.value
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

function setMapStyle(el, styleid) {
    let layerId
    if (el !== null) {
        layerId = el.id;
    } else {
        layerId = styleid
    }

    if (scope.serverType === 'mapbox') {
        if (layerId === 'weightmap') {
            map.setStyle('mapbox://styles/' + scope.weightMapUrl);
        } else {
            map.setStyle(scope.stylesUrl + layerId);
        }

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


function startTimer(showTime = false) {
    overlayOn()
    progressArea.style.display = 'block'
    timer = setIntervalAsync(async () => {
        ticks++;
        incPb(pbElement)
        if (showTime === true) {
            processCount.innerHTML = `Time: ${ticks}`
        }

    }, 10);
}

function stopTimer() {
    clearIntervalAsync(timer);
    pbElement.value = 0
    console.log('complete in ', ticks * 10, ' ms');
    ticks = 0
    progressMsg.innerHTML = ''
    progressArea.style.display = 'none'
    processCount.innerHTML = ''
    processStatus.innerHTML = ''
    overlayOff()
}


async function getHeightmap(z = 14, overrideZoom = false) {
    return new Promise(async (resolve, reject) => {

        let objTiles = await downloadTiles(scope.terrianUrl, true, z, overrideZoom)
        objTiles.heightmap = mapUtils.toHeightmap(objTiles.tiles, objTiles.distance, mapSize);
        objTiles.xOffset = Math.round(objTiles.leftDistance / objTiles.distance * objTiles.heightmap.length);
        objTiles.yOffset = Math.round(objTiles.topDistance / objTiles.distance * objTiles.heightmap.length);

        objTiles.sanatizedMap = mapUtils.sanatizeMap(objTiles.heightmap, objTiles.xOffset, objTiles.yOffset);
        let heights = mapUtils.calcMinMaxHeight(objTiles.heightmap);
        grid.minHeight = heights.min;
        grid.maxHeight = heights.max;
        prev_lng = document.getElementById('lng').innerHTML
        prev_lat = document.getElementById('lat').innerHTML
        objTiles ? resolve(objTiles) : reject('timout');
    })
}


async function downloadTiles(tilesUrl, isHeightmap = true, z = 14, overrideZoom = false) {
    return new Promise(async (resolve, reject) => {
        let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
        let objTileCnt = mapUtils.getTileCountAdjusted(z, extent, overrideZoom)
        let x = objTileCnt.x
        let y = objTileCnt.y
        let zoom = objTileCnt.zoom
        let tileCnt = objTileCnt.tileCnt
        let objTiles = {}


        document.getElementById('satZoomVal').value = zoom
        document.getElementById('zoomlevel').innerHTML = zoom
        document.getElementById('satZoomTileCount').innerHTML = mapUtils.getTileCount(zoom, extent).length.toString()
        document.getElementById('heightmapZoomTileCount').innerHTML = mapUtils.getTileCount(zoom, extent).length.toString()
        document.getElementById('heightmapZoomVal').value = zoom

        let tileLng = mapUtils.tile2long(x, zoom);
        let tileLat = mapUtils.tile2lat(y, zoom);

        let tileLng2 = mapUtils.tile2long(x + tileCnt, zoom);
        let tileLat2 = mapUtils.tile2lat(y + tileCnt, zoom);
        let tiles
        let vTiles
        // get the length of one side of the tiles extent
        distance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng2, tileLat2]), {units: 'kilometers'}) / Math.SQRT2;
        let topDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([tileLng, extent.topleft[1]]), {units: 'kilometers'});
        let leftDistance = turf.distance(turf.point([tileLng, tileLat]), turf.point([extent.topleft[0], tileLat]), {units: 'kilometers'});
        if (isHeightmap === true) {
            // create the tiles empty array
            tiles = mapUtils.Create2DArray(tileCnt);
        } else {
            tiles = []
        }
        promiseArray = [];
        let count = 1
        let totalCount = tileCnt * tileCnt
        progressCount(count, totalCount, 'downloading');
        // download the tiles

        for (let i = 0; i < tileCnt; i++) {
            for (let j = 0; j < tileCnt; j++) {
                let url = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + urlType + '?' + urlKey + scope.apiKey;
                if (isHeightmap === true) {
                    promiseArray.push(mapUtils.downloadToTile(true, url).then((png) => {
                        tiles[i][j] = png
                        progressCount(count++, totalCount, 'downloading');
                    }));
                } else {
                    promiseArray.push(mapUtils.downloadToTile(false, url, (x + j), (y + i)).then((tile) => {
                        tiles.push(tile)
                        progressCount(count++, totalCount, 'downloading');
                    }));
                }
            }
        }


        await Promise.all(promiseArray);

        if (isHeightmap === true) {
            promiseArray = []
            vTiles = mapUtils.Create2DArray(tileCnt);
            tilesUrl = scope.vectorUrl
            for (let i = 0; i < tileCnt; i++) {
                for (let j = 0; j < tileCnt; j++) {
                    let url = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + vectorType + '?' + urlKey + scope.apiKey;
                    promiseArray.push(mapUtils.downloadPbfToTile(url).then((data) => {
                        vTiles[i][j] = data
                        progressCount(count++, totalCount, 'downloading vector tiles');
                    }));
                }
            }
        }
        await Promise.all(promiseArray)

        objTiles.tiles = tiles
        objTiles.vTiles = vTiles
        objTiles.distance = distance
        objTiles.topDistance = topDistance
        objTiles.leftDistance = leftDistance
        objTiles.zoom = objTileCnt.zoom
        objTiles.x = x
        objTiles.y = y
        objTiles.zoom = zoom
        objTiles.tileCnt = objTileCnt.tileCnt
        objTiles ? resolve(objTiles) : reject('timout');
    });
}

function progressCount(count, totalCount, msg) {
    processCount.innerHTML = `${msg}  ${count} of ${totalCount}`
}

function setUrlInfo(val) {
    if (scope.serverType === 'mapbox') {
        if (val === 'height') {
            urlType = '@2x.png'
        }
        if (val === 'style') {
            urlType = ''
        }
    } else if (scope.serverType === 'maptiler') {
        if (val === 'height') {
            urlType = '.webp'
        } else if (val === 'jpg') {
            urlType = '.jpg'
        } else if (val === 'png') {
            urlType = '.png'
        }
    }
}

function convertHeightmap(heightmap, watermap) {
    const citiesmapSize = 1081;

    // cities has L/H byte order
    let citiesmap = new Uint8ClampedArray(2 * citiesmapSize * citiesmapSize);
    let workingmap = mapUtils.Create2DArray(citiesmapSize, 0);

    // correct the waterDepth for the scaling.
    // in the final pass, it will be scaled back. Round to 1 decimal
    let waterDepth = Math.round(scope.waterDepth / parseFloat(scope.heightScale) * 100 * 10) / 10;
    // watermap: => normalized depth between 0 => deepest water, 1 => land

    for (let y = 0; y < citiesmapSize; y++) {
        for (let x = 0; x < citiesmapSize; x++) {
            // stay with ints as long as possible
            let height = (heightmap[y][x] - scope.baseLevel * 10);

            // raise the land by the amount of water depth
            // a height lower than baselevel is considered to be the below sea level and the height is set to 0
            // water depth is unaffected by height scale
            // the map is unscaled at this point, so high mountains above 1024 meter can be present
            let calcHeight = (height + Math.round(waterDepth * 10 * watermap[y][x])) / 10;
            workingmap[y][x] = Math.max(0, calcHeight);
        }
    }

    // level correction, for specific needs
    // to smooth plains and dramatize mountains or level a mountanus coastline
    let levelCorrection = parseInt(document.getElementById('levelCorrection').value)
    workingmap = levelMap(workingmap, grid.minHeight + waterDepth, grid.maxHeight, levelCorrection);

    // smooth the plains and wateredges in a number of passes
    let passes = parseInt(document.getElementById('blurPasses').value);
    let postPasses = parseInt(document.getElementById('blurPostPasses').value);
    let plainsHeight = parseInt(document.getElementById('plainsHeight').value);
    for (let l = 0; l < passes; l++) {
        workingmap = filterMap(workingmap, 0, plainsHeight + waterDepth, meanKernel);
    }

    // sharpen the mountains, for more dramatic effect
    for (let l = 0; l < postPasses; l++) {
        workingmap = filterMap(workingmap, plainsHeight + waterDepth, grid.maxHeight, sharpenKernel);
    }

    // if there where enough passes, all the small streams on the plains are faded.
    // so redraw them, with little extra depth
    let streamDepth = parseInt(document.getElementById('streamDepth').value);
    let highestWaterHeight = 0;
    if (document.getElementById('drawStrm').checked) {
        for (let y = 0; y < citiesmapSize; y++) {
            for (let x = 0; x < citiesmapSize; x++) {
                let height = workingmap[y][x];
                if (height > highestWaterHeight) {
                    highestWaterHeight = height;
                }
                // prevent drawing below the seabed
                if (height > streamDepth) {
                    workingmap[y][x] = height - (1 - watermap[y][x]) * streamDepth;
                }
            }
        }
    }

    // tilt the map in the direction of gravity, so water always flows to the lowest point
    //  let tiltHeight = parseInt(document.getElementById('tiltHeight').value);
    // correct the tiltHeight for the scale. In the final pass, it will be corrected back
    //tiltHeight = Math.round(tiltHeight / parseFloat(scope.heightScale) * 100 * 10) / 10;
    //workingmap = tiltMap(workingmap, scope.gravityCenter, tiltHeight);

    // finally, finish the drawn streams with a light smoothing
    // the streams are drawn over the entire map, so post process the entire map
    for (let l = 0; l < postPasses; l++) {
        workingmap = filterMap(workingmap, 0, highestWaterHeight, meanKernel);
    }

    // convert the normalized and smoothed map to a cities skylines map/
    // As this is the final step, take scale into account
    for (let y = 0; y < citiesmapSize; y++) {
        for (let x = 0; x < citiesmapSize; x++) {
            // get the value in 1/10meyers and scale and convert to cities skylines 16 bit int
            let h = Math.round(workingmap[y][x] / 100 * parseFloat(scope.heightScale) / 0.015625);

            if (h > 65535) h = 65535;

            // calculate index in image
            let index = y * citiesmapSize * 2 + x * 2;

            // cities used hi/low 16 bit
            citiesmap[index + 0] = h >> 8;
            citiesmap[index + 1] = h & 255;
        }
    }


    // log the correct bounding rect to the console
    let bounds = getExtent(grid.lng, grid.lat, mapSize);
    console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);

    return citiesmap;
}

function interpolateArray(data, fitCount) {

    let linearInterpolate = function (before, after, atPoint) {
        return before + (after - before) * atPoint;
    };

    let newData = new Array();
    let springFactor = new Number((data.length - 1) / (fitCount - 1));
    newData[0] = data[0]; // for new allocation
    for (let i = 1; i < fitCount - 1; i++) {
        let tmp = i * springFactor;
        let before = new Number(Math.floor(tmp)).toFixed();
        let after = new Number(Math.ceil(tmp)).toFixed();
        let atPoint = tmp - before;
        newData[i] = linearInterpolate(data[before], data[after], atPoint);
    }
    newData[fitCount - 1] = data[data.length - 1]; // for new allocation
    return newData;
}

function levelMap(map, min, max, style) {
    let curve;

    switch (style) {
        case 1: // reserved for testing
            curve = [0.1, 1, 1.9];
            break;
        case 2: // coastline and plains
            curve = [0.15, 0.45, 0.75, 1.1, 1.4, 1.7, 1.9, 1.9];
            break;
        case 3: // agressive coastline and plains
            curve = [0.1, 0.2, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
            break;
        case 9:
            curve = [0.1, 0.2, 0.5, 1, 1.3, 1.7, 2.5];
            break;
        default:
            console.log('no map leveling');
            return map;
    }

    const interpolatedCurve = interpolateArray(curve, 256);

    const maxY = map.length;
    const maxX = map[0].length;
    const elevationStep = Math.round((max - min) / interpolatedCurve.length);

    // calculate the minimum level for each index in the curve
    let levels = [min]; // size of the levels array will be 1 larger then the curve
    let lastLevel = min;
    for (let i = 0; i < interpolatedCurve.length; i++) {
        levels.push(Math.round((lastLevel + elevationStep * interpolatedCurve[i]) * 10) / 10);
        lastLevel = levels[i + 1];
    }

    // debugging
    //let debug = [];
    //for(let i = 0; i < interpolatedCurve.length; i++) {
    //    debug.push([i, interpolatedCurve[i], levels[i]]);
    //}
    //exportToCSV(debug);

    const leveledMap = mapUtils.Create2DArray(maxY, 0);

    let highestHight = 0;

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = map[y][x];

            if (h - min > 0) {
                // calcualte the index based on the position in the heights array
                let idx = Math.min(interpolatedCurve.length - 1, Math.floor((h - min) / elevationStep));
                h = levels[idx] + ((h - levels[idx]) * interpolatedCurve[idx]);
                h = Math.round(h * 10) / 10;
            }
            leveledMap[y][x] = h;

            if (h > highestHight) highestHight = h;
        }
    }

    console.log(`min ${min} max ${max} highest high ${highestHight}`);
    // after releveling the map, it is possible that the highest point has become higher
    // rescale back to original min max
    let rescale = 10;
    if (highestHight > max) {
        rescale = Math.floor((max - min) / highestHight * 100) / 10; // little speed gain, by taking calc out the loop
        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                let h = leveledMap[y][x];
                if (h - min > 0) {
                    leveledMap[y][x] = Math.round(h * rescale) / 10;
                }
            }
        }
    }

    console.log(`leveled map with style ${style}, rescale ${rescale / 10}`);
    return leveledMap;
}

function filterMap(map, fromLevel, toLevel, kernel) {
    const maxY = map.length;
    const maxX = map[0].length;

    // kernel size must be uneven!
    const kernelDist = parseInt((kernel.length - 1) / 2);

    const filteredMap = mapUtils.Create2DArray(maxY, 0);

    for (let y = 0; y < maxY; y++) {
        for (let x = 0; x < maxX; x++) {
            let h = map[y][x];
            if (h >= fromLevel && h < fromLevel + toLevel) {
                let sum = 0;
                let cnt = 0;
                for (let i = -kernelDist; i <= kernelDist; i++) {
                    for (let j = -kernelDist; j <= kernelDist; j++) {
                        if (y + i >= 0 && y + i < maxY && x + j >= 0 && x + j < maxX) {
                            cnt += kernel[i + kernelDist][j + kernelDist];
                            sum += map[y + i][x + j] * kernel[i + kernelDist][j + kernelDist];
                        }
                    }
                }
                if (cnt) h = sum / cnt;
            }
            filteredMap[y][x] = h;
        }
    }

    return filteredMap;
}

async function previewHeightmap() {
    progressMsg.innerHTML = 'Processing heightmap'
    startTimer()
    let convertedHeightmap, png, imgUrl;
    setUrlInfo('height')
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked
    let objTiles = await getHeightmap()
    let watermap = mapUtils.sanatizeWatermap(mapUtils.toWatermap(objTiles.vTiles, objTiles.heightmap.length), objTiles.xOffset, objTiles.yOffset);
    if (autoCalc === true) {
        await autoCalculateBaseHeight()
    }

    convertedHeightmap = convertHeightmap(objTiles.sanatizedMap, watermap);
    png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
    imgUrl = download('testheightmap.png', png, true);
    previewImage.src = imgUrl
    updateInfopanel()
    stopTimer()
}

// async function downloadVtiles(tileCnt, x, y,zoom) {
//     let vTiles = mapUtils.Create2DArray(tileCnt);
//
//     for (let i = 0; i < tileCnt; i++) {
//         for (let j = 0; j < tileCnt; j++) {
//             incPb(pbElement);
//             let url = 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/' + zoom + '/' + (x + j) + '/' + (y + i) + '.vector.pbf?access_token=' + mapboxgl.accessToken;
//             let woQUrl = 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/' + zoom + '/' + (x + j) + '/' + (y + i) + '.vector.pbf';
//
//             await downloadPbfToTile(url, woQUrl).then((data) => vTiles[i][j] = data);
//         }
//     }
//     return vTiles
// }

// async function downloadPbfToTile(url, withoutQueryUrl = url) {
//     const cachedRes = await caches.match(url, {ignoreSearch: true});
//     if (cachedRes && cachedRes.ok) {
//         console.log('pbf: load from cache');
//         let data = await cachedRes.arrayBuffer();
//         let tile = new VectorTile(new Protobuf(new Uint8Array(data)));
//         return tile;
//     } else {
//         console.log('pbf: load by fetch, cache downloaded file');
//         try {
//             const response = await fetch(url);
//             if (response.ok) {
//                 let res = response.clone();
//                 let data = await response.arrayBuffer();
//                 let tile = new VectorTile(new Protobuf(new Uint8Array(data)));
//                 cache.put(withoutQueryUrl, res);
//                 return tile;
//             } else {
//                 throw new Error('download Pbf error:', response.status);
//             }
//         } catch (e) {
//             console.log(e.message);
//             return true;
//         }
//     }
// }


async function workerProcess(config) {
    return new Promise(async (resolve, reject) => {
        myWorker.postMessage(config);
        myWorker.onmessage = function (e) {
            //  console.log(e.data)
            let results = e.data
            if (results.process === 'worker' && results.msg === 'complete') {
                stopTimer()
                resolve(true)
            } else if (results.process === 'weightMap' && results.msg === 'update') {
                processStatus.innerHTML = `Converting ${results.name}  `
            } else if (results.process === 'combineTilesJimp' && results.msg === 'update') {
                progressCount(results.count, results.totalCount, '')
            }
        }
    })
}

async function setupEventSource() {

    // let isRunning = await isServerRunning()
    // if (isRunning === false) {
    //     toggleModal('open', `Backend server is checked in settings, but the server is not running.  Please see help to install and start the server or uncheck Backend server.`)
    //     return
    // }
    if (event_source === undefined) {
        event_source = new EventSource(userSettings.desktopServerUrl + 'subscribe');
        event_source.onmessage = function (event) {
            let data = JSON.parse(event.data)
            if (data.event === 'stitch_tiles' && data.count) {
                let total_count
                if (data.total_count) {
                    total_count = data.total_count
                } else {
                    total_count = 'unknown'
                }
                progressCount(data.count, total_count, data.process)
            } else if (data.event === 'stitch_tiles') {
                processCount.innerHTML = data.process
            }
        };
    }
}

async function exportMap() {
    let dirHandle = await userSettings.dirHandle
    let satZoomVal = document.getElementById('satZoomVal').value
    let overrideSatZoom = document.getElementById('overrideSatZoom').checked
    let heightmapZoomVal = document.getElementById('heightmapZoomVal').value
    let overrideHeightmapZoom = document.getElementById('overrideHeightmapZoom').checked
    let ele_heightmap = document.getElementById('heightmap').checked
    let satellite = document.getElementById('satellite').checked
    let isRunning

    let bUseBackend = false
    if (satZoomVal > 14 || heightmapZoomVal > 14) {
        isRunning = await isServerRunning()
        if (isRunning === false) {
            toggleModal('open', `To use a zoom level of greater than 14 please download the desktop version, download link in help file.  Cannot connect to desktop server`)
            return
        } else {
            await setupEventSource(satellite, ele_heightmap)
            bUseBackend = true
        }
    }

    try {
        if (await fileUtils.verifyPermission(dirHandle, true) === false) {
            console.error(`User did not grant permission to '${dirHandle.name}'`);
            return;
        }
    } catch (e) {
        toggleModal('open', `Please choose a download directory in the settings panel`)
        togglePanel(4)
        console.log(e)
        return
    }

    let convertedHeightmap, png;
    let autoCalc = document.getElementById("autoCalcBaseHeight").checked

    let mapimage = document.getElementById('mapimage').checked
    let weightmap = document.getElementById('weightmapdl').checked
    let geojson = document.getElementById('geojson').checked
    let sealevel = document.getElementById('sealevel').checked
    let flipx = document.getElementById('flipx').checked
    let flipy = document.getElementById('flipy').checked
    let useworldpart = document.getElementById('useworldpart').checked
    let heightmapblurradius = document.getElementById('blurradius').value
    let weightmapblurradius = document.getElementById('weightmapblurradius').value
    let landscapeSize = ''

    if (useworldpart === true) {
        landscapeSize = scope.worldpartlandscapeSize.toString()
    } else {
        landscapeSize = scope.landscapeSize.toString()
    }

    let lat, lng
    lng = grid.lng.toFixed(5)
    lat = grid.lat.toFixed(5)

    let tileSize = 512
    let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
    let bbox = [extent.topleft[0], extent.bottomright[1], extent.bottomright[0], extent.topleft[1]]
    let bboxTLBR = [extent.topleft[0], extent.topleft[1], extent.bottomright[0], extent.bottomright[1]]
    let satzoom, heightzoom
    if (satZoomVal.length === 0) {
        satzoom = 14
    } else {
        satzoom = satZoomVal
    }
    if (heightmapZoomVal.length === 0) {
        heightzoom = 14
    } else {
        heightzoom = heightmapZoomVal
    }
    let bboxString = '[' + bbox + ']'
    let config = {}
    subDirName = ''
    subDirName = `tile_lat_${lat}_lng_${lng}`
    const subDir = await dirHandle.getDirectoryHandle(subDirName, {create: true});

    if (scope.exportType === 'unrealSend') {
        if (ele_heightmap !== true) {
            toggleModal('open', `Send to Unreal requires image download type heightmap to be checked`)
            return
        }
    }

    if (ele_heightmap === true || satellite === true || mapimage === true || weightmap === true || geojson === true) {
        //Process heightmap
        if (ele_heightmap === true) {
            heightmapFileName = `heightmap_landscape_size_${landscapeSize}.png`
            progressMsg.innerHTML = 'Processing heightmap'
            console.log('heightmap')
            startTimer()
            setUrlInfo('height')
            let objTileCnt = mapUtils.getTileCountAdjusted(heightzoom, extent, overrideHeightmapZoom)
            config = {}
            let ZrangeSeaLevel = '32767'
            let maxPngValue = '65535'
            let minPngValue = '0'
            let resizeMethod = 'bilinear'
            let translateOptions = `-ot UInt16 -of PNG -scale ${minPngValue} ${maxPngValue} ${ZrangeSeaLevel} ${maxPngValue} -outsize ${landscapeSize} ${landscapeSize} -r ${resizeMethod}`

            config.function = 'heightmap'
            config.heightmapblurradius = heightmapblurradius
            config.sealevel = sealevel
            config.flipx = flipx
            config.flipy = flipy
            config.landscapeSize = landscapeSize
            config.dirHandle = subDir
            config.filename = heightmapFileName
            config.bbox = bboxTLBR
            config.zoom = parseInt(objTileCnt.zoom)
            config.access_token = urlType + '?' + urlKey + scope.apiKey
            config.api_url = scope.terrianUrl
            config.base_dir = scope.desktopDownloadDirectory
            config.sub_dir = subDirName
            config.is_heightmap = true
            if (bUseBackend === true) {
                console.log('send backend')
                await processFromBackend(config)
                stopTimer()
            } else {
                let objTiles = await getHeightmap(heightzoom, overrideHeightmapZoom)
                let watermap = mapUtils.sanatizeWatermap(mapUtils.toWatermap(objTiles.vTiles, objTiles.heightmap.length), objTiles.xOffset, objTiles.yOffset);
                if (autoCalc === true) {
                    await autoCalculateBaseHeight()
                }
                convertedHeightmap = convertHeightmap(objTiles.sanatizedMap, watermap);
                png = UPNG.encodeLL([convertedHeightmap], 1081, 1081, 1, 0, 16);
                console.log('finished convert heightmap')
                updateInfopanel()
                stopTimer()

                console.log('start manipulating image')
                progressMsg.innerHTML = 'Manipulating and resizing image'
                startTimer(true)
                //Resample rescale
                config.png = png
                config.function = 'manipulateImage'
                config.isHeightmap = true
                await workerProcess(config)
                stopTimer()
            }
        }

        //Process satellite
        if (satellite === true) {
            console.log('Processing satellite')
            progressMsg.innerHTML = 'Processing satellite'
            startTimer()
            setUrlInfo('jpg')

            let objTileCnt = mapUtils.getTileCountAdjusted(satzoom, extent, overrideSatZoom)
            let satFilename = `satellite_zoom_${objTileCnt.zoom}.png`
            config = {}
            config.function = 'satellite'
            config.dirHandle = subDir
            config.heightmapblurradius = heightmapblurradius
            config.sealevel = sealevel
            config.flipx = flipx
            config.flipy = flipy
            config.landscapeSize = landscapeSize
            config.filename = satFilename
            config.bbox = bboxTLBR
            config.zoom = parseInt(objTileCnt.zoom)
            config.access_token = urlType + '?' + urlKey + scope.apiKey
            config.api_url = scope.satelliteMapUrl
            config.base_dir = scope.desktopDownloadDirectory
            config.sub_dir = subDirName
            config.is_heightmap = false
            if (bUseBackend === true) {
                console.log('send backend')
                await processFromBackend(config)
                stopTimer()
            } else {
                let objTiles = await downloadTiles(scope.satelliteMapUrl, false, satzoom, overrideSatZoom)
                console.log('Combining images')
                progressMsg.innerHTML = 'Combining images'
                startTimer()
                config.function = 'combineImages'
                config.objTiles = objTiles
                config.tileSize = tileSize
                config.dirHandle = subDir
                config.lng = lng
                config.lat = lat
                config.zoom = objTiles.zoom
                config.filename = satFilename
                await workerProcess(config)
                stopTimer()
            }
        }
        //Process mapimage
        if (mapimage === true) {
            console.log('Processing map image')
            progressMsg.innerHTML = 'Processing map image'
            startTimer()

            let styleName, objStyle, url, mapFileName
            if (scope.serverType === 'mapbox') {
                //Use the static api instead of stitching tiles
                styleName = map.getStyle().metadata['mapbox:origin'];
                if (styleName === undefined) {
                    url = scope.mapUrl + scope.weightMapUrl + '/static/'
                    console.log('weight')
                } else {
                    objStyle = mapUtils.convertMapboxMaptilerStyles('mapbox', styleName)
                    url = scope.mapUrl + 'mapbox/' + objStyle[0].mapbox + '/static/'
                }

                let width = 1280
                let height = 1280
                url = url + bboxString + `/${height}x${width}?access_token=${scope.apiKey}&attribution=false&logo=false`
                mapFileName = `map_image_width_${width}_height_${height}.png`

                let objTile = await mapUtils.downloadToTile(false, url)
                await saveImage(subDir, objTile.buffer, mapFileName, "png")
                stopTimer()

            } else if (scope.serverType === 'maptiler') {
                setUrlInfo('png')
                styleName = map.getStyle().name
                objStyle = mapUtils.convertMapboxMaptilerStyles('maptiler', styleName.toUpperCase())
                url = scope.mapUrl + objStyle[0].maptiler_map + '/'
                let objTiles = await downloadTiles(url, false, zoom, false)
                stopTimer()
                mapFileName = `map_image.png`

                console.log('Combining images')
                progressMsg.innerHTML = 'Combining images'
                startTimer()
                config = {}
                config.function = 'combineImages'
                config.objTiles = objTiles
                config.tileSize = tileSize
                config.dirHandle = subDir
                config.lng = lng
                config.lat = lat
                config.zoom = objTiles.zoom
                config.filename = mapFileName
                await workerProcess(config)
                stopTimer()
            }
        }

        //Process weightmap
        if (weightmap === true) {
            if (scope.serverType === 'mapbox') {
                console.log('Processing weightmap image')
                progressMsg.innerHTML = 'Processing weightmap image'
                startTimer(true)

                let url = scope.mapUrl + scope.weightMapUrl + '/static/'
                let width = 1280
                let height = 1280
                url = url + bboxString + `/${height}x${width}?access_token=${scope.apiKey}&attribution=false&logo=false`
                let weightFileName = `weightmap_image_width_${width}_height_${height}.png`
                //Use the static api instead of stitching tiles
                let objTile = await mapUtils.downloadToTile(false, url)
                await saveImage(subDir, objTile.buffer, weightFileName, "png")

                config = {}
                config.function = 'weightMap'
                config.weight_data = userSettings.weightmapColors
                config.weightMapUrl = scope.weightMapUrl
                config.dirHandle = subDir
                config.objTile = objTile
                config.lng = grid.lng
                config.lat = grid.lat
                config.weightmapblurradius = weightmapblurradius
                config.landscapeSize = landscapeSize
                await workerProcess(config)
                stopTimer()
            } else {
                console.log('Weightmaps are not available for Maptiler')
                //toggleModal('open', `Weightmaps are not available for Maptiler`)
            }
            stopTimer()
        }
        //Process geojson
        if (geojson === true) {
            console.log('Processing geojson')
            progressMsg.innerHTML = 'Processing geojson'
            startTimer()
            let features = mapUtils.getFeaturesFromBB(map, bbox, true)
            let strFeatures = JSON.stringify(features)
            let featuresFileName = `features_lat_${lat}_lng_${lng}.json`
            await fileUtils.writeFileToDisk(subDir, featuresFileName, strFeatures)
            stopTimer()
        }
        if (scope.exportType === 'unrealSend') {
            await sendToUnreal(landscapeSize,useworldpart)
        }
    } else {
        toggleModal('open', `Please select at least one image type to download`)
    }
}


// function wait(milliseconds) {
//     return new Promise(resolve => setTimeout(resolve, milliseconds));
// }

async function isServerRunning() {
    try {
        const response = await fetch(userSettings.desktopServerUrl, {
            method: "GET"
        })
        let result = await response.json()
        if (result.msg === 'server is running') {
            return true
        } else {
            return false
        }
    } catch (e) {
        console.log(e)
        stopTimer()
        return false
    }
}

async function processFromBackend(data) {
    try {
        let payload = JSON.stringify(data)
        const response = await fetch(userSettings.desktopServerUrl + 'process_tiles', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: payload
        })
        let result = await response.json()
    } catch (e) {
        console.log(e)
        stopTimer()
    }
}

async function autoCalculateBaseHeight() {
    await setBaseLevel()
    await setHeightScale()
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
    scope.exportType = e.value
}

function landscapeSizeChange(e) {
    scope.landscapeSize = e.value
    calculateScale()
}

function worldpartlandscapeSizeChange(e) {
    scope.worldpartlandscapeSize = e.value
    calculateScale()
}
function useworldpartChange(e) {
    calculateScale()
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

function getTilesResolutionSize(tiles) {
    let tl_tiles = tiles[0]
    let br_tiles = tiles[tiles.length - 1]
    let x_tile_range = [tl_tiles.x, br_tiles.x]
    let y_tile_range = [tl_tiles.y, br_tiles.y]
    let edge_length_x = x_tile_range[1] - x_tile_range[0]
    let edge_length_y = y_tile_range[1] - y_tile_range[0]
    edge_length_x = Math.max(1, edge_length_x)
    edge_length_y = Math.max(1, edge_length_y)
    let width = 512, height = 512
    let total_width = width * edge_length_x
    let total_height = height * edge_length_y
    let obj = {}
    obj.totalHeight = total_height
    obj.totalWidth = total_width
    return obj
}

function overrideSatZoomChange(zoom) {
    let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
    let tiles = mapUtils.getTileCount(zoom, extent)
    let obj = getTilesResolutionSize(tiles)
    let count = tiles.length
    document.getElementById('satZoomTileCount').innerHTML = count.toString()
    if (zoom > 14) {
        document.getElementById('satresolution').innerHTML = `Expected sat resolution if zoom > 14 Height: ${obj.totalHeight} Width: ${obj.totalWidth}`
    }
}


function overrideHeightmapZoomChange(zoom) {
    let extent = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
    let tiles = mapUtils.getTileCount(zoom, extent)
    let obj = getTilesResolutionSize(tiles)
    let count = tiles.length
    document.getElementById('heightmapZoomTileCount').innerHTML = count.toString()
    if (zoom > 14) {
        document.getElementById('heightresolution').innerHTML = `Expected height resolution if zoom > 14 Height: ${obj.totalHeight} Width: ${obj.totalWidth}`
    }
}

async function saveImage(dirHandle, imageBytes, save_fileName, file_type) {
    let outputBlob = new Blob([imageBytes], {type: 'image/' + file_type});
    await fileUtils.writeFileToDisk(dirHandle, save_fileName, outputBlob)
}

async function saveWeightmapGrid() {
    gridOptions.api.stopEditing();
    await saveUserSettings()
}

async function deleteWeightmapGrid() {
    gridOptions.api.stopEditing();
    let selectedRows = gridOptions.api.getSelectedNodes()
    let rows = gridOptions.rowData
    for (let i = 0; i < selectedRows.length; i++) {
        for (let j = 0; j < rows.length; j++) {
            if (rows[j] === selectedRows[i].data) {
                rows.splice(j, 1);
            }
        }
    }
    gridOptions.api.setRowData(rows);
    await saveUserSettings()
}

function addWeightmapGrid() {
    gridOptions.rowData.push({name: 'New Value', color: '1,1,1'})
    gridOptions.api.setRowData(gridOptions.rowData);
}

function help() {
    let params = `scrollbars=yes,resizable=no,status=no,location=no,toolbar=no,menubar=no,
width=900,height=600,left=500,top=100`;
    open('help.html', 'help', params);
}

async function sendToUnreal(landscapesize,useworldpart) {
    startTimer('Sending to Unreal', true)
    console.log('sendtounreal')
    let host = 'http://localhost:30010/', call = 'remote/object/call', data = {}, dataJson, result,
        bpPath, bluePrintName = 'Mapbox_BP'


    //Find name of Mapbox_BP in scene
    data = {
        "objectPath": "/Script/UnrealEd.Default__EditorActorSubsystem",
        "functionName": "GetAllLevelActors"
    }

    dataJson = await mapUtils.unrealRemoteControl(data, host + call)
    if (dataJson.error) {
        if (dataJson.error.message === "Failed to fetch") {
            toggleModal('open', "Cannot connect to Unreal server. Please make sure your project is open and Mapbox_BP is in the scene.  " +
                "Also make sure you launched the Map using the Select Map button as this starts the Unreal Web Server")
        } else {
            toggleModal('open', dataJson.error.message)
        }
    } else {
        let objArray = await dataJson.response.json()
        for (let obj of objArray.ReturnValue) {
            result = obj.includes(bluePrintName)
            if (result === true) {
                bpPath = obj
                break;
            } else {
                bpPath = null
            }
        }

        if (bpPath) {
            //Mapbox_BP is in scene and we can continue
            let wpGridSize
            if (useworldpart === true) {
                wpGridSize = worldpartiongridsize
            } else {
                wpGridSize = 0
            }

            data = {
                "objectPath": bpPath,
                "functionName": "GenerateMapboxLandscape",
                "parameters": {
                    "LandscapeName": landscapename,
                    "LandscapeSize": landscapesize.toString() ,
                    "TileHeightmapFileName": subDirName + '/' + heightmapFileName,
                    "TileGeojsonFileName": "",
                    "TileInfoFileName": "",
                    "MapMiddleLngX": "",
                    "MapMiddleLatY": "",
                    "MapBtmRLng": "",
                    "MapBtmLLng": "",
                    "MapTopLLat": "",
                    "MapBtmLLat": "",
                    "RunFunction": "Unreal Heightmap",
                    "SlippyMapTileString": "",
                    "HeightMapTexturesPath": '/Game/ImportedHeightMaps/',
                    "AlphaBrushName": "",
                    "AlphaBrushDestinationPath": "",
                    "AlphaBrushTemplatePath": "",
                    "AlphaBrushTexturesPath": "",
                    "HeightmapProperty": "HeightMap",
                    "WorldPartitionGridSize": wpGridSize.toString()
                }
            }


            //Call method on Mapbox_BP
            dataJson = await mapUtils.unrealRemoteControl(data, host + call)
            if (dataJson.error) {
                console.log(dataJson.error)
                toggleModal('open', dataJson.error.message)
            } else {
                //Success
                console.log(await dataJson.response.json())
            }
        } else {
            toggleModal('open', 'Could not find Mapbox_BP in scene')
        }
    }
    stopTimer()
}

function readChunks(reader) {
    return {
        async* [Symbol.asyncIterator]() {
            let readResult = await reader.read();
            while (!readResult.done) {
                yield readResult.value;
                readResult = await reader.read();
            }
        },
    };
}

async function loadGeojson() {
    try {
        if (map.getLayer("geojson-layer")) {
            map.removeLayer("geojson-layer");
        }

        if (map.getSource("geojson")) {
            map.removeSource("geojson");
        }
        let obj = {}
        //https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/geojson/vancouver-blocks.json
        let response = await fetch(scope.GeojsonUrl);
        let geojson_data = await response.json();
        let source = {
            type: 'geojson',
            // Use a URL for the value for the `data` property.
            data: geojson_data
        }
        map.addSource('geojson', source);
        let layerStyle = JSON.parse(scope.GeojsonLayerStyle)
        map.addLayer(layerStyle)
        obj.source = source
        obj.layer = layerStyle
        // togglePanel(6)
        return obj
    } catch (e) {
        console.log(e)
        toggleModal('open', e)
    }
}

async function geoJsonScreenShot(panelid) {

    if (geojsonStyleObj === null) {
        geojsonStyleObj = await loadGeojson()
    }
    let nostyle = {version: 8, sources: {}, layers: []}
    map.setStyle(nostyle)
    let style = 'nostyle'

    map.on('style.load', async function () {
        if (style === 'nostyle') {
            // map.setLayoutProperty('startsquare', 'visibility', 'none');
            // map.setLayoutProperty('grid', 'visibility', 'none');
            // const sideBar = document.getElementById('sideBar')
            // sideBar.style.display = "none";
            map.addSource('geojson', geojsonStyleObj.source);
            map.addLayer(geojsonStyleObj.layer)
            let bbox2 = turf.bbox(geojsonStyleObj.source.data);
            map.fitBounds(bbox2, {padding: 10})
            await captureScreen(panelid);
            style = ''
            // sideBar.style.display = "block"
            // map.setLayoutProperty('startsquare', 'visibility', 'visible');
            // map.setLayoutProperty('grid', 'visibility', 'visible');
            setMapStyle(null, 'streets-v11');
        }
    })
}

async function captureScreen(panelid) {
    let dirHandle = await userSettings.dirHandle
    try {

        if (await fileUtils.verifyPermission(dirHandle, true) === false) {
            console.error(`User did not grant permission to '${dirHandle.name}'`);
            return;
        }
    } catch (e) {
        toggleModal('open', `Please choose a download directory in the settings panel`)
        togglePanel(4)
        console.log(e)
        return
    }

    togglePanel(panelid)
    let transparent = document.getElementById('transparent').checked
    let resizeimage = document.getElementById('resizeimage').checked

    map.setLayoutProperty('startsquare', 'visibility', 'none');
    map.setLayoutProperty('grid', 'visibility', 'none');
    const sideBar = document.getElementById('sideBar')
    sideBar.style.display = "none";

    const logo = document.getElementsByClassName('mapboxgl-ctrl-logo')
    const canvas = document.createElement("canvas");
    const srcContext = canvas.getContext("2d");
    const video = document.createElement("video");
    let dstCanvas = document.createElement("canvas");
    let dstContext = dstCanvas.getContext("2d");
    let lng = grid.lng.toFixed(5)
    let lat = grid.lat.toFixed(5)
    subDirName = ''
    subDirName = `tile_lat_${lat}_lng_${lng}`
    let buffer, tempImage

    let subDir = await dirHandle.getDirectoryHandle(subDirName, {create: true});

    try {
        logo[0].style.cssText = 'display:none !important';
        // logo.style.setProperty('display', 'none', 'important');
        const captureStream = await navigator.mediaDevices.getDisplayMedia();
        video.srcObject = captureStream;
        await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        await video.play();

        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        const screenLeft = window.screenLeft;
        const screenTop = window.screenTop;
        const windowLeft = window.outerWidth - window.innerWidth - screenLeft;
        const windowTop = window.outerHeight - window.innerHeight - screenTop;
        dstCanvas.width = displayWidth
        dstCanvas.height = displayHeight;
        // 224, 230, 238
        let transparentColor = {
            r: 224,
            g: 230,
            b: 238
        };
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        srcContext.drawImage(video, windowLeft, windowTop, displayWidth, displayHeight, 0, 0, displayWidth, displayHeight);

        if (transparent === true) {
            let pixels = srcContext.getImageData(0, 0, displayWidth, displayHeight);
            for (let i = 0, len = pixels.data.length; i < len; i += 4) {
                let r = pixels.data[i];
                let g = pixels.data[i + 1];
                let b = pixels.data[i + 2];

                // if the pixel matches our transparent color, set alpha to 0
                if (r === transparentColor.r && g === transparentColor.g && b === transparentColor.b) {
                    pixels.data[i + 3] = 0;
                }
            }
            dstContext.putImageData(pixels, 0, 0);
            tempImage = await imageUtiles.loadImageFromCanvas(dstCanvas)
        } else {
            tempImage = await imageUtiles.loadImageFromCanvas(canvas)
        }

        if (resizeimage === true) {
            tempImage = tempImage.resize({width: scope.landscapeSize, height: scope.landscapeSize})
        }
        buffer = await tempImage.toBuffer()
        captureStream.getTracks().forEach(track => track.stop());

        sideBar.style.display = "block"
        map.setLayoutProperty('startsquare', 'visibility', 'visible');
        map.setLayoutProperty('grid', 'visibility', 'visible');

        if (window === window.top) {
            await saveImage(subDir, buffer, 'screenshot.png', "png")
        } else {
            console.error("Error: screenshot");
            sideBar.style.display = "block"
            map.setLayoutProperty('startsquare', 'visibility', 'visible');
            map.setLayoutProperty('grid', 'visibility', 'visible');
        }
    } catch (err) {
        console.error("Error: " + err);
        sideBar.style.display = "block"
        map.setLayoutProperty('startsquare', 'visibility', 'visible');
        map.setLayoutProperty('grid', 'visibility', 'visible');
    }
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
window.overrideSatZoomChange = overrideSatZoomChange
window.overrideHeightmapZoomChange = overrideHeightmapZoomChange
window.saveWeightmapGrid = saveWeightmapGrid
window.deleteWeightmapGrid = deleteWeightmapGrid
window.addWeightmapGrid = addWeightmapGrid
window.worldpartlandscapeSizeChange = worldpartlandscapeSizeChange
window.help = help
window.geoJsonScreenShot = geoJsonScreenShot
window.captureScreen = captureScreen
window.loadGeojson = loadGeojson
window.useworldpartChange = useworldpartChange



