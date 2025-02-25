import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div style={styles.container}>
      <div 
        style={{
          ...styles.content,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        <div style={styles.header}>
          <h1 style={styles.title}>AWS WAF Visualization</h1>
          <p style={styles.subtitle}>Visualize your WAF rules dependencies with an interactive graph</p>
        </div>

        <div style={styles.features}>
          <div style={styles.featureCard} onClick={() => navigate('/waf-tree')}>
            <div style={styles.iconPlaceholder}>🔍</div>
            <h3>Dependency Visualization</h3>
            <p>Clear visualization of rule relationships and dependencies</p>
          </div>
          <div style={styles.featureCard} onClick={() => navigate('/waf-stats')}>
            <div style={styles.iconPlaceholder}>📊</div>
            <h3>Rule Analysis</h3>
            <p>View detailed statistics and analytics of your WAF traffic</p>
          </div>
          <div style={styles.featureCard} onClick={() => navigate('/waf-table')}>
            <div style={styles.iconPlaceholder}>📋</div>
            <h3>Table View</h3>
            <p>View WAF rules in a sortable table format</p>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflowY: 'auto',  // Changed from 'hidden' to 'auto'
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    maxWidth: '1200px',
    width: '100%',
    padding: '2rem',
    textAlign: 'center',
    color: 'white',
    transition: 'all 0.8s ease-out',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  header: {
    marginBottom: '4rem',
  },
  title: {
    fontSize: '3.5rem',
    marginBottom: '1rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '1.5rem',
    opacity: 0.9,
    maxWidth: '600px',
    margin: '0 auto',
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginBottom: '4rem',
    flexWrap: 'wrap',
  },
  featureCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '15px',
    width: '300px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    transform: 'scale(1)',
    '&:hover': {
      transform: 'translateY(-5px)',
      background: 'rgba(255,255,255,0.15)',
    },
    '&:active': {
      transform: 'scale(0.98)',
    }
  },
  iconPlaceholder: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
  },
  button: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    borderRadius: '30px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.3s ease',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
};

export default Home;
