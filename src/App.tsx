import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { BottomBar } from './components/BottomBar';
import { Block } from './components/Block';
import type { Block as BlockType, BlockType as BlockTypeEnum } from './types';

function App() {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  const addBlock = (type: BlockTypeEnum) => {
    const newBlock: BlockType = {
      id: crypto.randomUUID(),
      type,
      title: type === 'chef' ? 'Agent' : type === 'ingredients' ? 'Dane' : type === 'dish' ? 'Wynik' : 'Notatka',
      description: '',
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<BlockType>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const clearBoard = () => {
    if (confirm('Czy na pewno chcesz wyczyścić blat?')) {
      setBlocks([]);
      setPrompt('');
      setSelectedId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-kitchen-bg text-white overflow-hidden font-sans">
      <Sidebar onAddBlock={addBlock} onClear={clearBoard} />
      
      <div className="flex-1 flex flex-col h-full">
        <Board onClick={() => setSelectedId(null)}>
          {blocks.map(block => (
            <Block
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              onSelect={setSelectedId}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
            />
          ))}
        </Board>
        
        <BottomBar prompt={prompt} setPrompt={setPrompt} />
      </div>
    </div>
  );
}

export default App;
