'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [key: string]: number };
  isActive: boolean;
  totalVotes: number;
  voters: Set<string>;
  timeLimit?: number; // in seconds
}

interface PollSession {
  code: string;
  polls: Poll[];
  participants: Set<string>;
  currentPollIndex: number;
}

export default function AdminPollsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<any>(null);
  const [pollSessions, setPollSessions] = useState<PollSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PollSession | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [timeLimit, setTimeLimit] = useState(30); // default 30 seconds
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
      socketInstance.emit('getPollSessions');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server. Please try again.');
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('pollSessionsList', (sessions: PollSession[]) => {
      console.log('Received sessions:', sessions);
      setPollSessions(sessions);
    });

    socketInstance.on('pollSessionCreated', ({ code }: { code: string }) => {
      console.log('New session created:', code);
      const newSession: PollSession = {
        code,
        polls: [],
        participants: new Set(),
        currentPollIndex: -1,
      };
      setPollSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);
      setError(null);
    });

    socketInstance.on('pollSessionUpdate', (updatedSession: PollSession) => {
      console.log('Session updated:', updatedSession);
      setPollSessions(prev => prev.map(s => s.code === updatedSession.code ? updatedSession : s));
      if (currentSession?.code === updatedSession.code) {
        setCurrentSession(updatedSession);
      }
    });

    socketInstance.on('error', ({ message }: { message: string }) => {
      console.error('Socket error:', message);
      setError(message);
    });

    setSocket(socketInstance);

    return () => {
      console.log('Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, []);

  const handleCreateSession = () => {
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    if (socket) {
      console.log('Creating new session...');
      setError(null);
      socket.emit('createPollSession');
    } else {
      setError('Socket connection not established');
    }
  };

  const handleCreatePoll = () => {
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    if (socket && currentSession && question && options.every(opt => opt.trim())) {
      const pollData = {
        code: currentSession.code,
        question,
        options: options.filter(opt => opt.trim()),
        timeLimit,
      };
      
      if (editingPoll) {
        socket.emit('updatePoll', { ...pollData, pollId: editingPoll.id });
        setEditingPoll(null);
      } else {
        socket.emit('createPoll', pollData);
      }
      
      setQuestion('');
      setOptions(['', '', '', '']);
      setTimeLimit(30);
      setError(null);
    } else {
      setError('Please fill in all fields');
    }
  };

  const handleStartPoll = (pollId: string) => {
    if (socket && currentSession) {
      socket.emit('startPoll', { code: currentSession.code, pollId });
    }
  };

  const handleEndPoll = (pollId: string) => {
    if (socket && currentSession) {
      socket.emit('endPoll', { code: currentSession.code, pollId });
    }
  };

  const handleDeletePoll = (pollId: string) => {
    if (socket && currentSession) {
      socket.emit('deletePoll', { code: currentSession.code, pollId });
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setQuestion(poll.question);
    setOptions([...poll.options, ...Array(4 - poll.options.length).fill('')]);
    setTimeLimit(poll.timeLimit || 30);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Poll Management</h1>
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <button
              onClick={handleCreateSession}
              disabled={!isConnected}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isConnected
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create New Session
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-6 mb-8">
          {pollSessions.map((session) => (
            <div
              key={session.code}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all ${
                currentSession?.code === session.code ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setCurrentSession(session)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Session: {session.code}</h2>
                  <p className="text-sm text-gray-600">
                    Participants: {session.participants.size}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  {session.polls.length} polls
                </div>
              </div>
            </div>
          ))}
        </div>

        {currentSession && (
          <>
            {/* Create/Edit Poll Form */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">
                {editingPoll ? 'Edit Poll' : 'Create New Poll'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question</label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Enter your question"
                  />
                </div>
                {options.map((option, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium mb-2">
                      Option {index + 1}
                    </label>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder={`Enter option ${index + 1}`}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Time Limit (seconds)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg"
                    min="10"
                    max="300"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleCreatePoll}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {editingPoll ? 'Update Poll' : 'Add Poll'}
                  </button>
                  {editingPoll && (
                    <button
                      onClick={() => {
                        setEditingPoll(null);
                        setQuestion('');
                        setOptions(['', '', '', '']);
                        setTimeLimit(30);
                      }}
                      className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Polls List */}
            <div className="space-y-6">
              {currentSession.polls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{poll.question}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Time Limit: {poll.timeLimit || 30} seconds
                      </p>
                      <p className="text-sm text-gray-600">
                        Total Votes: {poll.totalVotes} / {currentSession.participants.size}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!poll.isActive ? (
                        <button
                          onClick={() => handleStartPoll(poll.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Start Poll
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEndPoll(poll.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          End Poll
                        </button>
                      )}
                      <button
                        onClick={() => handleEditPoll(poll)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePoll(poll.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {poll.options.map((option, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>{option}</span>
                          <span>{poll.votes[option] || 0} votes</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${((poll.votes[option] || 0) / poll.totalVotes) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 