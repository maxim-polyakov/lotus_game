import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  palette,
  session,
  applyGameSize,
  layoutInfo,
} from './shared';
import { BootScene, MenuScene } from '../pages/HomePage';
import { AuthScene } from '../pages/LoginPage';
import { PlayScene } from '../pages/PlayPage';
import { MatchScene } from '../components/GameBoard';
import { HeroesScene } from '../pages/HeroesPage';
import { DecksScene } from '../pages/DecksPage';
import { DeckEditorScene } from '../pages/DeckDetailPage';
import { ShopScene } from '../pages/ShopPage';
import { ProfileScene } from '../pages/ProfilePage';
import { LeaderboardScene } from '../pages/LeaderboardPage';
import { ReplaysScene } from '../pages/ReplaysListPage';
import { ReplayViewerScene } from '../pages/ReplayPage';
import { FriendsScene } from '../pages/FriendsPage';
import { NotificationsScene } from '../pages/NotificationsPage';
import { AdminScene } from '../pages/AdminCabinetPage';
import { ChatScene } from '../components/ChatWidget';

export {
  GAME_WIDTH,
  GAME_HEIGHT,
  palette,
  session,
  applyGameSize,
  layoutInfo,
};

export function createLotusGame(parent) {
  const size = applyGameSize();
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: size.width,
    height: size.height,
    backgroundColor: '#10141f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      fullscreenTarget: parent,
      autoRound: true,
    },
    input: {
      activePointers: 3,
      windowEvents: true,
      touch: {
        capture: false,
      },
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    dom: {
      createContainer: true,
    },
    scene: [
      BootScene,
      AuthScene,
      MenuScene,
      PlayScene,
      MatchScene,
      HeroesScene,
      DecksScene,
      DeckEditorScene,
      ShopScene,
      ProfileScene,
      LeaderboardScene,
      ReplaysScene,
      ReplayViewerScene,
      FriendsScene,
      NotificationsScene,
      AdminScene,
      ChatScene,
    ],
  });
}

export function refreshLotusGame(game) {
  if (!game?.scale) return;
  const before = `${GAME_WIDTH}x${GAME_HEIGHT}`;
  const size = applyGameSize();
  game.scale.resize(size.width, size.height);
  game.scale.refresh();
  if (`${GAME_WIDTH}x${GAME_HEIGHT}` === before) return;
  game.scene.getScenes(true).forEach((scene) => {
    scene.scene.restart(scene.scene.settings.data || {});
  });
}
