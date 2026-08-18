import React, { useEffect, useState } from 'react';
import { fetchSearchHistory, submitFeedback } from '../services/api';
import { History, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const HistoryFeedbackPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [category, setCategory] = useState('Route Accuracy');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSearchHistory().then(setHistory).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitFeedback({
        user_email: userEmail,
        category,
        comment,
        rating
      });
      setSubmitted(true);
      setComment('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
      {/* Search History */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-base border-b border-slate-800 pb-3">
          <History className="w-5 h-5" />
          <span>Route Search History</span>
        </div>

        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 text-xs">
          {history.map((item) => (
            <div key={item.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-200">
                <span>{item.from_location} → {item.to_location}</span>
                <span className="text-cyan-400 font-extrabold">{item.eta_minutes} min</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Distance: {item.distance_km} km</span>
                <span>{item.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Citizen Feedback Form */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-base border-b border-slate-800 pb-3">
          <MessageSquare className="w-5 h-5" />
          <span>Citizen Feedback & Traffic Observations</span>
        </div>

        {submitted && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Thank you! Your feedback has been recorded into the database.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Your Email</label>
            <input
              type="email"
              required
              placeholder="commuter@nagpur.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Feedback Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="Route Accuracy">Route & ETA Accuracy</option>
              <option value="Traffic Alert">Traffic Alert Verification</option>
              <option value="UI Experience">Dashboard & Map Experience</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Rating (1 to 5 Stars)</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value={5}>5 Stars - Excellent accuracy</option>
              <option value={4}>4 Stars - Very good</option>
              <option value={3}>3 Stars - Average</option>
              <option value={2}>2 Stars - Minor discrepancies</option>
              <option value={1}>1 Star - Needs improvement</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Detailed Observations</label>
            <textarea
              rows={4}
              required
              placeholder="The Wardha Road bypass saved me 15 minutes during evening peak hour..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
          >
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </form>
      </div>
    </div>
  );
};
