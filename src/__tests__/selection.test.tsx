import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/useStore';

describe('Selection Logic', () => {
  beforeEach(() => {
    const store = useStore.getState();
    store.clearBoard();
    store.updateView({ x: 0, y: 0, scale: 1 });
  });

  it('selects a block when clicked', () => {
    // Setup state manually
    const block = {
      id: 'test-block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 0,
      y: 0
    };
    useStore.setState({ blocks: [block] });
    
    render(<App />);

    // Find the block by its title
    const blockInput = screen.getByDisplayValue('Agent');
    const blockElement = blockInput.closest('.absolute'); 

    expect(blockElement).toBeInTheDocument();

    // Click the block
    fireEvent.click(blockElement!);

    // Check store state
    expect(useStore.getState().selectedId).toBe(block.id);
    expect(useStore.getState().selectedBlockIds).toContain(block.id);
  });

  it('clears selection when clicking background', () => {
    const block = {
      id: 'test-block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 0,
      y: 0
    };
    
    useStore.setState({ 
      blocks: [block],
      selectedId: block.id,
      selectedBlockIds: [block.id]
    });

    render(<App />);

    expect(useStore.getState().selectedId).toBe(block.id);

    const board = document.getElementById('board-container');
    expect(board).toBeInTheDocument();

    // Click the board
    fireEvent.click(board!);

    expect(useStore.getState().selectedId).toBeNull();
    expect(useStore.getState().selectedBlockIds).toHaveLength(0);
  });

  it('selects a group when clicking group background (empty area)', () => {
    const group = {
      id: 'group-1',
      title: 'New Group',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      color: 'blue'
    };

    useStore.setState({ groups: [group] });

    render(<App />);

    const board = document.getElementById('board-container');
    
    // Mock rect so clientX/Y maps 1:1 to canvas coordinates
    vi.spyOn(board!, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {}
    });

    // Click inside the group (e.g., 150, 150)
    // Group is at 100,100 with size 200x200.
    fireEvent.click(board!, { clientX: 150, clientY: 150 });

    expect(useStore.getState().selectedGroupId).toBe(group.id);
  });

  it('selects a block inside a group when clicking the block', () => {
    const group = {
      id: 'group-1',
      title: 'New Group',
      x: 100,
      y: 100,
      width: 400,
      height: 400,
      color: 'blue'
    };

    const block = {
      id: 'block-1',
      type: 'chef' as const,
      title: 'Agent',
      description: '',
      x: 150, // Inside group
      y: 150
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

    // Click on the block.
    // Block is at 150,150.
    // Let's click at 160, 160.
    fireEvent.click(board!, { clientX: 160, clientY: 160 });

    expect(useStore.getState().selectedId).toBe(block.id);
    expect(useStore.getState().selectedGroupId).toBeNull();
  });

  it('supports multi-select with Ctrl key', () => {
    const block1 = {
      id: 'block-1',
      type: 'chef' as const,
      title: 'Agent 1',
      description: '',
      x: 0,
      y: 0
    };

    const block2 = {
      id: 'block-2',
      type: 'ingredients' as const,
      title: 'Data',
      description: '',
      x: 200,
      y: 0
    };

    useStore.setState({ blocks: [block1, block2] });

    render(<App />);
    
    // Find block elements
    const el1Input = screen.getByDisplayValue('Agent 1');
    const el1 = el1Input.closest('.absolute');
    
    const el2Input = screen.getByDisplayValue('Data');
    const el2 = el2Input.closest('.absolute');

    expect(el1).toBeInTheDocument();
    expect(el2).toBeInTheDocument();

    // Click block 1
    fireEvent.click(el1!);
    expect(useStore.getState().selectedBlockIds).toEqual([block1.id]);

    // Ctrl+Click block 2
    fireEvent.click(el2!, { ctrlKey: true });

    expect(useStore.getState().selectedBlockIds).toContain(block1.id);
    expect(useStore.getState().selectedBlockIds).toContain(block2.id);
    expect(useStore.getState().selectedBlockIds).toHaveLength(2);
  });
});
