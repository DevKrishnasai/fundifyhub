/**
 * Requests Domain Module
 * @module domain/requests
 */

export { RequestsService, requestsService } from './requests.service';
export type { CreateRequestInput, UpdateRequestInput, ListRequestsInput, AssignAgentInput, AssignAdminInput, CreateOfferInput } from './requests.service';
export * from './requests.validators';
export * from './requests.events';
