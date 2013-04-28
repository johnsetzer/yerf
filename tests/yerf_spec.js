var expectOnError = function (sample, expectedErrorMsg) {
  var sampleOnError = spyOn(sample, 'onError').andCallFake(function (error) {
    expect(error.message).toBe(expectedErrorMsg);
  });
  return sampleOnError;
}

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

  describe('Tests that change the epoch', function () {
    var oldUsesModernPerf;
    var oldModernBoot;
    var oldOldBoot;

    beforeEach(function () {
      oldUsesModernPerf = yerf().usesModernPerf;
      oldModernBoot = yerf().modernBoot;
      oldOldBoot = yerf().oldBoot;
    });

    afterEach(function () {
      yerf().usesModernPerf = oldUsesModernPerf;
      yerf().modernBoot = oldModernBoot;
      yerf().oldBoot = oldOldBoot;
    });

    describe('getTime()', function () {
      describe('when using modern perf', function () {
        it('returns the time since navigation start', function () {
          yerf().usesModernPerf = true;
          mockNow(100);
          
          expect(yerf().getTime()).toBe(100);
          expect(nowSpy.calls.length).toBe(1);
        });
      });

      describe('when using old perf', function () {
        it('returns the time since navigation start', function () {
          yerf().usesModernPerf = false;
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
          yerf().usesModernPerf = true;
          yerf().modernBoot = 100;
          yerf().oldBoot = 1000000;

          expect(yerf().normTime(1000200)).toBe(100);
        });
      });

      describe('when using old perf', function () {
        it('converts unix time to yerf time', function () {
          yerf().usesModernPerf = false;
          yerf().oldBoot = 1000000;
          
          expect(yerf().normTime(1000200)).toBe(200);
        });
      });
    });
  });
});