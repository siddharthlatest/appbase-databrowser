/**
 * Based on: https://github.com/ianwalter/ng-breadcrumbs
 * Modified for use in Appbase Databrowser
 * @author Sagar Chandarana
 */

angular
  .module('ng-breadcrumbs', [])
  .factory('breadcrumbs', [ function () {
    var BreadcrumbService = {
      breadcrumbs: [],
      get: function(options) {
        this.options = options || this.options;
        if (this.options) {
          for (var key in this.options) {
            if (this.options.hasOwnProperty(key)) {
              for (var index in this.breadcrumbs) {
                if (this.breadcrumbs.hasOwnProperty(index)) {
                  var breadcrumb = this.breadcrumbs[index];
                  if (breadcrumb.label === key) {
                    breadcrumb.label = this.options[key];
                  }
                }
              }
            }
          }
        }
        return this.breadcrumbs;
      },
      generateBreadcrumbs: function(p) {
        if(typeof p !== 'string'){
          throw 'Use a string for generating breadcrumbs'
        }
        var pathElements = p.split('/'),
          path = '',
          self = this;

        if (pathElements[1] === '') {
          delete pathElements[1];
        }

        this.breadcrumbs = [];
        angular.forEach(pathElements, function(el) {
          path += path === '/' ? el : '/' + el;
          self.breadcrumbs.push({
            label: el, path: path
          });
        });
        return self
      }
    };

    return BreadcrumbService;
  }]);
