const sharp = require('sharp');
const crypto = require('crypto');

async function resizeImage(req, res, next) {
  if (!req.files.image || !req.files.images) return next();
  const imageId = await crypto.randomBytes(5).toString('hex');
  req.body.image = `cabin-${req.body.name}-${imageId}-${Date.now()}.jpeg`;
  req.body.images = [];
  await sharp(req.files.image[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`../../Front-end/public/img/cabins/${req.body.image}`);
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `cabin-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`../../Front-end/public/img/cabins/${filename}`);
      req.body.images.push(filename);
    }),
  );
}

module.exports = { resizeImage };
