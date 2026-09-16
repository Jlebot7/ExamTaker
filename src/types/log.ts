export type ViolationEventType = 
  | 'tab_blur' 
  | 'visibility_hidden' 
  | 'contextmenu' 
  | 'fullscreen_exit' 
  | 'paste_attempt'
  | 'devtools_opened'
  | 'print_screen';

export interface IntegrityLog {
  id: string;
  timestamp: number; // ServerValue.TIMESTAMP
  eventType: ViolationEventType;
  details: string;
  violationNumber: number;
}
