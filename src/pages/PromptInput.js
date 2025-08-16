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

function PromptInput({ categoryFilter, hideResults = false }) {
  const [prompts, setPrompts] = useState([]);
  const [category, setCategory] = useState('All'); // filter category (used if no external filter)
  const [jobTitle, setJobTitle] = useState(''); // new field for job title
  const [typicalDay, setTypicalDay] = useState(''); // new field for typical day

  // Save new prompt to Firestore
  const handleSubmit = async () => {
    if (!jobTitle.trim() || !typicalDay.trim()) return;

    try {
      await addDoc(collection(db, 'prompts'), {
        job_title: jobTitle,
        typical_day: typicalDay,
        category: 'General', // default category since filter is removed
        createdAt: serverTimestamp(),
      });
      setJobTitle('');
      setTypicalDay('');
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
  const effectiveCategory = categoryFilter ?? category;
  const filteredPrompts = prompts
    .filter(prompt => (effectiveCategory === 'All' ? true : prompt.category === effectiveCategory))
    .slice(0, 3);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      {/* Input and category selector */}
      <div className="prompt-container">
        <div className="prompt-row-horizontal">
          <div className="job-field-horizontal">
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="Enter job title"
              className="job-input text-black"
            />
          </div>
          <div className="job-field-horizontal wider">
            <input
              value={typicalDay}
              onChange={e => setTypicalDay(e.target.value)}
              placeholder="Describe a typical day"
              className="job-input text-black"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="go-button-large bg-white text-blue-700 rounded-md font-semibold hover:bg-blue-100"
          >
            Go
          </button>
        </div>
      </div>

      {/* Filters for displayed prompts (only show if no external filter provided) */}
      {categoryFilter === undefined && (
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
            <option value="Transport">Transport</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Education">Education</option>
          </select>
        </div>
      )}

      {!hideResults && (
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
      )}
    </div>
  );
}

export default PromptInput;
