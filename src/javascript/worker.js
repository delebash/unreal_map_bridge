import imageUtils from "./image-utiles.js";
import fileUtils from "./fs-helpers.js";
import {combineTilesJimp} from "./combine-tiles-jimp.js";
import mapUtils from "./map-utils.js";

onmessage = async function (e) {

    const config = e.data;

    // return to main thread
    //postMessage(stat);

    switch (config.function) {
        case "manipulateImage":
            await manipulateImage(config)
            break;
        case "combineImages":
            await combineImages(config)
            break;
        case "weightMap":
            await weightMap(config)
            break;
        default:
            break;

    }
    postMessage({process:'worker', msg:'complete'})
};

async function manipulateImage(config) {
    let exportBuff = await imageUtils.manipulateImage(config.png, config.heightmapblurradius, config.sealevel, config.flipx, config.flipy, config.landscapeSize, config.isHeightmap)
    await saveImage(config.dirHandle, exportBuff, config.filename, "png")
    postMessage({process:config.function, msg:'complete'})
}

async function combineImages(config) {
    let imageBuffer = await combineTilesJimp(config.objTiles.tiles, config.tileSize, config.tileSize)
    await saveImage(config.dirHandle, imageBuffer, config.filename, "png")
    postMessage({process:config.function, msg:'complete'})
}

function weightMap(config) {
    return new Promise(async (resolve, reject) => {
        let black = [0, 0, 0]
        let white = [255, 255, 254] //offset from real white
        let weight_data = config.weight_data
        for (let data of weight_data) {
            postMessage({process:config.function, msg:'update',name:data.name})
            let splat_image = null
            let pixelsArray = null
            //Change color for splat map
            if (Array.isArray(data.color[0])) {
                splat_image = null
                pixelsArray = null
                splat_image = await imageUtils.loadImageFromArray(config.objTile.buffer)
                pixelsArray = splat_image.getPixelsArray()
                for (let aColor of data.color) {
                    for (let i = 0; i < pixelsArray.length; i++) {
                        if (JSON.stringify(pixelsArray[i]) === JSON.stringify(aColor)) {
                            splat_image.setPixel(i, white)
                        }
                    }
                }

                pixelsArray = splat_image.getPixelsArray()
                for (let i = 0; i < pixelsArray.length; i++) {
                    if (JSON.stringify(pixelsArray[i]) !== JSON.stringify(white)) {
                        splat_image.setPixel(i, black)
                    }
                }

                let img = splat_image
                    .resize({
                        width: config.landscapeSize,
                        height: config.landscapeSize
                    })
                    .gaussianFilter({radius: config.weightmapblurradius})

                let splat_buff = await img.toBuffer()
                let weightmapFileName = `weightmap_${data.name}_lat_${config.lat}_lng_${config.lng}.png`
                await saveImage(config.dirHandle, splat_buff, weightmapFileName, "png")

            } else {
                splat_image = await imageUtils.loadImageFromArray(config.objTile.buffer)
                pixelsArray = splat_image.getPixelsArray()
                for (let i = 0; i < pixelsArray.length; i++) {
                    if (JSON.stringify(pixelsArray[i]) === JSON.stringify(data.color)) {
                        splat_image.setPixel(i, white)
                    } else {
                        splat_image.setPixel(i, black)
                    }
                }

                let img = splat_image
                    .resize({
                        width: config.landscapeSize,
                        height: config.landscapeSize
                    })
                    .gaussianFilter({radius: config.weightmapblurradius})

                let splat_buff = await img.toBuffer()
                let weightmapFileName = `weightmap_${data.name}_lat_${config.lat}_lng_${config.lng}.png`
                await saveImage(config.dirHandle, splat_buff, weightmapFileName, "png")

            }
        }
        postMessage({process:config.function, msg:'complete'})
        resolve(true)
    })
}

async function saveImage(dirHandle, imageBytes, save_fileName, file_type) {
    let outputBlob = new Blob([imageBytes], {type: 'image/' + file_type});
    await fileUtils.writeFileToDisk(dirHandle, save_fileName, outputBlob)
    postMessage({process:'saveImage', msg:'complete'})
}
