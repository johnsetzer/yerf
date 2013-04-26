/*
 * A Tree node can be a browser or an event sample on a browser
 */
function Tree(key, value, children) {
  this.key = key || null;
  this.value = value || null;
  this.children = children || {};
}

Tree.prototype.insert = function(keysList, value){
  var k = keysList.shift();
  var t;
  
  if (!k) { return; }
  
  t = this.children[k];
  if (!t) {
    t = new Tree(k);
    this.children[k] = t;
    t.key = k;
  }

  if (keysList.length == 0) {
    t.value = value;
  } else {
    t.insert(keysList, value);
  }
}

Tree.prototype.eachNode = function(func){
  var recEachNode = function(tree, keyList) {
    var entireKey = keyList.join('.') + '.' + tree.key;
    func(tree, entireKey, keyList.length);
    keyList.push(tree.key); 
    _.each(tree.children, function(t){
      recEachNode(t, _.clone(keyList));
    });
  };
  recEachNode(this, []);
}

function TreeRenderer(jQuery, $appendTo) {
  this.$ = jQuery;
  this.$appendTo = $appendTo;
  this.loadStats = function(){
    throw new Error('Not implemented yet.  Need to return a object of stats in the form: {key: "Browser.x.y.x", val:anyObject}.');
  };
  this.getVal = function(){
    throw new Error('Not implemented yet.  getVal(data) needs to return the value you want to graph from the data object.');
  };

  this.stats = null;

  this.render = function(){
    var that = this;
    this.loadStats(function(err, stats){
      if (err) { console.log(err); return; }
      var tuple = that.cullOffsets(stats);
      var deltas = tuple.deltas;
      var offsets = tuple.offsets;

      console.log('**** DELTAS ****');
      _.each(deltas, function(v, k){
        v = that.getVal(v);
        console.log(k + '=>' + v);
      });

      console.log('**** OFFSETS ****');
      _.each(offsets, function(v, k){
        v = that.getVal(v);
        console.log(k + '=>' + v);
      });

      var tree = that.treeify(offsets);

      console.log('**** TREE ****');
      that.printTree(tree, offsets, deltas);

      that.renderTree(tree, offsets, deltas);
    });
  };

  this.cullOffsets = function(canocialObj){
    var tuple = { deltas: {}, offsets: {} };
    var sampleKey;
    _.each(canocialObj, function(val, key){
      // Regex: (browser).waterfall.(key)
      var matches = key.match(/(.*)\.offset\.(.*)/);
      if(matches){
        sampleKey = matches[1]+ '.' + matches[2];
        tuple.offsets[sampleKey] = val;
      } else {
        matches = key.match(/(.*)\.delta\.(.*)/);
        if(matches){
          sampleKey = matches[1]+ '.' + matches[2];
          tuple.deltas[sampleKey] = val;
        } else {
          console.log('Unknown key format:', key);
        }
      }
    });
    return tuple;
  }

  this.treeify = function(offsets){
    var tree = new Tree();

    _.each(offsets, function(v, k){
      tree.insert(k.split('.'), v);
    });

    return tree;
  };

  this.printTree = function(tree, offsets, deltas) {
    var that = this;
    tree.eachNode(function(tree, entireKey, depth){
      if(depth > 0) {
        entireKey = entireKey.slice(1); // The initial node causes a period at the beginning of the path.  Remove this period.
        var offset = that.getVal(tree.value);

        var delta = that.getVal(deltas[entireKey]);

        var indent = '';
        for (var i=0; i < depth-1; i++) { indent += '     '; }
        console.log(indent + tree.key + '=>' + entireKey + ' ' + offset + ', ' + delta);
      }
    });
  }

  this.renderTree = function(tree, offsets, deltas){
    var that = this;
    that.pixelsPerMillisecond = _.max(deltas) / window.innerWidth;
    _.each(tree.children, function(c){
      that.eachBrowser(c, offsets, deltas);
    });
  }

  this.eachBrowser = function(tree, offsets, deltas){
    var that = this;
    var $browser = that.$('<div />', {
        class: 'browser'
    });
    $browser.append(that.$('<div />', {
      text: tree.key
    , class: 'browser-title'
    }));
    
    that.renderChildren($browser, tree, [tree.key], 0, offsets, deltas);
    
    that.$appendTo.append($browser);
  }

  this.renderChildren = function($parentElement, tree, keyList, parentOffset, offsets, deltas){
    var that = this;
    var RIGHT_ARROW = '25B6';
    var DOWN_ARROW = '25BC';
    var DOWN_ARROW_STR = '\u25BC';
    
    _.each(tree.children, function(child){
      var $node;
      var myKeyList = keyList.slice(0); // Clone a copy of the keylist.
      var depth = myKeyList.length - 1;
      var offset = that.getVal(child.value);
      var totalOffset = parentOffset + offset;
      var entireKey = myKeyList.join('.') + '.' + child.key;

      var delta = that.getVal(deltas[entireKey]);
      if(!typeof(delta) === 'number'){ console.log("Delta is not a number for ", entireKey); }
      
      // Default settings if event is not expanded
      var renderDelta = delta;

      // Short events could happen in 0 millis or be so short you can't hover over them.  
      // Force them to be MIN_WIDTH px wide.
      var MIN_WIDTH = 12;
      var widthExpanded = false;
      if (delta < MIN_WIDTH) {
        renderDelta = MIN_WIDTH;
        widthExpanded = true;
      }

      renderDelta = renderDelta / that.pixelsPerMillisecond;
      var rendOffset = offset / that.pixelsPerMillisecond;
      var width = renderDelta;// - (2 * (depth-1)); // Compensate for CSS borders
      var title = 'key:' + entireKey
        + '\noffset:' + offset
        + '\ndelta:' + delta
        + '\ntotal offset:'+ totalOffset;

      if(_.isEmpty(child.children)){
        $node = that.$('<div />', {
          text: child.key
        , class: 'title'
        , style: 'width:'+width+'px; left:'+rendOffset+'px'
        , title: title
        });
        
        $node.click(function (e) {
          e.stopPropagation();
        });

        that.setTitleColor($node, depth, widthExpanded);
        $parentElement.append($node);

      } else {
        $node = that.$('<div />', {
          class: 'sample'
        , style: 'width:'+width+'px; left:'+rendOffset+'px'
        , title: title
        });
        that.setBackgroundColor($node, depth);
        $parentElement.append($node);

        var $title = that.$('<div />', {
          text: child.key
        , class: 'title '
        });
        that.setTitleColor($title, depth, widthExpanded);
        $node.append($title);

        var titleHeight = 25;
        var $collapseButton;
        var hasCollapseButton = (width >= titleHeight);
        if (hasCollapseButton) {
          $collapseButton = that.$('<div />', {
            class: 'collapse-arrow'
          });
          $collapseButton.html('&#x'+DOWN_ARROW+';');
          $title.append($collapseButton);
        }

        var $kids = that.$('<div />', {});
        $node.append($kids);

        $node.click(function (e) {
          e.stopPropagation();
          $kids.toggleClass('collapsed');
          
          var currentHtml = $collapseButton.html();
          var newArrowCode = currentHtml === DOWN_ARROW_STR ? RIGHT_ARROW : DOWN_ARROW;
          $collapseButton.html('&#x'+newArrowCode+';');
        });

        myKeyList.push(child.key);
        that.renderChildren($kids, child, myKeyList, offset, offsets, deltas);
      }
    });
  };
  
  this.setTitleColor = function($node, depth, widthExpanded) {
    // Make title a different color if it is widthExpanded
    var red = widthExpanded ? 230 : 260;
    var green = widthExpanded ? 230 : 140;
    var blue = widthExpanded ? 10 : 0;
    var amplitude = 20;
    return this.setNodeColor($node, depth, amplitude, red, green, blue);
  };

  this.setBackgroundColor = function($node, depth) {
    var GRAY = 140;
    var red = GRAY;
    var green = GRAY;
    var blue = GRAY;
    var amplitude = 20;
    return this.setNodeColor($node, depth, amplitude, red, green, blue);
  };

  this.setNodeColor = function($node, depth, amplitude, red, green, blue) {
    var increment = depth * amplitude;
    red += increment;
    green += increment;
    blue += increment;
    $node.css('background-color', 'rgb('+red+','+green+','+blue+')');
    return $node;
  };

};

