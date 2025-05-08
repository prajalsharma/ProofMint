import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

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

interface PollStore {
  [code: string]: PollSession;
}

const pollSessions: PollStore = {};

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create a new poll session
  socket.on('createPollSession', () => {
    console.log('Received createPollSession request from:', socket.id);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated session code:', code);
      
      const session: PollSession = {
        code,
        polls: [],
        participants: new Set(),
        currentPollIndex: -1,
      };
      
      pollSessions[code] = session;
      console.log('Created new session:', session);
      
      socket.emit('pollSessionCreated', { code });
      console.log('Emitted pollSessionCreated event with code:', code);
    } catch (error) {
      console.error('Error creating poll session:', error);
      socket.emit('error', { message: 'Failed to create poll session' });
    }
  });

  // Join a poll session
  socket.on('joinPollSession', (data: { code: string }) => {
    console.log('Received joinPollSession request:', data);
    const session = pollSessions[data.code];
    if (session) {
      socket.join(data.code);
      session.participants.add(socket.id);
      socket.emit('pollSessionJoined', { session });
      console.log('Client joined session:', data.code);
    } else {
      console.log('Invalid poll code:', data.code);
      socket.emit('error', { message: 'Invalid poll code' });
    }
  });

  // Create a new poll within a session
  socket.on('createPoll', (data: { code: string; question: string; options: string[]; timeLimit?: number }) => {
    const session = pollSessions[data.code];
    if (session) {
      const poll: Poll = {
        id: uuidv4(),
        question: data.question,
        options: data.options,
        votes: {},
        isActive: false,
        totalVotes: 0,
        voters: new Set(),
        timeLimit: data.timeLimit || 30,
      };
      session.polls.push(poll);
      io.to(data.code).emit('pollSessionUpdate', session);
    }
  });

  // Update an existing poll
  socket.on('updatePoll', (data: { code: string; pollId: string; question: string; options: string[]; timeLimit?: number }) => {
    const session = pollSessions[data.code];
    if (session) {
      const pollIndex = session.polls.findIndex(p => p.id === data.pollId);
      if (pollIndex !== -1) {
        session.polls[pollIndex] = {
          ...session.polls[pollIndex],
          question: data.question,
          options: data.options,
          timeLimit: data.timeLimit || 30,
        };
        io.to(data.code).emit('pollSessionUpdate', session);
      }
    }
  });

  // Delete a poll
  socket.on('deletePoll', (data: { code: string; pollId: string }) => {
    const session = pollSessions[data.code];
    if (session) {
      session.polls = session.polls.filter(p => p.id !== data.pollId);
      if (session.currentPollIndex >= session.polls.length) {
        session.currentPollIndex = session.polls.length - 1;
      }
      io.to(data.code).emit('pollSessionUpdate', session);
    }
  });

  // Start a poll
  socket.on('startPoll', (data: { code: string; pollId: string }) => {
    const session = pollSessions[data.code];
    if (session) {
      const pollIndex = session.polls.findIndex(p => p.id === data.pollId);
      if (pollIndex !== -1) {
        // End any currently active poll
        session.polls.forEach(p => p.isActive = false);
        
        // Start the new poll
        session.polls[pollIndex].isActive = true;
        session.currentPollIndex = pollIndex;
        
        // Set timer to end the poll
        const poll = session.polls[pollIndex];
        if (poll.timeLimit) {
          setTimeout(() => {
            if (poll.isActive) {
              poll.isActive = false;
              io.to(data.code).emit('pollSessionUpdate', session);
            }
          }, poll.timeLimit * 1000);
        }
        
        io.to(data.code).emit('pollSessionUpdate', session);
      }
    }
  });

  // End a poll
  socket.on('endPoll', (data: { code: string; pollId: string }) => {
    const session = pollSessions[data.code];
    if (session) {
      const poll = session.polls.find(p => p.id === data.pollId);
      if (poll) {
        poll.isActive = false;
        io.to(data.code).emit('pollSessionUpdate', session);
      }
    }
  });

  // Handle votes
  socket.on('vote', (data: { code: string; pollId: string; option: string }) => {
    const session = pollSessions[data.code];
    if (session) {
      const poll = session.polls.find(p => p.id === data.pollId);
      if (poll && poll.isActive && !poll.voters.has(socket.id)) {
        poll.votes[data.option] = (poll.votes[data.option] || 0) + 1;
        poll.totalVotes++;
        poll.voters.add(socket.id);
        io.to(data.code).emit('pollSessionUpdate', session);
      }
    }
  });

  // Get all poll sessions (for admin)
  socket.on('getPollSessions', () => {
    console.log('Received getPollSessions request from:', socket.id);
    const sessions = Object.values(pollSessions);
    console.log('Sending sessions list:', sessions);
    socket.emit('pollSessionsList', sessions);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove participant from all sessions
    Object.values(pollSessions).forEach(session => {
      session.participants.delete(socket.id);
    });
  });
});

const PORT = process.env.WEBSOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 