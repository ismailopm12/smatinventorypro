 // Scan sound utility using Web Audio API
 
 let audioContext: AudioContext | null = null;
 
 function getAudioContext(): AudioContext {
   if (!audioContext) {
     audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
   }
   return audioContext;
 }
 
 export function playSuccessSound(): void {
   try {
     const ctx = getAudioContext();
     
     // Resume context if suspended (required for mobile browsers)
     if (ctx.state === 'suspended') {
       ctx.resume();
     }
     
     const now = ctx.currentTime;
     
     // Create oscillator for the beep
     const oscillator = ctx.createOscillator();
     const gainNode = ctx.createGain();
     
     oscillator.connect(gainNode);
     gainNode.connect(ctx.destination);
     
     // Play two quick beeps for success
     oscillator.type = 'sine';
     oscillator.frequency.setValueAtTime(880, now); // A5 note
     oscillator.frequency.setValueAtTime(1108.73, now + 0.1); // C#6 note
     
     // Volume envelope
     gainNode.gain.setValueAtTime(0, now);
     gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
     gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
     gainNode.gain.linearRampToValueAtTime(0.3, now + 0.12);
     gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
     
     oscillator.start(now);
     oscillator.stop(now + 0.25);
   } catch (e) {
     console.warn('Could not play scan sound:', e);
   }
 }
 
 export function playErrorSound(): void {
   try {
     const ctx = getAudioContext();
     
     if (ctx.state === 'suspended') {
       ctx.resume();
     }
     
     const now = ctx.currentTime;
     
     const oscillator = ctx.createOscillator();
     const gainNode = ctx.createGain();
     
     oscillator.connect(gainNode);
     gainNode.connect(ctx.destination);
     
     // Low buzz for error
     oscillator.type = 'sine';
     oscillator.frequency.setValueAtTime(200, now);
     oscillator.frequency.setValueAtTime(150, now + 0.1);
     
     gainNode.gain.setValueAtTime(0, now);
     gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
     gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
     
     oscillator.start(now);
     oscillator.stop(now + 0.2);
   } catch (e) {
     console.warn('Could not play error sound:', e);
   }
 }