import { EventEmitter } from 'events';

// Decoupled asynchronous event hub for backend state mutations
export const eventHub = new EventEmitter();
