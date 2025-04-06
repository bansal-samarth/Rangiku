import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! How can I help you with your visit today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  // Define application context based on the current page
  const getPageContext = () => {
    const path = location.pathname;
    
    // System context that explains the application
    const systemContext = `
      You are a helpful assistant for a visitor management system called VisitTrack.

      This application helps businesses manage:
      - Visitor registration
      - Visitor check-in and check-out
      - Meeting scheduling and approvals
      - Viewing pending and approved meetings
      - Monitoring visitor and meeting status

      Do not mention features like badge printing, feedback forms, meeting room booking, or visitor statistics — they are not part of this system.

      Always reply in a concise, friendly, and easy-to-understand way.
      Focus on practical help directly related to the current page.
      Avoid generic advice or off-topic responses.
      `;

    
    // Page-specific context
    if (path.includes('/visitors/new')) {
      return systemContext + `
        The user is currently on the "New Visitor" page.
        This page allows staff to register new visitors by entering details like:
        - Visitor name, email, phone
        - Purpose of visit
        - Host/person being visited
        - Expected arrival/departure times
        - Any special accommodations needed
        Help with filling forms, understanding required fields, or the visitor registration process.
      `;
    } else if (path.includes('/visitors/check-in')) {
      return systemContext + `
        The user is currently on the "Check-In" page.
        This page is used to:
        - Check in visitors who have arrived
        - Confirm visitor identity
        - Record actual arrival time
        - Print visitor badges if applicable
        - Notify hosts of visitor arrival
        Offer help with the check-in procedure, troubleshooting, or policy questions.
      `;
    } else if (path.includes('/visitors/check-out')) {
      return systemContext + `
        The user is currently on the "Check-Out" page.
        This page is used to:
        - Record when visitors leave the premises
        - Collect any visitor badges or credentials
        - Record feedback if applicable
        Offer help with the check-out procedure or related policies.
      `;
    } else if (path.includes('/visitors/pending')) {
      return systemContext + `
        The user is currently on the "Pending Visitors" page.
        This page shows all visitors who:
        - Have been registered but haven't arrived yet
        - Need approval or additional processing
        Help with managing pending visitors, sending reminders, or rescheduling.
      `;
    } else if (path.includes('/meetings/request')) {
      return systemContext + `
        The user is currently on the "Request Meeting" page.
        This page allows staff to:
        - Schedule new meetings with visitors
        - Select meeting rooms
        - Set meeting duration
        - Add meeting agenda and requirements
        Offer help with the meeting request process or best practices.
      `;
    } else if (path.includes('/meetings/respond')) {
      return systemContext + `
        The user is currently on the "Incoming Meeting Requests" page.
        This page shows meeting requests that:
        - Need approval or rejection
        - May need rescheduling or modification
        Help with the process of responding to meeting requests or common considerations.
      `;
    } else if (path.includes('/meetings/status')) {
      return systemContext + `
        The user is currently on the "Meeting Status" page.
        This page provides an overview of:
        - Upcoming meetings
        - Meeting history
        - Status of meeting requests
        Help with interpreting meeting statuses or managing meetings.
      `;
    } else if (path.includes('/dashboard')) {
      return systemContext + `
        The user is currently on the Dashboard home page.
        This dashboard provides:
        - Overview of today's visitors and meetings
        - Recent activity summary
        - Quick access to key functions
        - Statistics on visitor traffic
        Help with navigating the dashboard or understanding the metrics displayed.
      `;
    }
    
    // Default context if no specific page is matched
    return systemContext + `
      Help the user navigate the visitor management system, understand its features,
      or resolve any issues they might be experiencing with the application.
    `;
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add this to your ChatBot component
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await axios.get(`/api/chat/history?path=${location.pathname}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.data.messages && response.data.messages.length > 0) {
          setMessages(response.data.messages);
        } else {
          // Reset to default welcome message if no history
          setMessages([
            { role: 'assistant', content: 'Hi there! How can I help you with your visit today?' }
          ]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen, location.pathname]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset chat when changing pages
  useEffect(() => {
    // Optional: You could reset chat or add a system message when page changes
    // setMessages([{ role: 'assistant', content: `I see you're now on the ${getCurrentPageName()} page. How can I help?` }]);
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
  
    try {
      // Save user message to database
      await axios.post('/api/chat/message', {
        content: input,
        role: 'user',
        path: location.pathname
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      // Prepare context-aware messages
      const contextMessage = { role: 'system', content: getPageContext() };
      const messageHistory = [...messages, userMessage];
      
      // Only include the most recent messages to stay within token limits
      const recentMessages = messageHistory.slice(-5);
      
      // Call Groq API with LLaMA model and context
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-8b-8192',
        messages: [contextMessage, ...recentMessages],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json'
        }
      });
  
      const assistantResponse = response.data.choices[0].message.content;
      
      // Save assistant response to database
      await axios.post('/api/chat/message', {
        content: assistantResponse,
        role: 'assistant',
        path: location.pathname
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: assistantResponse }
      ]);
    } catch (error) {
      console.error('Error in chat process:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat button */}
      <button
        onClick={toggleChat}
        className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
        aria-label="Open help chat"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border overflow-hidden">
          <div className="bg-green-600 text-white p-3">
            <h3 className="font-medium">VisitTrack Assistant</h3>
          </div>
          
          <div className="h-80 overflow-y-auto p-3">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}
              >
                <div 
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-center text-gray-500">
                <div className="flex justify-center items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="border-t p-2">
            <div className="flex">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Type your question..."
                className="flex-1 border rounded-l-lg p-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 rounded-r-lg hover:bg-green-700 disabled:bg-green-300"
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;