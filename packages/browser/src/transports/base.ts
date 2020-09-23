import { API } from '@sentry/core';
import { Event, SentryResponse, Transport, TransportOptions } from '@sentry/types';
import { PromiseBuffer, SentryError } from '@sentry/utils';

/** Base Transport class implementation */
export abstract class BaseTransport implements Transport {
  /**
   * @deprecated
   */
  public url: string;

  /** Helper to get Sentry API endpoints. */
  protected readonly _api: API;

  /** A simple buffer holding all requests. */
  protected readonly _buffer: PromiseBuffer<SentryResponse> = new PromiseBuffer(30);

  public constructor(public options: TransportOptions) {
    this._api = new API(this.options.dsn);
    // eslint-disable-next-line deprecation/deprecation
    this.url = this._api.getStoreEndpointWithUrlEncodedAuth();
  }

  /**
   * @inheritDoc
   */
  public sendEvent(_: Event): PromiseLike<SentryResponse> {
    throw new SentryError('Transport Class has to implement `sendEvent` method');
  }

  /**
   * @inheritDoc
   */
  public close(timeout?: number): PromiseLike<boolean> {
    return this._buffer.drain(timeout);
  }
}
