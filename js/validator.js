compareHTML_ = function(input, valid) {
  var inputParsed = null;
  try {
    inputParsed = $(input.trim());
    if (inputParsed.length == 0) {
      throw new Error();
    }
  } catch (err) {
    return "Oops! Something's wrong with your HTML. Make sure it looks like the example."
  }

  var validParsed = $(valid.trim());

  if(inputParsed.length > validParsed.length) {
    return "Oops! It looks like you have some extra HTML.";
  } else if(inputParsed.length < validParsed.length) {
    return "Oops! It looks like you're missing some HTML.";
  }

  var buildMap = function (el) {
    var map = {}
    if (!el.attributes) {
      return map;
    }
    $.each(el.attributes, function (ind, attr) {
      map[attr.name] = attr.value;
    });
    return map;
  }

  for(var i = 0; i < inputParsed.length; i++) {
    var inputNode = inputParsed[i];
    var validNode = validParsed[i];

    if(inputNode.nodeName != validNode.nodeName) {
      return "Woops! Your tag should be a " + validNode.nodeName.toLowerCase() +
        " rather than a " + inputNode.nodeName.toLowerCase() + ".";
    }

    var inputAttrAsMap = buildMap(inputNode);
    var validAttrAsMap = buildMap(validNode);

    //now lets compare the maps of attributes
    var keys = _.keys(validAttrAsMap);

    for (var j = 0; j < keys.length; j++) {
      var propName = keys[j];
      if (!inputAttrAsMap[propName]) {
        return "Oops! It looks like your script include is missing the \"" + propName + "\" attribute.";
      } else if (inputAttrAsMap[propName] != validAttrAsMap[propName]) {
        return "Oops! It looks like your \"" + propName + "\" attribute isn't quite right.";
      }
    }
  }
}

var defaultJSMatchError = "Oops! Something doesn't look quite right. Make sure your JavaScript looks like the example!";

compareJavascript_ = function(input, match) {
  var inputSyntax = null;

  try {
    inputSyntax = esprima.parse(input, {tolerant: true});
    if(inputSyntax.errors.length > 0) {
      return defaultJSMatchError;
    }
    

    var matchSyntax = esprima.parse(match, {tolerant: true});
    var newSymbols = new SymbolContainer();
    try {
      compareAndExtract_(inputSyntax, matchSyntax, newSymbols);
    } catch(err) {
        //if the syntax trees were different, return.
      return err.message;
    }
  } catch(e) {
    return e.message;
  }

  //remember this vars for later use.
  //this.saveCapturedVarsForThisLesson_(newSymbols.getSymbols());
}

/**
 * Compares two syntax trees. Returns a string error if they aren't equal. Also extracts any symbols in 'input'
 * that start with a $ in 'match' into the symbols object
 * @param input
 * @param match
 * @param symbols
 * @return {*}
 */
