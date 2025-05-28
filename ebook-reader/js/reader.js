import ProgressIndicator from './ProgressIndicator';
import { readerState } from './state';

// After DOM is ready and #reader-header exists:
const progressContainer = document.createElement('div');
progressContainer.id = 'progress-indicator';
document.querySelector('#reader-header').appendChild(progressContainer);
new ProgressIndicator({ container: progressContainer, readerState });