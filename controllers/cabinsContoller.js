const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
const { resizeImages } = require('../utils/resizingImages');
const { resizeOne } = require('../utils/resizeOne');
const { resizeAll } = require('../utils/resizeAll');

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
  if (req.originalUrl === '/api/v1/cabins/addCabin' && !req.files.image) {
    return next(new AppError('Please upload a cabin image', 400));
  }
  if (!req.files.image && !req.files.images) return next();
  // console.log(req.body);
  if (req.files.image && !req.files.images) {
    resizeOne(req, res, next);
    return next();
  }
  if (req.files.images && !req.files.image) {
    resizeAll(req, res, next);
    return next();
  }
  resizeImages(req, res, next);
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
  const cabin = await Cabin.findOne({ name: req.body.name });
  if (
    cabin &&
    cabin.name === req.body.name &&
    req.originalUrl.includes(`${cabin._id}`)
  ) {
    req.cabin = cabin;
    return next();
  }
  if (cabin) {
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
  ];
  if (req.originalUrl.includes(`cabins/${req.params.id}`)) {
    let inc = 0;
    const { cabin } = req;
    const bodyKeys = Object.keys(req.body);
    bodyKeys.forEach((key) => {
      if (
        key === 'regularPrice' ||
        key === 'discount' ||
        key === 'maxCapacity'
      ) {
        req.body[key] = Number(req.body[key]);
      }
      if (req.body[key] !== cabin[key]) {
        inc += 1;
      }
    });
    if (inc === 0) {
      return next(new AppError('No changes made', 400));
    }
  }
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
