import { useState, useEffect } from "react";

// Component to display Firebase metadata with real-time updates in JSON format
export default function FirebaseMetadata({ isConnected }) {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    // Connect to Firebase SensorData using SSE
    let es;
    try {
      const FB_URL = "https://minor-project-mt-default-rtdb.asia-southeast1.firebasedatabase.app";
      es = new EventSource(`${FB_URL}/SensorData.json`);
      
      es.onopen = () => {
        console.log("Firebase connection opened");
      };
      
      es.onerror = () => {
        console.log("Firebase connection error");
        setLoading(false);
      };
      
      es.addEventListener("put", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.data !== undefined) {
            processFirebaseData(data.data);
          }
        } catch (err) {
          console.error("Error parsing put event:", err);
        }
      });
      
      es.addEventListener("patch", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.data) {
            processFirebaseData(data.data);
          }
        } catch (err) {
          console.error("Error parsing patch event:", err);
        }
      });
    } catch (err) {
      console.error("Error creating EventSource:", err);
      setLoading(false);
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [isConnected]);

  const processFirebaseData = (rawData) => {
    if (!rawData || typeof rawData !== "object") {
      setMetadata([]);
      setLoading(false);
      return;
    }

    const entries = Object.entries(rawData);
    
    // Convert to array with timestamp for sorting
    const processed = entries.map(([key, value]) => ({
      id: key,
      ...value,
      timestamp: value.Timestamp || value.timestamp || 0,
      receivedAt: Date.now()
    }));

    // Sort by timestamp (latest first)
    const sorted = processed.sort((a, b) => (b.timestamp || b.receivedAt) - (a.timestamp || a.receivedAt));
    
    setMetadata(sorted);
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown time";
    if (timestamp > 1000000000000) { // Milliseconds
      return new Date(timestamp).toLocaleString();
    } else if (timestamp > 1000000000) { // Seconds
      return new Date(timestamp * 1000).toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#84a084" }}>
        Loading Firebase metadata...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#84a084" }}>
        <p style={{ marginBottom: "10px" }}>🔴 Firebase not connected</p>
        <p>Connect to Firebase to see live metadata</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: "#182818", margin: 0 }}>
          Firebase Live Metadata
        </h2>
        <p style={{ fontSize: 12, color: "#84a084", marginTop: 4 }}>
          Latest sensor readings from Firebase (sorted newest first)
        </p>
      </div>

      {metadata.length === 0 ? (
        <div style={{ textAlign: "center", color: "#84a084", padding: "40px 0" }}>
          <p>No sensor data available yet</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Waiting for data from ESP32 sensors...
          </p>
        </div>
      ) : (
        <div style={{ 
          maxHeight: "calc(100vh - 180px)",
          overflowY: "auto",
          background: "#1e1e1e",
          borderRadius: "8px",
          padding: "16px",
          fontFamily: "monospace",
          fontSize: 13,
          color: "#d4d4d4"
        }}>
          {metadata.map((entry, index) => {
            // Create clean JSON object without internal fields
            const cleanEntry = { ...entry };
            delete cleanEntry.id;
            delete cleanEntry.receivedAt;
            
            return (
              <div key={entry.id || index} style={{ marginBottom: "16px" }}>
                <div style={{ 
                  color: "#569cd6", 
                  fontSize: "12px", 
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between"
                }}>
                  <span>Reading #{metadata.length - index}</span>
                  <span style={{ color: "#6a9955" }}>ID: {entry.id?.substring(0, 8) || 'unknown'}</span>
                </div>
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: "pre-wrap", 
                  wordBreak: "break-word",
                  background: "#2d2d2d",
                  padding: "12px",
                  borderRadius: "4px",
                  border: "1px solid #3e3e3e"
                }}>
                  {JSON.stringify(cleanEntry, null, 2)}
                </pre>
                <div style={{ 
                  color: "#6a9955", 
                  fontSize: "11px", 
                  marginTop: "4px",
                  textAlign: "right"
                }}>
                  Received: {new Date(entry.receivedAt).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
