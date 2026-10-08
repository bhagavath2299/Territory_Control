// the three cars, three trails and four abilities that can be chosen for now (the engine still knows the others)
const CARS=['sport','muscle','f1'],TRAILS=['glow','neon','fire'],OPEN_AB=['boost','dash','shield','recall'];
const SKL={sport:1,muscle:1,f1:1};
const CARDEF={sport:'Sport',muscle:'Muscle',f1:'Formula'},TRLDEF={glow:'Glow',neon:'Neon',fire:'Fire'};
// ---------- icons (24x24, filled) ----------
const I=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const IC={
 play:I('<path d="M8 4.5v15l12-7.5z"/>'),
 bolt:I('<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'),
 bots:I('<path fill-rule="evenodd" d="M11 2h2v3h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4zM8.5 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 15h8v1.5H8z"/>'),
 friends:I('<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 21c0-4 3-7 7-7s7 3 7 7zm14-6c3 0 6 2 6 6h-5c0-2-.4-4-1-6z"/>'),
 replay:I('<path d="M12 4a8 8 0 1 0 7.7 10h-2.1A6 6 0 1 1 12 6c1.7 0 3.2.7 4.3 1.7L13 11h7V4l-2.3 2.3A8 8 0 0 0 12 4zm-1.5 5.5v6l5-3z"/>'),
 garage:I('<path fill-rule="evenodd" d="M5 11l2-5h10l2 5h1a2 2 0 0 1 2 2v4h-2a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H2v-4a2 2 0 0 1 2-2zm3.2-3-1.2 3h10l-1.2-3z"/>'),
 gear:I('<path fill-rule="evenodd" d="M10.3 2h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 3-2 1.7c.1.6.1 1.2 0 1.8l2 1.7-1.7 3-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-3 2-1.7a6 6 0 0 1 0-1.8l-2-1.7 1.7-3 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" transform="translate(0 1.2)"/>'),
 how:I('<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 15h2v2h-2zm1-11a4 4 0 0 1 2 7.5c-.8.5-1 1-1 1.5v.5h-2V15c0-1.2.6-2 1.6-2.6A2 2 0 1 0 10 10H8a4 4 0 0 1 4-4z"/>'),
 back:I('<path d="M15.7 5.3 14.3 3.9 6.2 12l8.1 8.1 1.4-1.4L9 12z"/>'),
 share:I('<path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3 3 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.3 9.6a3 3 0 1 0 0 4.8l6.8 3.9A3 3 0 1 0 18 16z"/>'),
 pause:I('<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'),
 restart:I('<path d="M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"/>'),
 eye:I('<path d="M12 5C6.5 5 2.7 9 1.5 12c1.2 3 5 7 10.500 7s9.300-4 10.500-7C21.300 9 17.500 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6.200a2.200 2.200 0 1 0 0 4.400 2.200 2.200 0 0 0 0-4.400z"/>'),
 trophy:I('<path fill-rule="evenodd" d="M7 3h10v5a5 5 0 0 1-10 0zM10 14h4v3h3v4H7v-4h3zM3 4h3v3a3 3 0 0 1-3-3zM21 4h-3v3a3 3 0 0 0 3-3z"/>'),
 war:I('<path fill-rule="evenodd" d="M5 2h2v20H5zM8 3h11l-2.5 4.500L19 12H8z"/>'),
 stats:I('<path d="M4 20h4V10H4zm6 0h4V4h-4zm6 0h4v-7h-4z"/>'),
 gift:I('<path fill-rule="evenodd" d="M3 9h18v4H3zm1 5h7v7H4zm9 0h7v7h-7zM12 9C9 5 6 4 6 6.500S9 9 12 9zm0 0c3-4 6-5 6-2.500S15 9 12 9z"/>'),
 // abilities
 boost:I('<path d="M4 5l8 7-8 7V5zm8 0 8 7-8 7V5z"/>'),
 dash:I('<path d="M3 7h6v2H3zm0 4h9v2H3zm0 4h6v2H3zM13 5l8 7-8 7v-4.500H11v-5h2z"/>'),
 shield:I('<path d="M12 2 4 5v6c0 5 3.400 9.200 8 11 4.600-1.800 8-6 8-11V5z"/>'),
 recall:I('<path d="M12 5V2L7 6.500 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"/>'),
 ghost:I('<path d="M12 2a7 7 0 0 0-7 7v13l3-2.500L10.500 22 12 20.500 13.500 22l2.500-2.500L19 22V9a7 7 0 0 0-7-7zM9.500 9a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3zm5 0a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3z"/>'),
 trap:I('<path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.200 4.200l1.400-1.400 2.100 2.100-1.400 1.400zM16.300 16.300l1.400-1.400 2.100 2.100-1.400 1.400zM4.200 19.800l2.100-2.100 1.400 1.400-2.100 2.100zM16.300 7.700l2.100-2.100 1.400 1.400-2.100 2.100z"/>'),
 emp:I('<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>'),
 grab:I('<path d="M12 3c4.500 0 8 2.700 8 6v3h-4V9.500c0-.8-1.800-1.500-4-1.500s-4 .7-4 1.500V12H4V9c0-3.300 3.500-6 8-6zM4 13h4v6H4zm12 0h4v6h-4z"/>'),
 cannon:I('<path d="M3 15a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm4-4.500 9-5 2 3.500-9 5zM19 6l2-1 1 2-2 1z"/>'),
 fort:I('<path d="M12 2 4 5v6c0 5 3.400 9.200 8 11 4.600-1.800 8-6 8-11V5zm0 4 4 1.500V11c0 2.600-1.600 5-4 6.200C9.600 16 8 13.600 8 11V7.500z"/>'),
 strike:I('<path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-1 1v3H8v2h3v3h2v-3h3v-2h-3V7z"/>'),
 lock:I('<path d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10zm2 0h8V8a4 4 0 1 0-8 0z"/>'),
 check:I('<path d="M9 16.200 4.800 12l-1.400 1.400L9 19 21 7l-1.400-1.400z"/>'),
 x:I('<path d="M6.400 5 5 6.400 10.600 12 5 17.600 6.400 19 12 13.400 17.600 19 19 17.600 13.400 12 19 6.400 17.600 5 12 10.600z"/>'),
 cam:I('<path d="M9 4 7.500 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.500L15 4zm3 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>'),
 star:I('<path d="m12 2 2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L12 17.300 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z"/>')};
const ABI={boost:IC.boost,dash:IC.dash,shield:IC.shield,recall:IC.recall,ghost:IC.ghost,trap:IC.trap,emp:IC.emp,grab:IC.grab};
