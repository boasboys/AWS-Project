import React from 'react';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/pexels-scottwebb-1029624.jpg';
import logo from '../assets/1002079229-removebg-preview.png';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.mainContainer}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <img
            src={logo}
            alt="AppsFlyer Logo"
            style={styles.logoImage}
            onClick={() => navigate('/')}
          />
          <button onClick={() => navigate('/')} style={styles.navButton}>
            Back to Home
          </button>
        </div>
      </nav>

      <div style={styles.container}>
        <div style={styles.content}>
          <section style={styles.section}>
            <h1 style={styles.title}>About AWS WAF Visualization Tool</h1>
            
            <div style={styles.infoCard}>
              <h2 style={styles.sectionTitle}>Purpose</h2>
              <p style={styles.text}>
                Our AWS WAF Visualization Tool is designed to simplify the complex task of 
                managing AWS Web Application Firewall (WAF) rules. By providing intuitive 
                visual representations of rule relationships and dependencies, we help security 
                teams better understand and optimize their WAF configurations.
              </p>
            </div>

            <div style={styles.infoCard}>
              <h2 style={styles.sectionTitle}>Key Features</h2>
              <ul style={styles.featureList}>
                <li style={styles.featureItem}>
                  <strong>Interactive Visualization:</strong> Dynamic graph-based interface 
                  showing relationships between WAF rules
                </li>
                <li style={styles.featureItem}>
                  <strong>Dependency Analysis:</strong> Easily identify rule dependencies 
                  and potential conflicts
                </li>
                <li style={styles.featureItem}>
                  <strong>Optimization Insights:</strong> Get recommendations for improving 
                  your WAF configuration
                </li>
                <li style={styles.featureItem}>
                  <strong>Real-time Updates:</strong> See changes and updates to your WAF 
                  rules in real-time
                </li>
              </ul>
            </div>

            <div style={styles.infoCard}>
              <h2 style={styles.sectionTitle}>How It Works</h2>
              <p style={styles.text}>
                The tool connects to your AWS WAF configuration and creates an interactive 
                visual representation of your rules and their relationships. You can explore 
                dependencies, analyze rule patterns, and identify potential optimizations 
                through our intuitive interface.
              </p>
            </div>

            <button 
              onClick={() => navigate('/app')} 
              style={styles.actionButton}
            >
              Start Visualizing
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainContainer: {
    fontFamily: "'Poppins', sans-serif",
    width: '100%',
    minHeight: '100vh',
    background: `url(${backgroundImage}) no-repeat center center / cover`,
    position: 'absolute',
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: '70px',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    background: 'rgba(255, 255, 255, 0.5)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoImage: {
    height: '100px',
    cursor: 'pointer',
  },
  navButton: {
    background: 'transparent',
    color: '#220d4e',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background 0.2s ease',
  },
  container: {
    paddingTop: '90px',
    minHeight: '100vh',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  section: {
    background: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '15px',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    color: '#220d4e',
    marginBottom: '2rem',
    textAlign: 'center',
    fontWeight: 700,
  },
  infoCard: {
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '10px',
    padding: '2rem',
    border: '2px solid #220d4e',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    color: '#220d4e',
    marginBottom: '1rem',
  },
  text: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#333',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    display: 'grid',
    gap: '1rem',
  },
  featureItem: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#333',
  },
  actionButton: {
    background: '#220d4e',
    color: '#FFFFFF',
    border: '2px solid #220d4e',
    padding: '1rem 2rem',
    borderRadius: '30px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    alignSelf: 'center',
    marginTop: '1rem',
  },
};

export default AboutPage;
