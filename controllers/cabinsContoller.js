const multer = require('multer');
const Cabin = require('../models/cabinModel');
const {
  getAll,
  getOne,
  createOne,
  deleteOne,
  updateOne,
} = require('./handleFactory');
const AppError = require('../utils/appError');

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

const top5CheapCabins = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'regularPrice';
  req.query.fields = 'name,regularPrice,description';
  next();
};

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
    !req.body.name ||
    !req.body.maxCapacity ||
    !req.body.regularPrice ||
    !req.body.discount ||
    !req.body.description
  ) {
    return next(new AppError('Please provide all the required fields', 400));
  }
  next();
};

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
};
