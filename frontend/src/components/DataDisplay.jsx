// src/components/DataDisplay.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zealthy-exercise-fb2f.onrender.com'

const DataDisplay = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/form-submissions`);
        setSubmissions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching submissions:', err);
        setError('Error loading data. Please try again later.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
   
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="data-display-container">
      <div className="header">
        <h1>Form Submissions Data</h1>
        <div className="nav-links">
          <button onClick={() => navigate('/admin')} className="nav-link">Back to Admin</button>
          <button onClick={() => navigate('/')} className="nav-link">Back to Form</button>
        </div>
      </div>
      {submissions.length === 0 ? (
        <div className="no-data">
          <p>No submissions found in the database.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Address</th>
                <th>Birthdate</th>
                <th>About</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.id}</td>
                  <td>{submission.username}</td>
                  <td>{submission.address !== undefined ? submission.address : 'Not collected'}</td>
                  <td>{submission.birthdate !== undefined ? submission.birthdate : 'Not collected'}</td>
                  <td>
                    <div className="about-text">
                      {submission.about_you !== undefined ? submission.about_you : 'Not collected'}
                    </div>
                  </td>
                  <td>{formatDate(submission.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataDisplay;