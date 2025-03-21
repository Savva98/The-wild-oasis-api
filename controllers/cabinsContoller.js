const multer = require('multer');
const Cabin = require('../models/cabinModel');
const { deleteOne, updateOne } = require('../models/guestModel');
const { getAll, getOne, createOne } = require('./handleFactory');

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
};
