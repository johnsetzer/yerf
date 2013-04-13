describe('yerf()', function () {  

  // Mock yerf().getTime()
  var getTimeSpy;
  var mockGetTime = function () {
    var nextTimes = Array.prototype.slice.call(arguments);
    getTimeSpy = spyOn(yerf(), 'getTime').andCallFake(function () {
      if (nextTimes.length > 0) {
        var time = nextTimes.shift();
        return time;
      } else {
        return -1111; // Error Code
      }
    });
  };

  var expectSample = function (sample, key, startedAt, stoppedAt, delta) {
    expect(sample.key).toBe(key);
    expect(sample.startedAt).toBe(startedAt);
    expect(sample.stoppedAt).toBe(stoppedAt);
    expect(sample.delta).toBe(delta);
  };

  var expectOnError = function (sample, expectedErrorMsg) {
    var sampleOnError = spyOn(sample, 'onError').andCallFake(function (error) {
      expect(error.message).toBe(expectedErrorMsg);
    });
    return sampleOnError;
  }

  jasmine.Spy.prototype.restore = function() {
    this.baseObj[this.methodName] = this.originalValue;
  };

  beforeEach(function () {
    kivi.clear();
    yerf().clear(); 
  });

  describe('Sample', function () {
    describe('constructor', function () {
      it('returns object with key set and all other values set to default', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.key).toBe('test');
        expect(sample.delta).toBe(undefined);
        expect(sample.offset).toBe(undefined);
        expect(sample.startedAt).toBe(undefined);
        expect(sample.stoppedAt).toBe(undefined);
        expect(sample.parent).toBe(undefined);
        expect(sample.children).toBe(undefined);
        expect(sample.waitingFor).toBe(undefined);
        expect(sample.state).toBe('created');
      });

      it('throws an exception if no key is passed to the constructor', function () {
        expect(function(){ new (yerf().Sample)(); }).toThrow('You must specify a key for this Sample.');
      });

      describe('when a second sample with the same key as the first sample is newed', function () {
        it('returns the first sample', function () {
          var sampleOnError = expectOnError(yerf().Sample.prototype, 'Sample[test] already exists.');
          var sample = new (yerf().Sample)('test');
          expect(sampleOnError).not.toHaveBeenCalled();

          expect(new (yerf().Sample)('test')).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();
        });
      });
    });

    describe('fullChildKey()', function () {
      it('returns the full key path of a child with the given key', function () {
        var level1 = new (yerf().Sample)('1');
        expect(level1.fullChildKey('2')).toBe('1.2');
      });

      it('throws an exception if no key is passed in', function () {
        var level1 = new (yerf().Sample)('1');
        expect(function(){ level1.fullChildKey(); }).toThrow('You must specify a childKey.');
      });
    });

    describe('find()', function () {
      it('returns the sample with a relative path from the parent', function () {
        var level1 = new (yerf().Sample)('1');
        var level2 = level1.waterfall('2').start('2').children['2'];
        var level3 = level2.waterfall('3').start('3').children['3'];
        expect(level1.find('2.3')).toBe(yerf('1.2.3'));
      });

      it('throws an exception if no key is passed in', function () {
        var level1 = new (yerf().Sample)('1');
        expect(function(){ level1.find() }).toThrow('You must specify a childKey.');
      });
    });

    describe('events', function () {
      it('calls subscribers when an event is fired', function () {
        var foo = new (yerf().Sample)('foo');
        var bar = new (yerf().Sample)('bar');
        var fooSub1 = jasmine.createSpy();
        var fooSub2 = jasmine.createSpy();
        var barSub = jasmine.createSpy();

        foo.on('start', fooSub1);
        foo.on('start', fooSub2);
        bar.on('start', barSub);

        foo.trigger('start');
        
        expect(fooSub1).toHaveBeenCalledWith(foo);
        expect(fooSub2).toHaveBeenCalledWith(foo);
        expect(barSub).not.toHaveBeenCalled();
      });

      it('does not call subscribers on a different event', function () {
        var foo = new (yerf().Sample)('foo');
        var fooSub1 = jasmine.createSpy();
        var fooSub2 = jasmine.createSpy();

        foo.on('start', fooSub1);
        foo.on('stop', fooSub2);

        foo.trigger('start');
        
        expect(fooSub1).toHaveBeenCalledWith(foo);
        expect(fooSub2).not.toHaveBeenCalled();
      });
    });

    describe('on()', function () {
      it('returns the Sample so methods can be chained', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.on('event', function() {})).toBe(sample);
      });

      it('throws an exception if no event is passed in', function () {
        var sample = new (yerf().Sample)('test');
        expect(function(){ sample.on(undefined, function() {}); }).toThrow('You must specify an event for Sample.on().');
      });
    });

    describe('trigger()', function () {
      it('returns the Sample so methods can be chained', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.trigger('event')).toBe(sample);
      });

      it('throws an exception if no event is passed in', function () {
        var sample = new (yerf().Sample)('test');
        expect(function(){ sample.trigger(); }).toThrow('You must specify an event for Sample.trigger().');
      });
    });

    describe('start()', function () {
      describe('when there are no arguments', function () {
        it('sets startedAt', function () {
          mockGetTime(1);
          var sample = new (yerf().Sample)('test');
          sample.start();
          expect(sample.startedAt).toEqual(1);
        });

        it('changes state to started', function () {
          var sample = new (yerf().Sample)('test');
          sample.start();
          expect(sample.state).toEqual('started');
        });

        it('triggers start event', function () {
          var sample = new (yerf().Sample)('test');
          var sub = jasmine.createSpy();
          sample.on('start', sub);
          sample.start();
          expect(sub).toHaveBeenCalledWith(sample);
        });

        it('returns the Sample so methods can be chained', function () {
          var sample = new (yerf().Sample)('test');
          expect(sample.start()).toBe(sample);
        });

        describe('when the sample has a parent', function () {
          it('sets offset from parent\'s started at', function () {
            mockGetTime(1, 3);
            var sample = new (yerf().Sample)('test');
            var parent = new (yerf().Sample)('parent');
            sample.parent = parent;
            parent.start();
            sample.start();
            expect(sample.offset).toBe(2); // 3 - 1 = 2
          });
        });

        describe('when the sample is already started and is started again', function () {
          it('calls onAlreadyStarted()', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Sample[test] has already started.');
            sample.start();
            expect(sample.start()).toBe(sample);
            expect(sampleOnError).toHaveBeenCalled();
          });
        });
      });

      describe('when there are arguments', function () {
        it('starts children with the given names', function () {
          var sample = new (yerf().Sample)('test');
          sample.waterfall('dep1', 'dep2', 'dep3');
          sample.start('dep1', 'dep2');
          
          expect(yerf('test.dep1').state).toBe('started');
          expect(yerf('test.dep2').state).toBe('started');

          expect(sample.children['dep1']).toBe(yerf('test.dep1'));
          expect(sample.children['dep2']).toBe(yerf('test.dep2'));
        });

        it('does not restart already started children', function () {
          var sample = new (yerf().Sample)('test');
          sample.waterfall('dep1', 'dep2', 'dep3');
          new (yerf().Sample)('test.dep1').start();
          sample.start('dep2');
          
          expect(yerf('test.dep1').state).toBe('started');
          expect(yerf('test.dep2').state).toBe('started');

          expect(sample.children['dep1']).toBe(yerf('test.dep1'));
          expect(sample.children['dep2']).toBe(yerf('test.dep2'));
        });

        it('calls onError() if you try to start an event that it is not waiting for', function () {
          var sample = new (yerf().Sample)('test');

          var sampleOnError = expectOnError(sample, 'Cannot start a child[not_waiting_for] you are not waiting for.');
          sample.waterfall('dep1', 'dep2', 'dep3');
          expect(sample.start('not_waiting_for')).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();
        });
      });
    });

    describe('stop()', function () {
      describe('when there are no arguments', function () {
        it('sets stoppedAt and delta', function () {
          mockGetTime(1, 3);
          var sample = new (yerf().Sample)('test');
          sample.start().stop();
          expect(sample.stoppedAt).toEqual(3);
          expect(sample.delta).toEqual(2);
        });

        it('changes state to stopped', function () {
          var sample = new (yerf().Sample)('test');
          sample.start().stop();
          expect(sample.state).toEqual('stopped');
        });

        it('triggers stop event', function () {
          var sample = new (yerf().Sample)('test');
          var sub = jasmine.createSpy();
          sample.on('stop', sub);
          sample.start().stop();
          expect(sub).toHaveBeenCalledWith(sample);
        });

        it('passes delta to kivi.set()', function () {
          mockGetTime(1, 3);
          var sample = new (yerf().Sample)('test');
          var kiviSpy =  spyOn(kivi, 'set');
          sample.start().stop();
          expect(kiviSpy.calls.length).toBe(1);
          expect(kiviSpy).toHaveBeenCalledWith('yerf.delta.test', 2);
        });

        it('returns the Sample so methods can be chained', function () {
          var sample = new (yerf().Sample)('test');
          expect(sample.start().stop()).toBe(sample);
        });

        describe('when the sample is already stopped and is stopped again', function () {
          it('calls onError()', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Sample[test] has already stopped.');
            sample.start().stop();
            expect(sample.stop()).toBe(sample);
            expect(sampleOnError).toHaveBeenCalled();
          });
        });

        describe('when the sample is stopped before it is started', function () {
          it('calls onError()', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Sample[test] has not been started.');
            expect(sample.stop()).toBe(sample);
            expect(sampleOnError).toHaveBeenCalled();
          });
        });
      });

      describe('when there are arguments', function () {
        it('stops children with the given names', function () {
          var sample = new (yerf().Sample)('test');
          sample.waterfall('dep1', 'dep2', 'dep3');
          sample.start('dep1', 'dep2');
          sample.stop('dep1', 'dep2');
          
          expect(yerf('test.dep1').state).toBe('stopped');
          expect(yerf('test.dep2').state).toBe('stopped');

          expect(sample.children['dep1']).toBe(yerf('test.dep1'));
          expect(sample.children['dep2']).toBe(yerf('test.dep2'));
        });

        it('calls onError() if you try to stop an event that it is not a child', function () {
          var sample = new (yerf().Sample)('test');
          sample.waterfall('dep1', 'dep2', 'dep3');
          sample.start('dep1');

          var sampleOnError = expectOnError(sample, 'Cannot stop a child[not_waiting_for] that is not attached.');
          expect(sample.stop('not_waiting_for')).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();

          sampleOnError.restore('onError');
          sampleOnError = expectOnError(sample, 'Cannot stop a child[dep2] that is not attached.');
          expect(sample.stop('dep2')).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();
        });
      });

      describe('when a whole bunch of errors are chained together', function () {
        it('calls onError() for each error', function () {
          var sample = new (yerf().Sample)('test');
          var sampleOnError = spyOn(sample, 'onError');

          sample.start().start().waterfall('dep1').stop('wrong').stop();

          expect(sampleOnError.calls.length).toBe(3);
          expect(sampleOnError.calls[0].args[0].message).toBe('Sample[test] has already started.');
          expect(sampleOnError.calls[1].args[0].message).toBe('Cannot stop a child[wrong] that is not attached.');
          expect(sampleOnError.calls[2].args[0].message).toBe('Sample[test] is a waterfall and cannot be manually stopped.');
        });
      });
    });

    describe('waterfall()', function () {

      describe('when it is called without args', function () {
        describe('and doesn\'t have any existing dependencies', function () {
          it('it can be stopped', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Should not be called by test.');
            expect(sample.waterfall()).toBe(sample);
            expect(sampleOnError).not.toHaveBeenCalled();
          });
        });

        describe('and does have existing dependencies', function () {
          it('calls onError()', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Sample[test] is a waterfall and cannot be manually stopped.');

            sample.waterfall('dependency');
            sample.waterfall();
            expect(sample.stop()).toBe(sample);
            expect(sampleOnError).toHaveBeenCalled();
          });
        });
      });

      it('returns the Sample so methods can be chained', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.start().waterfall()).toBe(sample);
      });

      it('starts if it is not already started', function () {
        var sample = new (yerf().Sample)('test');
        sample.waterfall();
        expect(sample.state).toBe('started');
      });

      describe('when it is already stopped', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var sampleOnError = expectOnError(sample, 'Sample[test] has already stopped.');
          sample.state = 'stopped';

          expect(sample.waterfall()).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();
        });
      });

      it('sets its offset', function () {
        var sample = new (yerf().Sample)('test');
        sample.waterfall();
        expect(sample.offset).toBe(0);
      });

      it('calling it again does not reset its offset', function () {
        var sample = new (yerf().Sample)('test');
        sample.offset = 10;
        sample.waterfall();
        expect(sample.offset).toBe(10);
      });

      it('calling it again adds more dependencies', function () {
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        expect(sample.waitingFor).toEqual({dep1: true, dep2: true});
        
        sample.waterfall('dep3');
        expect(sample.waitingFor).toEqual({dep1: true, dep2: true, dep3: true});
      });

      it('does not allow you to wait on the same event more than once', function () {
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'repeat', 'repeat');
        expect(sample.waitingFor).toEqual({dep1: true, repeat: true});
        
        sample.waterfall('dep1');
        expect(sample.waitingFor).toEqual({dep1: true, repeat: true});
      });

      describe('when it is called with args and is stopped', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var sampleOnError = expectOnError(sample, 'Sample[test] is a waterfall and cannot be manually stopped.');

          sample.waterfall('dep1', 'dep2');
          expect(sample.stop()).toBe(sample);
          expect(sampleOnError).toHaveBeenCalled();
        });
      });

      it('automatically stops after its dependencies are stopped', function () {
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start().stop();
        var dep2 = new (yerf().Sample)('test.dep2').start().stop();

        expect(sample.state).toBe('stopped');
        expect(dep1.state).toBe('stopped');
        expect(dep2.state).toBe('stopped');
      });

      it('sets its stoppedAt time to be the stoppedAt time of the last dependency', function () {
        mockGetTime(100, 100, 200, 300, 400);
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start().stop();
        var dep2 = new (yerf().Sample)('test.dep2').start().stop();
        
        expect(dep2.stoppedAt).toBe(400);  // Sanity check
        expect(sample.stoppedAt).toBe(400);// The test
      });

      it('sets the offsets of its children', function () {
        mockGetTime(10, 20, 30);
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start();
        var dep2 = new (yerf().Sample)('test.dep2').start();
        
        expect(dep1.offset).toBe(10);
        expect(dep2.offset).toBe(20);
      });

      it('only reports values to kivi when all the dependencies are finished', function () {
        mockGetTime(1, 10, 20, 30, 50);
        var kiviSpy =  spyOn(kivi, 'set');

        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start().stop();
        var dep2 = new (yerf().Sample)('test.dep2').start();

        expect(sample.state).toBe('started');
        expect(dep1.state).toBe('stopped');
        expect(dep2.state).toBe('started');
        expect(kiviSpy).not.toHaveBeenCalled();

        dep2.stop();

        expect(sample.state).toBe('stopped');
        expect(dep1.state).toBe('stopped');
        expect(dep2.state).toBe('stopped');

        expect(kiviSpy.calls.length).toBe(6);
        
        expect(kiviSpy.calls[0].args[0]).toBe('yerf.delta.test');
        expect(kiviSpy.calls[0].args[1]).toBe(49);
        expect(kiviSpy.calls[1].args[0]).toBe('yerf.offset.test');
        expect(kiviSpy.calls[1].args[1]).toBe(0);

        expect(kiviSpy.calls[2].args[0]).toBe('yerf.delta.test.dep1');
        expect(kiviSpy.calls[2].args[1]).toBe(10);
        expect(kiviSpy.calls[3].args[0]).toBe('yerf.offset.test.dep1');
        expect(kiviSpy.calls[3].args[1]).toBe(9);

        expect(kiviSpy.calls[4].args[0]).toBe('yerf.delta.test.dep2');
        expect(kiviSpy.calls[4].args[1]).toBe(20);
        expect(kiviSpy.calls[5].args[0]).toBe('yerf.offset.test.dep2');
        expect(kiviSpy.calls[5].args[1]).toBe(29);
      });

      it('calls onError() if one of its dependencies is already started', function () {
        var sample = new (yerf().Sample)('test');
        var dep1 = new (yerf().Sample)('test.dep1').start();
        var sampleOnError = expectOnError(sample, 'Child[test.dep1] is already started.');
        
        expect(sample.waterfall('dep1', 'dep2')).toBe(sample);
        expect(sampleOnError).toHaveBeenCalled();
      });

      it('handles three levels of nesting', function () {
        mockGetTime(1, 100, 100, 150, 160, 200, 500, 500, 550, 560, 600);
        var root = yerf().create('root').waterfall('dep1', 'dep2');
        var dep1 = yerf().create('root.dep1').waterfall('dep1', 'dep2').start('dep1', 'dep2'); // 100 - 200
        var dep1dep1 = yerf('root.dep1.dep1').stop(); // 100 - 150
        var dep1dep2 = yerf('root.dep1.dep2').stop(); // 160 - 200
        var dep2 = yerf().create('root.dep2').waterfall('dep1', 'dep2').start('dep1', 'dep2'); // 500 - 600
        var dep2dep1 = yerf('root.dep2.dep1').stop(); // 500 - 550
        var dep2dep2 = yerf('root.dep2.dep2').stop(); // 560 - 600

        expect(root.offset).toBe(0);
        expect(dep1.offset).toBe(99);
        expect(dep1dep1.offset).toBe(0);
        expect(dep1dep2.offset).toBe(50);
        expect(dep2.offset).toBe(499);
        expect(dep2dep1.offset).toBe(0);
        expect(dep2dep2.offset).toBe(50);

        expect(root.startedAt).toBe(1);
        expect(dep1.startedAt).toBe(100);
        expect(dep1dep1.startedAt).toBe(100);
        expect(dep1dep2.startedAt).toBe(150);
        expect(dep2.startedAt).toBe(500);
        expect(dep2dep1.startedAt).toBe(500);
        expect(dep2dep2.startedAt).toBe(550);

        expect(root.stoppedAt).toBe(600);
        expect(dep1.stoppedAt).toBe(200);
        expect(dep1dep1.stoppedAt).toBe(160);
        expect(dep1dep2.stoppedAt).toBe(200);
        expect(dep2.stoppedAt).toBe(600);
        expect(dep2dep1.stoppedAt).toBe(560);
        expect(dep2dep2.stoppedAt).toBe(600);

        expect(root.children.dep1).toBe(dep1);
        expect(root.children.dep2).toBe(dep2);
        expect(dep1.parent).toBe(root);
        expect(dep2.parent).toBe(root);

        expect(dep1.children.dep1).toBe(dep1dep1);
        expect(dep1.children.dep2).toBe(dep1dep2);
        expect(dep1dep1.parent).toBe(dep1);
        expect(dep1dep2.parent).toBe(dep1);

        expect(dep2.children.dep1).toBe(dep2dep1);
        expect(dep2.children.dep2).toBe(dep2dep2);
        expect(dep2dep1.parent).toBe(dep2);
        expect(dep2dep2.parent).toBe(dep2);
      });
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
        expect(grandParent.offset).toBe(0);
      }

      var checkUncle = function () {
        expect(uncle.startedAt).toBe(100);
        expect(uncle.stoppedAt).toBe(105);
        expect(uncle.delta).toBe(5);
        expect(uncle.offset).toBe(50);
      }

      var checkParent= function () {
        expect(parent.startedAt).toBe(100);
        expect(parent.stoppedAt).toBe(200);
        expect(parent.delta).toBe(100);
        expect(parent.offset).toBe(50);
      }

      var checkChild = function () {
        expect(child.startedAt).toBe(150);
        expect(child.stoppedAt).toBe(200);
        expect(child.delta).toBe(50);
        expect(child.offset).toBe(50);
      }

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

        var result = parent.backfill('backfill', 110, 190);
        var backfill = parent.find('backfill');
        expect(result).toBe(parent);

        expect(backfill.parent).toBe(parent);
        expect(parent.children.backfill).toBe(backfill);
        expect(backfill.key).toBe('grandParent.parent.backfill');
        expect(backfill.startedAt).toBe(110);
        expect(backfill.stoppedAt).toBe(190);
        expect(backfill.delta).toBe(80);
        expect(backfill.state).toBe('stopped');
      });

      describe('when start and stop are between the parent\'s start and stop', function () {
        it('does not change the start times or offsets', function () {
          child.stop();
          setupCheck();

          var result = parent.backfill('backfill', 110, 190);
          expect(result).toBe(parent);

          // Parent and children are unchanged
          setupCheck();
        });
      });

      describe('when start is before grand parent start', function () {
        it('propagates start changes up the parent tree and changes children offsets', function () {
          child.stop();
          setupCheck();

          var result = parent.backfill('backfill', 0, 199);
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

          var result = parent.backfill('backfill', 75, 199);
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

          var result = parent.backfill('backfill', 160, 250);
          var backfill = parent.find('backfill');
          expect(result).toBe(parent);

          // Backfill's offset is unchanged
          expect(backfill.offset).toBe(60);

          // GrandParent's end time is updated
          expect(grandParent.startedAt).toBe(50);
          expect(grandParent.stoppedAt).toBe(250);
          expect(grandParent.delta).toBe(200);
          expect(grandParent.offset).toBe(0);

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

          var result = parent.backfill('backfill', 1, 250);
          var backfill = parent.find('backfill');
          expect(result).toBe(parent);

          // Backfill's offset is updated
          expect(backfill.offset).toBe(0);

          // GrandParent's times are updated
          expect(grandParent.startedAt).toBe(1);
          expect(grandParent.stoppedAt).toBe(250);
          expect(grandParent.delta).toBe(249);
          expect(grandParent.offset).toBe(0);

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

      it('throws an exception when key is omitted', function () {
        child.stop();
        setupCheck();

        expect(function () { parent.backfill(undefined, 110, 190); }).toThrow('You must specify a key for this Sample.');
      });

      it('throws an exception when startedAt is omitted', function () {
        child.stop();
        setupCheck();

        expect(function () { parent.backfill('backfill', undefined, 190); }).toThrow('You must specify a startedAt for this Sample[backfill].');
      });

      it('throws an exception when stoppedAt is omitted', function () {
        child.stop();
        setupCheck();

        expect(function () { parent.backfill('backfill', 110, undefined); }).toThrow('You must specify a stoppedAt for this Sample[backfill].');
      });

      it('calls onError() if the parent is not stopped', function () {
        var sampleOnError = expectOnError(parent, 'Sample[grandParent.parent] must be stopped to backfill with key[backfill].');

        var result = parent.backfill('backfill', 110, 190);
        expect(result).toBe(parent);

        expect(sampleOnError).toHaveBeenCalled();
      });
    });

    describe('backfillRequest', function () {
      describe('when a key is provided', function () {
        it('searches GetEntries for a matching request to backfill and uses provided key', function () {
          mockGetTime(100, 200);
          
          var sample = new (yerf().Sample)('sample');

          var perfSpy = spyOn(window.performance, 'webkitGetEntries').andCallFake(function () {
            return [
              {
                name: 'http://www.server.com/assets/19/action'
              , startTime: 50
              , duration: 60
              }
            ];
          });
          
          sample.start().stop();
          var result = sample.backfillRequest(/action/, 'backfill');
          expect(result).toBe(sample);
          
          expect(yerf().usesModernPerf).toBe(true);
          expect(perfSpy).toHaveBeenCalled();

          var action = sample.children.backfill;
          expect(action.parent).toBe(sample);
          expect(action.key).toBe('sample.backfill');
          expect(action.startedAt).toBe(50);
          expect(action.stoppedAt).toBe(110);
          expect(action.delta).toBe(60);
        });
      });

      describe('when a key is not provided', function () {
        it('searches GetEntries for a matching request to backfill and uses inner most matching group as key', function () {
          mockGetTime(100, 200);
          
          var sample = new (yerf().Sample)('sample');

          var perfSpy = spyOn(window.performance, 'webkitGetEntries').andCallFake(function () {
            return [
              {
                name: 'http://www.server.com/assets/19/action.json'
              , startTime: 50
              , duration: 60
              }
            ];
          });
          
          sample.start().stop();
          var result = sample.backfillRequest(/(assets.*(action)).json/);
          expect(result).toBe(sample);
          
          expect(yerf().usesModernPerf).toBe(true);
          expect(perfSpy).toHaveBeenCalled();

          var action = sample.children.action;
          expect(action.parent).toBe(sample);
          expect(action.key).toBe('sample.action');
          expect(action.startedAt).toBe(50);
          expect(action.stoppedAt).toBe(110);
          expect(action.delta).toBe(60);
        });
      });

      describe('when usesModernPerf is false', function () {
        it('does not backfill', function () {
          mockGetTime(100, 200);
          
          var sample = new (yerf().Sample)('sample');
          sample.children = {};

          var perfSpy = spyOn(yerf(), 'usesModernPerf').andReturn(false);
          
          sample.start().stop();
          var result = sample.backfillRequest(/action/, 'backfill');
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

    describe('beforeReport', function () {
      it('gets called before _reportToKivi', function () {
        var beforeReportCalled = false;
        
        var sample = new (yerf().Sample)('sample');
        
        sample.beforeReport = function () {
          beforeReportCalled = true;
        }

        var beforeReportSpy = spyOn(sample, 'beforeReport').andCallThrough();
        var reportToKiviSpy = spyOn(sample, '_reportToKivi').andCallFake(function () {
          expect(beforeReportCalled).toBe(true);
        });
        
        sample.start().stop();
        
        expect(beforeReportSpy).toHaveBeenCalled();
        expect(reportToKiviSpy).toHaveBeenCalled();
      });
    });
  });

  describe('events', function () {
    it('calls subscribers when an event is fired', function () {
      var sample = new (yerf().Sample)('1');
      var fooSub1 = jasmine.createSpy();
      var fooSub2 = jasmine.createSpy();
      var barSub = jasmine.createSpy();

      yerf().on('namespace.foo', 'start', fooSub1);
      yerf().on('namespace.foo', 'start', fooSub2);
      yerf().on('namespace.bar', 'start', barSub);

      yerf().trigger('namespace.foo', 'start', sample);
      
      expect(fooSub1).toHaveBeenCalledWith(sample);
      expect(fooSub2).toHaveBeenCalledWith(sample);
      expect(barSub).not.toHaveBeenCalled();
    });

    it('does not call subscribers on a different event', function () {
      var sample = new (yerf().Sample)('1');
      var fooSub1 = jasmine.createSpy();
      var fooSub2 = jasmine.createSpy();

      yerf().on('namespace.foo', 'start', fooSub1);
      yerf().on('namespace.foo', 'stop', fooSub2);

      yerf().trigger('namespace.foo', 'start', sample);
      
      expect(fooSub1).toHaveBeenCalledWith(sample);
      expect(fooSub2).not.toHaveBeenCalled();
    });
  });

  describe('on()', function () {
    it('throws an exception if no fullKey is passed in', function () {
      var sub = jasmine.createSpy();
      expect(function(){ yerf().on(undefined, 'event', sub); }).toThrow('You must specify a fullKey for yerf().on().');
    });

    it('throws an exception if no event is passed in', function () {
      var sub = jasmine.createSpy();
      expect(function(){ yerf().on('fullKey', undefined, sub); }).toThrow('You must specify an event for yerf().on().');
    });

    it('throws an exception if no subscriber is passed in', function () {
      expect(function(){ yerf().on('fullKey', 'event', undefined); }).toThrow('You must specify a subscriber function for yerf().on().');
    });

    it('throws an exception if subscriber is not a function', function () {
      expect(function(){ yerf().on('fullKey', 'event', {}); }).toThrow('You must specify a subscriber function for yerf().on().');
    });
  });

  describe('trigger()', function () {
    it('throws an exception if no fullKey is passed in', function () {
      var sub = jasmine.createSpy();
      expect(function(){ yerf().trigger(undefined, 'event', {}); }).toThrow('You must specify a fullKey for yerf().trigger().');
    });

    it('throws an exception if no event is passed in', function () {
      var sub = jasmine.createSpy();
      expect(function(){ yerf().trigger('fullKey', undefined, {}); }).toThrow('You must specify an event for yerf().trigger().');
    });

    it('does not throw an exception if no object is passed in', function () {
      expect(function(){ yerf().trigger('fullKey', 'event', undefined); }).not.toThrow();
    });
  });

  describe('yerf()', function () {
    describe('when a fullKey is passed in', function () {
      it('returns the sample if it exists', function () {
        var sample = new (yerf().Sample)('test');
        expect(yerf('test')).toBe(sample);
      });

      it('returns undefined if it does not exist', function () {
        var sample = new (yerf().Sample)('test');
        expect(yerf('not_test')).toBe(undefined);
      });
    });

    describe('when a fullKey is not passed in', function () {
      it('returns the yerf object', function () {
        var obj = yerf();
        expect(typeof obj).toBe('object');
        expect(typeof obj.create).toBe('function');
        expect(typeof obj.start).toBe('function');
        expect(typeof obj.Sample).toBe('function');
      });
    });
  });

  describe('find()', function () {
    describe('when a fullKey is passed in', function () {
      it('returns the sample if it exists', function () {
        var sample = new (yerf().Sample)('test');
        expect(yerf().find('test')).toBe(sample);
      });

      it('returns undefined if it does not exist', function () {
        var sample = new (yerf().Sample)('test');
        expect(yerf().find('not_test')).toBe(undefined);
      });
    });
  });

  describe('create()', function () {
    describe('when a fullKey is passed in', function () {
      it('calls onError() if the sample already exists', function () {
        var sample = new (yerf().Sample)('test');
        var sampleOnError = expectOnError(yerf().Sample.prototype, 'Sample[test] already exists.');

        expect(yerf().create('test')).toBe(sample);
        expect(sampleOnError).toHaveBeenCalled();
      });

      it('returns a new sample if the sample does not exist', function () {
        var sample = yerf().create('test');
        expect(sample.state).toBe('created');
      });
    });

    describe('when a fullKey is not passed in', function () {
      it('throws an exception', function () {
        expect(function() { yerf().create(); }).toThrow('You must specify a key for this Sample.');
      });
    });
  });

  describe('start()', function () {
    describe('when a fullKey is passed in', function () {
      it('calls onError() if the sample already exists', function () {
        var sample = new (yerf().Sample)('test');

        var sampleOnError = expectOnError(yerf().Sample.prototype, 'Sample[test] already exists.');
        expect(yerf().start('test')).toBe(sample);
        expect(sampleOnError).toHaveBeenCalled();
      });

      it('returns a new sample if the sample does not exist and starts it', function () {
        var sample = yerf().start('test');
        expect(sample.state).toBe('started');
      });
    });

    describe('when a fullKey is not passed in', function () {
      it('throws an exception', function () {
        expect(function() { yerf().start(); }).toThrow('You must specify a key for this Sample.');
      });
    });
  });

  describe('clear()', function () {
    it('completely resets the state of yerf() and forgets any measurements taken', function () {
     
      yerf().start('test');
      yerf('test').stop();

      var spy = jasmine.createSpy();
      yerf().on('key', 'event', spy);

      yerf().clear();

      expect(yerf('test')).toBe(undefined);

      yerf().trigger('key', 'event', {});

      expect(spy).not.toHaveBeenCalled();
    });
  });    
});