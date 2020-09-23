import { Event } from './event';
import { Status } from './status';

/** JSDoc */
export interface SentryResponse {
  status: Status;
  event?: Event;
  reason?: string;
}
