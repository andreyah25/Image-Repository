
const sharp = require('sharp');

async function compressImage(inputBuffer) {
    return await sharp(inputBuffer)
        .rotate()
        .resize({
            width: 2560,
            height: 2560,
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: 75,
            mozjpeg: true
        })
        .toBuffer();
}

module.exports = { compressImage };
