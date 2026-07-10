import './styles.css';

import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/types';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root element');
}

const gameViewport = document.createElement('main');
gameViewport.className = 'game-viewport';

const canvas = document.createElement('canvas');
canvas.className = 'game-canvas';
canvas.width = DESIGN_WIDTH;
canvas.height = DESIGN_HEIGHT;
canvas.setAttribute('aria-label', '游戏画布');

const landscapeNotice = document.createElement('div');
landscapeNotice.className = 'landscape-notice';
landscapeNotice.setAttribute('role', 'status');
landscapeNotice.textContent = '请旋转设备至竖屏游玩';

gameViewport.append(canvas);
app.append(gameViewport, landscapeNotice);
