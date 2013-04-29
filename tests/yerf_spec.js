describe('yerf()', function () {

  beforeEach(function () {
    kivi.clear();
    yerf().clear(); 
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
        var onErrorSpy = expectOnError('Sample[test] already exists.');

        expect(yerf().create('test')).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
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

        var onErrorSpy = expectOnError('Sample[test] already exists.');
        expect(yerf().start('test')).toBe(sample);
        expect(onErrorSpy).toHaveBeenCalled();
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

  describe('getEntries()', function () {
    var oldPerformance, oldHasEntries;
    var entries = [1, 2, 3];
    
    beforeEach(function () {
      oldPerformance = window.performance;
      oldHasEntries = yerf().hasEntries;
      // Firefox won't let you replace window.performance,
      // so this tests fails on Firefox.
      window.performance = {};
      yerf().hasEntries = true;
    });

    afterEach(function () {
      window.performance = oldPerformance;
      yerf().hasEntries = oldHasEntries;
    });

    describe('when performance.webkitGetEntries() is present', function () {
      it('returns an entry list', function () {
        window.performance.webkitGetEntries = function () {};
        var perfSpy = spyOn(window.performance, 'webkitGetEntries').andReturn(entries);

        expect(yerf().getEntries()).toBe(entries);
        expect(perfSpy).toHaveBeenCalled();
      });
    });

    describe('when performance.getEntries() is present', function () {
      it('returns an entry list', function () {
        window.performance.getEntries = function () {};
        var perfSpy = spyOn(window.performance, 'getEntries').andReturn(entries);

        expect(yerf().getEntries()).toBe(entries);
        expect(perfSpy).toHaveBeenCalled();
      });
    });

    describe('when no entry method is present', function () {
      it('returns an empty list', function () {
        window.performance = {};

        expect(yerf().getEntries()).toEqual([]);
      });
    });
  });

  describe('Tests that change the epoch', function () {
    var oldHasNow;
    var oldModernBoot;
    var oldOldBoot;

    beforeEach(function () {
      oldHasNow = yerf().hasNow;
      oldModernBoot = yerf().modernBoot;
      oldOldBoot = yerf().oldBoot;
    });

    afterEach(function () {
      yerf().hasNow = oldHasNow;
      yerf().modernBoot = oldModernBoot;
      yerf().oldBoot = oldOldBoot;
    });

    describe('getTime()', function () {
      describe('when using modern perf', function () {
        it('returns the time since navigation start', function () {
          yerf().hasNow = true;
          mockNow(100);

          expect(yerf().getTime()).toBe(100);
          expect(nowSpy.calls.length).toBe(1);
        });
      });

      describe('when using old perf', function () {
        it('returns the time since navigation start', function () {
          yerf().hasNow = false;
          yerf().oldBoot = 100;
          mockDate(300);
            
          expect(yerf().getTime()).toBe(200);
          expect(dateSpy.calls.length).toBe(1);
        });
      });
    });

    describe('normTime()', function () {
      describe('when using modern perf', function () {
        it('converts unix time to yerf time', function () {
          yerf().hasNow = true;
          yerf().modernBoot = 100;
          yerf().oldBoot = 1000000;

          expect(yerf().normTime(1000200)).toBe(300);
        });

        it('forces negative times to zero', function () {
          yerf().hasNow = true;
          yerf().modernBoot = 100;
          yerf().oldBoot = 1000000;

          expect(yerf().normTime(1)).toBe(0);
        });
      });

      describe('when using old perf', function () {
        it('converts unix time to yerf time', function () {
          yerf().hasNow = false;
          yerf().oldBoot = 1000000;
          
          expect(yerf().normTime(1000200)).toBe(200);
        });

        it('forces negative times to zero', function () {
          yerf().hasNow = false;
          yerf().oldBoot = 1000000;
          
          expect(yerf().normTime(1)).toBe(0);
        });
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
      var sample = new (yerf().Sample)('2');
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
});