compareAndExtract_ = function(input, match, symbols) {

  if (input.type != match.type) {
    if(match.type == "Identifier" && match.name.indexOf("$_") == 0) {
      //we found a wildcard variable that can match more than just an identifier. Re-stringify the contained code
      //and place it in the symbols. Return safely.
      symbols.addSymbol(match.name.substring(1), renderAST(input));
      return;
    }
    throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
  }

  switch (input.type) {
    case "Program":
      compareArrays_(input.body, match.body, symbols);
      break;
    case "VariableDeclaration":
      if (input.kind != match.kind) {
        throw new JSCompareException(JSCompareException.MISC, "Oops. Your variable declaration doesn't look quite right.");
      }
      compareArrays_(input.declarations, match.declarations, symbols);
      break;
    case "VariableDeclarator":
      compareAndExtract_(input.id, match.id, symbols);
      compareAndExtract_(input.init, match.init, symbols);
      break;
    case "Identifier":
      if (match.name.indexOf("$") == 0) {
        //we're supposed to extract this variable
        symbols.addSymbol(match.name.substring(1), input.name);
      } else {
        if (match.name != input.name) {
          throw new JSCompareException(JSCompareException.MISC, "One of your names doesn't match. Change \"" + input.name + "\" to \"" + match.name + "\".");
        }
      }
      break;
    case "Literal":
      if (input.value !== match.value) {
        throw new JSCompareException(JSCompareException.MISC, "Almost. You need to change the value " + input.value + " to " + match.value + ".");
      }
      break;
    case "NewExpression":
      compareAndExtract_(input.callee, match.callee, symbols);
      compareArrays_(input.arguments, match.arguments, symbols);
      break;
    case "ExpressionStatement":
      compareAndExtract_(input.expression, match.expression, symbols);
      break;
    case "CallExpression":
      compareArrays_(input.arguments, match.arguments, symbols);
      compareAndExtract_(input.callee, match.callee, symbols);
      break;
    case "MemberExpression":
      if(input.computed != match.computed) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      compareAndExtract_(input.object, match.object, symbols);
      compareAndExtract_(input.property, match.property, symbols);
      break;
    case "ObjectExpression":
      var self = this;
      var sortFunc = function(a, b) {
        return self.compareKeys_(a.key, b.key);
      }
      var inputPropertiesClone = input.properties.slice(0).sort(sortFunc);
      var matchPropertiesClone = match.properties.slice(0).sort(sortFunc);
      compareArrays_(inputPropertiesClone, matchPropertiesClone, symbols);
      break;
    case "Property":
      if(input.kind != match.kind) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      if(compareKeys_(input.key, match.key, symbols) !== 0) {
        throw new JSCompareException(JSCompareException.MISC, "Almost. You need to change the property name " + k1text + " to " + k2text + ".");
      }
      compareAndExtract_(input.value, match.value, symbols);
      break;
    case "FunctionExpression":
      if(input.expression != match.expression || input.generator != match.generator || input.rest != match.rest) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      compareAndExtract_(input.body, match.body, symbols);
      compareArrays_(input.defaults, match.defaults, symbols);
      compareArrays_(input.params, match.params, symbols);
      break;
    case "BlockStatement":
      compareArrays_(input.body, match.body, symbols);
      break;
    case "ArrayExpression":
      compareArrays_(input.elements, match.elements, symbols);
      break;
    case "FunctionDeclaration":
      compareAndExtract_(input.id, match.id, symbols);
      compareArrays_(input.defaults, match.defaults, symbols);
      compareArrays_(input.params, match.params, symbols);
      break;
    case "AssignmentExpression":
      if (input.right.callee.name != match.right.callee.name) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      compareAndExtract_(input.left, match.left, symbols);
      compareAndExtract_(input.right, match.right, symbols);
      break;
    case "ForStatement":
      compareAndExtract_(input.body, match.body, symbols);
      compareAndExtract_(input.init, match.init, symbols);
      compareAndExtract_(input.test, match.test, symbols);
      compareAndExtract_(input.update, match.update, symbols);
      break;
    case "BinaryExpression":
      if(input.operator != match.operator) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      compareAndExtract_(input.left, match.left, symbols);
      compareAndExtract_(input.right, match.right, symbols);
      break;
    case "UpdateExpression":
      if((input.operator != match.operator) || (input.prefix != match.prefix)) {
        throw new JSCompareException(JSCompareException.MISC, defaultJSMatchError);
      }
      compareAndExtract_(input.argument, match.argument, symbols);
      break;
    default:
      //We may have more things to implement here.
      throw new JSCompareException("unimplemented", "JSMatch: Unimplemented AST type: " + input.type);
      break;
  }
}

compareKeys_ = function(inputKey, matchKey){
  var getKeyText = function(k) {
    if(k.type == 'Literal') {
      return k.value;
    } else if(k.type == 'Identifier') {
      return k.name;
    }
    return null;
  }

  var k1text = getKeyText(inputKey);
  var k2text = getKeyText(matchKey);
  if(k1text === null || k2text === null) {
    throw new JSCompareException(JSCompareException.MISC, "Almost. Your object has an invalid property key type.");
  }
  if(k1text !== k2text) {
    if(k1text > k2text) {
      return 1;
    }
    return -1;
  } else {
    return 0;
  }
}

compareArrays_ = function(arr1, arr2, symbols) {
  if (arr1.length != arr2.length) {
    throw new JSCompareException(JSCompareException.ARR_LENGTHS, defaultJSMatchError)
  }
  for (var i = 0; i < arr1.length; i++) {
    compareAndExtract_(arr1[i], arr2[i], symbols);
  }
}

function renderAST(ast) {
  //NOTE: this isn't accurate, but people prob won't notice... we only use it in one spot right now.
  switch(ast.type) {
    case "BinaryExpression":
      return renderAST(ast.left) + " " + ast.operator + " " + renderAST(ast.right);
      break;
    case "Identifier":
      return ast.name;
      break;
    case "Literal":
      return ast.raw;
      break;
    default:
      break;
  }
}

//Custom error object
function JSCompareException(eid, exp) {
  this.code = eid;
  this.message = exp;
  Error.apply(this, [exp]);
}

JSCompareException.prototype = new Error();
JSCompareException.prototype.constructor = JSCompareException;
JSCompareException.prototype.name = 'JSCompareException';

JSCompareException.ARR_LENGTHS = "arr_lengths";
JSCompareException.MISC = "misc";
JSCompareException.SYMBOL_MISMATCH = "symbol_mismatch";

//holds symbols and throws errors if there are mismatches.
function SymbolContainer() {
  this.symbols_ = {};
}

SymbolContainer.prototype.addSymbol = function(sym, val) {
  if(this.symbols_[sym] && this.symbols_[sym] != val) {
    throw new JSCompareException(JSCompareException.SYMBOL_MISMATCH,
      "Oops. You've inconsistently named a variable. \"" + val + "\" and \"" + this.symbols_[sym] + "\" should be the same.")
  }
  this.symbols_[sym] = val;
}

SymbolContainer.prototype.getSymbols = function() {
  return this.symbols_;
}