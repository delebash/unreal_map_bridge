import imageUtils from "./image-utiles.js";
import tib from "tiles-in-bbox";
let cache, downloadCount = 0
caches.open('tiles').then((data) => cache = data);


function getTileInfo(lng, lat, multiple, x, y, z, bbox) {
    // let tileInfo = {}
    // let xyzpoint
    //
    //
    // if (multiple === false) {
    //   xyzpoint = tilebelt.pointToTile(lng, lat, z)
    //   x = xyzpoint[0]
    //   y = xyzpoint[1]
    // }
    //
    // let widthInMeters = 40075016.686 * Math.abs(Math.cos(lat)) / Math.pow(2, z);
    // let metersPerPixel = widthInMeters / 512;
    //
    // tileInfo.z = z
    // tileInfo.x = x
    // tileInfo.y = y
    // tileInfo.pointLng = lng
    // tileInfo.pointLat = lat
    // tileInfo.tileWidthInMeters = widthInMeters
    // tileInfo.metersPerPixel = metersPerPixel
    // tileInfo.mapboxTileName = tileInfo.z + "-" + tileInfo.x + "-" + tileInfo.y
    // tileInfo.tile = [tileInfo.x, tileInfo.y, tileInfo.z] // x,y,z
    // if (multiple === false) {
    //   tileInfo.bbox = tilebelt.tileToBBOX(tileInfo.tile);
    // } else {
    //   tileInfo.bbox = bbox;
    // }
    // //tileInfo.bbox = tilebelt.tileToBBOX(tileInfo.tile);
    // tileInfo.polygon_bb = getTileGeoJsonBB(tileInfo.bbox)
    // tileInfo.area_bb = getAreaBB(tileInfo.bbox)
    //
    // const llb = new mapboxgl.LngLatBounds(tileInfo.bbox);
    //
    // //Corners of bbox
    // tileInfo.bboxCT = llb.getCenter();
    // tileInfo.bboxSW = llb.getSouthWest()
    // tileInfo.bboxNE = llb.getNorthEast()
    // tileInfo.bboxNW = llb.getNorthWest()
    // tileInfo.bboxSE = llb.getSouthEast()
    //
    // //Edge of bbox
    // tileInfo.bboxW = llb.getWest().toFixed(5)
    // tileInfo.bboxS = llb.getSouth().toFixed(5)
    // tileInfo.bboxE = llb.getEast().toFixed(5)
    // tileInfo.bboxN = llb.getNorth().toFixed(5)
    //
    // tileInfo.topLeft = tileInfo.bboxNW
    // tileInfo.bottomLeft = tileInfo.bboxSW
    // tileInfo.topRight = tileInfo.bboxNE
    // tileInfo.bottomRight = tileInfo.bboxSE
    // tileInfo.center = tileInfo.bboxCT
    //
    //
    // const topLeft = turf.point([tileInfo.bboxNE.lng, tileInfo.bboxNE.lat]);
    // const topRight = turf.point([tileInfo.bboxSW.lng, tileInfo.bboxNE.lat]);
    // const bottomLeft = turf.point([tileInfo.bboxNE.lng, tileInfo.bboxSW.lat]);
    // const bottomRight = turf.point([tileInfo.bboxSW.lng, tileInfo.bboxSW.lat]);
    // const middleLeft = turf.midpoint(topLeft, bottomLeft);
    // const middleRight = turf.midpoint(topRight, bottomRight);
    // tileInfo.distance = turf.distance(middleLeft, middleRight, 'kilometers').toFixed(2);
    //
    // tileInfo.maxPngValue = 65535
    // tileInfo.rgbFileName = 'terrain-rgb' + '-' + tileInfo.mapboxTileName + '.png'
    // tileInfo.mapFileName = 'map' + '-' + tileInfo.mapboxTileName + '.png'
    // tileInfo.satFileName = 'sat' + '-' + tileInfo.mapboxTileName + '.png'
    // tileInfo.thirtyTwoFileName = 'thirtytwo' + '-' + tileInfo.mapboxTileName + '.png'
    // tileInfo.tileInfoFileName = 'tile-info' + '-' + tileInfo.mapboxTileName + '.json'
    // tileInfo.geoJsonFileName = 'geojson' + '-' + tileInfo.mapboxTileName + '.json'

    // return tileInfo
}


