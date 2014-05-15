describe('yerf().Sample', function () {  
  beforeEach(function () {
    kivi.clear();
    yerf().clear(); 
  });

  describe('backfill()', function () {
    var grandParent
    , parent
    , child
    , uncle;

    var checkGrandParent = function () {
      expect(grandParent.startedAt).toBe(50);
      expect(grandParent.stoppedAt).toBe(200);
      expect(grandParent.delta).toBe(150);
      expect(grandParent.offset).toBe(50);
    };

    var checkUncle = function () {
      expect(uncle.startedAt).toBe(100);
      expect(uncle.stoppedAt).toBe(105);
      expect(uncle.delta).toBe(5);
      expect(uncle.offset).toBe(50);
    };

    var checkParent = function () {
      expect(parent.startedAt).toBe(100);
      expect(parent.stoppedAt).toBe(200);
      expect(parent.delta).toBe(100);
      expect(parent.offset).toBe(50);
    };

    var checkChild = function () {
      expect(child.startedAt).toBe(150);
      expect(child.stoppedAt).toBe(200);
      expect(child.delta).toBe(50);
      expect(child.offset).toBe(50);
    };

    var setupCheck = function () {
      checkGrandParent();
      checkUncle();
      checkParent();
      checkChild();
    };
    
    beforeEach(function () {
      mockGetTime(50, 100, 100, 105, 150, 200);

      grandParent = new (yerf().Sample)('grandParent'); // 50 - 200
      grandParent.waterfall('parent', 'uncle');

      uncle = grandParent.start('uncle').find('uncle'); // 100 - 105

      parent = grandParent.start('parent').find('parent'); // 100 - 200
      parent.waterfall('child', 'child');

      uncle.stop();

      child = parent.start('child').find('child'); // 150 - 200
    });

    it('adds the sample to the parent', function () {
      child.stop();
      setupCheck();

      var result = parent.backfill(undefined, 'backfill', 110, 190);
      var backfill = parent.find('backfill');
      expect(result).toBe(parent);

      expect(backfill.parent).toBe(parent);
      expect(parent.children.backfill).toBe(backfill);
      expect(backfill.key).toBe('grandParent.parent.backfill');
      expect(backfill.startedAt).toBe(110);
      expect(backfill.stoppedAt).toBe(190);
      expect(backfill.delta).toBe(80);
      expect(backfill.offset).toBe(10);
      expect(backfill.state).toBe('stopped');
    });

    describe('when parentKey is specified', function () {
      it('creates a parentKey and adds the sample to the parentKey', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill('parentKey', 'backfill', 110, 190);
        var parentKey = parent.find('parentKey');
        var backfill = parentKey.find('backfill');
        expect(result).toBe(parent);

        expect(parentKey.parent).toBe(parent);
        expect(parent.children.parentKey).toBe(parentKey);
        expect(parentKey.key).toBe('grandParent.parent.parentKey');
        expect(parentKey.startedAt).toBe(110);
        expect(parentKey.stoppedAt).toBe(190);
        expect(parentKey.delta).toBe(80);
        expect(parentKey.offset).toBe(10);
        expect(parentKey.state).toBe('stopped');

        expect(backfill.parent).toBe(parentKey);
        expect(parentKey.children.backfill).toBe(backfill);
        expect(backfill.key).toBe('grandParent.parent.parentKey.backfill');
        expect(backfill.startedAt).toBe(110);
        expect(backfill.stoppedAt).toBe(190);
        expect(backfill.delta).toBe(80);
        expect(backfill.offset).toBe(0);
        expect(backfill.state).toBe('stopped');
      });
    
      describe('when backfill is called twice', function () {
        it('uses the existing parentKey', function () {
          child.stop();
          setupCheck();

          var result = parent.backfill('parentKey', 'backfill', 110, 190);
          var parentKey = parent.find('parentKey');
          var backfill = parentKey.find('backfill');
          expect(result).toBe(parent);

          var result2 = parent.backfill('parentKey', 'backfill2', 105, 200);
          var backfill2 = parentKey.find('backfill2');
          expect(result2).toBe(parent);

          expect(parentKey.parent).toBe(parent);
          expect(parent.children.parentKey).toBe(parentKey);
          expect(parentKey.key).toBe('grandParent.parent.parentKey');
          expect(parentKey.startedAt).toBe(105);
          expect(parentKey.stoppedAt).toBe(200);
          expect(parentKey.delta).toBe(95);
          expect(parentKey.offset).toBe(5);
          expect(parentKey.state).toBe('stopped');

          expect(backfill.parent).toBe(parentKey);
          expect(parentKey.children.backfill).toBe(backfill);
          expect(backfill.key).toBe('grandParent.parent.parentKey.backfill');
          expect(backfill.startedAt).toBe(110);
          expect(backfill.stoppedAt).toBe(190);
          expect(backfill.delta).toBe(80);
          expect(backfill.offset).toBe(5);
          expect(backfill.state).toBe('stopped');

          expect(backfill2.parent).toBe(parentKey);
          expect(parentKey.children.backfill2).toBe(backfill2);
          expect(backfill2.key).toBe('grandParent.parent.parentKey.backfill2');
          expect(backfill2.startedAt).toBe(105);
          expect(backfill2.stoppedAt).toBe(200);
          expect(backfill2.delta).toBe(95);
          expect(backfill2.offset).toBe(0);
          expect(backfill2.state).toBe('stopped');
        });
      });
    });


    describe('when start and stop are between the parent\'s start and stop', function () {
      it('does not change the start times or offsets', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill(undefined, 'backfill', 110, 190);
        expect(result).toBe(parent);

        // Parent and children are unchanged
        setupCheck();
      });
    });

    describe('when start is before grand parent start', function () {
      it('propagates start changes up the parent tree and changes children offsets', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill(undefined, 'backfill', 0, 199);
        var backfill = parent.find('backfill');
        expect(result).toBe(parent);

        // Backfill's offset is updated
        expect(backfill.offset).toBe(0);

        // GrandParent's started time is updated
        expect(grandParent.startedAt).toBe(0);
        expect(grandParent.stoppedAt).toBe(200);
        expect(grandParent.delta).toBe(200);
        expect(grandParent.offset).toBe(0);

        // Parent's started time and offset is updated
        expect(parent.startedAt).toBe(0);
        expect(parent.stoppedAt).toBe(200);
        expect(parent.delta).toBe(200);
        expect(parent.offset).toBe(0);

        // Uncle's offset is updated
        expect(uncle.startedAt).toBe(100);
        expect(uncle.stoppedAt).toBe(105);
        expect(uncle.delta).toBe(5);
        expect(uncle.offset).toBe(100);

        // Child's offset is updated
        expect(child.startedAt).toBe(150);
        expect(child.stoppedAt).toBe(200);
        expect(child.delta).toBe(50);
        expect(child.offset).toBe(150);
      });
    });

    describe('when start is before parent start but after grandparent start', function () {
      it('propagates start changes only to parent and changes children offsets', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill(undefined, 'backfill', 75, 199);
        var backfill = parent.find('backfill');
        expect(result).toBe(parent);

        // Backfill's offset is updated
        expect(backfill.offset).toBe(0);

        // GrandParent is unchanged
        checkGrandParent();

        // Parent's started time is updated
        expect(parent.startedAt).toBe(75);
        expect(parent.stoppedAt).toBe(200);
        expect(parent.delta).toBe(125);
        expect(parent.offset).toBe(25);

        // Uncle is unchanged
        checkUncle();

        // Child's offset is updated
        expect(child.startedAt).toBe(150);
        expect(child.stoppedAt).toBe(200);
        expect(child.delta).toBe(50);
        expect(child.offset).toBe(75);
      });
    });

    describe('when end is after grand parent end', function () {
      it('propagates end changes up the parent tree', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill(undefined, 'backfill', 160, 250);
        var backfill = parent.find('backfill');
        expect(result).toBe(parent);

        // Backfill's offset is unchanged
        expect(backfill.offset).toBe(60);

        // GrandParent's end time is updated
        expect(grandParent.startedAt).toBe(50);
        expect(grandParent.stoppedAt).toBe(250);
        expect(grandParent.delta).toBe(200);
        expect(grandParent.offset).toBe(50);

        // Parent's end time is updated
        expect(parent.startedAt).toBe(100);
        expect(parent.stoppedAt).toBe(250);
        expect(parent.delta).toBe(150);
        expect(parent.offset).toBe(50);

        // Uncle is unchanged
        checkUncle();

        // Child is unchanged
        checkChild();
      });
    });

    describe('when start and end are beyond the parents bounds', function () {
      it('propagates start and end changes up the parent tree', function () {
        child.stop();
        setupCheck();

        var result = parent.backfill(undefined, 'backfill', 1, 250);
        var backfill = parent.find('backfill');
        expect(result).toBe(parent);

        // Backfill's offset is updated
        expect(backfill.offset).toBe(0);

        // GrandParent's times are updated
        expect(grandParent.startedAt).toBe(1);
        expect(grandParent.stoppedAt).toBe(250);
        expect(grandParent.delta).toBe(249);
        expect(grandParent.offset).toBe(1);

        // Parent's times are updated
        expect(parent.startedAt).toBe(1);
        expect(parent.stoppedAt).toBe(250);
        expect(parent.delta).toBe(249);
        expect(parent.offset).toBe(0);

        // Uncle's offset is updated
        expect(uncle.startedAt).toBe(100);
        expect(uncle.stoppedAt).toBe(105);
        expect(uncle.delta).toBe(5);
        expect(uncle.offset).toBe(99);

        // Child's offset is updated
        expect(child.startedAt).toBe(150);
        expect(child.stoppedAt).toBe(200);
        expect(child.delta).toBe(50);
        expect(child.offset).toBe(149);
      });
    });

    describe('when the sample has no children', function () {
      it('creates a children object', function () {
        yerf().clear();
        getTimeSpy.restore('getTime');
        mockGetTime(50, 75);

        var noChildrenParent = new (yerf().Sample)('noChildrenParent'); // 50 - 75
        noChildrenParent.start().stop();

        var result = noChildrenParent.backfill(undefined, 'child', 100, 175);
        expect(result).toBe(noChildrenParent);

        var child = noChildrenParent.find('child');

        expect(noChildrenParent.stoppedAt).toBe(175);
        expect(noChildrenParent.children.child).toBe(child);

        expect(child.delta).toBe(75);
        expect(child.offset).toBe(50);
        expect(child.startedAt).toBe(100);
        expect(child.stoppedAt).toBe(175);
        expect(child.parent).toBe(noChildrenParent);
        expect(child.children).toBe(undefined);
        expect(child.waitingFor).toBe(undefined);
        expect(child.state).toBe('stopped');
      });
    });

    it('throws an exception when key is omitted', function () {
      child.stop();
      setupCheck();

      expect(function () { parent.backfill(undefined, undefined, 110, 190); }).toThrow('You must specify a key for this Sample.');
    });

    it('throws an exception when startedAt is omitted', function () {
      child.stop();
      setupCheck();

      expect(function () { parent.backfill(undefined, 'backfill', undefined, 190); }).toThrow('You must specify a startedAt for this Sample[backfill].');
    });

    it('throws an exception when stoppedAt is omitted', function () {
      child.stop();
      setupCheck();

      expect(function () { parent.backfill(undefined, 'backfill', 110, undefined); }).toThrow('You must specify a stoppedAt for this Sample[backfill].');
    });

    it('calls onError() if the parent is not stopped', function () {
      var onErrorSpy = expectOnError('Sample[grandParent.parent] must be stopped to backfill with key[backfill].');

      var result = parent.backfill(undefined, 'backfill', 110, 190);
      expect(result).toBe(parent);

      expect(onErrorSpy).toHaveBeenCalled();
    });

    it('calls onError() if the parent[key] is already defined', function () {
      child.stop();
      setupCheck();

      var onErrorSpy = expectOnError('Sample[grandParent.parent.child] already exists.');

      var result = parent.backfill(undefined, 'child', 110, 190);
      expect(result).toBe(parent);

      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe('backfillRequest', function () {
    describe('when getEntries() is mocked', function () {
      var sample, perfSpy, oldHasEntries;
        
      beforeEach(function () {
        mockGetTime(100, 200);
        
        sample = new (yerf().Sample)('sample');

       
        perfSpy = spyOn(yerf(), 'getEntries').andCallFake(function () {
          return [
            {
              name: 'http://www.server.com/assets/19/action.json'
            , startTime: 50
            , duration: 60
            }
          ];
        });

        oldHasEntries = yerf().hasEntries;
        yerf().hasEntries = true;
      });

      afterEach(function () {
        yerf().hasEntries = oldHasEntries;
      });

      describe('when a key is provided', function () {
        it('searches getEntries() for a matching request to backfill and uses provided key', function () {
          sample.start().stop();
          var result = sample.backfillRequest(undefined, 'backfill', /action/);
          expect(result).toBe(sample);
          
          expect(yerf().hasEntries).toBe(true);
          expect(perfSpy).toHaveBeenCalled();

          var action = sample.children.backfill;
          expect(action.parent).toBe(sample);
          expect(action.key).toBe('sample.backfill');
          expect(action.startedAt).toBe(50);
          expect(action.stoppedAt).toBe(110);
          expect(action.delta).toBe(60);
        });
      });

      describe('when the parentKey and the key are provided', function () {
        it('searches getEntries() for a matching request to backfill and uses provided key', function () {
          sample.start().stop();
          var result = sample.backfillRequest('parentKey', 'backfill', /action/);
          expect(result).toBe(sample);
          
          expect(yerf().hasEntries).toBe(true);
          expect(perfSpy).toHaveBeenCalled();

          var parent = sample.children.parentKey;
          expect(parent.parent).toBe(sample);
          expect(parent.key).toBe('sample.parentKey');
          expect(parent.startedAt).toBe(50);
          expect(parent.stoppedAt).toBe(110);
          expect(parent.delta).toBe(60);

          var action = parent.children.backfill;
          expect(action.parent).toBe(parent);
          expect(action.key).toBe('sample.parentKey.backfill');
          expect(action.startedAt).toBe(50);
          expect(action.stoppedAt).toBe(110);
          expect(action.delta).toBe(60);
        });
      });

      describe('when a key is not provided', function () {
        it('searches getEntries() for a matching request to backfill and uses inner most matching group as key', function () {
          sample.start().stop();
          var result = sample.backfillRequest(undefined, undefined, /(assets.*(action)).json/);
          expect(result).toBe(sample);
          
          expect(yerf().hasEntries).toBe(true);
          expect(perfSpy).toHaveBeenCalled();

          var action = sample.children.action;
          expect(action.parent).toBe(sample);
          expect(action.key).toBe('sample.action');
          expect(action.startedAt).toBe(50);
          expect(action.stoppedAt).toBe(110);
          expect(action.delta).toBe(60);
        });
      });
    });

    describe('when hasEntries is false', function () {

      beforeEach(function () {
        oldHasEntries = yerf().hasEntries;
        oldYerfEpoch = yerf().yerfEpoch;
        oldUnixEpoch = yerf().unixEpoch;
      });

      afterEach(function () {
        yerf().hasEntries = oldHasEntries;
        yerf().yerfEpoch = oldYerfEpoch;
        yerf().unixEpoch = oldUnixEpoch;
      });

      it('does not backfill', function () {
        mockGetTime(100, 200);
        
        var sample = new (yerf().Sample)('sample');
        sample.children = {};
        
        sample.start().stop();
        var result = sample.backfillRequest(undefined, 'backfill', /action/);
        expect(result).toBe(sample);

        var action = sample.children.backfill;
        expect(action).toBe(undefined);
        expect(yerf('sample.backfill')).toBe(undefined);
      });
    });

    it('throws an exception when urlPattern is omitted', function () {
      var sample = new (yerf().Sample)('sample');

      expect(function () { sample.backfillRequest(); }).toThrow('You must specify a urlPattern for this Sample.');
    });
  });

  describe('unixBackfill', function () {
    var oldHasNow;
    var oldYerfEpoch;
    var oldUnixEpoch;

    beforeEach(function () {
      oldHasNow = yerf().hasNow;
      oldYerfEpoch = yerf().yerfEpoch;
      oldUnixEpoch = yerf().unixEpoch;
    });

    afterEach(function () {
      yerf().hasNow = oldHasNow;
      yerf().yerfEpoch = oldYerfEpoch;
      yerf().unixEpoch = oldUnixEpoch;
    });

    it('converts unix times to yerf times and does a backfill', function () {
      yerf().hasNow = true;
      yerf().yerfEpoch = 100;
      yerf().unixEpoch = 1000000;
      mockGetTime(100, 200);

      var sample = new (yerf().Sample)('sample');
      sample.start().stop();

      var backfillSpy = spyOn(sample, 'backfill').andCallThrough();
      
      var result = sample.unixBackfill('parent', 'backfill', 1000500, 1000600);
      expect(result).toBe(sample);

      // it delegates the heavy lifting to backfill()
      expect(backfillSpy).toHaveBeenCalledWith('parent', 'backfill', 600, 700);

      // Redundant sanity checking
      var parent = yerf('sample.parent');
      var backfill = yerf('sample.parent.backfill');

      expect(result.children.parent).toBe(parent);
      
      expect(parent.startedAt).toBe(600);
      expect(parent.stoppedAt).toBe(700);
      expect(parent.delta).toBe(100);
      expect(parent.parent).toBe(result);
      expect(parent.children.backfill).toBe(backfill);

      expect(backfill.startedAt).toBe(600);
      expect(backfill.stoppedAt).toBe(700);
      expect(backfill.delta).toBe(100);
      expect(backfill.parent).toBe(parent);
    });

    it('throws an exception when startedAt is omitted', function () {
      var sample = new (yerf().Sample)('sample');
      sample.start().stop();

      expect(function () { sample.unixBackfill(undefined, 'backfill', undefined, 190); }).toThrow('You must specify a startedAt for this Sample[backfill].');
    });

    it('throws an exception when stoppedAt is omitted', function () {
      var sample = new (yerf().Sample)('sample');
      sample.start().stop();

      expect(function () { sample.unixBackfill(undefined, 'backfill', 110, undefined); }).toThrow('You must specify a stoppedAt for this Sample[backfill].');
    });
  });
});