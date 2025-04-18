const sharp = require('sharp');
const { catchAsync } = require('./catchAsync');

const resizeOne = catchAsync(async (req, res, next, cabinImagePath) => {
  const imageId = crypto.randomBytes(5).toString('hex');
  req.body.image = `cabin-${req.body.name}-${imageId}-${Date.now()}.jpeg`;
  await sharp(req.files.image[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`${cabinImagePath}/${req.body.image}`);
  return next();
});

module.exports = { resizeOne };
