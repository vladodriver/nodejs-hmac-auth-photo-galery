module.exports.env = function (req, res, next) {
  //prevent caching ajax response
  var noiecache = {
    "Cache-Control": "no-cache, no-store",
  }
  res.set(noiecache);
  res.json({
    env: process.env,
    ram: process.memoryUsage()
  })
};
