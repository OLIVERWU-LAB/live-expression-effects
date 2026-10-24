// One-colour, solid silhouettes. No extra rays, outlines or decorative droplets.
export const CONTROL_ICONS=Object.freeze({
 rain:'<path d="M12 2.5C10.1 5.4 5.2 10.8 5.2 15a6.8 6.8 0 0 0 13.6 0c0-4.2-4.9-9.6-6.8-12.5Z"/>',
 fireworks:'<path d="M12 1.8c1.4 6.9 3.3 8.8 10.2 10.2-6.9 1.4-8.8 3.3-10.2 10.2C10.6 15.3 8.7 13.4 1.8 12 8.7 10.6 10.6 8.7 12 1.8Z"/>',
 smile:'<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM7.7 8.8a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0Zm6.4 0a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0Zm-6.6 4.8c-.6 0-.9.6-.6 1.1a5.7 5.7 0 0 0 10.2 0c.3-.5 0-1.1-.6-1.1-.3 0-.6.2-.7.4a4.1 4.1 0 0 1-7.6 0c-.1-.2-.4-.4-.7-.4Z"/>'
});
export const controlIcon=(name,extra='')=>`<svg class="control-glyph ${extra}" viewBox="0 0 24 24" aria-hidden="true">${CONTROL_ICONS[name]}</svg>`;
