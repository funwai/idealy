import { db } from '../firebase/config'; // adjust path if needed
import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

function PromptInput() {
  const [input, setInput] = useState('');
  const [prompts, setPrompts] = useState([]);

  // Save prompts to Firestore
  const handleSubmit = async () => {
    console.log('testing', input)
    if (!input.trim()) return;
        console.log('Submitting:', input); // ✅ Add this line
    try {
      await addDoc(collection(db, 'prompts'), {
        text: input,
        createdAt: serverTimestamp()
      });
      setInput(''); // clear input after saving
    } catch (error) {
      console.error('Error saving prompt:', error);
    }
  };

  // Listen for prompt updates
  useEffect(() => {
    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const promptList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPrompts(promptList);
    });

    return () => unsubscribe(); // cleanup listener on unmount
  }, []);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      {/* Input and button */}
      <div className="w-full flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your problem here..."
          className="flex-grow px-4 py-2 rounded-md text-black"
        />
        <button
          onClick={handleSubmit}
          className="bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100"
        >
          Go
        </button>
      </div>

      {/* Display list of prompts */}
      <div className="w-full mt-4 space-y-2">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="bg-white text-black px-4 py-2 rounded-md shadow-sm"
          >
            {prompt.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptInput;
