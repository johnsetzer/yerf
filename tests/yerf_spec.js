describe('yerf()', function () {

  // Stub the Date Constructor
  var nextDates = []; // Array of integers
  var RealDate = Date;
  Date = function(){
    if (nextDates.length > 0) {
      var time = nextDates.shift();
      //console.log('Date returning', time);
      return new RealDate(time);
    } else {
      //console.log('Date returning RealDate.');
      return new RealDate();
    }
  };

  var expectSample = function (sample, key, startedAt, stoppedAt, delta) {
    expect(sample.key).toBe(key);
    expect(sample.startedAt.getTime()).toBe(startedAt);
    expect(sample.stoppedAt.getTime()).toBe(stoppedAt);
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
    yerf().clear(); 
  });

  describe('Sample', function () {
    describe('new()', function () {
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
          nextDates = [1];
          var sample = new (yerf().Sample)('test');
          sample.start();
          expect(sample.startedAt.getTime()).toEqual(1);
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
            nextDates = [1, 3];
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
          nextDates = [1, 3];
          var sample = new (yerf().Sample)('test');
          sample.start().stop();
          expect(sample.stoppedAt.getTime()).toEqual(3);
          expect(sample.delta).toEqual(2);
        });

        it('changes state to stopped', function () {
          var sample = new (yerf().Sample)('test');
          sample.start().stop();
          expect(sample.state).toEqual('reportable');
        });

        it('triggers stop event', function () {
          var sample = new (yerf().Sample)('test');
          var sub = jasmine.createSpy();
          sample.on('stop', sub);
          sample.start().stop();
          expect(sub).toHaveBeenCalledWith(sample);
        });

        it('returns the Sample so methods can be chained', function () {
          var sample = new (yerf().Sample)('test');
          expect(sample.start().stop()).toBe(sample);
        });

        // TODO hand yerf() and moving to completed samples

        // TODO fix this.  Should be in yerf() but not in completedSamples
        // it('adds this sample to _allSamples and _activeSamples', function () {
        //   var sample = new (yerf().Sample)('test');
        //   sample.start();
        //   expect(_allSamples[sample.fullKey()]).toBe(sample);
        //   expect(_allSamples[sample.fullKey()]).toBe(sample);
        // });

        describe('when the sample is already stopped and is stopped again', function () {
          it('calls onError()', function () {
            var sample = new (yerf().Sample)('test');
            var sampleOnError = expectOnError(sample, 'Sample[test] has already stopped.');
            sample.start().stop();
            expect(sample.stop()).toBe(sample);
            expect(sampleOnError).toHaveBeenCalled();
          });
        });

        describe('when the sample is already stopped before it is started', function () {
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

        expect(sample.state).toBe('reportable');
        expect(dep1.state).toBe('reportable');
        expect(dep2.state).toBe('reportable');
      });

      it('sets the offsets of its children', function () {
        nextDates = [10, 20, 30];
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start();
        var dep2 = new (yerf().Sample)('test.dep2').start();
        
        expect(dep1.offset).toBe(10);
        expect(dep2.offset).toBe(20);
      });

      it('only moves children to reportable state when root event is stopped', function () {
        var sample = new (yerf().Sample)('test');

        sample.waterfall('dep1', 'dep2');
        var dep1 = new (yerf().Sample)('test.dep1').start().stop();
        var dep2 = new (yerf().Sample)('test.dep2').start();

        expect(sample.state).toBe('started');
        expect(dep1.state).toBe('stopped');
        expect(dep2.state).toBe('started');

        dep2.stop();

        expect(sample.state).toBe('reportable');
        expect(dep1.state).toBe('reportable');
        expect(dep2.state).toBe('reportable');

      });

      it('calls onError() if one of its dependencies is already started', function () {
        var sample = new (yerf().Sample)('test');
        var dep1 = new (yerf().Sample)('test.dep1').start();
        var sampleOnError = expectOnError(sample, 'Child[test.dep1] is already started.');
        
        expect(sample.waterfall('dep1', 'dep2')).toBe(sample);
        expect(sampleOnError).toHaveBeenCalled();
      });

      it('handles three levels of nesting', function () {
        nextDates = [1, 100, 100, 150, 160, 200, 200, 500, 500, 550, 560, 600, 600, 600];
        var root = yerf().new('root').waterfall('dep1', 'dep2');
        var dep1 = yerf().new('root.dep1').waterfall('dep1', 'dep2').start('dep1', 'dep2');
        var dep1dep1 = yerf('root.dep1.dep1').stop();
        var dep1dep2 = yerf('root.dep1.dep2').stop();
        var dep2 = yerf().new('root.dep2').waterfall('dep1', 'dep2').start('dep1', 'dep2');
        var dep2dep1 = yerf('root.dep2.dep1').stop();
        var dep2dep2 = yerf('root.dep2.dep2').stop();

        expect(root.offset).toBe(0);
        expect(dep1.offset).toBe(99);
        expect(dep1dep1.offset).toBe(0);
        expect(dep1dep2.offset).toBe(50);
        expect(dep2.offset).toBe(499);
        expect(dep2dep1.offset).toBe(0);
        expect(dep2dep2.offset).toBe(50);

        expect(root.startedAt.getTime()).toBe(1);
        expect(dep1.startedAt.getTime()).toBe(100);
        expect(dep1dep1.startedAt.getTime()).toBe(100);
        expect(dep1dep2.startedAt.getTime()).toBe(150);
        expect(dep2.startedAt.getTime()).toBe(500);
        expect(dep2dep1.startedAt.getTime()).toBe(500);
        expect(dep2dep2.startedAt.getTime()).toBe(550);

        expect(root.stoppedAt.getTime()).toBe(600);
        expect(dep1.stoppedAt.getTime()).toBe(200);
        expect(dep1dep1.stoppedAt.getTime()).toBe(160);
        expect(dep1dep2.stoppedAt.getTime()).toBe(200);
        expect(dep2.stoppedAt.getTime()).toBe(600);
        expect(dep2dep1.stoppedAt.getTime()).toBe(560);
        expect(dep2dep2.stoppedAt.getTime()).toBe(600);

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
      expect(function(){ yerf().on('fullKey', 'event', undefined); }).toThrow('You must specify a subscriber for yerf().on().');
    });

    it('throws an exception if subscriber is not a function', function () {
      expect(function(){ yerf().on('fullKey', 'event', {}); }).toThrow('Subscriber must be a function.');
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
        expect(typeof obj.new).toBe('function');
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

  describe('new()', function () {
    describe('when a fullKey is passed in', function () {
      it('calls onError() if the sample already exists', function () {
        var sample = new (yerf().Sample)('test');
        var sampleOnError = expectOnError(yerf().Sample.prototype, 'Sample[test] already exists.');

        expect(yerf().new('test')).toBe(sample);
        expect(sampleOnError).toHaveBeenCalled();
      });

      it('returns a new sample if the sample does not exist', function () {
        var sample = yerf().new('test');
        expect(sample.state).toBe('created');
      });
    });

    describe('when a fullKey is not passed in', function () {
      it('throws an exception', function () {
        expect(function() { yerf().new(); }).toThrow('You must specify a key for this Sample.');
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

  describe('postData', function () {
    beforeEach(function () {
      nextDates = [1, 2, 11, 20, 30, 40, 40, 50, 60];

        var started = yerf().start('started');               // 1
        var stopped = yerf().start('stopped').stop();        // 2, 11
        var root = yerf().start('root').waterfall('dep1');   // 20, 40
        var dep1 = yerf().start('root.dep1').stop();         // 30, 40
        var reported = yerf().start('reported').stop();      // 50, 60
        reported.state = 'reported';
    });

    describe('when includeReported is true', function () {
      it('creates and array of samples to jsonify', function () {
        var expected = [
          { key: 'stopped', val: 9 }
        , { key: 'root', val: 20 }
        , { key: 'offset.root', val: 0 }
        , { key: 'root.dep1', val: 10 }
        , { key: 'offset.root.dep1', val: 10 }
        , { key: 'reported', val: 10 }
        ];
        expect(yerf().postData(true)).toEqual(expected);
      });
    });

    describe('when includeReported is false', function () {
      it('creates and array of samples to jsonify', function () {
        var expected = [
          { key: 'stopped', val: 9 }
        , { key: 'root', val: 20 }
        , { key: 'offset.root', val: 0 }
        , { key: 'root.dep1', val: 10 }
        , { key: 'offset.root.dep1', val: 10 }
        ];
        expect(yerf().postData(false)).toEqual(expected);
      });
    });
  });

  describe('post()', function () {

    var postSuccessSpy, jquery, sample, ajaxSpy;

    beforeEach(function () {
      sample = yerf().start('test').stop();
      postSuccessSpy = spyOn(yerf(), '_postSuccess').andCallThrough();
      jquery = {ajax: function (params) {
        params.success({});
      }};
      ajaxSpy = spyOn(jquery, 'ajax').andCallThrough();
      yerf().config.$ = jquery;
      yerf().config.postUrl = 'http://localhost'

    });
    
    describe('when JQuery and post URL are set and there are samples to report', function () {
      it('reports the samples and marks them reported', function () {
        yerf().post();
        
        expect(ajaxSpy).toHaveBeenCalled();
        expect(postSuccessSpy).toHaveBeenCalled();
        
        var params = ajaxSpy.mostRecentCall.args[0];
        expect(params.url).toBe('http://localhost');
        
        expect(sample.state).toBe('reported');
      });
    });

    describe('when JQuery and post URL are set and there are not samples to report', function () {
      it('does not report report the samples', function () {
        yerf('test').state = 'reported';
        yerf().post();
        
        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(postSuccessSpy).not.toHaveBeenCalled();
      });
    });

    describe('when JQuery is not set and post URL is set and there are samples to report', function () {
      it('does not report report the samples', function () {
        yerf().config.$ = undefined;
        expect(function () { yerf().post(); }).toThrow('You need to set yerf.config.$');
        
        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(postSuccessSpy).not.toHaveBeenCalled();
        
        expect(sample.state).toBe('reportable');
      });
    });

    describe('when JQuery is set and post URL is not set and there are samples to report', function () {
      it('does not report report the samples', function () {
        yerf().config.postUrl = undefined;
        expect(function () { yerf().post(); }).toThrow('You need to set yerf.config.postUrl');
        
        expect(ajaxSpy).not.toHaveBeenCalled();
        expect(postSuccessSpy).not.toHaveBeenCalled();
        
        expect(sample.state).toBe('reportable');
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

  describe('enablePost()', function () {
    beforeEach(function () {
      jasmine.Clock.useMock();
    });

    afterEach(function () {
      yerf().disablePost();
    });

    describe('when recurringInterval is set', function () {
      

      it('calls post() at each member of the startingIntervalSeries and then uses the recurringInterval', function () {
        var spy = spyOn(yerf(), 'post');
        yerf().enablePost([100, 200], 300);
        expect(spy.callCount).toBe(0);
        jasmine.Clock.tick(105);
        expect(spy.callCount).toBe(1);
        jasmine.Clock.tick(100);
        expect(spy.callCount).toBe(1);
        jasmine.Clock.tick(105);
        expect(spy.callCount).toBe(2);
        jasmine.Clock.tick(300);
        expect(spy.callCount).toBe(3);
        jasmine.Clock.tick(300);
        expect(spy.callCount).toBe(4);
      });
    });

    describe('when recurringInterval is not set', function () {

      it('calls post() at each member of the startingIntervalSeries and then stops', function () {
        var spy = spyOn(yerf(), 'post');
        yerf().enablePost([100, 200]);
        expect(spy.callCount).toBe(0);
        jasmine.Clock.tick(105);
        expect(spy.callCount).toBe(1);
        jasmine.Clock.tick(100);
        expect(spy.callCount).toBe(1);
        jasmine.Clock.tick(105);
        expect(spy.callCount).toBe(2);
        jasmine.Clock.tick(300);
        expect(spy.callCount).toBe(2);
        jasmine.Clock.tick(300);
        expect(spy.callCount).toBe(2);
      });
    });

    describe('when only recurringInterval is set', function () {

      it('calls post() on recurringInterval', function () {
        var spy = spyOn(yerf(), 'post');
        yerf().enablePost(null, 200);
        expect(spy.callCount).toBe(0);
        jasmine.Clock.tick(200);
        expect(spy.callCount).toBe(1);
        jasmine.Clock.tick(200);
        expect(spy.callCount).toBe(2);
        jasmine.Clock.tick(205);
        expect(spy.callCount).toBe(3);
        jasmine.Clock.tick(200);
        expect(spy.callCount).toBe(4);
      });
    });
  });

  describe('disablePost()', function () {
    describe('when recurringInterval is set', function () {
      beforeEach(function () {
        jasmine.Clock.useMock();
      });

      it('stops interval calls to post', function () {
        var spy = spyOn(yerf(), 'post');
        yerf().enablePost(null, 300);
        expect(spy.callCount).toBe(0);
        jasmine.Clock.tick(305);
        expect(spy.callCount).toBe(1);
        yerf().disablePost();
        jasmine.Clock.tick(305);
        expect(spy.callCount).toBe(1);
      });

      it('stops series calls to post', function () {
        var spy = spyOn(yerf(), 'post');
        yerf().enablePost([300, 300, 300, 300]);
        expect(spy.callCount).toBe(0);
        jasmine.Clock.tick(305);
        expect(spy.callCount).toBe(1);
        yerf().disablePost();
        jasmine.Clock.tick(305);
        expect(spy.callCount).toBe(1);
      });
    });
  });    
});