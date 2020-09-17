import { eventToSentryRequest, sessionToSentryRequest } from '@sentry/core';
import { Event, Session, Response } from '@sentry/types';
import { SyncPromise } from '@sentry/utils';

import { BaseTransport } from './base';

/** `XHR` based transport */
export class XHRTransport extends BaseTransport {
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

    return this._buffer.add(
      new SyncPromise<Response>((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = (): void => {
          if (request.readyState === 4) {
            const headers = {
              'x-sentry-rate-limits': request.getResponseHeader('X-Sentry-Rate-Limits'),
              'retry-after': request.getResponseHeader('Retry-After'),
            };
            this._handleResponse({ eventType, response: request, headers, resolve, reject });
          }
        };

        request.open('POST', sentryReq.url);
        for (const header in this.options.headers) {
          if (this.options.headers.hasOwnProperty(header)) {
            request.setRequestHeader(header, this.options.headers[header]);
          }
        }
        request.send(sentryReq.body);
      }),
    );
  }

  /**
   * @inheritDoc
   */
  public sendSession(session: Session): PromiseLike<Response> {
    const sentryReq = sessionToSentryRequest(session, this._api);

    return new SyncPromise<Response>((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.onreadystatechange = (): void => {
        if (request.readyState !== 4) {
          return;
        }

        const status = Status.fromHttpCode(request.status);

        if (status === Status.Success) {
          resolve({ status });
          return;
        }

        reject(request);
      };

      request.open('POST', sentryReq.url);

      for (const header in this.options.headers) {
        if (this.options.headers.hasOwnProperty(header)) {
          request.setRequestHeader(header, this.options.headers[header]);
        }
      }

      request.send(sentryReq.body);
    });
  }
}
