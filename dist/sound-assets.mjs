// Five user clips plus one CC0 paper rustle. Content-addressed URLs prevent stale cached revisions.
export const AUDIO_FILES={
  "shoot": "assets/audio/shoot-364ca1ba5960.mp3",
  "explode": "assets/audio/explode-895ac3e0cede.mp3",
  "fireworks2": "assets/audio/fireworks2-c49ff933cd99.mp3",
  "shining": "assets/audio/shining-8f6574bd823f.mp3",
  "sparks": "assets/audio/sparks-3d9bc3421cc0.mp3",
  "paper": "assets/audio/paper-fbf05bd9ba67.mp3"
};
export const AUDIO_URLS=Object.fromEntries(Object.entries(AUDIO_FILES).map(([key,path])=>[key,new URL("./"+path,import.meta.url).href]));
// Original launch/paper clips stay in source history. The live engine replaces
// them with program textures, so it neither downloads nor decodes those files.
export const LIVE_AUDIO_FILES=Object.fromEntries(Object.entries(AUDIO_FILES).filter(([key])=>!['shoot','paper'].includes(key)));
export const LIVE_AUDIO_URLS=Object.fromEntries(Object.entries(LIVE_AUDIO_FILES).map(([key,path])=>[key,new URL('./'+path,import.meta.url).href]));
