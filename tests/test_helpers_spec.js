describe('mockGetTime', function () {
  it('makes yerf().getTime() return the fake time arguments until there are none left', function () {
    mockGetTime(100, 200);
    expect(yerf().getTime()).toBe(100);
    expect(yerf().getTime()).toBe(200);
    expect(yerf().getTime()).toBe(-1111);
    expect(getTimeSpy.calls.length).toBe(3);
  });
});

describe('mockNow', function () {
  it('makes performance.now() return the fake time arguments until there are none left', function () {
    mockNow(100, 200);
    expect(performance.now()).toBe(100);
    expect(performance.now()).toBe(200);
    expect(performance.now()).toBe(-1111);
    expect(nowSpy.calls.length).toBe(3);
  });
});

describe('mockDate', function () {
  it('makes Date.getTime() return the fake time arguments until there are none left', function () {
    mockDate(100, 200);
    expect(new Date().getTime()).toBe(100);
    expect(new Date().getTime()).toBe(200);
    expect(new Date().getTime()).toBe(-1111);
    expect(dateSpy.calls.length).toBe(3);
  });
});