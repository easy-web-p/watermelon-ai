import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Link, RouterProvider, useRouter } from './router';

function Probe() {
  const { path, query } = useRouter();
  return (
    <div>
      <span data-testid="path">{path}</span>
      <span data-testid="thread">{query.get('thread') ?? ''}</span>
      <Link to="/market">ไปหน้าราคาตลาด</Link>
    </div>
  );
}

function renderRouter() {
  return render(
    <RouterProvider>
      <Probe />
    </RouterProvider>,
  );
}

describe('RouterProvider', () => {
  it('defaults to the root path when the hash is empty', () => {
    window.location.hash = '';
    renderRouter();
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('reads the current hash path', () => {
    window.location.hash = '#/cultivation';
    renderRouter();
    expect(screen.getByTestId('path')).toHaveTextContent('/cultivation');
  });

  it('normalises a hash that is missing its leading slash', () => {
    window.location.hash = '#chat';
    renderRouter();
    expect(screen.getByTestId('path')).toHaveTextContent('/chat');
  });

  it('separates the query string from the path', () => {
    window.location.hash = '#/chat?thread=tapping-sound';
    renderRouter();
    expect(screen.getByTestId('path')).toHaveTextContent('/chat');
    expect(screen.getByTestId('thread')).toHaveTextContent('tapping-sound');
  });

  it('follows hash changes made outside React', async () => {
    window.location.hash = '#/chat';
    renderRouter();
    expect(screen.getByTestId('path')).toHaveTextContent('/chat');

    await act(async () => {
      window.location.hash = '#/plots';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/plots');
  });
});

describe('Link', () => {
  it('renders a real href so middle-click and copy-link still work', () => {
    window.location.hash = '#/';
    renderRouter();
    expect(screen.getByRole('link', { name: 'ไปหน้าราคาตลาด' })).toHaveAttribute('href', '#/market');
  });

  it('navigates on click', async () => {
    window.location.hash = '#/';
    renderRouter();

    await act(async () => {
      screen.getByRole('link', { name: 'ไปหน้าราคาตลาด' }).click();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByTestId('path')).toHaveTextContent('/market');
  });
});
