import React, { useState } from 'react';
import { X, ShieldAlert, Plus } from 'lucide-react';
import { createIncident } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  segments: any[];
}

export const IncidentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, segments }) => {
  const [segmentId, setSegmentId] = useState(segments[0]?.id || 'seg_sitabuldi_rahate');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Accident');
  const [severity, setSeverity] = useState(2);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createIncident({
        segment_id: segmentId,
        title,
        type,
        severity: Number(severity),
        description
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Report Road Incident</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Road Segment</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.corridor})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Incident Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value="Accident">Accident</option>
              <option value="Road Closure">Road Closure</option>
              <option value="Construction">Construction / Repair</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Event">Public Event / Procession</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Incident Headline / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Multi-vehicle collision near Ajni Flyover"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Severity Level</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            >
              <option value={1}>Low Impact (Minor slowdown)</option>
              <option value={2}>Moderate Impact (1-lane blocked)</option>
              <option value={3}>Severe Impact (Complete Road Closure)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Detailed Description & Advisories</label>
            <textarea
              rows={3}
              required
              placeholder="Traffic diverted via Central Bazaar road..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast Incident</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
