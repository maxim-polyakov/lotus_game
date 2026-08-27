/**
 * Legacy GIF/effect overlays from admin uploads are intentionally not rendered.
 * Card play/hit feedback uses Phaser tweens on CardGameObject instead of playEffectUrl GIFs.
 */
export { CardGameObject, playCardSound } from './CardDisplay';
