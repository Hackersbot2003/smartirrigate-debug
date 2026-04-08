import React, { useState, useRef, useEffect } from 'react';

const AIAssistant = ({ isOpen, onClose, sensorData, weatherData, agroData, position = { right: 24, bottom: 24 } }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cropInfo, setCropInfo] = useState({ cropType: '', plantingDate: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCropForm, setShowCropForm] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = selectedImage ? 'Analyzing crop image...' : input;
    const newMessage = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);
    setSelectedImage(null);

    try {

      const requestBody = {
        question: input,
        sensorData: sensorData || {},
        weatherData: weatherData || null,
        agroData: agroData || {},
        chatHistory: messages.slice(-6),
        ...cropInfo,
        imageData: selectedImage
      };

      const response = await fetch('http://localhost:5000/api/ai-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        text: data.reply,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I couldn\'t reach the AI assistant right now. Please try again later.',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setShowCropForm(true);
  };

  const saveCropInfo = () => {
    setShowCropForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 w-96 h-[40vh] max-h-[500px] flex flex-col bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-200" style={{
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      border: "1px solid #e0ece0",
      background: "#fff",
      right: `${position.right}px`,
      bottom: `${position.bottom}px`,
      width: "28rem",
      height: "80vh",
      maxHeight: "700px"
    }}>
      {/* Header */}
      <div className="bg-green-700 text-white p-3 flex justify-between items-center" style={{
        background: "linear-gradient(135deg,#1a6e1a,#44c044)",
        color: "#fff"
      }}>
        <h2 className="text-lg font-bold" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800 }}>
          🤖 AI Assistant
        </h2>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-lg"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      {/* Crop Information Form */}
      {showCropForm && (
        <div className="p-3 border-b bg-yellow-50 max-h-40 overflow-y-auto" style={{
          background: "#fdf4e6",
          borderColor: "#f0d090"
        }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#a06010", fontFamily: "'Sora',sans-serif" }}>Crop Info</h3>
          <div className="space-y-2">
            <select
              value={cropInfo.cropType}
              onChange={(e) => setCropInfo(prev => ({ ...prev, cropType: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{
                padding: "6px 10px",
                border: "1px solid #e0ece0",
                borderRadius: "8px",
                background: "#f2f5f2",
                color: "#182818",
                fontSize: "12px"
              }}
            >
              <option value="">Crop type</option>
              <option value="wheat">Wheat</option>
              <option value="rice">Rice</option>
              <option value="maize">Maize</option>
              <option value="corn">Corn</option>
              <option value="tomato">Tomato</option>
              <option value="potato">Potato</option>
              <option value="onion">Onion</option>
              <option value="chilli">Chilli</option>
              <option value="cotton">Cotton</option>
              <option value="sugarcane">Sugarcane</option>
              <option value="groundnut">Groundnut</option>
              <option value="soybean">Soybean</option>
              <option value="other">Other</option>
            </select>
            <input
              type="date"
              value={cropInfo.plantingDate}
              onChange={(e) => setCropInfo(prev => ({ ...prev, plantingDate: e.target.value }))}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{
                padding: "6px 10px",
                border: "1px solid #e0ece0",
                borderRadius: "8px",
                background: "#f2f5f2",
                color: "#182818",
                fontSize: "12px"
              }}
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={saveCropInfo}
                disabled={!cropInfo.cropType || !cropInfo.plantingDate}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-xs"
                style={{
                  background: cropInfo.cropType && cropInfo.plantingDate ? "#27a627" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  cursor: cropInfo.cropType && cropInfo.plantingDate ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  fontFamily: "'Sora',sans-serif"
                }}
              >
                Start Chat
              </button>
              <button
                onClick={startNewSession}
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                style={{
                  background: "#a0a0a0",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "'Sora',sans-serif"
                }}
              >
                New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50" style={{
        background: "#f2f5f2",
        flex: 1,
        overflowY: "auto",
        padding: "12px"
      }}>
        {messages.length === 0 && !showCropForm && (
          <div className="text-center text-gray-500 text-sm mt-4" style={{ color: "#84a084" }}>
            <div className="text-2xl mb-2">🌾</div>
            <h3 className="font-medium" style={{ color: "#456045", fontFamily: "'Sora',sans-serif" }}>Ask me anything!</h3>
            <p className="mt-1" style={{ color: "#84a084", fontSize: "11px" }}>About crops, irrigation, or upload images.</p>
            <div className="mt-3 text-xs space-y-1">
              <div className="bg-blue-50 p-2 rounded" style={{
                background: "#eef8ee",
                border: "1px solid #a0d0a0",
                color: "#1a6e1a",
                fontSize: "10px",
                margin: "4px 0"
              }}>• Should I water today?</div>
              <div className="bg-green-50 p-2 rounded" style={{
                background: "#eef8ee",
                border: "1px solid #a0d0a0",
                color: "#1a6e1a",
                fontSize: "10px",
                margin: "4px 0"
              }}>• Soil: {sensorData?.soilMoisture?.toFixed(1)}%</div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-1.5 rounded-lg text-sm ${
                message.sender === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
              style={{
                maxWidth: "calc(100% - 8px)",
                padding: "8px 12px",
                borderRadius: message.sender === 'user' ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                background: message.sender === 'user' ? "#27a627" : "#e0ece0",
                color: message.sender === 'user' ? "#fff" : "#182818",
                fontSize: "12px",
                wordWrap: "break-word"
              }}
            >
              <div>{message.text}</div>
              <div className="text-xs opacity-70 mt-0.5" style={{ fontSize: "9px", opacity: 0.7 }}>{message.timestamp}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm" style={{
              background: "#e0ece0",
              color: "#182818",
              padding: "8px 12px",
              borderRadius: "12px 12px 12px 4px",
              fontSize: "12px"
            }}>
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600" style={{
                  width: "12px",
                  height: "12px",
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: "transparent",
                  borderTopColor: "#27a627"
                }}></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 border-t bg-white" style={{
        borderTop: "1px solid #e0ece0",
        padding: "8px",
        background: "#fff"
      }}>
        {selectedImage && (
          <div className="mb-2 flex items-center justify-center" style={{ marginBottom: "8px" }}>
            <img src={selectedImage} alt="Selected" className="w-12 h-12 object-cover rounded" style={{
              width: "40px",
              height: "40px",
              objectFit: "cover",
              borderRadius: "6px",
              border: "1px solid #e0ece0"
            }} />
            <button
              onClick={() => setSelectedImage(null)}
              className="text-red-500 hover:text-red-700 ml-1 text-sm"
              style={{
                marginLeft: "6px",
                color: "#d94f4f",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="flex items-end space-x-1" style={{ gap: "4px", alignItems: "flex-end" }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded-full text-sm"
            title="Upload Image"
            style={{
              padding: "6px",
              background: "#f2f5f2",
              border: "1px solid #e0ece0",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#27a627"
            }}
          >
            📷
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <div className="flex-1" style={{ flex: 1 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about crops..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              rows="2"
              disabled={showCropForm}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #e0ece0",
                borderRadius: "8px",
                background: "#f2f5f2",
                color: "#182818",
                fontSize: "12px",
                resize: "none",
                outline: "none",
                fontFamily: "'Plus Jakarta Sans',sans-serif"
              }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={(!input.trim() && !selectedImage) || isLoading || showCropForm}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{
              background: (!input.trim() && !selectedImage) || isLoading || showCropForm ? "#ccc" : "#27a627",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: (!input.trim() && !selectedImage) || isLoading || showCropForm ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'Sora',sans-serif",
              minWidth: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;