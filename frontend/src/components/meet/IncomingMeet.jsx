import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const IncomingMeetings = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState({});
  const [declineReasons, setDeclineReasons] = useState({});

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5000/api/meetings/incoming', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMeetings(response.data.meetings);
      } catch (error) {
        toast.error('Failed to fetch incoming meeting requests');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const handleApprove = async (meetingId) => {
    setResponding(prev => ({ ...prev, [meetingId]: true }));
    try {
      await axios.put(`http://localhost:5000/api/meetings/${meetingId}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Meeting approved successfully');
      // Update local state to reflect approval
      setMeetings(prev =>
        prev.map(m => (m.id === meetingId ? { ...m, approved: true } : m))
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve meeting');
    } finally {
      setResponding(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  const handleReject = async (meetingId) => {
    setResponding(prev => ({ ...prev, [meetingId]: true }));
    try {
      const payload = { reason: declineReasons[meetingId] || '' };
      await axios.put(`http://localhost:5000/api/meetings/${meetingId}/reject`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Meeting rejected successfully');
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject meeting');
    } finally {
      setResponding(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  const handleReasonChange = (meetingId, value) => {
    setDeclineReasons(prev => ({ ...prev, [meetingId]: value }));
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold text-green-700 mb-6">Incoming Meeting Requests</h1>
      {loading ? (
        <p>Loading meeting requests...</p>
      ) : meetings.length === 0 ? (
        <p className="text-green-800">No incoming meeting requests.</p>
      ) : (
        <div className="space-y-6">
          {meetings.map(meeting => (
            <div key={meeting.id} className="bg-green-50 p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-green-800">{meeting.purpose}</h2>
              <p className="text-green-700">From: User ID {meeting.requestor_id}</p>
              <p className="text-green-700">
                When: {new Date(meeting.schedule_start).toLocaleString()} - {new Date(meeting.schedule_end).toLocaleString()}
              </p>
              <p className="text-green-700">
                Video Meet:{" "}
                <a
                  href={meeting.google_meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {meeting.google_meet_link}
                </a>
              </p>
              {meeting.notes && <p className="text-green-700">Notes: {meeting.notes}</p>}

              <div className="mt-4 flex flex-col md:flex-row md:space-x-4">
                <button
                  onClick={() => handleApprove(meeting.id)}
                  disabled={responding[meeting.id]}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mb-2 md:mb-0"
                >
                  {responding[meeting.id] ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(meeting.id)}
                  disabled={responding[meeting.id]}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {responding[meeting.id] ? 'Processing...' : 'Decline'}
                </button>
              </div>

              <div className="mt-2">
                <label className="block text-green-800 font-medium">
                  Reason (if declining):
                </label>
                <input
                  type="text"
                  value={declineReasons[meeting.id] || ''}
                  onChange={(e) => handleReasonChange(meeting.id, e.target.value)}
                  placeholder="Enter reason for declining"
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncomingMeetings;
