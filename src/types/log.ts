export type ViolationEventType = 
  | 'tab_blur' 
  | 'visibility_hidden' 
  | 'contextmenu' 
  | 'fullscreen_exit' 
  | 'paste_attempt'
  | 'devtools_opened'
  | 'print_screen'
  | 'camera_phone_detected'
  | 'camera_multiple_persons'
  | 'camera_absence'
  | 'camera_blocked';

export interface IntegrityLog {
  id: string;
  timestamp: number; // ServerValue.TIMESTAMP
  eventType: ViolationEventType;
  details: string;
  violationNumber: number;
}
