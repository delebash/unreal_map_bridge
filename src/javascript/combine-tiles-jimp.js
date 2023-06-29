'use strict'

import minBy from 'lodash/minBy';
import maxBy from 'lodash/maxBy';
import sortBy from 'lodash/sortBy';
import 'https://cdnjs.cloudflare.com/ajax/libs/jimp/0.22.8/jimp.min.js'

let totalCount = 0

export async function combineTilesJimp(tiles, tWidth, tHeight, postMessage) {
    try {

        totalCount = tiles.length
        console.log(totalCount)
        const offsetX = minBy(tiles, tile => tile.x).x
        const offsetY = minBy(tiles, tile => tile.y).y

        const makeRelative = (tile) => ({
            x: tile.x - offsetX,
            y: tile.y - offsetY,
            buffer: tile.buffer
        })

        const index = sortBy(tiles.map(makeRelative), ['y', 'x'])
        const cols = 1 + maxBy(index, tile => tile.x).x
        const rows = 1 + maxBy(index, tile => tile.y).y
        const w = tWidth * cols
        const h = tHeight * rows


        let image = await Jimp.read(Buffer.from(index[0].buffer))
        image.background(0xFFFFFFFF)
        image.resize(w, h);
        let compImage = await CompositeImg(image, index, tHeight, tWidth)
        //console.log('getting buffer')
        let buffer = await compImage.getBufferAsync(Jimp.MIME_PNG);
        return buffer
    } catch (e) {
        console.log(e)
    }
}


async function CompositeImg(image, index, tHeight, tWidth) {
    try {
        let count = 1
        for (let data of index) {
            let buffer = Buffer.from(data.buffer)
            let y = data.y * tHeight
            let x = data.x * tWidth
            let newImage = await Jimp.read(buffer)
            image.composite(newImage, x, y)
           // postMessage({process: 'combineTilesJimp', msg: 'update', count: count, totalCount: totalCount})
            count++
            console.log(count)
        }
        return image
    } catch (e) {

    }
}

function progressCount(count, totalCount, msg) {

    processCount.innerHTML = `${msg}  ${count} of ${totalCount}`
}
