const { sanitizeQuery } = require('./sanitizeQuery');
class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.regex = /\b(gte|gt|lte|lt)\b/g;
  }

  filterByDiscount(str, query) {
    if (str === 'with-discount') {
      query.discount = { $gt: 0 };
      return this;
    }
    if (str === 'no-discount') {
      query.discount = 0;
      return this;
    }
  }

  filter() {
    const values = Object.values(this.queryString);
    if (values.includes('all')) {
      const keys = Object.keys(this.queryString);
      const index = values.indexOf('all');
      delete this.queryString[keys[index]];
    }
    const queryObj = { ...this.queryString };
    const excludeFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'date',
      'dateFrom',
    ];
    excludeFields.forEach((el) => delete queryObj[el]);
    const emptyObject = {};
    Object.keys(queryObj).forEach((key) => {
      if (this.regex.test(key)) {
        const value = queryObj[key];
        const operator = key
          .split('[')[1]
          .replace(']', '')
          .replace(this.regex, (match) => `$${match}`);
        const fieldName = key.replace(/\[.*\]$/, '');
        emptyObject[fieldName] = { [operator]: value };
      } else emptyObject[key] = queryObj[key];
    });
    let queryStr = JSON.stringify(emptyObject);
    if (queryStr === '{}') {
      return this;
    }
    const parsedQuery = JSON.parse(queryStr);
    const transformedQuery = { ...parsedQuery };
    if (typeof transformedQuery.discount === 'string') {
      this.filterByDiscount(transformedQuery.discount, transformedQuery);
    }
    const sanitize = sanitizeQuery(transformedQuery);

    this.query = this.query.find(sanitize);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join('');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('name');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  getBydate() {
    if (this.queryString.date) {
      const startDate = new Date(this.queryString.date);

      this.query = this.query
        .find({
          created_at: { $gte: startDate, $lte: new Date() },
        })
        .select('createdAt totalPrice');
    }
    return this;
  }

  getAfterDate() {
    if (this.queryString.dateFrom) {
      const dateFrom = new Date(this.queryString.dateFrom);
      this.query = this.query.find({
        startDate: { $gte: dateFrom, $lte: new Date() },
        status: { $nin: ['canceled', 'unconfirmed'] },
      });
    }
    return this;
  }
}

module.exports = ApiFeatures;
