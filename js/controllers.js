'use strict';

/* Controllers */

angular.module('tutorial.controllers', [])
  .controller('Starter', ['$scope', '$cookieStore', '$location', '$rootScope', '$http', '$routeParams', function($scope, $cookieStore, $location, $rootScope, $http, $routeParams) {
    $http.get('tutorial_data/tutorial1.json').success(function(data, status, headers, config) {
      if (data && status === 200) {
        $rootScope.tutorial = data;
        if(parseInt($routeParams.stepNo) > data.noOfSteps)
          $location.path('/');
        $http.get('tutorial_data/tutorial1code.txt').success(function(data, status, headers, config) {
          if (data && status === 200) {
            $rootScope.tutorial.code = data;
          }
        });
      }
    });
  
    var s4 = function() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };

    var guid = function() {
      return s4() + s4() + s4();
    };

    $cookieStore.put("tut_id", guid());

    $scope.initialize = function() {
      $location.path('/1')
    };

  }])
  .controller('Stepper', ['$scope', '$location', '$rootScope', '$http', '$routeParams', '$cookieStore', function($scope, $location, $rootScope, $http, $routeParams, $cookieStore) {
  
    $scope.hideError = true;
    $scope.hideSuccess = true;
    $scope.hideSuggestion = false;
    $scope.hideExample = false;
    $scope.makeOrange = true;

    $scope.session_id = $cookieStore.get("tut_id");
    
    var validate = function() {
      var comp;
      if($rootScope.tutorial.steps[$scope.currentPage].validator === "js")
        comp = compareJavascript_
      else
        comp = compareHTML_
    
      var entered = $scope.editor.getRange({line: $scope.input_start, ch: 0}, {line: $scope.editor.getDoc().lineCount() - $scope.numLines, ch: 0});
      var valid = "";
      for(var k=0;k<$scope.reference.length;k++) {
        for(var i=$scope.code_segments[$scope.reference[k]][0]; i<$scope.code_segments[$scope.reference[k]][1]; i++) {
          valid += ($scope.code_lines[i] + " ");
        }
      }
      //console.log(entered);
      //console.log(valid);
      return comp(entered, valid);
    };
    
    $scope.referenceLoaded = function(editor) {
      if(!$scope.reference) {
        setTimeout(function() {$scope.referenceLoaded(editor);}, 500);
      }
      else {
        var precedingWhitespaces = function() {
          var firstLine = $scope.code_segments[$scope.reference[0]][0];
          var k;
          for(k=0; k<$scope.code_lines[$scope.code_segments[$scope.reference[0]][0]].length && $scope.code_lines[$scope.code_segments[$scope.reference[0]][0]].charAt(k) === ' '; k++);
          return k;
        }();
        var doc = editor.getDoc();
        var line_no = 0;
        for(var i=0;i<$scope.reference.length;i++) {
          for(var j=$scope.code_segments[$scope.reference[i]][0]; j<$scope.code_segments[$scope.reference[i]][1]; j++) {
            if(j === $scope.code_segments[$scope.reference[i]][1]-1) {
              doc.replaceRange($scope.code_lines[j].slice(precedingWhitespaces), {line: line_no, ch: 0});
            }
            else
              doc.replaceRange($scope.code_lines[j].slice(precedingWhitespaces)+"\n", {line: line_no, ch: 0});
            line_no = line_no+1;
          }
        }
        editor.scrollIntoView({line: 0, ch: 0});
      }
    };
    
    $scope.editorLoaded = function(editor) {
      if(!$scope.code_segments) {
        setTimeout(function() {$scope.editorLoaded(editor);}, 500);
        return;
      }
      
      $scope.editor = editor;
      var doc = editor.getDoc();
      
      var after_input_start;
      var line_no = 0;
      for(var i=0;i<$scope.code_segments.length;i++) {
        if(i === $scope.reference[0]) {
          $scope.input_start = line_no;
          doc.replaceRange($scope.placeholder+"\n", {line: line_no, ch: 0});
          editor.addLineClass(line_no, "background", "highlightedLine");
          after_input_start = line_no;
          line_no = line_no+1;
        } else if($scope.reference.indexOf(i) > -1) {
          continue;
        } else {
          var start_ch;
          var mid_line_no;
          if(i === $scope.reference) {
            mid_line_no = line_no - 1;
            start_ch = 100;
          } else {
            mid_line_no = line_no;
            start_ch = 0;
          }
          for(var j=$scope.code_segments[i][0]; j<$scope.code_segments[i][1]; j++) {
            if(j === $scope.code_segments[$scope.code_segments.length - 1][1] - 1)
              doc.replaceRange($scope.code_lines[j], {line: line_no, ch: 0});
            else
              doc.replaceRange($scope.code_lines[j]+"\n", {line: line_no, ch: 0});
            line_no = line_no+1;
          }
          doc.markText({line: mid_line_no, ch: start_ch}, {line: line_no, ch: 0}, {readOnly: true});
        }
      }
      
      $scope.numLines = line_no - after_input_start - 1;

      editor.scrollIntoView({line: after_input_start-1, ch: 0});
      
      editor.on("change", function(editor, changeObj) {
        var doc = editor.getDoc();
        if(changeObj.text.length > 1) {
          doc.eachLine(changeObj.from.line, changeObj.from.line + changeObj.text.length, function(lineHandle) {
            editor.addLineClass(lineHandle, "background", "highlightedLine");
          });
        }

        var result = validate();
        if(!result) {
          $scope.hideSuccess = false;
          $scope.hideSuggestion = true;
          $scope.hideError = true;
          $scope.$apply();
        } else {
          $scope.failure = result;
          $scope.makeOrange = true;
          $scope.hideSuccess = true;
          $scope.hideSuggestion = true;
          $scope.hideError = false;
          $scope.$apply();
        }
      })
      
      editor.addKeyMap({
        Enter: function(cm) {
          var doc = cm.getDoc()
          if (doc.getCursor().line < line_no - 3)
            cm.execCommand("newlineAndIndent");
        }
      });
      
    };
  
    $scope.currentPage = parseInt($location.path().split("/")[1])-1;

    $scope.nextStep = function() {
      var result = validate();
      if(!result) {
        $scope.makeOrange = false;
        $scope.hideSuccess = false;
        $scope.hideError = true;
        $scope.hideSuggestion = true;
        $scope.hideExample = true;
        $scope.next_button_text = $scope.next2_text;
        $scope.matter = $rootScope.tutorial.steps[$scope.currentPage]["matter-after"];
        $scope.editor.setOption("readOnly", true);
        $scope.nextStep = function() {
          if($scope.currentPage === $rootScope.tutorial.noOfSteps-1) {
            window.location.href = "http://chat.appbase.io/finished/"+$scope.session_id;
          }
          else if($scope.currentPage < $rootScope.tutorial.noOfSteps-1) {
            $scope.setPage($scope.currentPage + 1);
          }
        };
      } else {
        $scope.failure = result;
        $scope.hideSuccess = true;
        $scope.hideError = false;
        $scope.hideSuggestion = true;
      }
    };

    $scope.forceNextStep = function() {
      if($scope.currentPage < $rootScope.tutorial.noOfSteps-1) {
        $scope.setPage($scope.currentPage + 1);
      }
    };
    
    $scope.prevStep = function() {
      if($scope.currentPage-1 < 0)
        return;
      $scope.setPage($scope.currentPage - 1);
    };
    
    $scope.setPage = function(n) {
      $location.path("/"+(n+1).toString());
    };
  
    var showTutorial = function() {
      $scope.pages = function() {
        var pages = [];
        for(var i=0;i<$rootScope.tutorial.noOfSteps;i++) {
          pages.push(i);
        }
        return pages;
      }();
    
      $scope.matter = $rootScope.tutorial.steps[$scope.currentPage].matter;
      
      if($rootScope.tutorial.steps[$scope.currentPage].success) {
        $scope.success = $rootScope.tutorial.steps[$scope.currentPage].success;
      } else {
        $scope.success = $rootScope.tutorial.success;
      }
      
      if($rootScope.tutorial.steps[$scope.currentPage].failure) {
        $scope.failure = $rootScope.tutorial.steps[$scope.currentPage].failure;
      } else {
        $scope.failure = $rootScope.tutorial.failure;
      }
      
      if($rootScope.tutorial.steps[$scope.currentPage].suggestion) {
        $scope.suggestion = $rootScope.tutorial.steps[$scope.currentPage].suggestion;
      } else {
        $scope.suggestion = $rootScope.tutorial.suggestion;
      }
      
      if($rootScope.tutorial.steps[$scope.currentPage].placeholder) {
        $scope.placeholder = $rootScope.tutorial.steps[$scope.currentPage].placeholder;
      } else {
        $scope.placeholder = $rootScope.tutorial.placeholder;
      }

      if($rootScope.tutorial.steps[$scope.currentPage].next_text) {
        $scope.next_text = $rootScope.tutorial.steps[$scope.currentPage].next_text;
      } else {
        $scope.next_text = $rootScope.tutorial.next_text;
      }

      if($rootScope.tutorial.steps[$scope.currentPage].next2_text) {
        $scope.next2_text = $rootScope.tutorial.steps[$scope.currentPage].next2_text;
      } else {
        $scope.next2_text = $rootScope.tutorial.next2_text;
      }

      $scope.next_button_text = $scope.next_text;
      
      $scope.code_lines = $rootScope.tutorial.code.replace("{{session_id}}", $scope.session_id, "m").split("\n");
      
      $scope.code_segments = $rootScope.tutorial.steps[$scope.currentPage].visible;
      $scope.reference = $rootScope.tutorial.steps[$scope.currentPage].reference;
    };
  
    if(!$rootScope.tutorial || !$rootScope.tutorial.code) {
      $http.get('tutorial_data/tutorial1.json').success(function(data, status, headers, config) {
        if (data && status === 200) {
          $rootScope.tutorial = data;
          if(parseInt($routeParams.stepNo) > data.noOfSteps)
            $location.path('/');
          $http.get('tutorial_data/tutorial1code.txt').success(function(data, status, headers, config) {
            if (data && status === 200) {
              $rootScope.tutorial.code = data;
              showTutorial();
            }
          });
        }
      });
    } else {
      if(parseInt($routeParams.stepNo) > $rootScope.tutorial.noOfSteps)
        $location.path('/');
      showTutorial();
    }
    
  }]);