function getFeaturesFromBB(map, tile_info, combine) {
    tile_info.swPt = map.project(tile_info.bboxSW)
    tile_info.nePt = map.project(tile_info.bboxNE)
    tile_info.nwPt = map.project(tile_info.bboxNW)
    tile_info.sePt = map.project(tile_info.bboxSE)
    let features = map.queryRenderedFeatures([tile_info.swPt, tile_info.nePt])

    if (combine === true) {
        features = getUniqueFeatures(features)
    }
    return features

}

// Because features come from tiled vector data,
// feature geometries may be split
// or duplicated across tile boundaries.
// As a result, features may appear
// multiple times in query results.
function getUniqueFeatures(features) {
    const uniqueIds = new Set();
    const uniqueFeatures = [];
    for (const feature of features) {
        const name = feature.properties["name"];
        const type = feature.geometry["type"];
        let id = name + '-' + type
        if (!uniqueIds.has(id)) {
            uniqueIds.add(id);
            uniqueFeatures.push(feature);
        }
    }
    return uniqueFeatures;
}

async function unrealRemoteControl(data, url) {
    let response, dataJson = {}, error = ''

    const requestOptions = {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    };

    try {
        response = await fetch(url, requestOptions);
    } catch (e) {
        error = e
    }

    dataJson.response = response
    dataJson.error = error

    return dataJson

}

/**
 * Download png from api
 *
 * @param {boolean} toPng Convert to png or leave as array buffer
 * @param {string} url Convert to png or leave as array buffer
 * @param {string} withoutQueryUrl used to store in cache
 * @param {number} x slippy tile x
 * @param {number} y slippy tile y
 * @return {png,buffer} return png or buffer
 */
async function downloadToTile(toPng, url, withoutQueryUrl = url, x = 0, y = 0,) {

    let obj = {}, png
    const cachedRes = await caches.match(url, {ignoreSearch: true});
    if (cachedRes && cachedRes.ok) {
        console.log('tile: load from cache');
        let buffer = await cachedRes.arrayBuffer();
        if (toPng === true) {
            png = await imageUtils.loadImageFromArray(buffer);
            return png
        } else {
            obj.buffer = buffer
            obj.x = x
            obj.y = y
            return obj;
        }
    } else {
        console.log('tile: load by fetch, cache downloaded file');
        try {
            const response = await fetch(url);
            if (response.ok) {
                let res = response.clone();
                let buffer = await response.arrayBuffer();
                cache.put(withoutQueryUrl, res);
                if (toPng === true) {
                    png = await imageUtils.loadImageFromArray(buffer);
                    return png
                } else {
                    obj.buffer = buffer
                    obj.x = x
                    obj.y = y
                    return obj;
                }
            } else {
                throw new Error('download tileerror:', response.status);
            }
        } catch (e) {
            console.log(e.message);
        }
    }
}




function long2tile(lon, zoom) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

