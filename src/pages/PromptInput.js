import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config'; // adjust path if needed

function PromptInput() {
  const [input, setInput] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [category, setCategory] = useState('All'); // filter category
  const [date, setDate] = useState(''); // filter date (yyyy-mm-dd)
  const [newPromptCategory, setNewPromptCategory] = useState('General'); // category when adding prompt

  // Save new prompt to Firestore
  const handleSubmit = async () => {
    if (!input.trim()) return;

    try {
      await addDoc(collection(db, 'prompts'), {
        text: input,
        category: newPromptCategory,
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  // Listen for latest prompts live, order by newest first
  useEffect(() => {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrompts(data);
    });
    return () => unsubscribe();
  }, []);

  // Filter prompts by category and date, then slice top 3
  const filteredPrompts = prompts
    .filter(prompt => {
      if (category !== 'All' && prompt.category !== category) return false;

      if (date && prompt.createdAt?.seconds) {
        const promptDate = new Date(prompt.createdAt.seconds * 1000).toISOString().split('T')[0];
        return promptDate === date;
      }
      return true;
    })
    .slice(0, 3);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      {/* Input and category selector */}
      <div className="w-full flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your problem here..."
          className="flex-grow px-6 py-3 rounded-md text-black"
          style={{ minWidth: '300px' }}
        />
        <select
          value={newPromptCategory}
          onChange={e => setNewPromptCategory(e.target.value)}
          className="p-2 rounded-md text-black"
        >
          <option value="General">General</option>
          <option value="Tech">Tech</option>
          <option value="Health">Health</option>
          <option value="Education">Education</option>
        </select>
        <button
          onClick={handleSubmit}
          className="bg-white text-blue-700 px-6 py-3 rounded-md font-semibold hover:bg-blue-100"
        >
          Go
        </button>
      </div>

      {/* Filters for displayed prompts */}
      <div className="w-full flex items-center gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="p-2 rounded-md text-black"
        >
          <option value="All">All Categories</option>
          <option value="General">General</option>
          <option value="Tech">Tech</option>
          <option value="Health">Health</option>
          <option value="Education">Education</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="p-2 rounded-md text-black"
        />
      </div>

      {/* Display filtered prompts */}
      <div className="w-full space-y-3 mt-4">
        {filteredPrompts.length === 0 && (
          <p className="text-white">No prompts match the selected filters.</p>
        )}
        {filteredPrompts.map(({ id, text, category, createdAt }) => (
          <div key={id} className="bg-white text-black px-4 py-3 rounded-md shadow-sm">
            <p>{text}</p>
            <p className="text-xs text-gray-500 mt-1">
              {createdAt?.seconds
                ? new Date(createdAt.seconds * 1000).toLocaleString()
                : 'No timestamp'}
            </p>
            <p className="text-xs text-gray-500">Category: {category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptInput;
