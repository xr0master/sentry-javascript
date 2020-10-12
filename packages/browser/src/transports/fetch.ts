import { eventToSentryRequest, sessionToSentryRequest } from '@sentry/core';
import { Event, Session, Response } from '@sentry/types';
import { getGlobalObject, supportsReferrerPolicy, SyncPromise } from '@sentry/utils';

import { BaseTransport } from './base';

const global = getGlobalObject<Window>();

/** `fetch` based transport */
export class FetchTransport extends BaseTransport {
  /**
   * @inheritDoc
   */
  public sendEvent(event: Event): PromiseLike<Response> {
    const eventType = event.type || 'event';

    if (this._isRateLimited(eventType)) {
      return Promise.reject({
        event,
        reason: `Transport locked till ${this._disabledUntil(eventType)} due to too many requests.`,
        status: 429,
      });
    }

    const sentryReq = eventToSentryRequest(event, this._api);
    const options: RequestInit = {
      body: sentryReq.body,
      method: 'POST',
      // Despite all stars in the sky saying that Edge supports old draft syntax, aka 'never', 'always', 'origin' and 'default
      // https://caniuse.com/#feat=referrer-policy
      // It doesn't. And it throw exception instead of ignoring this parameter...
      // REF: https://github.com/getsentry/raven-js/issues/1233
      referrerPolicy: (supportsReferrerPolicy() ? 'origin' : '') as ReferrerPolicy,
    };
    if (this.options.fetchParameters !== undefined) {
      Object.assign(options, this.options.fetchParameters);
    }
    if (this.options.headers !== undefined) {
      options.headers = this.options.headers;
    }

    return this._buffer.add(
      new SyncPromise<Response>((resolve, reject) => {
        global
          .fetch(sentryReq.url, options)
          .then(response => {
            const headers = {
              'x-sentry-rate-limits': response.headers.get('X-Sentry-Rate-Limits'),
              'retry-after': response.headers.get('Retry-After'),
            };
            this._handleResponse({ eventType, response, headers, resolve, reject });
          })
          .catch(reject);
      }),
    );
  }

  /**
   * @inheritDoc
   */
  public sendSession(session: Session): PromiseLike<Response> {
    const sentryReq = sessionToSentryRequest(session, this._api);

    const options: RequestInit = {
      body: sentryReq.body,
      method: 'POST',
      // Despite all stars in the sky saying that Edge supports old draft syntax, aka 'never', 'always', 'origin' and 'default
      // https://caniuse.com/#feat=referrer-policy
      // It doesn't. And it throw exception instead of ignoring this parameter...
      // REF: https://github.com/getsentry/raven-js/issues/1233
      referrerPolicy: (supportsReferrerPolicy() ? 'origin' : '') as ReferrerPolicy,
    };

    if (this.options.fetchParameters !== undefined) {
      Object.assign(options, this.options.fetchParameters);
    }

    if (this.options.headers !== undefined) {
      options.headers = this.options.headers;
    }

    return new SyncPromise<Response>((resolve, reject) => {
      global
        .fetch(sentryReq.url, options)
        .then(response => {
          const status = Status.fromHttpCode(response.status);

          if (status === Status.Success) {
            resolve({ status });
            return;
          }

          reject(response);
        })
        .catch(reject);
    });
  }
}
