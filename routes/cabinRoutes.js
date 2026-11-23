const express = require('express');
const {
  getAllCabins,
  getCabin,
  addCabin,
  updateCabin,
  deleteCabin,
  top5CheapCabins,
  checkUploadedData,
  checkCabinName,
  uploadCabinImages,
  resizeCabinImages,
} = require('../controllers/cabinsContoller');
const { protect, restrictTo } = require('../controllers/authController');
const { validateCSRFToken } = require('../controllers/csrfTokenController');

const cabinRout = '/api/v1/cabins';
const router = express.Router();
router.use(protect);
router.get('/', getAllCabins);
router.route('/top-5-cheap').get(top5CheapCabins, getAllCabins);
router.use(restrictTo('admin'), validateCSRFToken);
router
  .route('/:id')
  .get(getCabin)
  .patch(
    uploadCabinImages,
    resizeCabinImages,
    checkCabinName,
    checkUploadedData,
    updateCabin,
  )
  .delete(deleteCabin);
router
  .route('/addCabin')
  .post(
    uploadCabinImages,
    resizeCabinImages,
    checkCabinName,
    checkUploadedData,
    addCabin,
  );

module.exports = { router, cabinRout };
