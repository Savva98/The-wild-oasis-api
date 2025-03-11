const Cabin = require('../models/cabinModel');
const { getAll, getOne } = require('./handleFactory');

const getAllCabins = getAll(Cabin);
const getCabin = getOne(Cabin);

module.exports = { getAllCabins, getCabin };
