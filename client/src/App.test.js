import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./game/PhaserApp', () => () => <div>Lotus Game</div>);

test('renders the game application', () => {
  render(<App />);
  expect(screen.getByText('Lotus Game')).toBeInTheDocument();
});
