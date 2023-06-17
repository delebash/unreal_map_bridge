import {Image} from "image-js";

// import workerUrl from 'gdal3.js/dist/package/gdal3.js?url'
// import dataUrl from 'gdal3.js/dist/package/gdal3WebAssembly.data?url'
// import wasmUrl from 'gdal3.js/dist/package/gdal3WebAssembly.wasm?url'
// import initGdalJs from 'gdal3.js';
// const paths = {
//     wasm: wasmUrl,
//     data: dataUrl,
//     js: workerUrl,
// };
// let Gdal = await initGdalJs({paths})

let Gdal = await initGdalJs({ path: 'https://cdn.jsdelivr.net/npm/gdal3.js@2.4.0/dist/package', useWorker: false })

async function manipulateImage(buff, blurradius, sealevel, flipx, flipy, landscapeSize, isHeightmap) {
    let ZrangeSeaLevel = '32767'
    let maxPngValue = '65535'
    let minPngValue = '0'
    let resizeMethod = 'bilinear'
    let translateOptions = []
    let exportBuffer

    let mapImage = await Image.load(buff);

    //Manipulate image
    if (flipx === true) {
        mapImage = await mapImage.flipX()
    }

    if (flipy === true) {
        mapImage = await mapImage.flipY()
    }
    if (blurradius > 0) {
        mapImage = await mapImage.blurFilter(blurradius)
    }

    exportBuffer = await mapImage.toBuffer()

    // Resample and scale
    if (landscapeSize !== '0' || landscapeSize !== '1081') {
        if (isHeightmap === true) {
            if (sealevel === true) {
                translateOptions = ['-ot', 'UInt16', '-of', 'PNG', '-scale', minPngValue, maxPngValue, ZrangeSeaLevel, maxPngValue, '-outsize', landscapeSize, landscapeSize, '-r', resizeMethod];
            } else {
                translateOptions = ['-ot', 'UInt16', '-of', 'PNG', '-outsize', landscapeSize, landscapeSize, '-r', resizeMethod];
            }
            exportBuffer = await processGdal(exportBuffer, 'heightmap.png', translateOptions, "png");
        }
    }
    return exportBuffer
}


/**
 * Load image-js image from array
 *
 * @param {ArrayBuffer} imageArray ArrayBuffer representing image values
 * @return {image-js} Image-js image.
 */
async function loadImageFromArray(imageArray, options = {}) {
    try {
        let image = await Image.load(imageArray, options)
        return image
    } catch (e) {
        console.log(e)
    }
}


/**
 * Convert image to specified bit and color
 *
 * @param {int} width Image width.
 * @param {int} height Image width.
 * @param {int[]} imageArray Uint16Array representing image values
 * @param {int} bitDepth image-js bit depth example 8,16,32
 * @param {string} colorModel image-js color madel string.
 * @return {image-js} Image-js image.
 */
function convertImage(width, height, imageArray, bitDepth, colorModel) {
    let newImage = new Image(width, height, imageArray, {kind: colorModel, bitDepth: bitDepth})
    return newImage
}


async function processGdal(buff, filename, translateOptions, file_type) {
    let blob = new Blob([buff], {type: 'image/' + file_type})
    const file = new File([blob], filename);
    const result = await Gdal.open(file);
    const dataset = result.datasets[0];
    console.log('gdal transale')
    const filePath = await Gdal.gdal_translate(dataset, translateOptions);
    const fileBytes = await Gdal.getFileBytes(filePath);
    Gdal.close(dataset);
    return fileBytes;
}

export default {
    manipulateImage,
    loadImageFromArray,
    convertImage
}
