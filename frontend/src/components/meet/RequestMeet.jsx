import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const MeetingRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipients: '',
    purpose: '',
    schedule_start: '',
    schedule_end: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const recipientList = formData.recipients
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);

    if (recipientList.length === 0) {
      toast.error('Please enter at least one recipient ID');
      return;
    }
    if (!formData.schedule_start || !formData.schedule_end) {
      toast.error('Please enter both start and end times');
      return;
    }
    if (new Date(formData.schedule_end) <= new Date(formData.schedule_start)) {
      toast.error('End time must be after start time');
      return;
    }
    if (!formData.purpose) {
      toast.error('Please enter a meeting purpose');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        recipients: recipientList,
        purpose: formData.purpose,
        schedule_start: formData.schedule_start,
        schedule_end: formData.schedule_end,
        google_meet_link: 'https://meet.google.com/hxw-wuec-wzw',
        notes: formData.notes
      };

      await axios.post('http://localhost:5000/api/meetings/request', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success('Meeting request sent successfully!');
      setRequestSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send meeting request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-green-50 shadow-lg rounded-xl overflow-hidden">
        <div className="bg-green-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Group Meeting Request</h1>
          <p className="text-green-200">
            Schedule a meeting with multiple recipients using Video Meet
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-8">
          <div className="mb-5">
            <label className="block text-green-800 font-medium mb-2">
              Recipient IDs <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="recipients"
              value={formData.recipients}
              onChange={handleChange}
              placeholder="Enter IDs separated by commas (e.g., 123,456)"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="mb-5">
            <label className="block text-green-800 font-medium mb-2">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              placeholder="Meeting purpose"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-green-800 font-medium mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="schedule_start"
                value={formData.schedule_start}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
            <div>
              <label className="block text-green-800 font-medium mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="schedule_end"
                value={formData.schedule_end}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-green-800 font-medium mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional information..."
              rows="3"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send Meeting Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MeetingRequest;