yerf().render = function(){
  var $ = kivi.getConfig('$');

  // Setup element to render into
  var $waterfallDiv = $('<div />', {
    id: 'yerf-waterfall'
  , class: 'yerf-waterfall'
  });

  // Setup TreeRenderer
  var treeRenderer = new TreeRenderer($, $waterfallDiv);
  treeRenderer.getVal = function(v){
    return v;
  };
  treeRenderer.loadStats = function(callback) {
    var stats = {};
    var rawStats = kivi._store;
    var key, val, browserKey, yerfKey;

    for (key in rawStats){
      // Don't include non-yerf keys
      var matches = key.match(/(.*)(yerf\.)(.*)/);
      if (matches) {
        val = rawStats[key];
        browserKey = matches[1] || 'Browser.';
        yerfKey = browserKey + matches[3];
        if (!stats[yerfKey]) {
          stats[yerfKey] = val;
        } else {
          console.log('Ignoring duplicate key [' + key + '].');
        }  
      }
      
    }
    callback(null, stats);
  }; 

  var $closeButton = $('<div />', {text: 'Close', class: 'button', style:'background: #FA556B;'}).click(function(){
    $waterfallDiv.remove();
  });
  
  $waterfallDiv.append($closeButton);
  
  treeRenderer.render();
  
  $(document.body).append($waterfallDiv);
};

// This file shouldn't get loaded into DOM until you want to execute render().
// So, call render(); once loaded.
yerf().render();