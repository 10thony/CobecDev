// src/App.tsx or any other React component
import React, { useState } from "react";
import { chatWithMongoData } from "../lib/mongoChatService";

function ChatComponent() {
  const [userPrompt, setUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"jobs" | "resumes" | "both">("both");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userPrompt.trim()) return;

    setIsLoading(true);
    setAiResponse("");
    setError(null);

    try {
      // Call the client-side MongoDB chat function
      const response = await chatWithMongoData({
        query: userPrompt,
        searchType: searchType,
        limit: 5, // Limit results for better performance
      });
      
      setAiResponse(response);
      setUserPrompt(""); // Clear the input
    } catch (err) {
      console.error("Failed to get AI response:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>MongoDB-Connected Chat</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        This chat searches through your actual MongoDB collections (181 job postings and 100 resumes) 
        and provides responses based only on the data found in your database.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="searchType" style={{ display: "block", marginBottom: "5px" }}>
            Search Type:
          </label>
          <select
            id="searchType"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "jobs" | "resumes" | "both")}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="both">Jobs & Resumes</option>
            <option value="jobs">Jobs Only</option>
            <option value="resumes">Resumes Only</option>
          </select>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="userPrompt" style={{ display: "block", marginBottom: "5px" }}>
            Your Query:
          </label>
          <textarea
            id="userPrompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Try: 'Find resumes for Computer Engineer positions with software development skills'"
            rows={5}
            style={{ 
              width: "100%", 
              padding: "10px", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              fontFamily: "inherit"
            }}
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: isLoading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer"
          }}
        >
          {isLoading ? "Searching..." : "Search Database"}
        </button>
      </form>

      {error && (
        <div style={{ 
          color: "red", 
          backgroundColor: "#ffe6e6", 
          padding: "10px", 
          borderRadius: "4px", 
          marginTop: "15px" 
        }}>
          {error}
        </div>
      )}

      {aiResponse && (
        <div style={{ marginTop: "20px" }}>
          <h2>Search Results:</h2>
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "15px", 
            borderRadius: "4px", 
            border: "1px solid #dee2e6",
            whiteSpace: "pre-wrap"
          }}>
            {aiResponse}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#e9ecef", borderRadius: "4px" }}>
        <h3>Sample Queries to Try:</h3>
        <ul>
          <li>"Find resumes for Computer Engineer positions with software development skills"</li>
          <li>"Search for Aviation Safety Inspector positions with FAA experience"</li>
          <li>"Find candidates with Python programming and data analysis skills"</li>
          <li>"Search for government positions requiring security clearance"</li>
          <li>"Find jobs for candidates with 5+ years of project management experience"</li>
        </ul>
      </div>
    </div>
  );
}

export default ChatComponent;