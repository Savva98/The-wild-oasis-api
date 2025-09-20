class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.regex = /\b(gte|gt|lte|lt)\b/g;
  }

  filterByDiscount(str, query) {
    if (str === 'all') {
      delete query.discount;
      return this;
    }
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
    let queryStr = JSON.stringify(queryObj);
    if (queryStr === '{}') {
      return this;
    }
    queryStr = queryStr.replace(this.regex, (match) => `$${match}`);
    const parsedQuery = JSON.parse(queryStr);
    const transformedQuery = { ...parsedQuery };
    if (typeof transformedQuery.discount === 'string') {
      this.filterByDiscount(transformedQuery.discount, transformedQuery);
    }

    this.query = this.query.find(transformedQuery);
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
