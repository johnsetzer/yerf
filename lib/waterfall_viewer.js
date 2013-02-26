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

      var tree = that.treeify(offsets);

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

      console.log('**** TREE ****');
      that.printTree(tree, offsets, deltas);

      that.renderTree(tree, offsets, deltas);
    });
  };

  this.cullOffsets = function(canocialObj){
    var tuple = { deltas: {}, offsets: {} };
    _.each(canocialObj, function(val, key){
      // Regex: (browser).waterfall.(key)
      var matches = key.match(/(.*)\.offset\.(.*)/);
      if(matches){
        var sampleKey = matches[1]+ '.' + matches[2];        
        tuple.offsets[sampleKey] = val;
      } else {
        tuple.deltas[key] = val;
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
        console.log(indent + tree.key + '=>' + entireKey + ' ' +offset +', ' + delta);
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
    _.each(tree.children, function(child){
      var $node;
      var myKeyList = keyList.slice(0); // Clone a copy of the keylist.
      var depth = myKeyList.length - 1;
      var offset = parentOffset + that.getVal(child.value);
      var entireKey = myKeyList.join('.') + '.' + child.key;

      var delta = that.getVal(deltas[entireKey]);
      if(!typeof(delta) === 'number'){ console.log("Delta is not a number for ", entireKey); }
      
      // Default settings if event is not expanded
      var renderDelta = delta;
      var levelClass = 'level' + (depth % 5);

      // Short events could happen in 0 millis or be so short you can't hover over them.  
      // Force them to be 10px wide.
      var expanded = delta < 10;
      if (expanded) {
        renderDelta = 10;
        levelClass = 'level-expanded';
      }

      renderDelta = renderDelta / that.pixelsPerMillisecond;
      var rendOffset = offset / that.pixelsPerMillisecond;
      var width = renderDelta - (2 * (depth-1)); // Compensate for CSS borders
      var title = 'key:'+entireKey+'\noffset:'+offset+'\ndelta:'+delta;

      if(_.isEmpty(child.children)){
        $node = that.$('<div />', {
          text: child.key
        , class: 'title ' + levelClass
        , style: 'width:'+width+'px; left:'+rendOffset+'px'
        , title: title
        });
        $parentElement.append($node);

      } else {
        var backClass = 'back-level' + (depth % 5);
        $node = that.$('<div />', {
          class: 'sample ' + backClass
        , style: 'width:'+width+'px; left:'+rendOffset+'px'
        , title: title
        });
        $parentElement.append($node);

        var $title = that.$('<div />', {
          text: child.key
        , class: 'title ' + levelClass
        });
        $node.append($title);

        myKeyList.push(child.key);
        that.renderChildren($node, child, myKeyList, 0, offsets, deltas);
      }
    });
  };
};

yerf().render = function(){
  var $ = yerf().getConfig('$');

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
    var rawStats = yerf().postData(true);

    for (var index in rawStats){
      var sample = rawStats[index];
      var key = 'Browser.'+sample.key;
      if (!stats[key]) {
        stats[key] = sample.val;
      } else {
        console.log('Ignoring duplicate key [' + sample.key + '].');
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