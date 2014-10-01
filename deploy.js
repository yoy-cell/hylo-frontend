var async = require('async'),
  sha1 = require('sha1'),
  _ = require('lodash');

var Deployer = function(app, done, log) {
  this.app = app;
  this.done = done;
  this.bundleExts = ['js', 'css'];
  this.bundlePaths = {};
  this.log = log;

  var heroku = new (require('heroku-client'))({token: process.env.HEROKU_API_TOKEN});
  this.herokuConfig = heroku.apps(app).configVars();
};

Deployer.prototype.fail = function(err) {
  this.log.errorlns(err);
  this.done(false);
};

Deployer.prototype.getAWSKeys = function(callback) {
  this.log.subhead('fetching AWS credentials for ' + this.app);

  this.herokuConfig.info(function(err, vars) {
    this.herokuEnv = _.pick(vars, 'AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'AWS_S3_BUCKET');
    _.forOwn(this.herokuEnv, function(val, key) {
      this.log.writeln(key + ': ' + val);
    }.bind(this));

    callback(err);
  }.bind(this));
};

Deployer.prototype.upload = function(callback) {
  this.log.subhead('uploading to S3');

  var s3 = new (require('aws-sdk')).S3({
    accessKeyId: this.herokuEnv.AWS_ACCESS_KEY,
    secretAccessKey: this.herokuEnv.AWS_SECRET_KEY
  });

  var loop = function(type, innerCallback) {
    var path = 'dist/bundle.min.' + type.ext,
      contents = cat(path),
      digest = sha1(contents).substring(0, 8),
      bundlePath = 'assets/bundle-' + digest + '.min.' + type.ext;

    this.log.writeln(bundlePath);
    this.bundlePaths[type.ext] = bundlePath;

    s3.putObject({
      Bucket: this.herokuEnv.AWS_S3_BUCKET,
      Key: bundlePath,
      Body: contents,
      ACL: 'public-read',
      ContentType: type.contentType
    }, innerCallback);
  }.bind(this);

  async.each([
    {ext: 'js', contentType: 'application/x-javascript'},
    {ext: 'css', contentType: 'text/css'}
  ], loop, callback);
};

Deployer.prototype.updateEnv = function(callback) {
  this.log.subhead('updating ENV on ' + this.app);

  var prefix = 'http://s3.amazonaws.com/' + this.herokuEnv.AWS_S3_BUCKET + '/',
    newVars = {
      JS_BUNDLE_URL: prefix + this.bundlePaths.js,
      CSS_BUNDLE_URL: prefix + this.bundlePaths.css
    };

  _.forIn(newVars, function(val, key) {
    this.log.writeln(key + ': ' + val);
  }.bind(this));

  this.herokuConfig.update(newVars, callback);
};

module.exports = function(app, done, log) {
  var deployer = new Deployer(app, done, log);

  async.series([
    deployer.getAWSKeys.bind(deployer),
    deployer.upload.bind(deployer),
    deployer.updateEnv.bind(deployer)
  ], function(err) {
    if (err) {
      deployer.fail(err);
    } else {
      done();
    }
  });
};

