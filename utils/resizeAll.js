const sharp = require('sharp');
const crypto = require('crypto');
const path = require('path');
const { catchAsync } = require('./catchAsync');

const resizeAll = catchAsync(async (req, res, next) => {
  const cabinImagePath = path.join(
    __dirname,
    `../../Front-end/public/img/cabins`,
  );
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `cabin-${req.params.id}${crypto.randomBytes(5).toString('hex')}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`${cabinImagePath}/${filename}`);
      req.body.images.push(filename);
    }),
  );
});

module.exports = { resizeAll };
