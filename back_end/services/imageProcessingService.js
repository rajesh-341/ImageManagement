const sharp = require('sharp');

/*
Convert image to WebP before upload
This reduces storage size by ~70%
*/

async function convertToWebp(fileBuffer){

 return sharp(fileBuffer)
       .webp({quality:80})
       .toBuffer()

}

module.exports = {convertToWebp};