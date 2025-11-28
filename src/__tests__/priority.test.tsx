import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';

describe('Selection Priority Logic', () => {
  beforeEach(() => {
    const store = useStore.getState();
    store.clearBoard();
    store.updateView({ x: 0, y: 0, scale: 1 });
    store.setSelectionPriority('block'); // Default
  });

  it('selects nearest block in group when priority is "block" (default)', () => {
    const group = {
      id: 'group-1',
      title: 'Group',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      color: 'blue'
    };

    const block = {
      id: 'block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 50,
      y: 50
    };

    useStore.setState({ 
      groups: [group],
      blocks: [block]
    });

    render(<App />);

    const board = document.getElementById('board-container');
    vi.spyOn(board!, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {}
    });

    // Click inside the group, but NOT on the block.
    fireEvent.click(board!, { clientX: 400, clientY: 400 });

    // Should select the block because it's the only one in the group
    expect(useStore.getState().selectedId).toBe(block.id);
    expect(useStore.getState().selectedGroupId).toBeNull();
  });

  it('selects group when priority is "group"', () => {
    const group = {
      id: 'group-1',
      title: 'Group',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      color: 'blue'
    };

    const block = {
      id: 'block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 50,
      y: 50
    };

    useStore.setState({ 
      groups: [group],
      blocks: [block],
      selectionPriority: 'group'
    });

    render(<App />);

    const board = document.getElementById('board-container');
    vi.spyOn(board!, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {}
    });

    // Click inside the group, but NOT on the block.
    fireEvent.click(board!, { clientX: 400, clientY: 400 });

    // Should select the group
    expect(useStore.getState().selectedGroupId).toBe(group.id);
    expect(useStore.getState().selectedId).toBeNull();
  });

  it('switches priority dynamically', () => {
    const group = {
      id: 'group-1',
      title: 'Group',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      color: 'blue'
    };

    const block = {
      id: 'block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 50,
      y: 50
    };

    useStore.setState({ 
      groups: [group],
      blocks: [block],
      selectionPriority: 'block'
    });

    render(<App />);
    const board = document.getElementById('board-container');
    vi.spyOn(board!, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {}
    });

    // 1. Priority = block
    fireEvent.click(board!, { clientX: 400, clientY: 400 });
    expect(useStore.getState().selectedId).toBe(block.id);

    // Reset selection
    act(() => {
      useStore.getState().selectBlock(null);
    });

    // 2. Change priority to group
    act(() => {
      useStore.getState().setSelectionPriority('group');
    });

    fireEvent.click(board!, { clientX: 400, clientY: 400 });
    expect(useStore.getState().selectedGroupId).toBe(group.id);
    expect(useStore.getState().selectedId).toBeNull();
  });
});
