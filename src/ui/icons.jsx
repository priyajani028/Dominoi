const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = (paths) => (props) => <svg {...base} {...props}>{paths}</svg>;

export const Icons = {
  view: I(<><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0V12" /><path d="M14 10.5a1.5 1.5 0 0 1 3 0V12" /><path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3l-2.6-4.5a1.5 1.5 0 0 1 2.6-1.5L8 15" /></>),
  add: I(<><rect x="8.5" y="3" width="7" height="14" rx="1.4" /><path d="M12 7.5v5M9.5 10h5" /><path d="M6 21h12" /></>),
  select: I(<><path d="M5 3.5l13 7.2-5.6 1.4-2.4 5.4z" /><path d="M12.6 12.4l5 5" /></>),
  move: I(<><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>),
  rotate: I(<><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4.5h-4.5" /></>),
  ball: I(<><circle cx="9" cy="14" r="5.5" /><path d="M14.5 9.5L20 4M16 4h4v4" /></>),
  duplicate: I(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>),
  trash: I(<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>),
  templates: I(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><circle cx="17" cy="17" r="3.5" /></>),
  undo: I(<><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>),
  redo: I(<><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></>),
  clear: I(<><path d="M4 20h16" /><path d="M14.5 4.5l5 5L11 18H6l-2-2z" /><path d="M9.5 9.5l5 5" /></>),
  play: I(<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />),
  reset: I(<><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4.5h4.5" /></>),
  replay: I(<><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4.5h-4.5" /><path d="M10 9v6l5-3z" fill="currentColor" /></>),
  close: I(<path d="M6 6l12 12M18 6L6 18" />),
  help: I(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></>),
  single: I(<><rect x="9" y="3.5" width="6" height="14" rx="1.2" /><path d="M5 20.5h14" /></>),
  aframe: I(<><path d="M5.2 20L10.6 4.6l2.5.9L8 20.5z" /><path d="M18.8 20L13.4 4.6l-2.5.9L16 20.5z" /><path d="M3.5 20.5h17" /></>),
  flat: I(<><rect x="3.5" y="13" width="17" height="4.5" rx="1.2" /><path d="M3.5 20.5h17" /><path d="M12 13v4.5" /></>),
  soundOn: I(<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>),
  soundOff: I(<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>),
  focus: I(<><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" /><circle cx="12" cy="12" r="2.5" /></>),
};