function lat2tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    let n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toHeightmap(tiles, distance,mapSize) {

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
            let tile = tiles[i][j].getRGBAData()
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
function getTileCount(zoom,extent) {
        let bbox = {
        bottom: extent.bottomright[1],
        left: extent.topleft[0],
        top: extent.topleft[1],
        right: extent.bottomright[0]
    }
    return tib.tilesInBbox(bbox, zoom)
}

function getTileCountAdjusted(zoom, extent, override = false) {
    // get the extent of the current map
    // in heightmap, each pixel is treated as vertex data, and 1081px represents 1080 faces
    // therefore, "1px = 16m" when the map size is 17.28km
       let obj = {}

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

    //override for sat download
    if (override === false) {
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
    }

    obj.tileCnt = tileCnt
    obj.zoom = zoom
    obj.x = x
    obj.y = y

    return obj
}
function deleteCaches() {
    if (confirm('Delete the caches.\nIs that okay?')) {
        caches.delete('tiles').then(() => {
            caches.open('tiles').then((data) => cache = data);
        });
    }
}
function convertMapboxMaptilerStyles(key, layerId) {

    let mapStyle =
        [
            {
                mapbox: 'streets-v11',
                maptiler: 'STREETS',
                diff: false
            },
            {
                mapbox: 'dark-v10',
                maptiler: 'STREETS.DARK',
                maptilerAltName: 'Streets v2 Dark',
                diff: false
            },
            {
                mapbox: 'light-v10',
                maptiler: 'STREETS.LIGHT',
                maptilerAltName: 'Streets v2 Light',
                diff: false
            },
            {
                mapbox: 'outdoors-v11',
                maptiler: 'OUTDOOR',
                diff: false
            },
            {
                mapbox: 'satellite-v9',
                maptiler: 'SATELLITE',
                diff: true
            }
        ]
    const results = mapStyle.filter(obj => {
        return obj[key] === layerId;
    });
    return results
}
function Create2DArray(rows, def = null) {
    let arr = new Array(rows);
    for (let i = 0; i < rows; i++) {
        arr[i] = new Array(rows).fill(def);
    }
    return arr;
}


export default {
    getTileInfo,
    getFeaturesFromBB,
    unrealRemoteControl,
    downloadToTile,
    tile2lat,
    tile2long,
    lat2tile,
    long2tile,
    toHeightmap,
    calcMinMaxHeight,
    getTileCount,
    getTileCountAdjusted,
    deleteCaches,
    convertMapboxMaptilerStyles,
    Create2DArray
}



// async function downloadTiles(tileCount) {
//     return new Promise(async (resolve, reject) => {
//
//         let x = tileCount.x
//         let y = tileCount.y
//         let zoom = tileCount.zoom
//         let tileCnt = tileCount.tileCnt
//
//         document.getElementById('zoomlevel').innerHTML = zoom
//
//         // create the tiles empty array
//         let tiles = []
//
//         const promiseArray = [];
//         // download the tiles
//         for (let i = 0; i < tileCnt; i++) {
//             for (let j = 0; j < tileCnt; j++) {
//                 let url = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw?access_token=' + mapboxgl.accessToken;
//                 let woQUrl = tilesUrl + zoom + '/' + (x + j) + '/' + (y + i) + '@2x.pngraw';
//                 promiseArray.push(downloadBufferToTile((x + j), (y + i), url, woQUrl).then((tile) => {
//                     tiles.push(tile)
//                 }));
//             }
//         }
//         await Promise.all(promiseArray);
//         tiles ? resolve(tiles) : reject('timout');
//     });
// }

// let bounds = getExtent(grid.lng, grid.lat, mapSize);
// console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);
// // var bbox = {
//     bottom : 42.356,
//     left : -71.1279,
//     top : 42.3876,
//     right : -71.1002
// }
// let zoom = 15
// let bbox = {
//     bottom: 46.55886030311718,
//     left: -122.34375,
//     top: 47.04018214480666,
//     right: -121.640625
// }
//let tiles = getTileCount(16)
//print(getTotalTileCount((46.5588603031171, -122.34375), (47.04018214480666, -121.640625), 15, 15))
// let tiles = tib.tilesInBbox(bbox, zoom)
// console.log(tiles)
// console.log(tiles)
// bounds = getExtent(grid.lng, grid.lat, mapSize / 1080 * 1081);
// console.log(bounds.topleft[0], bounds.topleft[1], bounds.bottomright[0], bounds.bottomright[1]);
// bbox = {
//     bottom: bounds.bottomright[1],
//     left: bounds.topleft[0],
//     top: bounds.topleft[1],
//     right: bounds.bottomright[0]
// }
//
// tiles = tib.tilesInBbox(bbox, zoom)
// console.log(tiles)


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
