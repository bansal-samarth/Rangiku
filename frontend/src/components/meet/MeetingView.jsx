// MeetingView.jsx
import React from 'react';
import { useMeeting, useParticipant } from '@videosdk.live/react-sdk';

export const MeetingView = ({ onLeave }) => {
  const { join, participants, leave } = useMeeting();

  React.useEffect(() => {
    join();
  }, [join]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Video Call</h2>
      <div className="grid grid-cols-2 gap-4">
        {[...participants.keys()].map((participantId) => (
          <ParticipantView key={participantId} participantId={participantId} />
        ))}
      </div>
      <button
        className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
        onClick={() => {
          leave();
          onLeave();
        }}
      >
        Leave Meeting
      </button>
    </div>
  );
};

const ParticipantView = ({ participantId }) => {
  const { webcamStream, micStream, isLocal } = useParticipant(participantId);

  return (
    <div className="border rounded p-2">
      <h4 className="font-semibold mb-2">{isLocal ? "You" : "Participant"}</h4>
      {webcamStream ? (
        <video
          autoPlay
          playsInline
          ref={(videoRef) => {
            if (videoRef) videoRef.srcObject = new MediaStream([webcamStream.track]);
          }}
          className="w-full h-40 object-cover"
        />
      ) : (
        <p>No webcam</p>
      )}
    </div>
  );
};
