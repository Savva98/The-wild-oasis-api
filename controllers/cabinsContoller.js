const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Cabin = require('../models/cabinModel');
const {
  getAll,
  getOne,
  createOne,
  deleteOne,
  updateOne,
} = require('./handleFactory');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const { resizeImage } = require('../utils/resizingImages');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const uploadCabinImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

const resizeCabinImages = catchAsync(async (req, res, next) => {
  const cabinImagePath = path.join(
    __dirname,
    `../../Front-end/public/img/cabins`,
  );
  // console.log(req.body);
  if (req.files.image && !req.files.images) {
    const imageId = crypto.randomBytes(5).toString('hex');
    req.body.image = `cabin-${req.body.name}-${imageId}-${Date.now()}.jpeg`;
    await sharp(req.files.image[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`${cabinImagePath}/${req.body.image}`);
    return next();
  }
  if (req.files.images && !req.files.image) {
    req.body.images = [];
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
    return next();
  }
  resizeImage(req, res, next);
  next();
});

const top5CheapCabins = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'regularPrice';
  req.query.fields = 'name,regularPrice,description';
  next();
};

const checkCabinName = catchAsync(async (req, res, next) => {
  if (!req.body.name)
    return next(new AppError('Please provide a cabin name', 400));
  const cabins = await Cabin.findOne({ name: req.body.name });
  if (cabins) {
    return next(new AppError('Cabin name already exists', 400));
  }
  next();
});

const checkUploadedData = (req, res, next) => {
  const allowedFields = [
    'name',
    'maxCapacity',
    'regularPrice',
    'discount',
    'description',
    'image',
    'images',
  ];
  const uploadedFields = Object.keys(req.body);
  const isAllowed = uploadedFields.every((field) =>
    allowedFields.includes(field),
  );
  if (!isAllowed) {
    return next(new AppError('Invalid data uploaded', 400));
  }
  if (
    !req.body.maxCapacity ||
    !req.body.regularPrice ||
    !req.body.discount ||
    !req.body.description
  ) {
    return next(new AppError('Please provide all the required fields', 400));
  }
  next();
};

const deleteCabinImage = catchAsync(async (req, res, next) => {
  const cabin = await Cabin.findById(req.params.id);
  if (!cabin) {
    return next(new AppError('No cabin found with that ID', 404));
  }
  const cabinImagePath = path.join(
    __dirname,
    `../../Front-end/public/img/cabins`,
  );
  if (cabin.image) {
    const imagePath = path.join(cabinImagePath, cabin.image);
    try {
      await fs.promises.unlink(imagePath);
    } catch (err) {
      return next(new AppError('Error deleting image', 500));
    }
  }
  if (cabin.images) {
    await Promise.all(
      cabin.images.map(async (image) => {
        const imagePath = path.join(cabinImagePath, image);
        try {
          await fs.promises.unlink(imagePath);
        } catch (err) {
          return next(new AppError('Error deleting images', 500));
        }
      }),
    );
  }
  next();
});

const getAllCabins = getAll(Cabin);
const getCabin = getOne(Cabin);
const addCabin = createOne(Cabin);
const deleteCabin = deleteOne(Cabin);
const updateCabin = updateOne(Cabin);

module.exports = {
  getAllCabins,
  getCabin,
  addCabin,
  deleteCabin,
  updateCabin,
  uploadCabinImages,
  top5CheapCabins,
  checkUploadedData,
  resizeCabinImages,
  checkCabinName,
  deleteCabinImage,
};
