class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.regex = /\b(gte|gt|lte|lt)\b/g;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(this.regex, (match) => `$${match}`);
    const parsedQuery = JSON.parse(queryStr);
    const transformedQuery = { ...parsedQuery };
    // const queryEntries = Object.entries(parsedQuery);
    // for (let i = 0; i < queryEntries.length; i += 1) {
    //   if (this.regex.test(queryEntries[i][0])) {
    //     const split = queryEntries[i][0].split('{');
    //     const replace = split[0].replace('}', '');
    //     if (!transformedQuery[split[0]]) {
    //       transformedQuery[split[0]] = {};
    //     }
    //     transformedQuery[split[0]][replace] = Number(queryEntries[i][1]);
    //     // eslint-disable-next-line no-continue
    //     continue;
    //   }
    //   transformedQuery[queryEntries[i][0]] = queryEntries[i][1];
    // }
    // console.log(transformedQuery);
    this.query = this.query.find(transformedQuery);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join('');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('regularPrice');
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
          createdAt: { $gte: startDate, $lte: new Date() },
        })
        .select('createdAt totalPrice extrasPrice');
    }
    return this;
  }

  getAfterDate() {
    if (this.queryString.dateFrom) {
      const startDate = new Date(this.queryString.dateFrom);
      this.query = this.query.find({
        startDate: { $gte: startDate, $lte: new Date() },
      });
    }
    return this;
  }
}

module.exports = ApiFeatures;
