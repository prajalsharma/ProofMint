'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [key: string]: number };
  isActive: boolean;
  totalVotes: number;
  voters: Set<string>;
  timeLimit?: number;
}

interface PollSession {
  code: string;
  polls: Poll[];
  participants: Set<string>;
  currentPollIndex: number;
}

export default function PollsPage() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<any>(null);
  const [pollSession, setPollSession] = useState<PollSession | null>(null);
  const [pollCode, setPollCode] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001');
    setSocket(socketInstance);

    socketInstance.on('pollSessionJoined', ({ session }: { session: PollSession }) => {
      setPollSession(session);
      setError(null);
    });

    socketInstance.on('pollSessionUpdate', (updatedSession: PollSession) => {
      setPollSession(updatedSession);
      // Reset time left when a new poll starts
      const currentPoll = updatedSession.polls[updatedSession.currentPollIndex];
      if (currentPoll?.isActive) {
        setTimeLeft(currentPoll.timeLimit || 30);
      } else {
        setTimeLeft(null);
      }
    });

    socketInstance.on('error', ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev !== null ? prev - 1 : null);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft]);

  const handleJoinSession = () => {
    if (socket && pollCode.trim()) {
      socket.emit('joinPollSession', { code: pollCode.trim() });
    }
  };

  const handleVote = (pollId: string, option: string) => {
    if (socket && pollSession) {
      socket.emit('vote', { code: pollSession.code, pollId, option });
      setSelectedOptions(prev => ({ ...prev, [pollId]: option }));
    }
  };

  if (!pollSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Join a Poll Session</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Session Code</label>
              <input
                type="text"
                value={pollCode}
                onChange={(e) => setPollCode(e.target.value.toUpperCase())}
                className="w-full p-2 border rounded-lg font-mono"
                placeholder="Enter session code"
                maxLength={6}
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              onClick={handleJoinSession}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPoll = pollSession.polls[pollSession.currentPollIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">Session: {pollSession.code}</h2>
          <p className="text-sm text-gray-600">
            Participants: {pollSession.participants.size}
          </p>
        </div>

        {!currentPoll ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600">Waiting for the first poll to start...</p>
          </div>
        ) : !currentPoll.isActive ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600">Waiting for the next poll to start...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{currentPoll.question}</h2>
              {timeLeft !== null && (
                <div className="text-lg font-semibold">
                  Time Left: {timeLeft}s
                </div>
              )}
            </div>
            <div className="space-y-4">
              {currentPoll.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleVote(currentPoll.id, option)}
                  disabled={selectedOptions[currentPoll.id] !== undefined}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    selectedOptions[currentPoll.id] === option
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } ${selectedOptions[currentPoll.id] !== undefined ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    <span className="text-sm">
                      {currentPoll.votes[option] || 0} votes
                    </span>
                  </div>
                  {currentPoll.votes[option] && (
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(currentPoll.votes[option] / currentPoll.totalVotes) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedOptions[currentPoll.id] && (
              <p className="mt-4 text-center text-gray-500">You have voted!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 