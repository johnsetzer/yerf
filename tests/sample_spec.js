describe('yerf().Sample', function () {  
  beforeEach(function () {
    kivi.clear();
    yerf().clear(); 
  });

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
        var onErrorSpy = expectOnError('Sample[test] already exists.');
        var sample = new (yerf().Sample)('test');
        expect(onErrorSpy).not.toHaveBeenCalled();

        expect(new (yerf().Sample)('test')).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
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
        expect(sample.startedAt).toBe(1);
      });

      it('sets offset to startedAt on root nodes', function () {
        mockGetTime(1);
        var sample = new (yerf().Sample)('test');
        sample.start();
        expect(sample.startedAt).toBe(1);
        expect(sample.offset).toBe(1);
      });

      it('changes state to started', function () {
        var sample = new (yerf().Sample)('test');
        sample.start();
        expect(sample.state).toBe('started');
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
          var parent = new (yerf().Sample)('parent');
          parent.start();
          parent.start('test');
          var sample = yerf('parent.test');
          expect(sample.offset).toBe(2); // 3 - 1 = 2
        });
      });

      describe('when the sample is already started and is started again', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var onErrorSpy = expectOnError('Sample[test] has already started.');
          var sub = jasmine.createSpy();
          sample.on('start', sub);
          
          sample.start();
          sample.start();
          expect(onErrorSpy).toHaveBeenCalled();
          expect(sub.calls.length).toBe(1);
        });
      });
    });

    describe('when there are arguments', function () {
      it('starts children with the given names', function () {
        var sample = new (yerf().Sample)('test');
        sample.waterfall('dep1', 'dep2', 'dep3');

        var dep1Sub = jasmine.createSpy();
        yerf().on('test.dep1', 'start', dep1Sub);
        var dep2Sub = jasmine.createSpy();
        yerf().on('test.dep2', 'start', dep2Sub);
        var dep3Sub = jasmine.createSpy();
        yerf().on('test.dep3', 'start', dep3Sub);
        
        sample.start('dep1', 'dep2');
        
        expect(yerf('test.dep1').state).toBe('started');
        expect(yerf('test.dep2').state).toBe('started');
        expect(yerf('test.dep3')).toBe(undefined);

        expect(sample.children.dep1).toBe(yerf('test.dep1'));
        expect(sample.children.dep2).toBe(yerf('test.dep2'));
        expect(sample.children.dep3).toBe(undefined);

        expect(dep1Sub).toHaveBeenCalledWith(yerf('test.dep1'));
        expect(dep2Sub).toHaveBeenCalledWith(yerf('test.dep2'));
        expect(dep3Sub).not.toHaveBeenCalled();
      });

      it('onErrors if you start an already started children', function () {
        mockGetTime(1, 2, 3);
        var sample = new (yerf().Sample)('test');

        var dep1Sub = jasmine.createSpy();
        yerf().on('test.dep1', 'start', dep1Sub);
        var onErrorSpy = expectOnError('Sample[test.dep1] has already started.');

        // Start once
        sample.start('dep1');
        var dep1 = yerf('test.dep1');
        expect(dep1Sub).toHaveBeenCalledWith(dep1);
        expect(onErrorSpy).not.toHaveBeenCalled();
        
        // Restart
        sample.start('dep1');
        
        expect(yerf('test.dep1').state).toBe('started');
        expect(dep1Sub.callCount).toBe(1);

        expect(sample.children.dep1).toBe(dep1);
        expect(dep1.parent).toBe(sample);
        expect(dep1.startedAt).toBe(2);
        expect(dep1.offset).toBe(1);
        expect(onErrorSpy).toHaveBeenCalled();
      });

      it('starts and add events to the waterfall list if the event is not on the waterfall list', function () {
        var sample = new (yerf().Sample)('test');
        sample.waterfall('dep1', 'dep2');
        sample.start('dep1', 'not_waiting_for');

        // Check starts
        expect(yerf('test.dep1').state).toBe('started');
        expect(yerf('test.dep2')).toBe(undefined);
        expect(yerf('test.not_waiting_for').state).toBe('started');

        // Check waterfall list
        expect(sample.waitingFor.dep1).toBe(true);
        expect(sample.waitingFor.dep2).toBe(true);
        expect(sample.waitingFor.not_waiting_for).toBe(true);
      });

      it('returns the Sample so methods can be chained', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.start('dep1', 'dep2')).toBe(sample);
      });
    });
  });

  describe('stop()', function () {
    describe('when there are no arguments', function () {
      it('sets stoppedAt and delta', function () {
        mockGetTime(1, 3);
        var sample = new (yerf().Sample)('test');
        sample.start().stop();
        expect(sample.stoppedAt).toBe(3);
        expect(sample.delta).toBe(2);
      });

      it('changes state to stopped', function () {
        var sample = new (yerf().Sample)('test');
        sample.start().stop();
        expect(sample.state).toBe('stopped');
      });

      it('triggers stop event', function () {
        var sample = new (yerf().Sample)('test');
        var sub = jasmine.createSpy();
        sample.on('stop', sub);
        sample.start().stop();
        expect(sub).toHaveBeenCalledWith(sample);
      });

      it('passes delta and offset to kivi.set()', function () {
        mockGetTime(1, 3);
        var sample = new (yerf().Sample)('test');
        var kiviSpy =  spyOn(kivi, 'set');
        sample.start().stop();
        expect(kiviSpy.calls.length).toBe(2);
        expect(kiviSpy).toHaveBeenCalledWith('yerf.delta.test', 2);
        expect(kiviSpy).toHaveBeenCalledWith('yerf.offset.test', 1);
      });

      it('returns the Sample so methods can be chained', function () {
        var sample = new (yerf().Sample)('test');
        expect(sample.start().stop()).toBe(sample);
      });

      describe('when the sample is already stopped and is stopped again', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var onErrorSpy = expectOnError('Sample[test] has already stopped.');
          sample.start();
          sample.stop();
          sample.stop();
          expect(onErrorSpy).toHaveBeenCalled();
        });
      });

      describe('when the sample is stopped before it is started', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var onErrorSpy = expectOnError('Sample[test] has not been started.');
          expect(sample.stop()).toBe(sample);
          expect(onErrorSpy).toHaveBeenCalled();
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

        expect(sample.children.dep1).toBe(yerf('test.dep1'));
        expect(sample.children.dep2).toBe(yerf('test.dep2'));
      });

      it('calls onError() if you try to stop an event that is not a child', function () {
        var sample = new (yerf().Sample)('test');
        sample.waterfall('dep1', 'dep2');
        sample.start('dep1');

        var onErrorSpy = expectOnError('Cannot stop a child[dep2] that is not attached.');
        expect(sample.stop('dep2')).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
      });
    });

    describe('when a whole bunch of errors are chained together', function () {
      it('calls onError() for each error', function () {
        var sample = new (yerf().Sample)('test');
        var onErrorSpy = spyOn(yerf(), 'onError');

        sample.start().start().waterfall('dep1').stop('wrong').stop();

        expect(onErrorSpy.calls.length).toBe(3);
        expect(onErrorSpy.calls[0].args[0].message).toBe('Sample[test] has already started.');
        expect(onErrorSpy.calls[1].args[0].message).toBe('Cannot stop a child[wrong] that is not attached.');
        expect(onErrorSpy.calls[2].args[0].message).toBe('Sample[test] is a waterfall and cannot be manually stopped.');
      });
    });

    it('reports rounded values to kivi when finished', function () {
      mockGetTime(1.1, 10.2); // Not all browsers return integers for times
      var kiviSpy =  spyOn(kivi, 'set');

      var sample = new (yerf().Sample)('test');
      sample.start().stop();

      expect(kiviSpy.calls[0].args[0]).toBe('yerf.delta.test');
      expect(kiviSpy.calls[0].args[1]).toBe(9);
      expect(kiviSpy.calls[1].args[0]).toBe('yerf.offset.test');
      expect(kiviSpy.calls[1].args[1]).toBe(1);
    });
  });

  describe('waterfall()', function () {

    describe('when it is called without args', function () {
      describe('and doesn\'t have any existing dependencies', function () {
        it('it can be stopped', function () {
          var sample = new (yerf().Sample)('test');
          var onErrorSpy = expectOnError('Should not be called by test.');
          expect(sample.waterfall()).toBe(sample);
          expect(sample.stop()).toBe(sample);
          expect(onErrorSpy).not.toHaveBeenCalled();
        });
      });

      describe('and does have existing dependencies', function () {
        it('calls onError()', function () {
          var sample = new (yerf().Sample)('test');
          var onErrorSpy = expectOnError('Sample[test] is a waterfall and cannot be manually stopped.');

          sample.waterfall('dependency');
          sample.waterfall();
          expect(sample.stop()).toBe(sample);
          expect(onErrorSpy).toHaveBeenCalled();
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
        var onErrorSpy = expectOnError('Sample[test] has already stopped.');
        sample.state = 'stopped';

        expect(sample.waterfall()).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
      });
    });

    it('calling it again adds more dependencies', function () {
      var sample = new (yerf().Sample)('test');

      sample.waterfall('dep1', 'dep2');
      expect(sample.waitingFor).toEqual({dep1: true, dep2: true});
      
      sample.waterfall('dep3');
      expect(sample.waitingFor).toEqual({dep1: true, dep2: true, dep3: true});
    });

    it('does not allow you to wait on the same event more than once', function () {
      mockGetTime(1, 2, 3, 4, 5);
      var sample = new (yerf().Sample)('test');
      var stopSpy = spyOn(sample, '_checkStop');

      sample.waterfall('dep1', 'repeat', 'repeat');
      expect(sample.waitingFor).toEqual({dep1: true, repeat: true});
      
      sample.waterfall('dep1');
      expect(sample.waitingFor).toEqual({dep1: true, repeat: true});

      // Make sure _checkStop is only called once per dependency
      sample.start('dep1');
      sample.start('repeat');
      yerf('test.dep1').stop();
      yerf('test.repeat').stop();

      expect(stopSpy.callCount).toBe(2);
      expect(stopSpy).toHaveBeenCalledWith('dep1', 4);
      expect(stopSpy).toHaveBeenCalledWith('repeat', 5);
    });

    describe('when it is called with args and is stopped', function () {
      it('calls onError()', function () {
        var sample = new (yerf().Sample)('test');
        var onErrorSpy = expectOnError('Sample[test] is a waterfall and cannot be manually stopped.');

        sample.waterfall('dep1', 'dep2');
        expect(sample.stop()).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
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
      expect(kiviSpy.calls[1].args[1]).toBe(1);

      expect(kiviSpy.calls[2].args[0]).toBe('yerf.delta.test.dep1');
      expect(kiviSpy.calls[2].args[1]).toBe(10);
      expect(kiviSpy.calls[3].args[0]).toBe('yerf.offset.test.dep1');
      expect(kiviSpy.calls[3].args[1]).toBe(9);

      expect(kiviSpy.calls[4].args[0]).toBe('yerf.delta.test.dep2');
      expect(kiviSpy.calls[4].args[1]).toBe(20);
      expect(kiviSpy.calls[5].args[0]).toBe('yerf.offset.test.dep2');
      expect(kiviSpy.calls[5].args[1]).toBe(29);
    });

    it('calls onError() if one of its dependencies has already started', function () {
      var sample = new (yerf().Sample)('test');
      var dep1 = new (yerf().Sample)('test.dep1').start();
      var onErrorSpy = expectOnError('Child[test.dep1] has already started.');
      
      expect(sample.waterfall('dep1', 'dep2')).toBe(sample);
      expect(onErrorSpy).toHaveBeenCalled();
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

      expect(root.offset).toBe(1);
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

  describe('beforeReport', function () {
    it('gets called before _reportToKivi', function () {
      var beforeReportCalled = false;
      
      var sample = new (yerf().Sample)('sample');
      
      sample.beforeReport = function () {
        beforeReportCalled = true;
      };

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