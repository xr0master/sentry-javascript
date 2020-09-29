/**
 * NOTE: instrument.ts relies on it's local module state, so we need to make sure
 * that every test is isolated. ES6 syntax doesn't play nice with that feature in Jest.
 */

describe('addInstrumentationHandler', () => {
  let calls: number;
  let logMock: jest.Mock;

  beforeEach(() => {
    calls = 0;
    logMock = jest.fn();
    global.console = ({
      log: logMock,
    } as unknown) as Console;
  });

  test('runs registered callback for a given API', () => {
    jest.isolateModules(() => {
      const instrument = require('../src/instrument');

      global.console.log('beep');

      expect(calls).toBe(0);
      expect(logMock).toHaveBeenCalledTimes(1);

      instrument.addInstrumentationHandler({
        type: 'console',
        callback: () => {
          calls += 1;
        },
      });

      global.console.log('boop');

      expect(calls).toBe(1);
      expect(logMock).toHaveBeenCalledTimes(2);
    });
  });

  test('can register multiple callbacks for a given API', () => {
    jest.isolateModules(() => {
      const instrument = require('../src/instrument');

      global.console.log('beep');

      expect(calls).toBe(0);
      expect(logMock).toHaveBeenCalledTimes(1);

      instrument.addInstrumentationHandler({
        type: 'console',
        callback: () => {
          calls += 1;
        },
      });

      instrument.addInstrumentationHandler({
        type: 'console',
        callback: () => {
          calls += 1;
        },
      });

      global.console.log('boop');

      expect(calls).toBe(2);
      expect(logMock).toHaveBeenCalledTimes(2);
    });
  });

  test('skip duplicated callbacks that use same exact function for a given API', () => {
    jest.isolateModules(() => {
      const instrument = require('../src/instrument');

      global.console.log('beep');

      expect(calls).toBe(0);
      expect(logMock).toHaveBeenCalledTimes(1);

      const callback = () => {
        calls += 1;
      };

      instrument.addInstrumentationHandler({
        type: 'console',
        callback,
      });

      instrument.addInstrumentationHandler({
        type: 'console',
        callback,
      });

      global.console.log('boop');

      expect(calls).toBe(1);
      expect(logMock).toHaveBeenCalledTimes(2);
    });
  });
});
