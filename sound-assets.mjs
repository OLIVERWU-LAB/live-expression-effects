// Content-addressed, local recordings. Decoded once before live playback.
export const RECORDING_FILES={launch:'assets/audio/launch-a8ce255f9028.m4a',water:'assets/audio/contact-3ce4677dd264.m4a',paperLight:'assets/audio/paperLight-e1feffbe0b24.m4a'};
export const LIVE_AUDIO_FILES={explode:'assets/audio/explode-895ac3e0cede.mp3',sparks:'assets/audio/sparks-3d9bc3421cc0.mp3',...RECORDING_FILES};
export const LIVE_AUDIO_URLS=Object.fromEntries(Object.entries(LIVE_AUDIO_FILES).map(([key,path])=>[key,new URL('./'+path,import.meta.url).href]));
