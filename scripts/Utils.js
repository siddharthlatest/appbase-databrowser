(function(){
angular
.module('AppbaseDashboard')
.factory('utils', utilsFactory);

function utilsFactory(){
  var utils = {};
  var baseUrl;

  utils.appNamesToObj = function(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push({name: app});
    });
    return retArr;
  };

  utils.appObjToNames = function(_apps){
    var retArr = [];
    _apps.forEach(function(app){
      retArr.push(app.name);
    });
    return retArr;
  };

  utils.setBaseUrl = function(bUrl){
    baseUrl = bUrl;
  };

  utils.getBaseUrl = function(bUrl){
    return baseUrl;
  };

  utils.urlToAppname = function(url) {
    return utils.parseURL(url).appName;
  };

  utils.urlToPath = function(url) {
    return utils.parseURL(url).path;
  };

  utils.pathToUrl = function(path) {
    return baseUrl + path;
  };
  
  utils.parsePath = function(path) {
    return utils.parseURL(utils.pathToUrl(path));
  };

  utils.parseURL = function(url) {
    if(!url) return {}; //return empty object for undefined
    var intermediate, appname, version, path, namespace, key, obj_path, v;
    intermediate = url.split(/\/\/(.+)?/)[1].split(/\.(.+)?/);
    intermediate = intermediate[1].split(/\/(.+)?/)[1].split(/\/(.+)?/);
    appname = intermediate[0];
    intermediate = intermediate[1].split(/\/(.+)?/);
    version = intermediate[0];
    path = intermediate[1];
    if(path) {
      intermediate = path.split(/\/(.+)?/);
      namespace = intermediate[0];
      v = intermediate[1];
      key;
      obj_path;
      if(v) {
        intermediate = v.split(/\/(.+)?/);
        key = intermediate[0];
        obj_path = intermediate[1];
      }
    }
    var retObj = {
      appName: appname,
      ns: namespace,
      key: key,
      obj_path: obj_path,
      path: path,
      v: v
    }
    return retObj;
  }

  utils.cutLeadingTrailingSlashes = function(input) {
    if(typeof input !== 'string')
      return
    while(input.charAt(input.length - 1) === '/') {
      input = input.slice(0,-1);
    }
    while(input.charAt(0) === '/') {
      input = input.slice(1);
    }
    return input;
  };

  utils.parentUrl = function(url) {
    var parentPath = utils.parentPath(utils.urlToPath(url));
    return utils.pathToUrl(parentPath);
  };

  utils.parentPath = function(path) {
    var slashI;
    return path === undefined? '': path.slice(0, (slashI = path.lastIndexOf('/')) === -1? 0: slashI);
  };

  utils.appToURL = function(app) {
    return 'https://api.appbase.io/' + app + '/v2_1/';
  };

  return utils;
}

})();