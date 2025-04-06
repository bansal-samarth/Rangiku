import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import RecordRTC from 'recordrtc';

const MeetingStatus = () => {
  const navigate = useNavigate();
  const [incomingMeetings, setIncomingMeetings] = useState([]);
  const [outgoingMeetings, setOutgoingMeetings] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const callContainerRef = useRef(null);
  const recorderRef = useRef(null);

  const appID = 762424033;
  const serverSecret = 'b8cd9a5d03a3a4aa46a23da35377d22e';

  const groupByDate = (meetings) => {
    return meetings.reduce((groups, meeting) => {
      const dateKey = new Date(meeting.schedule_start).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
      return groups;
    }, {});
  };

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      try {
        const [incomingRes, outgoingRes] = await Promise.all([
          axios.get('http://localhost:5000/api/meetings/received', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get('http://localhost:5000/api/meetings/outgoing', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
        ]);
        setIncomingMeetings(incomingRes.data.meetings);
        setOutgoingMeetings(outgoingRes.data.meetings);
      } catch (error) {
        toast.error('Failed to fetch meeting data');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const incomingByDate = groupByDate(incomingMeetings);
  const outgoingByDate = groupByDate(outgoingMeetings);

  const handleJoinCall = (meeting) => {
    setSelectedMeeting(meeting);
    setShowModal(true);
    setTimeout(() => {
      startZegoCall(meeting);
      startRecording();
    }, 500);
  };

  const closeModal = () => {
    stopAndSaveRecording(); // This will now trigger the graph generation directly
    setShowModal(false);
  };
  
  const stopAndSaveRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(async () => {
        const blob = recorderRef.current.getBlob();
        setAudioBlob(blob);
  
        try {
          const formData = new FormData();
          formData.append('file', blob, 'meeting-audio.webm');
  
          const res = await axios.post('https://eae3-34-87-64-3.ngrok-free.app/graph', formData);
          console.log(res);
          setGraphData(res.data);
          setShowGraphModal(true);
          toast.success('Knowledge graph generated');
        } catch (err) {
          console.error(err);
          toast.error('Failed to generate knowledge graph');
        }
      });
    }
  };
  

  const startZegoCall = (meeting) => {
    const roomID = `room-${meeting.id}`;
    const userID = String(Date.now());
    const userName = localStorage.getItem('username') || 'Guest';

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      userName
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
      container: callContainerRef.current,
      sharedLinks: [{ name: 'Copy Link', url: window.location.href }],
      scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
      });
      recorderRef.current.startRecording();
      toast.success('Recording started');
    } catch (err) {
      console.error(err);
      toast.error('Failed to access microphone');
    }
  };



  const handleGenerateGraph = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append('audio', audioBlob, 'meeting-audio.webm');

    try {
      const res = await axios.post('http://localhost:5000/api/graph', formData);
      setGraphData(res.data);
      setShowGraphModal(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate knowledge graph');
    }
  };

  const MeetingCard = ({ meeting, type }) => {
    const recipientStatuses =
      type === 'sent'
        ? meeting.recipients.map(r => `${r.recipient_id}: ${r.status}`).join(', ')
        : meeting.status || 'pending';

    return (
      <div className="bg-white rounded-md shadow p-4 mb-3 border-l-4 border-green-600">
        <h3 className="font-semibold text-green-800">{meeting.purpose}</h3>
        <p className="text-green-700 text-sm">
          {new Date(meeting.schedule_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
          {new Date(meeting.schedule_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {type === 'sent' ? (
          <p className="text-green-700 text-xs mt-1">Recipient Statuses: {recipientStatuses}</p>
        ) : (
          <p className="text-green-700 text-xs mt-1">Your Response: {recipientStatuses}</p>
        )}
        {meeting.notes && <p className="text-green-700 text-xs mt-1">Notes: {meeting.notes}</p>}

        <div className="mt-4">
          <button
            onClick={() => handleJoinCall(meeting)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Join Video Call
          </button>
        </div>
      </div>
    );
  };

  const renderMeetingGroup = (groupedMeetings, sectionType) => {
    return Object.entries(groupedMeetings).map(([date, meetings]) => (
      <div key={date} className="mb-8">
        <h2 className="text-lg font-bold text-green-800 mb-4 border-b pb-1">{date}</h2>
        {meetings.map(meeting => (
          <MeetingCard key={meeting.id} meeting={meeting} type={sectionType} />
        ))}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <h1 className="text-3xl font-bold text-green-800 mb-8 text-center">Meeting Status Calendar</h1>
      {loading ? (
        <p className="text-green-800 text-center">Loading meetings...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-green-700 mb-4 border-b pb-2">Meetings I Sent</h2>
            {Object.keys(outgoingByDate).length === 0 ? (
              <p className="text-green-700">No sent meetings.</p>
            ) : (
              renderMeetingGroup(outgoingByDate, 'sent')
            )}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-green-700 mb-4 border-b pb-2">Meetings I Received</h2>
            {Object.keys(incomingByDate).length === 0 ? (
              <p className="text-green-700">No received meetings.</p>
            ) : (
              renderMeetingGroup(incomingByDate, 'received')
            )}
          </div>
        </div>
      )}

      {/* ZEGOCLOUD modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white w-[95%] md:w-[90%] h-[90vh] rounded-lg shadow-lg p-4 relative">
            <div ref={callContainerRef} className="w-full h-full rounded" />
            <button
              onClick={closeModal}
              className="absolute top-2 right-4 text-sm text-gray-600 hover:text-red-600"
            >
              Close
            </button>

            {audioBlob && (
              <button
                onClick={handleGenerateGraph}
                className="absolute bottom-4 left-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Get Knowledge Graph
              </button>
            )}
          </div>
        </div>
      )}

      {/* Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white w-11/12 md:w-3/4 h-[80vh] overflow-auto p-6 rounded shadow-lg relative">
            <h2 className="text-xl font-bold mb-4 text-purple-700">Knowledge Graph</h2>
            <div dangerouslySetInnerHTML={{ __html: graphData?.html || '' }} />
            <button
              onClick={() => setShowGraphModal(false)}
              className="absolute top-2 right-4 text-sm text-gray-600 hover:text-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingStatus;
