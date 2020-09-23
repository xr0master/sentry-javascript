import { Event, SentryResponse, Status, Transport } from '@sentry/types';
import { SyncPromise } from '@sentry/utils';

/** Noop transport */
export class NoopTransport implements Transport {
  /**
   * @inheritDoc
   */
  public sendEvent(_: Event): PromiseLike<SentryResponse> {
    return SyncPromise.resolve({
      reason: `NoopTransport: Event has been skipped because no Dsn is configured.`,
      status: Status.Skipped,
    });
  }

  /**
   * @inheritDoc
   */
  public close(_?: number): PromiseLike<boolean> {
    return SyncPromise.resolve(true);
  }
}
