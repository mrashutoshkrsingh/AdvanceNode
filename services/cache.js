const mongoose = require("mongoose");
const redis = require("redis");
const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);

const util = require("util");

client.get = util.promisify(client.get);

// const cachedBlogs = await client.get(req.user.id);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function () {
  this.useCache = true;
  return this;
};

mongoose.Query.prototype.exec = async function () {
  //   console.log("I am about to run a query");
  //   console.log(this.getQuery());
  //   console.log(this.mongooseCollection.name);
  if (this.useCache) {
    const key = JSON.stringify(
      Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name,
      })
    );

    const cacheValue = await client.get(key);

    if (cacheValue) {
      //   console.log(27, cacheValue);
      const doc = JSON.parse(cacheValue);
      return Array.isArray(doc)
        ? doc.map((value) => {
            return new this.model(value);
          })
        : new this.model(doc);
    }

    const result = await exec.apply(this, arguments);

    console.log(33, result);

    client.set(key, JSON.stringify(result), "EX", 10);

    return result;
  }
  return exec.apply(this, arguments);
};
